"""Label the lineup render: names and heights under each figure, grey background, cropped.
usage: python3 -I lineup_sheet.py lineup.png lineup.json out.png"""
import sys, json
from PIL import Image, ImageDraw, ImageFont
import numpy as np
src, js, out = sys.argv[1:4]
r = Image.open(src).convert('RGBA'); info = json.load(open(js))
bg = Image.new('RGBA', r.size, (196, 196, 198, 255)); bg.alpha_composite(r)
a = np.asarray(r)[:, :, 3]; ys, xs = np.where(a > 8)
y0 = max(0, ys.min() - 90); gy = int(info['_ground_y'])
im = bg.crop((0, y0, r.width, min(r.height, gy + 130))).convert('RGB'); d = ImageDraw.Draw(im)
fb = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; F = ImageFont.truetype(fb, 30); f2 = ImageFont.truetype(fb, 24)
names = {'person': ('Person', '1.8 m'), 'strider': ('STRIDER', None), 'howler': ('HOWLER 07', None), 'wraith': ('WRAITH', None),
         'bastion': ('BASTION', None), 'current': ('Howler now', None)}
for k, (nm, ht) in names.items():
    if k not in info: continue
    v = info[k]; cx = int(v['fx'] * r.width)
    ht = ht or '%.1f m tall' % v['h']
    sub = '' if k == 'person' else '%.1f m wide' % v['w']
    col = (110, 110, 115) if k == 'current' else (30, 30, 30)
    for t, f, yy in ((nm, F, gy - y0 + 18), (ht, f2, gy - y0 + 54), (sub, f2, gy - y0 + 84)):
        w = d.textlength(t, font=f); d.text((cx - w / 2, yy), t, fill=col if f is F else (70, 70, 70), font=f)
ppm = info['_px_per_m']; rx = int((.5 - (1.4 - (info['person']['x'] + (info['current']['x'] if 'current' in info else -30)) / 2) / ((2.2 + 30) * 1.02)) * r.width) if False else None
d.text((12, 12), 'IRONHOWL 4 CHASSIS - real sizes (ruler marks every 1 m)', fill=(30, 30, 30), font=F)
im.save(out); print(out, im.size)
