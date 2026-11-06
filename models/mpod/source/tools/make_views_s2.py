"""Session 2 copy of pipeline/make_views.py: exact-background outline (see figure()); otherwise unchanged.
Put an item's separate view pictures (front, side, back, and top if there is one) side by side on one sheet at a single
shared scale, so the rest of the pipeline can treat them like a concept sheet. Writes the sheet and views.json: each view's box
on the sheet and the mapping from metres to sheet pixels.

usage: python3 make_views.py outdir name H front.png side.png back.png [top.png] [--px 1200] [--flip front,back,side,top] [--sideR]
  H      the item's real height in metres (its tallest point above its lowest point)
  --px   the object's height in sheet pixels (every view is scaled to it; default 1200)
  --flip mirror these pictures left to right first (for a view drawn the wrong way round)
  --sideR the side picture shows the item's RIGHT side (it is printed as the right side, mirrored to the left)

How the views line up: front and back are scaled so the object is --px tall, and centred on its middle (x = 0). The side
view is scaled the same way; its middle is y = 0. The top view (front of the item toward the top of the picture) is scaled so
its width matches the front view's width, and centred on x = 0, y = 0. Every view keeps the object's lowest point on the
same sheet row (vg), except the top view, where cv is the sheet row of y = 0.
Mapping (u = sheet column, v = sheet row): front u = cu - x*ppm; side u = cu - y*ppm; rear u = cu + x*ppm; v = vg - z*ppm;
top u = cu + x*ppm, v = cv - y*ppm.
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage

def figure(im):
    """the object in a picture on a plain background: mask + its bounding box.
    Session 2: the ChatGPT views sit on one exact background colour (200, 200, 202), so every pixel that is not exactly
    that colour is the object. (The pipeline's test, 40 levels away from the background, cut the pale white paint
    - stripes, wolf emblems, codes - out of the object, and the sheet then lost them.)"""
    a = im.astype(np.int32)
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    bg = np.median(edge, 0)
    m = np.abs(a - bg).sum(2) > 3
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1)); big = sizes.max()
        m = np.isin(lab, 1 + np.where(sizes > max(60, big * .002))[0])
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(holes, hl, range(1, hn + 1)); m |= np.isin(hl, 1 + np.where(hs < 3000)[0])
    ys, xs = np.where(m)
    return m, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1), bg

def main(a):
    flags = [x for x in a if x.startswith('--')]
    def opt(k, d):
        return a[a.index(k) + 1] if k in a else d
    pos = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or a[i - 1] not in ('--px', '--flip'))]
    outdir, name, H = pos[0], pos[1], float(pos[2]); pics = dict(zip(('front', 'side', 'rear', 'top'), pos[3:7]))
    px = int(opt('--px', 1200)); flip = set(opt('--flip', '').split(',')) - {''}; sideR = '--sideR' in flags
    os.makedirs(outdir, exist_ok=True)
    V = {}
    for v, p in pics.items():
        im = Image.open(p).convert('RGB')
        if v in flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        arr = np.asarray(im); m, bb, bg = figure(arr)
        V[v] = dict(im=im, m=m, bb=bb, bg=bg)
    # scales: every view to px tall, except the top view (to the front view's width)
    hF = V['front']['bb'][3] - V['front']['bb'][1]
    for v in V:
        b = V[v]['bb']
        if v == 'top':
            wF = (V['front']['bb'][2] - V['front']['bb'][0]) * px / hF
            V[v]['s'] = wF / (b[2] - b[0])
        else: V[v]['s'] = px / (b[3] - b[1])
    margin = int(px * .06); ppm = px / H
    bgc = tuple(int(c) for c in np.median([V[v]['bg'] for v in V], 0))
    boxes, view, x = {}, dict(ppm=ppm), 0
    tiles = []
    for v in ('front', 'side', 'rear', 'top'):
        if v not in V: continue
        d = V[v]; s = d['s']; b = d['bb']
        w = int(round((b[2] - b[0]) * s)); h = int(round((b[3] - b[1]) * s))
        crop = d['im'].crop(b).resize((w, h), Image.LANCZOS)
        mk = Image.fromarray((d['m'][b[1]:b[3], b[0]:b[2]] * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
        bw = w + 2 * margin; bh = px + 2 * margin if v != 'top' else max(h + 2 * margin, px + 2 * margin)
        tiles.append((v, crop, mk, x, bw, bh, w, h))
        x += bw
    Wt = x; Ht = max(t[5] for t in tiles)
    sheet = Image.new('RGB', (Wt, Ht), bgc); maskimg = Image.new('L', (Wt, Ht), 0)
    for v, crop, mk, x0, bw, bh, w, h in tiles:
        if v == 'top':
            ox, oy = x0 + margin, (Ht - h) // 2
            view[v] = dict(cu=ox + w / 2, cv=oy + h / 2)
        else:
            ox, oy = x0 + margin, margin + px - h
            view[v] = dict(cu=ox + w / 2, vg=margin + px)
        # paste the object only (its own background replaced by the sheet's grey, so the views match)
        sheet.paste(crop, (ox, oy), mk.point(lambda q: 255 if q > 100 else 0))
        maskimg.paste(mk, (ox, oy))
        boxes[v] = [x0, 0, x0 + bw, Ht]
    if sideR: view['side']['is'] = 'right'
    sp = os.path.join(outdir, name + '_sheet.png'); sheet.save(sp); maskimg.save(os.path.join(outdir, name + '_sheet_mask.png'))
    J = dict(H=H, ppm=ppm, boxes=boxes, view=view, sheet=os.path.basename(sp), flip=sorted(flip), sizes={v: [round(V[v]['s'], 4)] for v in V})
    json.dump(J, open(os.path.join(outdir, name + '_views.json'), 'w'), indent=1)
    print('sheet %s  %d x %d px, %.1f px per metre; views %s' % (sp, Wt, Ht, ppm, ', '.join(V)))
    for v in V:
        b = V[v]['bb']; print('  %-5s object %4d x %4d px in its picture, scaled x%.3f' % (v, b[2] - b[0], b[3] - b[1], V[v]['s']))
    return J

if __name__ == '__main__':
    main(sys.argv[1:])
