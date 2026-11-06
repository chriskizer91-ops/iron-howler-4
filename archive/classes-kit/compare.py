"""Side-by-side proof image: the sheet's front / side / rear views on top, the blockout renders below, both scaled to the same height.
usage: python3 -I compare.py sheet.png measure.json renders_prefix out.png title"""
import sys, json
from PIL import Image, ImageDraw, ImageFont
import numpy as np

sheet, mj, pre, out, title = sys.argv[1:6]; LABEL = sys.argv[6] if len(sys.argv) > 6 else 'BLOCKOUT'
SH = 470
im = Image.open(sheet).convert('RGB'); figs = json.load(open(mj))
top = min(f['y0'] for f in figs)
bgc = tuple(int(v) for v in np.median(np.asarray(im)[5:40, -200:-20].reshape(-1, 3), axis=0))
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26); f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception:
    F = f2 = ImageFont.load_default()

def sheet_crop(f):
    y0 = top; y1 = f['y1']
    c = im.crop((f['x0'] - 6, y0 - 4, f['x1'] + 6, y1 + 4)); k = SH / (y1 - y0)
    return c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)

def render_crop(path):
    r = Image.open(path).convert('RGBA'); a = np.asarray(r)[:, :, 3]
    ys, xs = np.where(a > 8); c = r.crop((xs.min() - 6, ys.min() - 4, xs.max() + 6, ys.max() + 4)); k = SH / (ys.max() - ys.min())
    c = c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)
    bg = Image.new('RGBA', c.size, bgc + (255,)); bg.alpha_composite(c); return bg.convert('RGB')

cols = []
for f, v in zip(figs, ('front', 'side', 'rear')):
    a = sheet_crop(f); b = render_crop('%s_%s.png' % (pre, v)); cols.append((a, b, v))
pad = 24; head = 50
W = sum(max(a.width, b.width) for a, b, _ in cols) + pad * (len(cols) + 1)
Hh = head + 2 * (SH + 20) + pad * 2 + 30
can = Image.new('RGB', (W, Hh), bgc); d = ImageDraw.Draw(can)
d.text((pad, 12), title, fill=(30, 30, 30), font=F)
x = pad
for a, b, v in cols:
    w = max(a.width, b.width)
    can.paste(a, (x + (w - a.width) // 2, head)); can.paste(b, (x + (w - b.width) // 2, head + SH + 34))
    d.text((x + w // 2 - 30, head + SH + 8), v.upper(), fill=(40, 40, 40), font=f2)
    x += w + pad
d.text((W - 210, head + 4), 'YOUR SHEET', fill=(60, 60, 60), font=f2)
d.text((W - 210, head + SH + 38), LABEL, fill=(170, 80, 10), font=f2)
can.save(out); print(out, can.size)
