"""Paint a concept sheet (or any front / side / rear picture set that lines up with the model) onto the combat model's
colour atlas. Every texel of the atlas knows where it sits on the model; it takes its colour from the view that looks
at it most squarely and can actually see it (nothing in front of it). Texels no view sees keep the baked colour.
The side picture also paints the model's other side (mirrored), since the sheet only shows one side.

usage (Blender python):
  python3 -I project_sheet.py baked.blend base_albedo.png images.json outdir name [--map mapping.json]
images.json: {"image": "sheet.png", "boxes": "boxes.json", "unmirror": [[x0, y0, x1, y1], ...]}   (a concept sheet)
         or {"guide": "name_guide.json", "images": {"front": "f.png", "side": "s.png", "rear": "r.png"}}   (repainted guide pictures)   (boxes: front, side, rear figure boxes, as for sheetfit)
Writes outdir/<name>_albedo.png (2048), <name>_cover.png (which view painted what), <name>_map.json (the mapping).
Mapping, per view (u = picture column, v = row, x/y/z metres):  front u = cu - x*ppm, side u = cu - y*ppm, rear u = cu + x*ppm,
v = vg - z*ppm for all; ppm is the same in every view (the picture's tallest point is the ear tip, H).
"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
from scipy import ndimage
import bpy

VIEWS = ('front', 'side', 'rear')

def fill_small_holes(m, max_area=400):
    """white numbers, white stripes and pale highlights read as background: put them back into the figure"""
    holes = ndimage.binary_fill_holes(m) & ~m; lab, n = ndimage.label(holes)
    if not n: return m
    area = ndimage.sum(holes, lab, range(1, n + 1))
    return m | np.isin(lab, 1 + np.where(area < max_area)[0])

def figure_masks(img_path, boxes_path):
    import sheetfit as SF
    SM, img = SF.sheet_masks(img_path, json.load(open(boxes_path)))
    for v in SM: SM[v]['mask'] = fill_small_holes(SM[v]['mask'])
    return SM, img

COLL, MAT = 'LO', 'atlas'      # which meshes get painted (the combat model by default; Wraith V2 paints its full model)

def atlas_triangles():
    """world positions, normals and atlas UVs of every triangle to paint"""
    P, N, U = [], [], []
    for o in bpy.data.collections[COLL].objects:
        if o.type != 'MESH' or not o.data.materials or (MAT and o.data.materials[0].name != MAT): continue
        me = o.data; me.calc_loop_triangles(); M = o.matrix_world; Mn = M.to_3x3().inverted().transposed()
        nv = len(me.vertices); co = np.zeros(nv * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        co = co @ np.array(M.to_3x3()).T + np.array(M.translation)
        nl = len(me.loops); cn = np.zeros(nl * 3); me.corner_normals.foreach_get('vector', cn) if hasattr(me, 'corner_normals') else None
        cn = cn.reshape(-1, 3) @ np.array(Mn).T; cn /= np.maximum(1e-9, np.linalg.norm(cn, axis=1, keepdims=True))
        uv = np.zeros(nl * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
        lt = np.zeros(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('loops', lt); lt = lt.reshape(-1, 3)
        lv = np.zeros(nl, np.int64); me.loops.foreach_get('vertex_index', lv)
        P.append(co[lv[lt]]); N.append(cn[lt]); U.append(uv[lt])
    return np.concatenate(P), np.concatenate(N), np.concatenate(U)

def raster(t2, attr, W, H, depth=None, pad=.0):
    """rasterise triangles t2 (T,3,2 pixel coords) into a W x H grid. With depth (T,3): a z-buffer (nearest wins) and the
    triangle id per pixel. Without: attr (T,3,C) interpolated per pixel (triangles must not overlap, like UV islands)."""
    out = np.full((H, W), np.inf, np.float32) if depth is not None else np.zeros((H, W, attr.shape[2]), np.float32)
    tid = np.full((H, W), -1, np.int64)
    for i in range(len(t2)):
        a, b, c = t2[i]
        x0 = max(0, int(math.floor(min(a[0], b[0], c[0]) - pad))); x1 = min(W - 1, int(math.ceil(max(a[0], b[0], c[0]) + pad)))
        y0 = max(0, int(math.floor(min(a[1], b[1], c[1]) - pad))); y1 = min(H - 1, int(math.ceil(max(a[1], b[1], c[1]) + pad)))
        if x1 < x0 or y1 < y0: continue
        den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(den) < 1e-12: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        w0 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / den
        w1 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / den
        w2 = 1 - w0 - w1
        e = -pad / max(1.0, math.sqrt(abs(den)))
        ins = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not ins.any(): continue
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        if depth is not None:
            z = w0 * depth[i, 0] + w1 * depth[i, 1] + w2 * depth[i, 2]
            cur = out[sl]; m = ins & (z < cur); cur[m] = z[m]; tid[sl][m] = i
        else:
            v = w0[..., None] * attr[i, 0] + w1[..., None] * attr[i, 1] + w2[..., None] * attr[i, 2]
            o_ = out[sl]; m = ins & (tid[sl] < 0); o_[m] = v[m]; tid[sl][m] = i
    return out, tid

def view_uvd(v, p, m):
    """picture column, row and depth (smaller = nearer the viewer) of points p for view v"""
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    vv = m['vg'] - z * m['ppm']
    if v == 'front': return m['cu'] - x * m['ppm'], vv, -y
    if v == 'side': return m['cu'] - y * m['ppm'], vv, x
    if v == 'sideR': return m['cu'] - y * m['ppm'], vv, -x
    if v == 'top': return m['cu'] + x * m['ppm'], m['vg'] - y * m['ppm'], -z      # v2.1: looking straight down, front at the top
    return m['cu'] + x * m['ppm'], vv, y

UNMIRROR = []      # picture boxes (x0, y0, x1, y1) on the side view holding text
TOCAM = {'front': (0, 1, 0), 'side': (-1, 0, 0), 'sideR': (1, 0, 0), 'rear': (0, -1, 0), 'top': (0, 0, 1)}
SRC = {'front': 'front', 'side': 'side', 'sideR': 'side', 'rear': 'rear', 'top': 'top'}
SIDE_IS_RIGHT = [False]

def register(P, SM, H, search=30):
    """the scale from the side picture's height, then per view the sideways shift that overlaps the outlines best"""
    ppm = (SM['side']['y1'] - SM['side']['y0']) / H; res = {}
    for v in VIEWS:
        S = SM[v]; crop = (S['x0'] - 44, 0, S['x1'] + 44, S['y1'] + 12); W, Hh = crop[2] - crop[0], crop[3] - crop[1]
        flat = P.reshape(-1, 3); lo_, hi_ = flat.min(0), flat.max(0)
        cx = (S['x0'] + S['x1']) / 2
        cu0 = cx + {'front': (hi_[0] + lo_[0]) / 2, 'side': (hi_[1] + lo_[1]) / 2, 'rear': -(hi_[0] + lo_[0]) / 2}[v] * ppm
        m = dict(ppm=ppm, cu=cu0, vg=S['y1'])
        u, vv, d = view_uvd(v, P, m)
        zb, _ = raster(np.stack([u - crop[0], vv - crop[1]], -1), None, W, Hh, depth=d)
        sil = np.isfinite(zb); sh = S['mask'][crop[1]:crop[3], crop[0]:crop[2]]; best = (-1, 0)
        for dx in range(-search, search + 1):
            b = np.roll(sil, dx, 1); iou = (b & sh).sum() / max(1, (b | sh).sum())
            if iou > best[0]: best = (iou, dx)
        res[v] = dict(ppm=ppm, cu=cu0 + best[1], vg=S['y1'], crop=crop, iou=float(best[0]))
    return res

def filled(img, mask, crop):
    """the picture inside crop with everything outside the figure replaced by the nearest figure colour (no grey bleeds in)"""
    c = crop; part = img[c[1]:c[3], c[0]:c[2]].astype(np.float64); mk = mask[c[1]:c[3], c[0]:c[2]]
    mk = ndimage.binary_erosion(mk, iterations=3) | ~ndimage.binary_dilation(ndimage.binary_erosion(mk, iterations=3), iterations=60) & mk   # edge pixels are half background: never copy them
    _, (iy, ix) = ndimage.distance_transform_edt(~mk, return_indices=True)
    return part[iy, ix]

def bilinear(im, u, v):
    Hh, W = im.shape[:2]; u = np.clip(u - .5, 0, W - 1.001); v = np.clip(v - .5, 0, Hh - 1.001)
    x0 = np.floor(u).astype(int); y0 = np.floor(v).astype(int); fx = (u - x0)[:, None]; fy = (v - y0)[:, None]
    return (im[y0, x0] * (1 - fx) * (1 - fy) + im[y0, x0 + 1] * fx * (1 - fy) + im[y0 + 1, x0] * (1 - fx) * fy + im[y0 + 1, x0 + 1] * fx * fy)

def family(rgb, k=7, seed=3):
    """group the baked colours into a few families (k-means on colour), so each can be matched to the picture"""
    rng = np.random.default_rng(seed); x = rgb[rng.choice(len(rgb), min(40000, len(rgb)), replace=False)]
    c = x[rng.choice(len(x), k, replace=False)]
    for _ in range(20):
        lab = np.argmin(((x[:, None] - c[None]) ** 2).sum(2), 1)
        c = np.array([x[lab == i].mean(0) if (lab == i).any() else c[i] for i in range(k)])
    out = np.empty(len(rgb), int)
    for i in range(0, len(rgb), 200000): out[i:i + 200000] = np.argmin(((rgb[i:i + 200000, None] - c[None]) ** 2).sum(2), 1)
    return out

def figure_mask(im, bg=None):
    """the figure in a picture on a plain background"""
    import cv2
    a = im.astype(np.int32); bg = np.median(np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)]), 0) if bg is None else bg
    m = (np.abs(a - bg).sum(2) > 40) | ((a.max(2) - a.min(2)) > 40)
    m = fill_small_holes(ndimage.binary_opening(m, iterations=1))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    if n > 1:
        big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > max(60, st[big, cv2.CC_STAT_AREA] * .002)]
        m = np.isin(lab, keep)
    return m

def guide_sources(I):
    """the repainted pictures (one per view) and where each sits, from the guide's known mapping"""
    import cv2
    G = json.load(open(I['guide'])); gd = os.path.dirname(os.path.abspath(I['guide'])); out = {}
    for v in VIEWS:
        g = G[v]; W, H = g['size']
        im = np.asarray(Image.open(I['images'][v]).convert('RGB'))
        if im.shape[:2] != (H, W): im = np.asarray(Image.fromarray(im).resize((W, H), Image.LANCZOS))   # same canvas as the guide
        fm = figure_mask(im); gm = np.asarray(Image.open(os.path.join(gd, g['mask']))) > 127
        # the AI may have moved or resized the figure a little: find scale s and shift t with  picture = s * guide + t
        best = (-1, 1, 0, 0); ys, xs = np.where(fm); yg, xg = np.where(gm)
        for sc in np.arange(.9, 1.101, .01):
            tx0 = xs.mean() - sc * xg.mean(); ty0 = ys.max() - sc * yg.max()
            for tx in np.arange(tx0 - 6, tx0 + 6.1, 2):
                for ty in np.arange(ty0 - 6, ty0 + 6.1, 2):
                    w_ = cv2.warpAffine(gm.astype(np.uint8), np.float32([[sc, 0, tx], [0, sc, ty]]), (W, H)) > 0
                    iou = (w_ & fm).sum() / max(1, (w_ | fm).sum())
                    if iou > best[0]: best = (iou, sc, tx, ty)
        iou, sc, tx, ty = best
        out[v] = dict(img=im, mask=fm, m=dict(ppm=g['ppm'] * sc, cu=g['cu'] * sc + tx, vg=g['vg'] * sc + ty, crop=(0, 0, W, H), iou=float(iou)))
        print(v, 'picture lines up with the guide: overlap %.0f%%, size x%.3f, shift %.1f, %.1f px' % (iou * 100, sc, tx, ty), flush=True)
    return out

def views_sources(I):
    """v2.1: an item's own sheet made by make_views.py: the mapping is exact, nothing to line up"""
    vp = I['views']; VJ = json.load(open(vp)); d = os.path.dirname(os.path.abspath(vp))
    sheet = I.get('sheet') or os.path.join(d, VJ['sheet'])
    img = np.asarray(Image.open(sheet).convert('RGB')); mp = sheet[:-4] + '_mask.png'
    mask = fill_small_holes(np.asarray(Image.open(mp).convert('L')) > 110) if os.path.exists(mp) else figure_mask(img)
    out = {}
    for v, b in VJ['boxes'].items():
        mv = VJ['view'][v]
        out[v] = dict(img=img, mask=mask, m=dict(ppm=VJ['ppm'], cu=mv['cu'], vg=mv.get('vg', mv.get('cv')), crop=tuple(b), iou=1.0))
    SIDE_IS_RIGHT[0] = VJ['view'].get('side', {}).get('is') == 'right'
    return out

def sheet_sources(img_path, boxes_path, P, H, mapping=None):
    SM, img = figure_masks(img_path, boxes_path); m = mapping or register(P, SM, H)
    return {v: dict(img=img, mask=SM[v]['mask'], m=m[v]) for v in VIEWS}

def project(blend, base_albedo, I, outdir, name, H, mapping=None, size=2048, power=3.0, eps=.05, k=2):
    bpy.ops.wm.open_mainfile(filepath=blend)
    P, N, U = atlas_triangles(); print('triangles', len(P), flush=True)
    SR = views_sources(I) if 'views' in I else guide_sources(I) if 'guide' in I else sheet_sources(I['image'], I['boxes'], P, H, mapping)
    VW = [v for v in ('front', 'side', 'rear', 'top') if v in SR]
    m = {v: SR[v]['m'] for v in VW}
    print('registration', {v: round(m[v]['iou'], 3) for v in VW}, flush=True)
    # 1. every texel: where it is on the model and which way it faces
    t2 = np.stack([U[..., 0] * size, (1 - U[..., 1]) * size], -1)
    pos, tid = raster(t2, np.concatenate([P, N], -1), size, size, pad=.6)
    cov = tid >= 0; del tid; idx = np.where(cov); tp = pos[idx][:, :3]; tn = pos[idx][:, 3:]; del pos
    tn /= np.maximum(1e-9, np.linalg.norm(tn, axis=1, keepdims=True))
    print('texels on the model', len(tp), flush=True)
    PV = ['front', 'side', 'sideR', 'rear'] + (['top'] if 'top' in m else [])
    acc = np.zeros((len(tp), 3), np.float32); wsum = np.zeros(len(tp), np.float32); who = np.zeros((len(tp), 5), np.float32)
    for j, v in enumerate(PV):
        mv = m[SRC[v]]; crop = mv['crop']; W, Hh = crop[2] - crop[0], crop[3] - crop[1]
        # 2. what this view can see: a depth picture of the whole model at 2x the picture's resolution
        u, vv, d = view_uvd(v, P, mv)
        zb, _ = raster(np.stack([(u - crop[0]) * k, (vv - crop[1]) * k], -1), None, W * k, Hh * k, depth=d)
        zb = ndimage.minimum_filter(zb, 3)     # a little slack at edges
        tu, tv, td = view_uvd(v, tp, mv)
        px = np.clip(((tu - crop[0]) * k).astype(int), 0, W * k - 1); py = np.clip(((tv - crop[1]) * k).astype(int), 0, Hh * k - 1)
        vis = td <= zb[py, px] + eps
        f = tn @ np.array(TOCAM[v], float); w = np.where(vis & (f > .05), np.clip(f, 0, 1) ** power, 0)
        if v == ('side' if SIDE_IS_RIGHT[0] else 'sideR'):      # numbers painted on the shown side would read backwards on the other side: flip them back
            for x0_, y0_, x1_, y1_ in UNMIRROR:
                inb = (tu >= x0_) & (tu <= x1_) & (tv >= y0_) & (tv <= y1_); tu = np.where(inb, x0_ + x1_ - tu, tu)
        src = filled(SR[SRC[v]]['img'], SR[SRC[v]]['mask'], crop)
        col = bilinear(src, tu - crop[0], tv - crop[1])
        acc += col * w[:, None]; wsum += w; who[:, j] = w
        print(v, 'paints', int((w > .2).sum()), 'texels', flush=True)
    del tp, tn
    base = np.asarray(Image.open(base_albedo).convert('RGB')).astype(np.float32)
    if base.shape[0] != size: base = np.asarray(Image.fromarray(base.astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32)
    out = base.copy(); alpha = np.clip(wsum / .35, 0, 1)[:, None]
    proj = acc / np.maximum(1e-9, wsum)[:, None]
    # where no picture sees the model, the baked colour is re-tinted to match the picture: each baked colour family
    # (orange armour, charcoal frame, steel ...) takes the typical picture colour of the same family where it IS seen
    bt = base[idx]; fam = family(bt); tinted = bt.copy()
    def _fig(v):
        c = SR[v]['m']['crop']; return SR[v]['img'][c[1]:c[3], c[0]:c[2]][SR[v]['mask'][c[1]:c[3], c[0]:c[2]]].astype(np.float64)
    figs = np.concatenate([_fig(v) for v in VW])
    sat = lambda c: (c.max(-1) - c.min(-1)) / np.maximum(1, c.max(-1))
    lum = lambda c: c @ np.array([.3, .59, .11])
    metal = figs[sat(figs) < .22]; metal = metal if len(metal) > 50 else figs; metal_l = np.median(lum(metal)); metal_c = np.median(metal, 0)   # its frame colour
    pp = figs[(sat(figs) > .45) & (figs[:, 0] > figs[:, 2] + 40)]
    paint = np.median(pp, 0) if len(pp) > 50 else metal_c          # the picture's armour colour (orange on the Wraith's kit)
    fl = {f_: np.median(bt[fam == f_], 0) for f_ in np.unique(fam)}
    grey_l = np.median([lum(c) for c in fl.values() if sat(c) < .35] or [60])
    for f_, c in fl.items():
        sel = fam == f_
        if sat(c) >= .35: tgt = paint * (lum(c) / max(1, lum(paint))) ** .3
        else: tgt = metal_c * np.clip(lum(c) / max(1, grey_l), .5, 1.8)
        tinted[sel] = bt[sel] * np.clip(tgt / np.maximum(4, c), .2, 3)
    out[idx] = tinted * (1 - alpha) + proj * alpha
    # 3. spread the painted colour into the gaps between atlas islands (no seams when the texture is shrunk)
    dist, (iy, ix) = ndimage.distance_transform_edt(~cov, return_indices=True)
    gap = ~cov & (dist < 12); del dist
    out[gap] = out[iy[gap], ix[gap]]
    os.makedirs(outdir, exist_ok=True)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(outdir, name + '_albedo.png'))
    cv = np.zeros((size, size, 3)); pal = np.array([(255, 140, 0), (40, 140, 255), (40, 200, 120), (220, 60, 200), (240, 240, 60)], float)
    cv[idx] = (who / np.maximum(1e-9, who.sum(1, keepdims=True))) @ pal * alpha
    Image.fromarray(cv.astype(np.uint8)).save(os.path.join(outdir, name + '_cover.png'))
    json.dump({v: {kk: m[v][kk] for kk in ('ppm', 'cu', 'vg', 'crop', 'iou')} for v in VW}, open(os.path.join(outdir, name + '_map.json'), 'w'), indent=1)
    print('painted %.0f%% of the model surface from the pictures' % (100 * (alpha > .5).mean()), flush=True)
    return m

if __name__ == '__main__':
    a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
    blend, base_albedo, images, outdir, name = a[:5]
    I = json.load(open(images)); UNMIRROR[:] = I.get('unmirror', []); mp = json.load(open(a[a.index('--map') + 1])) if '--map' in a else None
    project(blend, base_albedo, I, outdir, name, float(I.get('H', 6.3)), mp)
