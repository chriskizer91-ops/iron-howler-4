"""Record the walk demo frame by frame (fixed time steps) at phone size and make an MP4 and a GIF.
usage: python3 walk_video.py url out_prefix [seconds] [fps] [warmup_s]"""
import sys, io, os, subprocess, time
from playwright.sync_api import sync_playwright
from PIL import Image
url, pre = sys.argv[1], sys.argv[2]; secs = float(sys.argv[3]) if len(sys.argv) > 3 else 4; fps = int(sys.argv[4]) if len(sys.argv) > 4 else 24
warm = float(sys.argv[5]) if len(sys.argv) > 5 else 2
d = pre + '_frames'; os.makedirs(d, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.goto(url); pg.wait_for_function("document.getElementById('load').style.display==='none'", timeout=300000)
    pg.evaluate('__step(%d, %f)' % (int(warm * fps), 1 / fps))
    n = int(secs * fps); t = time.time()
    for i in range(n):
        pg.evaluate('__step(1, %f)' % (1 / fps)); pg.screenshot(path=os.path.join(d, 'f%04d.png' % i))
    print('frames', n, 'in %.0f s' % (time.time() - t))
    b.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(d, 'f%04d.png'), '-vf', 'scale=780:-2',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', pre + '.mp4'], check=True)
fr = [Image.open(os.path.join(d, 'f%04d.png' % i)).convert('RGB') for i in range(0, n, 2)]
fr = [f.resize((f.width // 4, f.height // 4), Image.LANCZOS) for f in fr]
fr[0].save(pre + '.gif', save_all=True, append_images=fr[1:], duration=int(2000 / fps), loop=0, optimize=True)
print('video', pre + '.mp4', os.path.getsize(pre + '.mp4') // 1024, 'KB  gif', os.path.getsize(pre + '.gif') // 1024, 'KB')
