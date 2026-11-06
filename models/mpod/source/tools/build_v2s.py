"""Session 2's copy of pipeline/build_v2.py (v2.1) with three additions for small kit pieces (everything else unchanged):
  - "round": n on a part: every slice is a superellipse (2 = ellipse, 3-4 = rounded box) exactly as wide as the front outline
    and as deep as the side outline at that height, instead of a box; for discs, barrels, nozzles, rounded heads.
  - "plan": [[x, y], ...] (metres, the item's right = +x, forward = +y) or {"circle": [x, y, r]}: a top-down outline for a
    part, for items with no top view (angled doors, round bases). Mirrored parts give it for their right-hand copy.
  - item-level "h_full" / "h_lo" (voxel size in metres, default 0.009 / 0.02) and "k_scale" (scales the default edge rounding).
Original description:
Wraith V2: build the model from the parts traced on its concept sheet (parts.json, see parts_wraith.py).

Each part is cut out of the sheet's figure in two views: front (or rear) for width and height, side for depth.
The front view sets the heights: the side outline of a part is stretched up or down to the front's height range.
Every slice through a part is a rounded box (superellipse) exactly as wide as the front outline and as deep as the
side outline at that height, so the model's outline matches the drawing in both views.
Mirrored parts are traced on the mech's right (image left in the front view) and copied to the left.

usage: python3 -I build_v2.py parts.json sheet.png out.blend [--fine] [--board outdir]
"""
import sys, os, json, math, time
HERE = os.path.dirname(os.path.abspath(__file__)); PIPE = os.path.join(HERE, '..', '..', '..', '..', 'pipeline')
sys.path.insert(0, HERE); sys.path.insert(0, os.path.abspath(PIPE))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import bpy
from mathutils import Vector, Matrix

S = 4                                                   # sub-pixels per sheet pixel when cutting out parts
SMOOTH = 1.4                                            # outline smoothing (sheet pixels)
BOX = {'front': (340, 0, 700, 534), 'side': (800, 0, 1060, 534), 'rear': (1200, 0, 1560, 534)}

def setup_views(J, sheet):
    """v2.1: an item made from separate view pictures (make_views.py) brings its own boxes, mapping and figure mask.
    Without them (the Wraith's sheet 90) the built-in boxes are used. Returns the figure mask and the sheet image."""
    global BOX, S
    vj = J.get('views')
    if isinstance(vj, str):
        vj = json.load(open(vj if os.path.isabs(vj) else os.path.join(os.path.dirname(os.path.abspath(J['_path'])), vj)))
    if vj:
        BOX = {k: tuple(v) for k, v in vj['boxes'].items()}
        J['view'] = dict(vj['view'], ppm=vj['ppm'])
        if 'top' in J['view']: J['view']['top'].setdefault('vg', J['view']['top']['cv'])
        S = J.get('S', 2)
        mp = sheet[:-4] + '_mask.png'
        im = np.asarray(Image.open(sheet).convert('RGB'))
        m = np.asarray(Image.open(mp).convert('L')) > 110 if os.path.exists(mp) else sheet_mask(sheet, cut=False)[0]
        return m, im
    return sheet_mask(sheet)

def sheet_mask(path, cut=True):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    bg = np.median(im[5:40, -200:-20].reshape(-1, 3), axis=0)
    m = (np.abs(im - bg).sum(2) > 45) | ((im.max(2) - im.min(2)) > 40)
    if cut: m[:52, :492] = False; m[534:] = False         # sheet 90: its title, its lower panels
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, 1 + np.where(sizes > 40)[0])
    # pale highlights and white stripes read as background: fill the small holes they leave (real gaps are big)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hn = ndimage.label(holes)
    if hn: hs = ndimage.sum(holes, hl, range(1, hn + 1)); m |= np.isin(hl, 1 + np.where(hs < 350)[0])
    return m, im.astype(np.uint8)

def upmask(m, view):
    """the figure in one view at S x resolution, with smooth (sub-pixel) edges"""
    x0, y0, x1, y1 = BOX[view]; c = m[y0:y1, x0:x1].astype(np.float32)
    c = ndimage.gaussian_filter(c, SMOOTH)     # rounds off small notches, which would otherwise run as grooves across the part
    up = np.asarray(Image.fromarray(c).resize(((x1 - x0) * S, (y1 - y0) * S), Image.BILINEAR))
    return up > .5

def poly_mask(poly, view):
    x0, y0, x1, y1 = BOX[view]; W, H = (x1 - x0) * S, (y1 - y0) * S
    im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([((u - x0) * S, (v - y0) * S) for u, v in poly], fill=1)
    return np.asarray(im).astype(bool)

def runs(row):
    """(start, end) column runs of True in a row; end exclusive"""
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]])); s = np.where(d == 1)[0]; e = np.where(d == -1)[0]
    return list(zip(s, e))

def part_slices(R, view, Vw, step, sym, region_side, Vs, ppm, remap=True):
    """per height: (z, x0, x1, y0, y1) from the part's front/rear region R and side region"""
    x0b, y0b = BOX[view][:2]; xs0, ys0 = BOX['side'][:2]
    rows = np.where(R.any(1))[0]; rs = np.where(region_side.any(1))[0]
    if not len(rows) or not len(rs): return []
    va0, va1 = y0b + rows[0] / S, y0b + (rows[-1] + 1) / S          # sheet rows (top, bottom) in the front view
    vs0, vs1 = ys0 + rs[0] / S, ys0 + (rs[-1] + 1) / S
    out = []
    n = max(2, int(round((va1 - va0) / ppm / step)))
    for k in range(n + 1):
        t = k / n; va = va0 + t * (va1 - va0)
        # the front sets the height: by default the side outline is read at the same height (the sheet's views share
        # one scale and ground), held at its own top or bottom where the front part reaches further; remap=True stretches it instead
        vsd = vs0 + t * (vs1 - vs0) if remap else min(vs1 - .5 / S, max(vs0, va))
        ia = min(R.shape[0] - 1, max(0, int((va - y0b) * S))); isd = min(region_side.shape[0] - 1, max(0, int((vsd - ys0) * S)))
        ra = runs(R[ia]); rsd = runs(region_side[isd])
        if not ra or not rsd: out.append(None); continue
        a = max(ra, key=lambda r: r[1] - r[0]); b = max(rsd, key=lambda r: r[1] - r[0])
        ua0, ua1 = x0b + a[0] / S, x0b + a[1] / S; us0, us1 = xs0 + b[0] / S, xs0 + b[1] / S
        if view == 'front': xa, xb = (Vw['front']['cu'] - ua1) / ppm, (Vw['front']['cu'] - ua0) / ppm
        else: xa, xb = (ua0 - Vw['rear']['cu']) / ppm, (ua1 - Vw['rear']['cu']) / ppm
        if sym: w = (xb - xa) / 2; xa, xb = -w, w
        ya, yb = (Vw['side']['cu'] - us1) / ppm, (Vw['side']['cu'] - us0) / ppm
        z = (Vw[view]['vg'] - va) / ppm
        out.append((z, xa, xb, ya, yb))
    return out

def superellipse(n, M):
    t = np.linspace(0, 2 * np.pi, M, endpoint=False); c, s = np.cos(t), np.sin(t)
    return np.sign(c) * np.abs(c) ** (2 / n), np.sign(s) * np.abs(s) ** (2 / n)

def loft(slices, n, M, smooth=.8):
    """rings through the slices (consecutive runs of valid slices become separate closed tubes)"""
    meshes = []; run = []
    for s_ in slices + [None]:
        if s_ is not None: run.append(s_); continue
        if len(run) >= 2:
            A = np.array(run)
            if smooth and len(A) > 4:
                for c in range(1, 5): A[1:-1, c] = ndimage.gaussian_filter1d(A[:, c], smooth, mode='nearest')[1:-1]
            ux, uy = superellipse(n, M)
            V = []; F = []
            for z, xa, xb, ya, yb in A:
                xc, a = (xa + xb) / 2, max(.004, (xb - xa) / 2); yc, b = (ya + yb) / 2, max(.004, (yb - ya) / 2)
                V += list(zip(xc + a * ux, yc + b * uy, np.full(M, z)))
            R = len(A)
            for r in range(R - 1):
                for k in range(M):
                    a0 = r * M + k; a1 = r * M + (k + 1) % M
                    F.append((a0, a1, a1 + M, a0 + M))
            top = len(V); V.append(((A[0, 1] + A[0, 2]) / 2, (A[0, 3] + A[0, 4]) / 2, A[0, 0]))
            bot = len(V); V.append(((A[-1, 1] + A[-1, 2]) / 2, (A[-1, 3] + A[-1, 4]) / 2, A[-1, 0]))
            for k in range(M):
                F.append((top, (k + 1) % M, k)); F.append((bot, (R - 1) * M + k, (R - 1) * M + (k + 1) % M))
            meshes.append((np.array(V), F))
        run = []
    return meshes

def clean_region(Rm, tol=1.6):
    """the region's outer outline as straight runs and clean corners (pixel steps in the outline would otherwise
    run across the part as grooves): largest outline, simplified to within tol sheet pixels, filled"""
    from skimage import measure
    if not Rm.any(): return Rm
    pad = np.pad(Rm, 2); cs = measure.find_contours(pad.astype(np.float32), .5)
    if not cs: return Rm
    out = Image.new('L', (Rm.shape[1], Rm.shape[0]), 0); d = ImageDraw.Draw(out)
    big = max(len(c) for c in cs)
    for c in cs:
        if len(c) < max(12, big * .08): continue                 # keep separate pieces of some size (e.g. two claws)
        a_ = measure.approximate_polygon(c, tol * S) - 2
        if len(a_) >= 3: d.polygon([(float(q[1]), float(q[0])) for q in a_], fill=1)
    return np.asarray(out).astype(bool)

def region_sd(Rm, view, Vw, ppm, sym):
    """signed distance (metres, + inside) of a part's region in one view, and how to sample it at (a, z):
    a = x for front/rear, y for side"""
    x0b, y0b = BOX[view][:2]
    ii, jj = np.where(Rm)
    if not len(ii): return None
    pad = 48; i0, i1 = max(0, ii.min() - pad), min(Rm.shape[0], ii.max() + pad + 1); j0, j1 = max(0, jj.min() - pad), min(Rm.shape[1], jj.max() + pad + 1)
    R = Rm[i0:i1, j0:j1].copy()
    if sym:      # centre part: each row becomes symmetric about the centre line, as wide as the traced run
        cuj = (Vw[view]['cu'] - x0b) * S - j0; Rs = np.zeros_like(R)
        for r in range(R.shape[0]):
            rr = runs(R[r])
            if not rr: continue
            a_, b_ = max(rr, key=lambda q: q[1] - q[0]); w = (b_ - a_) / 2
            Rs[r, max(0, int(round(cuj - w))):min(R.shape[1], int(round(cuj + w)))] = True
        R = Rs
    sd = (ndimage.distance_transform_edt(R) - ndimage.distance_transform_edt(~R)) / (S * ppm)
    sd = ndimage.gaussian_filter(sd, 2.5)        # removes the tiny pixel steps of the outline (they show as bands in the light)
    cu, vg = Vw[view]['cu'], Vw[view]['vg']
    def sample(a, z):
        u = (cu - a * ppm) if view in ('front', 'side') else (cu + a * ppm)
        v = vg - z * ppm
        return ndimage.map_coordinates(sd, [(v - y0b) * S - .5 - i0, (u - x0b) * S - .5 - j0], order=1, mode='constant', cval=-1.0)
    # extent in (a, z)
    us = x0b + (np.array([jj.min(), jj.max() + 1]) / S); vs = y0b + np.array([ii.min(), ii.max() + 1]) / S
    A = sorted(((cu - us) / ppm) if view in ('front', 'side') else ((us - cu) / ppm)); Z = sorted((vg - vs) / ppm)
    if sym: w = max(abs(A[0]), abs(A[1])); A = [-w, w]
    return sample, A, Z

def plan_sd(pl, h):
    """signed distance (metres, + inside) of a top-down outline given in metres: polygon [[x, y], ...] or {"circle": [x, y, r]}"""
    if isinstance(pl, dict) and 'circle' in pl:
        cx, cy, r = pl['circle']
        return (lambda x, y: r - np.hypot(x - cx, y - cy)),
    P_ = np.array(pl, float); r_ = h / 2; pad = .05
    x0, y0 = P_.min(0) - pad; x1, y1 = P_.max(0) + pad
    W, H_ = int((x1 - x0) / r_) + 1, int((y1 - y0) / r_) + 1
    im = Image.new('L', (W, H_), 0); ImageDraw.Draw(im).polygon([((x - x0) / r_, (y - y0) / r_) for x, y in P_], fill=1)
    M_ = np.asarray(im).astype(bool)
    sd = (ndimage.distance_transform_edt(M_) - ndimage.distance_transform_edt(~M_)) * r_
    sd = ndimage.gaussian_filter(sd, 1.0)
    def sample(x, y):
        return ndimage.map_coordinates(sd, [(y - y0) / r_, (x - x0) / r_], order=1, mode='constant', cval=-1.0)
    return sample,

def _edges(d, c):
    """first and last zero crossing (sub-voxel) of a 1-D distance profile d sampled at coordinates c; None if never inside"""
    ins = np.where(d > 0)[0]
    if not len(ins): return None
    i, j = ins[0], ins[-1]
    a = c[i] if i == 0 else c[i - 1] + (c[i] - c[i - 1]) * (-d[i - 1]) / (d[i] - d[i - 1])
    b = c[j] if j == len(c) - 1 else c[j] + (c[j + 1] - c[j]) * d[j] / (d[j] - d[j + 1])
    return a, b

def round_field(dF, dS, xs, ys, n):
    """per slice: a superellipse of exponent n inside the front range (x) and the side range (y); + inside (metres, approx)"""
    nz = dF.shape[1]; A = np.full((nz, 4), np.nan)
    for zi in range(nz):
        ex = _edges(dF[:, zi], xs); ey = _edges(dS[:, zi], ys)
        if ex and ey: A[zi] = ((ex[0] + ex[1]) / 2, max(1e-3, (ex[1] - ex[0]) / 2), (ey[0] + ey[1]) / 2, max(1e-3, (ey[1] - ey[0]) / 2))
    ok = ~np.isnan(A[:, 0])
    if ok.sum() > 4:
        idx = np.where(ok)[0]
        for c in range(4): A[idx, c] = ndimage.gaussian_filter1d(A[idx, c], 1.2, mode='nearest')
    g = np.full((len(xs), len(ys), nz), -1.0, np.float32)
    for zi in np.where(ok)[0]:
        xc, a, yc, b = A[zi]
        q = (np.abs(xs[:, None] - xc) / a) ** n + (np.abs(ys[None, :] - yc) / b) ** n
        g[:, :, zi] = (1 - q ** (1 / n)) * min(a, b)
    return g

def hull_mesh(F, Sd, k, h, remap=True, T=None, rnd=None, PL=None):
    """the part's solid: inside where it is inside both outlines; edges rounded by k (metres); marching cubes at h.
    The front view sets the height: the side outline is stretched to the front outline's height range (remap)."""
    from skimage import measure
    fs, FA, FZ = F; ss, SA, SZ = Sd
    z0, z1 = FZ[0] - 2 * h, FZ[1] + 2 * h          # the front view sets the height
    if z1 <= z0: return None
    xs = np.arange(FA[0] - 2 * h, FA[1] + 2 * h, h); ys = np.arange(SA[0] - 2 * h, SA[1] + 2 * h, h); zs = np.arange(z0, z1, h)
    if min(len(xs), len(ys), len(zs)) < 3: return None
    XZx, XZz = np.meshgrid(xs, zs, indexing='ij'); dF = fs(XZx.ravel(), XZz.ravel()).reshape(len(xs), len(zs))
    if remap: zsd = SZ[0] + (zs - FZ[0]) * (SZ[1] - SZ[0]) / max(1e-6, FZ[1] - FZ[0])    # stretch the side outline to the front's heights
    else:                                                                                  # or read it at the same height, held inside its own range
        e = min(.1 * (SZ[1] - SZ[0]), .03); zsd = np.clip(zs, SZ[0] + e, SZ[1] - e)
    YZy, YZz = np.meshgrid(ys, zsd, indexing='ij'); dS = ss(YZy.ravel(), YZz.ravel()).reshape(len(ys), len(zs))
    k = min(k, .3 * max(1e-3, dF.max()), .3 * max(1e-3, dS.max()))      # thin parts get smaller rounding
    f = -k * np.logaddexp(-dF[:, None, :] / k, -dS[None, :, :] / k)
    if T is not None:          # v2.1: inside the top outline too (x across, y along)
        XYx, XYy = np.meshgrid(xs, ys, indexing='ij'); dT = T[0](XYx.ravel(), XYy.ravel()).reshape(len(xs), len(ys))
        f = -k * np.logaddexp(-f / k, -dT[:, :, None] / k)
    if PL is not None:         # session 2: the part's own top-down outline in metres
        XYx, XYy = np.meshgrid(xs, ys, indexing='ij'); dP = PL[0](XYx.ravel(), XYy.ravel()).reshape(len(xs), len(ys))
        f = -k * np.logaddexp(-f / k, -dP[:, :, None] / k)
    if rnd:                    # session 2: round slices (superellipse inside the front and side ranges)
        f = np.minimum(f, round_field(dF, dS, xs, ys, rnd))
    f[0] = f[-1] = -1; f[:, 0] = f[:, -1] = -1; f[:, :, 0] = f[:, :, -1] = -1
    if f.max() <= 0: return None
    V, Fc, _, _ = measure.marching_cubes(f.astype(np.float32), 0.0, spacing=(h, h, h))
    V += np.array([xs[0], ys[0], zs[0]])
    return V, [tuple(int(i) for i in t) for t in Fc[:, ::-1]]

KN = {2: .07, 2.2: .065, 2.5: .055, 3: .045, 3.5: .035, 4: .028, 5: .02, 6: .015}

def mesh_obj(name, V, F, mat, coll, parent=None, mirror=False):
    V = np.array(V, float)
    if mirror: V[:, 0] *= -1; F = [tuple(reversed(f)) for f in F]
    me = bpy.data.meshes.new(name); me.from_pydata(V.tolist(), [], F); me.validate(); me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); coll.objects.link(o); o.data.materials.append(mat)
    if parent: o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o

def build(pj, sheet, fine=False, lo=False):
    J = json.load(open(pj)); J['_path'] = pj
    m, _ = setup_views(J, sheet)
    P, SH, JT, Vw = J['parts'], J.get('shared', {}), J.get('joints', {}), J['view']; ppm = Vw['ppm']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.data.collections.new('HI'); bpy.context.scene.collection.children.link(coll)
    clay = bpy.data.materials.new('clay'); clay.diffuse_color = (.62, .62, .64, 1)
    MU = {v: upmask(m, v) for v in BOX}
    # joints (shared skeleton names; R = the mech's right = +x = image left in the front view)
    def jpos(j, sd=1):
        q = JT[j]; return Vector((sd * (Vw['front']['cu'] - q['front']) / ppm, (Vw['side']['cu'] - q['side'][0]) / ppm, (Vw['side']['vg'] - q['side'][1]) / ppm))
    E = {}
    def empty(name, pos, parent=None):
        e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.empty_display_size = .15
        e.location = pos
        if parent: e.parent = parent
        bpy.context.view_layer.update()
        if parent: e.matrix_parent_inverse = parent.matrix_world.inverted()
        bpy.context.view_layer.update()     # keep every world matrix current (children read them)
        E[name] = e; return e
    GEN = 'skeleton' in J        # v2.1: joints listed in the parts file
    def spos(q, sd=1):
        return Vector((sd * (Vw['front']['cu'] - q['front']) / ppm if 'front' in q else 0, (Vw['side']['cu'] - q['side'][0]) / ppm, (Vw['side']['vg'] - q['side'][1]) / ppm))
    MIR = set()
    if GEN:
        for q in J['skeleton']:
            par = q.get('parent')
            for S_, sd in ((('R', 1), ('L', -1)) if q.get('mirror') else (('', 1),)):
                pn = None if not par else (par + '_' + S_ if (S_ and par in MIR) else par)
                empty(q['name'] + ('_' + S_ if S_ else ''), spos(q, sd) if 'side' in q else (0, 0, 0), E.get(pn))
            if q.get('mirror'): MIR.add(q['name'])
        root = E[J['skeleton'][0]['name']]
    else: root = empty('wraith', (0, 0, 0)); empty('hips', jpos('hips'), root); empty('torso', jpos('torso'), root); empty('head', jpos('head'), E['torso'])
    for S_, sd in ((('R', 1), ('L', -1)) if not GEN else ()):
        empty('thigh_' + S_, jpos('thigh', sd), E['hips']); empty('knee_' + S_, jpos('knee', sd), E['thigh_' + S_])
        empty('hock_' + S_, jpos('hock', sd), E['knee_' + S_]); empty('ankle_' + S_, jpos('ankle', sd), E['hock_' + S_])
        for i in range(3): empty('toe_%s%d' % (S_, i), jpos('toe%d' % i, sd), E['ankle_' + S_])
        empty('heel_' + S_, jpos('heel', sd), E['ankle_' + S_])
        empty('arm_' + S_, jpos('arm', sd), E['torso']); empty('elbow_' + S_, jpos('elbow', sd), E['arm_' + S_]); empty('wrist_' + S_, jpos('wrist', sd), E['elbow_' + S_])
    JN = {'head': 'head', 'torso': 'torso', 'hips': 'hips', 'thigh': 'thigh_', 'knee': 'knee_', 'hock': 'hock_', 'ankle': 'ankle_', 'heel': 'heel_',
          'arm': 'arm_', 'elbow': 'elbow_', 'wrist': 'wrist_', 'toe0': 'toe_%s0', 'toe1': 'toe_%s1', 'toe2': 'toe_%s2'}
    h = J.get('h_full', .009) if fine else (J.get('h_lo', .02) if lo else J.get('h_block', .015))          # voxel size (metres); session 2: per item
    KS = J.get('k_scale', 1.0)
    tris = 0; info = {}
    for name, p in P.items():
        view = 'front' if 'front' in p else 'rear'
        R = poly_mask(p[view], view) & MU[view]
        sp = SH[p['side']] if isinstance(p['side'], str) else p['side']
        RS = poly_mask(sp, 'side') & MU['side']
        R = clean_region(R, p.get('tol', 2.2)); RS = clean_region(RS, p.get('tol', 2.2))
        Fd = region_sd(R, view, Vw, ppm, p['kind'] == 'c'); Sdd = region_sd(RS, 'side', Vw, ppm, False)
        Td = None
        if 'top' in BOX:       # v2.1: the part's own top outline if traced, else the whole item's top outline
            RT = (poly_mask(p['top'], 'top') & MU['top']) if p.get('top') else MU['top']
            Td = region_sd(clean_region(RT, p.get('tol', 2.2)) if p.get('top') else RT, 'top', Vw, ppm, p['kind'] == 'c')
        hh = max(p.get('h', h), J.get('h_lo', .012)) if lo else p.get('h', h)
        PL = plan_sd(p['plan'], hh) if p.get('plan') else None
        hm = hull_mesh(Fd, Sdd, p.get('k', KS * KN.get(p.get('n', 3), .04)), hh, p.get('remap', False), Td, p.get('round'), PL) if Fd and Sdd else None
        parts = [hm] if hm else []
        sl = [(0, 0, 0, 0, 0)] * (len(hm[1]) if hm else 0)
        sides = [('R', False), ('L', True)] if p['kind'] == 'm' else [('', False)]
        for S_, mir in sides:
            if GEN: jn = p.get('j', J['skeleton'][0]['name']); jn = jn + '_' + S_ if (S_ and jn in MIR) else jn
            else: jn = JN[p['j']]; jn = (jn % S_ if '%s' in jn else jn + S_) if jn.endswith('_') or '%s' in jn else jn
            for i, (V, F) in enumerate(parts):
                o = mesh_obj(name + ('_' + S_ if S_ else '') + ('.%d' % i if i else ''), V, F, clay, coll, E.get(jn), mir); tris += len(F)
        info[name] = dict(slices=len(sl), z=(round(max(Fd[2][0], Sdd[2][0]), 2), round(min(Fd[2][1], Sdd[2][1]), 2)) if Fd and Sdd else None)
    # module mounts
    def bb(prefix):
        pts = [o.matrix_world @ Vector(c) for o in coll.objects if o.name.startswith(prefix) for c in o.bound_box]
        return Vector([min(q[i] for q in pts) for i in range(3)]), Vector([max(q[i] for q in pts) for i in range(3)])
    for q in (J.get('mounts', []) if GEN else []):        # v2.1: named mount empties, axes given as three vectors (x, y, z)
        for S_, sd in ((('R', 1), ('L', -1)) if q.get('mirror') else (('', 1),)):
            par = q.get('parent', J['skeleton'][0]['name']); par = par + '_' + S_ if (S_ and par in MIR) else par
            e = empty(q['name'] + ('_' + S_ if S_ else ''), spos(q, sd), E.get(par))
            if 'axes' in q:
                ax = [Vector(v) for v in q['axes']]
                if sd < 0: ax = [Vector((-v.x, v.y, v.z)) for v in ax]; ax[0] = -ax[0]
                e.matrix_world = Matrix.Translation(e.matrix_world.translation) @ Matrix(ax).transposed().to_4x4(); bpy.context.view_layer.update()
    for S_, sd in ((('R', 1), ('L', -1)) if not GEN else ()):
        a, b = bb('shmount_' + S_); empty('sh_' + S_, ((a.x + b.x) / 2, (a.y + b.y) / 2, b.z), E['torso'])
        a, b = bb('forearm_' + S_); el, wr = E['elbow_' + S_].matrix_world.translation, E['wrist_' + S_].matrix_world.translation
        d = (wr - el).normalized(); out = Vector((sd, 0, 0)); out = (out - d * out.dot(d)).normalized(); x = d.cross(out)
        fa = empty('fa_' + S_, ((b.x if sd > 0 else a.x), (a.y + b.y) / 2, (a.z + b.z) / 2), E['elbow_' + S_])
        fa.matrix_world = Matrix.Translation(fa.matrix_world.translation) @ Matrix((x, d, out)).transposed().to_4x4(); bpy.context.view_layer.update()
    if not GEN: a, b = bb('backpack'); empty('bk', (0, a.y, (a.z + b.z) / 2), E['torso'])
    tgt = J.get('lo_target', LO_TARGET) if lo else (J.get('target', TARGET) if fine else 0)      # v2.1: budgets per item in the parts file
    if tgt and tris > tgt:      # thin the marching-cubes mesh evenly down to the budget (small parts keep a minimum)
        r = tgt / tris
        for o in coll.objects:
            n0 = len(o.data.polygons); md = o.modifiers.new('dec', 'DECIMATE'); md.ratio = min(1, max(r, (60 if lo else 0) / max(1, n0))); md.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dec')
        tris = sum(len(o.data.polygons) for o in coll.objects)
    if lo: coll.name = 'LO'
    return tris, info

TARGET = 950000
LO_TARGET = 7200

def view_iou(sheet, outdir, tag, k=1, title=''):
    """render front / side / rear at the sheet's own scale, score the outline overlap, write an overlay + a board"""
    import sheetfit as SF
    J_ = VIEWS_; m, im = VMASK if VMASK is not None else sheet_mask(sheet); sc, cam = SF.setup('HI'); res = {}; tiles = []
    sc.render.film_transparent = True
    for v in [x for x in ('front', 'side', 'rear', 'top') if x in BOX]:
        x0, y0, x1, y1 = BOX[v]; crop = (x0, y0, x1, y1)
        a = SF.render_view(v, crop, J_['ppm'], J_[v]['cu'], J_[v]['vg'], os.path.join(outdir, '_%s_%s.png' % (tag, v)), k)
        if k > 1: a = np.asarray(Image.fromarray(a).resize((x1 - x0, y1 - y0), Image.LANCZOS))
        mm = a[:, :, 3] > 100; sh = m[y0:y1, x0:x1]
        res[v] = float((mm & sh).sum() / max(1, (mm | sh).sum()))
        best = max(((float((np.roll(mm, dx, 1) & sh).sum() / max(1, (np.roll(mm, dx, 1) | sh).sum())), dx) for dx in range(-8, 9)))
        if best[1]: print('  %s: shifting the model %+d px would give %.3f' % (v, best[1], best[0]))
        base = im[y0:y1, x0:x1].copy()
        # difference map: grey = both, red = only on the sheet (model too small), blue = only on the model (too big)
        ov = (base * .35 + 140).astype(np.uint8); ov[mm & sh] = (base[mm & sh] * .5 + 90).astype(np.uint8)
        ov[sh & ~mm] = (230, 40, 40); ov[mm & ~sh] = (40, 120, 255)
        tiles.append((v, base, ov))
    return res, tiles

VIEWS_ = None
VMASK = None

if __name__ == '__main__':
    a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
    pj, sheet, out = a[:3]; fine = '--fine' in a; lo = '--lo' in a
    t = time.time(); tris, info = build(pj, sheet, fine, lo)
    print('triangles', tris, ' build s %.1f' % (time.time() - t))
    for k_, v_ in info.items(): print('  %-9s triangles %6d  z %s' % (k_, v_['slices'], v_['z']))
    bpy.ops.wm.save_as_mainfile(filepath=out)
    if '--board' in a:
        od = a[a.index('--board') + 1]; os.makedirs(od, exist_ok=True)
        J0 = json.load(open(pj)); J0['_path'] = pj; VMASK = setup_views(J0, sheet); VIEWS_ = J0['view']
        res, tiles = view_iou(sheet, od, 'v2')
        print('IOU', ' '.join('%s %.3f' % (v, res[v]) for v in res), 'mean %.3f' % np.mean(list(res.values())))
        json.dump(res, open(os.path.join(od, 'iou.json'), 'w'))
        for v, base, ov in tiles: Image.fromarray(ov).save(os.path.join(od, 'overlay_%s.png' % v))
