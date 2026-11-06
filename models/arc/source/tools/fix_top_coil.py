"""Repair the Arc's side picture (A08): ChatGPT drew the top prong's coil as a few thin spikes, while the front view shows three
full rings like the other two prongs. This copies the bottom prong's coil (same picture, same size) up onto the top prong,
keeps the middle coil that overlaps it, and fills the ring tops the middle coil hid in the copy from one ring pitch over.
usage: python3 fix_top_coil.py A08_arc_side.png A08_arc_side_fixed.png
Coordinates are on the Arc's sheet (ar_sheet.png); the picture sits on the sheet at an offset of (348, -210)."""
import sys
import numpy as np
from PIL import Image

src_path, out_path = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src_path).convert('RGB')).copy()
ox, oy = 348, -210                       # sheet = picture + (ox, oy)
X = lambda x: x - ox; Y = lambda y: y - oy
bg = np.array([200, 200, 202], np.uint8)
src = a[Y(372):Y(500), X(720):X(826)].copy()                       # the bottom coil (sheet rows 372-500)
sr = np.arange(372, 500)[:, None]; cc = np.arange(720, 826)[None, :]
skip = np.broadcast_to(((sr < 377) & (cc < 784)) | ((sr < 394) & (cc >= 784)), src.shape[:2])   # bits of the middle prong
src[skip] = bg
dy = -210                                                           # up to the top prong (sheet rows 162-290)
t = a[Y(372 + dy):Y(500 + dy), X(720):X(826)]
keep = np.broadcast_to(((sr + dy) >= 262) & (cc >= 784), src.shape[:2])   # the middle coil is in front there: keep it
t[~keep] = src[~keep]
a[Y(140):Y(163), X(718):X(824)] = bg                               # tips of the old spikes above the copy
for y in range(155, 215):                                           # ring tops hidden behind the middle coil in the copy
    for x in range(784, 828):
        if np.abs(a[Y(y), X(x)].astype(int) - bg).sum() <= 2:
            s = a[Y(y), X(x - 35)]
            if np.abs(s.astype(int) - bg).sum() > 2: a[Y(y), X(x)] = s
Image.fromarray(a).save(out_path)
print('saved', out_path)
