"""Decal sheet for the Ironhowl 4 class chassis: tex/classes-decals.webp (1024 px).
The lower part (warnings, labels, stencils) is copied from howler-decals.webp at the same place, so hd.D rects still work.
The top band gets white stencil numbers 12 / 09 / 31 and white and yellow diagonal stripes.
usage: python3 -I make_cdecals.py tex_dir"""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
td = sys.argv[1]
src = Image.open(os.path.join(td, 'howler-decals.webp')).convert('RGBA')
S = 1024
out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
out.paste(src.crop((0, 440, S, S)), (0, 440))                       # warnings, labels, stencils kept in place
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf', 250)
def number(txt, x0):
    cell = Image.new('RGBA', (325, 320), (0, 0, 0, 0)); d = ImageDraw.Draw(cell)
    w = d.textlength(txt, font=F); d.text(((325 - w) / 2, 0), txt, font=F, fill=(244, 242, 236, 255))
    a = np.asarray(cell).copy()
    ys, xs = np.where(a[:, :, 3] > 0); cx = [int(xs.min() + (xs.max() - xs.min()) * k) for k in (.25, .75)]
    for c in cx: a[:, c - 6:c + 6, 3] = 0                              # stencil bridges, one through each digit
    a[150:160, :, 3] = 0
    out.alpha_composite(Image.fromarray(a), (x0, 12))
for t, x in (('12', 8), ('09', 348), ('31', 690)): number(t, x)
d = ImageDraw.Draw(out)
def stripes(x0, x1, y0, y1, col, n=5):
    w = (x1 - x0) / n
    for i in range(n):
        a = x0 + i * w; d.polygon([(a, y1), (a + w * .5, y1), (a + w * .5 + (y1 - y0), y0), (a + (y1 - y0), y0)], fill=col)
stripes(10, 470, 348, 420, (244, 242, 236, 255))
stripes(530, 990, 348, 420, (238, 190, 24, 255))
# light wear: a few speckles taken out of the white
rng = np.random.default_rng(3); a = np.asarray(out).copy()
mask = rng.random((440, S)) < .012
a[:440][mask, 3] = (a[:440][mask, 3] * .2).astype(np.uint8)
Image.fromarray(a).save(os.path.join(td, 'classes-decals.webp'), 'WEBP', quality=92, method=6, lossless=False)
Image.fromarray(a).convert('RGBA').save('/tmp/classes-decals-preview.png')
print('classes-decals.webp', os.path.getsize(os.path.join(td, 'classes-decals.webp')) // 1024, 'KB')
