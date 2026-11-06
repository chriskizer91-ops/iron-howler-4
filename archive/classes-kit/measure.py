"""Cut the front / side / rear views out of a chassis sheet and measure them.
usage: python3 -I measure.py sheet.png outprefix
Prints each figure's box (pixels) and writes a mask image and a per-row width profile (json)."""
import sys, json
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.int32)
H, W, _ = im.shape
top = im[:int(H * .63)]                       # upper band holds the three views
bg = np.median(top[5:40, -200:-20].reshape(-1, 3), axis=0)
d = np.abs(top - bg).sum(axis=2)
sat = top.max(axis=2) - top.min(axis=2)
mask = (d > 45) | (sat > 40)
mask[:52, :700] = False; mask[:4] = False         # title text
# drop the label row: labels are thin dark text near the bottom of the band
rows = mask.sum(axis=1)
cols = mask.sum(axis=0)
# split into figures by empty column gaps
on = cols > 3
segs, s = [], None
for x in range(W):
    if on[x] and s is None: s = x
    if (not on[x] or x == W - 1) and s is not None:
        if x - s > 60: segs.append((s, x))
        s = None
res = []
for (a, b) in segs:
    sub = mask[:, a:b]
    r = np.where(sub.sum(axis=1) > 2)[0]
    # figure = longest run of filled rows (labels sit below a gap)
    runs, st = [], r[0]
    for i in range(1, len(r)):
        if r[i] - r[i - 1] > 6: runs.append((st, r[i - 1])); st = r[i]
    runs.append((st, r[-1]))
    y0, y1 = max(runs, key=lambda t: t[1] - t[0])
    prof = []
    for y in range(y0, y1 + 1):
        xs = np.where(sub[y])[0]
        prof.append([int(xs.min() + a), int(xs.max() + a)] if len(xs) else None)
    res.append({'x0': int(a), 'x1': int(b), 'y0': int(y0), 'y1': int(y1), 'h': int(y1 - y0), 'w': int(b - a), 'profile': prof})
    print('figure x %d-%d  y %d-%d  height %d px  width %d px' % (a, b, y0, y1, y1 - y0, b - a))
json.dump(res, open(out + '.json', 'w'))
Image.fromarray((mask * 255).astype(np.uint8)).save(out + '_mask.png')
