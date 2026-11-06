"""Record a phone-size page as a sequence of frames (and an animated GIF), e.g. the walk demo.
usage: python3 walk_frames.py url out.gif [frames] [gap_s] [scale]"""
import sys, time, io
from playwright.sync_api import sync_playwright
from PIL import Image
url, out = sys.argv[1], sys.argv[2]; n = int(sys.argv[3]) if len(sys.argv) > 3 else 16; gap = float(sys.argv[4]) if len(sys.argv) > 4 else .2
sc = float(sys.argv[5]) if len(sys.argv) > 5 else .5
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    logs = []; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.goto(url); pg.wait_for_function("document.getElementById('load').style.display==='none'", timeout=300000); time.sleep(3)
    fr = []; t0 = time.time()
    for i in range(n):
        im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB'); fr.append(im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)); time.sleep(gap)
    el = time.time() - t0
    print('frames', n, 'in %.1f s' % el, '|', pg.inner_text('#stats').replace('\n', ' | '))
    for l in logs[:8]: print('console:', l)
    b.close()
fr[0].save(out, save_all=True, append_images=fr[1:], duration=int(1000 * el / n), loop=0, optimize=True)
fr[0].save(out.replace('.gif', '_first.png')); fr[len(fr) // 2].save(out.replace('.gif', '_mid.png'))
