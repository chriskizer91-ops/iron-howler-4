"""Session 2: the drone's top view (C04) and side view (C02) put the fans in different places along its length (the side
view 0.16 m further back; the character sheet C00 shows the same disagreement). The plan's rule is that the side view sets
depths, so this moves the two fan discs in a copy of the top picture back to where the side view has them. The fans sit
beside the body on the plain background, so nothing else in the picture changes.
usage: python3 shift_fans.py C04_drone_top.png out.png side_centre_y_m [ppm]"""
import sys
import numpy as np
from PIL import Image
src, out, yc_side = sys.argv[1], sys.argv[2], float(sys.argv[3]); ppm = float(sys.argv[4]) if len(sys.argv) > 4 else 1000
im = np.asarray(Image.open(src).convert('RGB')).copy(); bg = np.array([200, 200, 202])
fig = np.abs(im.astype(int) - bg).sum(2) > 3
ys, xs = np.where(fig); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
cx = (x0 + x1) / 2; cy = (y0 + y1) / 2                 # the picture's middle = x 0, y 0 (as make_views lines it up)
side = np.abs(np.arange(im.shape[1]) - cx) >= .184 * ppm  # columns beside the body (the front view puts the ring's inner edge at 0.184 m): only the fans are there
col = int(round(cx - .372 * ppm))                         # the left fan's middle column
rr = np.where(fig[:, col])[0]; top_c = (rr.min() + rr.max()) / 2
yc_top = (cy - top_c) / ppm; shift = int(round((yc_top - yc_side) * ppm))
print('fan centre: top view y %.3f m, side view y %.3f m -> move the fans back %d px' % (yc_top, yc_side, shift))
fan = fig & side[None, :]
new = im.copy(); new[:, side] = bg                         # clear beside the body ...
moved = np.zeros_like(fig); moved[shift:] = fan[:-shift]
src_rows = np.where(moved)                                 # ... and put the fans back, further back
new[src_rows] = im[src_rows[0] - shift, src_rows[1]]
Image.fromarray(new.astype(np.uint8)).save(out)
print('wrote', out)
