"""Make fskitter_sheet_fix.png (and its outline): the sheet with the top view's rows moved front to back so its body and legs
line up with the side view (tools/topmaps.py). The front, side and back views are unchanged. Tracing, building and printing all
use the fixed sheet, so every step agrees. usage: python3 tools/top_fix.py fskitter_sheet.png fskitter_sheet_fix.png"""
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import topmaps as TM
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')); mk = np.asarray(Image.open(src[:-4] + '_mask.png').convert('L'))
VJ = json.load(open(os.path.join(os.path.dirname(os.path.abspath(src)), 'fskitter_views.json')))
x0, y0, x1, y1 = VJ['boxes']['top']; H = im.shape[0]
bgc = im[3, 3].copy()
def rows(M):
    """for every output row of the sheet, the source row it takes (or -1 outside the picture)"""
    r = np.array([TM.inv(M, v + .5) - .5 for v in range(H)]); r = np.round(r).astype(int); r[(r < 0) | (r >= H)] = -1; return r
def take(a, r, fill):
    o = np.empty_like(a); ok = r >= 0; o[ok] = a[r[ok]]; o[~ok] = fill; return o
def zone(polys):
    z = Image.new('L', (im.shape[1], H), 0); d = ImageDraw.Draw(z)
    for p in polys: d.polygon([tuple(q) for q in p], fill=255)
    return np.asarray(z) > 0
top_im = im[:, x0:x1]; top_mk = mk[:, x0:x1]
zsrc = zone([TM.ZONE_F, TM.mirror(TM.ZONE_F), TM.ZONE_B, TM.mirror(TM.ZONE_B)])[:, x0:x1]
body_im = top_im.copy(); body_im[zsrc] = bgc; body_mk = top_mk.copy(); body_mk[zsrc] = 0      # the body alone (the legs move by their own maps)
oi = take(body_im, rows(TM.BODY), bgc); om = take(body_mk, rows(TM.BODY), 0)
for M, Z in ((TM.LEGF, TM.ZONE_F), (TM.LEGB, TM.ZONE_B)):
    zw = zone([TM.warp_poly(M, Z), TM.warp_poly(M, TM.mirror(Z))])[:, x0:x1]      # where this pair of legs lands
    li = take(top_im, rows(M), bgc); lm = take(top_mk, rows(M), 0)
    zs = zone([Z, TM.mirror(Z)])[:, x0:x1]; li[~take(zs, rows(M), False)] = bgc; lm[~take(zs, rows(M), False)] = 0   # only leg pixels
    body_here = om > 110
    oi[zw] = li[zw]; om[zw] = lm[zw]
    keep = zw & ~(lm > 110) & body_here            # a body pixel the leg zone covers but the leg doesn't: keep the body
    oi[keep] = take(body_im, rows(TM.BODY), bgc)[keep]; om[keep] = take(body_mk, rows(TM.BODY), 0)[keep]
I2 = im.copy(); M2 = mk.copy(); I2[:, x0:x1] = oi; M2[:, x0:x1] = om
Image.fromarray(I2).save(out); Image.fromarray(M2).save(out[:-4] + '_mask.png')
print('wrote', out)
