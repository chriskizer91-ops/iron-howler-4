"""Screenshot the model bay page at phone size (390 x 844) in headless Chromium, after the model has loaded.
usage: python3 phone_shot.py http://127.0.0.1:8765/index.html?m=h07&v=full out.png [wait_s]"""
import sys, time
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]; wait = float(sys.argv[3]) if len(sys.argv) > 3 else 4
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    logs = []; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.goto(url); t = time.time()
    pg.wait_for_function("document.getElementById('load').style.display==='none'", timeout=300000)
    time.sleep(wait)
    pg.screenshot(path=out)
    print('loaded in %.1f s' % (time.time() - t), pg.inner_text('#stats').replace('\n', ' | '))
    for l in logs[:10]: print('console:', l)
    b.close()
