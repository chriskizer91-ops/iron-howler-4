"""Turn the traced lassos + segmented silhouettes into clean per-part profile
polygons (in world metres).  Pure numpy/scipy/skimage/shapely - no bpy."""
import os, sys, json, importlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage import measure
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parts_spec as SP

SS = 4  # supersampling for masks

VIEW_BOX = {'front': (340, 700), 'side': (790, 1080), 'rear': (1190, 1590)}

def build_masks(sheet_path, cache=None):
    if cache and os.path.exists(cache):
        z = np.load(cache); return {k: z[k] for k in z.files}
    im = np.asarray(Image.open(sheet_path).convert('RGB')).astype(np.float32)
    H, W, _ = im.shape
    g = im.mean(2); sat = im.max(2) - im.min(2)
    ys, xs = np.mgrid[0:H, 0:W]
    fit = (ys < 555) & (sat < 12) & (g > 170)
    def basis(x, y):
        x = x / W; y = y / H
        return np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1)
    A = basis(xs[fit].astype(float), ys[fit].astype(float))
    Af = basis(xs.ravel().astype(float), ys.ravel().astype(float))
    bg = np.zeros((H, W, 3))
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, im[..., c][fit], rcond=None)
        bg[..., c] = (Af @ coef).reshape(H, W)
    d = np.sqrt(((im - bg) ** 2).sum(2))
    out = {}
    vg = int(np.floor(SP.GROUND_V))
    for k, (x0, x1) in VIEW_BOX.items():
        sub = d[:vg + 1, x0:x1]
        up = ndi.zoom(sub, SS, order=1, grid_mode=True, mode='nearest')
        m = up > 26
        m[int(SP.GROUND_V * SS):, :] = False
        m = ndi.binary_opening(m, iterations=1)
        m = ndi.binary_closing(m, iterations=2)
        m = ndi.binary_fill_holes(m)
        lab, n = ndi.label(m)
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.zeros_like(m)
        for i, s in enumerate(sizes):
            if s < 40 * SS * SS: continue
            yy, xx = np.where(lab == i + 1)
            if k == 'front' and xx.max() < 150 * SS and yy.max() < 50 * SS:  # title text
                continue
            keep |= lab == i + 1
        full = np.zeros((int(np.ceil((vg + 1) * SS)), int(W * SS)), bool)
        full[:keep.shape[0], x0 * SS:x0 * SS + keep.shape[1]] = keep
        out[k] = full
    if cache: np.savez_compressed(cache, **out)
    return out

def poly_mask(poly, shape):
    img = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(img).polygon([(u * SS, v * SS) for u, v in poly], fill=1)
    return np.asarray(img).astype(bool)

def mirror_f(poly):
    return [(2 * SP.AXIS_F - u, v) for u, v in poly]

def sym_full(poly):
    # half polygon (u >= axis) -> full symmetric polygon
    sh = Polygon(poly).buffer(0)
    mh = Polygon(mirror_f(poly)).buffer(0)
    return unary_union([sh, mh]).buffer(0.3).buffer(-0.3)

SMOOTH_SIGMA = 1.6   # in sheet pixels: removes stair-step jogs from the traced outline

def region_to_shapely(mask, tol=1.2):
    """mask at SS -> shapely polygon in sheet pixel coords (largest parts)."""
    if mask.sum() == 0: return None
    m = np.pad(mask, 8).astype(float)
    if SMOOTH_SIGMA > 0:
        m = (ndi.gaussian_filter(m, SMOOTH_SIGMA * SS) > 0.5).astype(float)
    m = m[7:-7, 7:-7]
    cs = measure.find_contours(m, 0.5)
    polys = []
    for c in cs:
        if len(c) < 8: continue
        pts = np.stack([(c[:, 1] - 1 + 0.5) / SS, (c[:, 0] - 1 + 0.5) / SS], 1)
        p = Polygon(pts).buffer(0)
        if p.area < 2.0: continue
        polys.append(p)
    if not polys: return None
    # even-odd: outer contours union minus holes (fill_holes so holes rare)
    polys.sort(key=lambda p: -p.area)
    g = polys[0]
    for p in polys[1:]:
        if g.contains(p): g = g.difference(p)
        else: g = g.union(p)
    return g.simplify(tol, preserve_topology=True)

def part_regions(masks, p):
    """Return (front_geom, side_geom) as shapely geometries in sheet px."""
    fm, sm = masks['front'], masks['side']
    if p['kind'] == 'sym':
        fg = sym_full(p['F'])
    else:
        fg = Polygon(p['F']).buffer(0)
    sg = Polygon(p['S']).buffer(0)
    if p.get('clipF', True):
        lm = poly_mask(list(fg.exterior.coords), fm.shape) if fg.geom_type == 'Polygon' else None
        if lm is None:
            lm = np.zeros(fm.shape, bool)
            for g in fg.geoms: lm |= poly_mask(list(g.exterior.coords), fm.shape)
        fg = region_to_shapely(lm & fm)
    if p.get('clipS', True):
        lm = poly_mask(list(sg.exterior.coords), sm.shape)
        sg = region_to_shapely(lm & sm)
    return fg, sg

def largest(g):
    if g is None: return None
    if g.geom_type == 'MultiPolygon':
        return max(g.geoms, key=lambda q: q.area)
    return g

def to_world_front(coords):
    return [((u - SP.AXIS_F) * SP.PX, (SP.GROUND_V - v) * SP.PX) for u, v in coords]

def to_world_side(coords):
    return [((u - SP.AXIS_S) * SP.PX, (SP.GROUND_V - v) * SP.PX) for u, v in coords]

def export_profiles(masks, out_json):
    importlib.reload(SP)
    res = []
    for p in SP.P:
        fg, sg = part_regions(masks, p)
        if fg is None or sg is None:
            print('WARN empty region', p['name']); continue
        def polys(g):
            gs = [g] if g.geom_type == 'Polygon' else [q for q in g.geoms if q.area > 4]
            return [[list(map(list, q.exterior.coords[:-1])), [list(map(list, h.coords[:-1])) for h in q.interiors]] for q in gs]
        res.append(dict({k: v for k, v in p.items() if k not in ('F', 'S')},
                        F=[[to_world_front(o), [to_world_front(h) for h in hs]] for o, hs in polys(fg)],
                        S=[[to_world_side(o), [to_world_side(h) for h in hs]] for o, hs in polys(sg)]))
    json.dump(res, open(out_json, 'w'))
    return res

PALETTE = [(255,80,80),(80,200,255),(255,220,60),(120,255,120),(255,120,255),(255,160,40),(60,120,255),(200,255,200),(255,255,255),(160,90,255)]

def overlay(masks, sheet_path, out_dir):
    importlib.reload(SP)
    im = Image.open(sheet_path).convert('RGB')
    for view in ('front', 'side'):
        x0, x1 = VIEW_BOX[view]
        base = im.crop((x0, 0, x1, int(SP.GROUND_V) + 4)).resize(((x1 - x0) * 3, (int(SP.GROUND_V) + 4) * 3), Image.LANCZOS)
        base = np.asarray(base).astype(float) * 0.55
        cover = np.zeros(masks[view].shape, bool)
        lay = np.zeros(base.shape)
        cnt = np.zeros(base.shape[:2])
        labels = []
        for i, p in enumerate(SP.P):
            fg, sg = part_regions(masks, p)
            g = fg if view == 'front' else sg
            if g is None: continue
            geoms = [g] if g.geom_type == 'Polygon' else list(g.geoms)
            if view == 'front' and p['kind'] == 'mirror':
                geoms += [Polygon(mirror_f(q.exterior.coords)) for q in geoms]
            col = PALETTE[i % len(PALETTE)]
            for q in geoms:
                mk = poly_mask(list(q.exterior.coords), masks[view].shape)
                cover |= mk
                sub = mk[:, x0 * SS:x1 * SS]
                sub3 = sub[::4, ::4][:, :] if False else ndi.zoom(sub.astype(float), 3 / SS, order=0) > 0.5
                hh = min(sub3.shape[0], base.shape[0]); ww = min(sub3.shape[1], base.shape[1])
                s3 = sub3[:hh, :ww]
                lay[:hh, :ww][s3] += col; cnt[:hh, :ww][s3] += 1
                e = s3 ^ ndi.binary_erosion(s3)
                base[:hh, :ww][e] = col
            c = np.array(q.centroid.coords[0]) if geoms else None
            labels.append((p['name'], (c[0] - x0) * 3, c[1] * 3, col))
        m = cnt > 0
        base[m] = base[m] * 0.5 + (lay[m] / cnt[m][:, None]) * 0.5
        unc = masks[view] & ~cover
        u3 = ndi.zoom(unc[:, x0 * SS:x1 * SS].astype(float), 3 / SS, order=0) > 0.5
        hh = min(u3.shape[0], base.shape[0]); ww = min(u3.shape[1], base.shape[1])
        base[:hh, :ww][u3[:hh, :ww]] = (255, 0, 0)
        img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(img)
        for n, x, y, col in labels:
            dr.text((x - 10, y - 5), n, fill=(255, 255, 255))
        img.save(os.path.join(out_dir, f'overlay_{view}.png'))
        print(view, 'uncovered silhouette px (orig units):', unc.sum() / SS / SS)

if __name__ == '__main__':
    sheet, work = sys.argv[1], sys.argv[2]
    masks = build_masks(sheet, os.path.join(work, 'masks4x.npz'))
    if len(sys.argv) > 3 and sys.argv[3] == 'export':
        export_profiles(masks, os.path.join(work, 'profiles.json'))
    else:
        overlay(masks, sheet, work)
