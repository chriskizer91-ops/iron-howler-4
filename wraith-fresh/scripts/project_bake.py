"""Stage 2 of the projection bake (numpy): project the sheet's front / side /
rear views onto the model's UV texture with occlusion testing, normal-based
view blending, per-row silhouette warping and a material fallback.
usage: python project_bake.py sheet.png masks4x.npz bake_dir out.png"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import parts_spec as SP

PX = SP.PX; SS = 4; K = 4
VIEW_BOX = {'front': (340, 700), 'side': (790, 1080), 'rear': (1190, 1590), 'sideneg': (790, 1080)}
# "09" decals on the side view: flipped back for the mirrored (-X) half
DECALS_SIDE = [(928, 120, 968, 154), (857, 124, 897, 154)]

def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)

def runs(row):
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    s = np.where(d == 1)[0]; e = np.where(d == -1)[0]
    return list(zip(s, e))

def row_warp(model, ref, min_len=3):
    """Per-row run matching: displacement (in mask pixels) that maps a model
    silhouette pixel to the corresponding reference pixel."""
    H, W = model.shape
    dx = np.full((H, W), np.nan, np.float32)
    for y in range(H):
        a = [r for r in runs(model[y]) if r[1] - r[0] >= min_len]
        b = [r for r in runs(ref[y]) if r[1] - r[0] >= min_len]
        if not a or len(a) != len(b): continue
        for (s0, e0), (s1, e1) in zip(a, b):
            xs = np.arange(s0, e0)
            t = (xs - s0 + 0.5) / (e0 - s0)
            dx[y, s0:e0] = (s1 + t * (e1 - s1)) - xs - 0.5
    # fill rows/pixels without matches: nearest valid along the row, then vertical
    valid = ~np.isnan(dx)
    if valid.any():
        idx = ndi.distance_transform_edt(~valid, return_distances=False, return_indices=True)
        dx = dx[idx[0], idx[1]]
    dx = ndi.gaussian_filter(dx, (3 * SS, 1.0 * SS))
    return dx

def bilinear(img, u, v):
    H, W = img.shape[:2]
    u = np.clip(u, 0, W - 1.001); v = np.clip(v, 0, H - 1.001)
    u0 = np.floor(u).astype(int); v0 = np.floor(v).astype(int)
    fu = (u - u0)[:, None]; fv = (v - v0)[:, None]
    return (img[v0, u0] * (1 - fu) * (1 - fv) + img[v0, u0 + 1] * fu * (1 - fv) +
            img[v0 + 1, u0] * (1 - fu) * fv + img[v0 + 1, u0 + 1] * fu * fv)

def main(sheet_path, masks_path, bake_dir, out_png, power=12.0, eps=0.035):
    sheet = np.asarray(Image.open(sheet_path).convert('RGB')).astype(np.float32) / 255.0
    sheet_m = sheet.copy()
    for (a, b, c, d) in DECALS_SIDE:
        sheet_m[b:d, a:c] = sheet[b:d, a:c][:, ::-1]
    masks = np.load(masks_path)
    P4 = np.load(os.path.join(bake_dir, 'tex_pos.npy'))
    N4 = np.load(os.path.join(bake_dir, 'tex_nrm.npy'))
    C4 = np.load(os.path.join(bake_dir, 'tex_col.npy'))
    E4 = np.load(os.path.join(bake_dir, 'tex_emit.npy')).astype(np.float32)
    T = P4.shape[0]
    cov = P4[..., 3] > 0
    ii = np.where(cov.ravel())[0]
    P = P4.reshape(-1, 4)[ii, :3].astype(np.float64)
    N = N4.reshape(-1, 4)[ii, :3] * 2 - 1
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
    base = lin2srgb(C4.reshape(-1, 4)[ii, :3])
    emit = E4.reshape(-1, 4)[ii, :3].max(1) > 0.05
    n = len(ii)
    acc = np.zeros((n, 3)); wsum = np.zeros(n); best = np.zeros(n)
    stats = {}
    for view, cdir, mirror in (('front', (0, -1, 0), False), ('side', (1, 0, 0), False),
                               ('sideneg', (-1, 0, 0), True), ('rear', (0, 1, 0), False)):
        Q = P
        cosv = np.clip(N @ np.array(cdir, float), 0, 1)
        w = cosv ** power
        # sheet coordinates
        if view == 'front':
            u = Q[:, 0] / PX + SP.AXIS_F
        elif view in ('side', 'sideneg'):
            u = Q[:, 1] / PX + SP.AXIS_S
        else:
            u = SP.AXIS_R - Q[:, 0] / PX
        v = SP.GROUND_V - Q[:, 2] / PX
        # occlusion via the per-view position map (top row first, K px per sheet px)
        pm = np.load(os.path.join(bake_dir, f'pos_{view}.npy'))
        u0, u1 = VIEW_BOX[view]
        c = np.round((u - u0) * K - 0.5).astype(int); r = np.round(v * K - 0.5).astype(int)
        inb = (c >= 0) & (c < pm.shape[1]) & (r >= 0) & (r < pm.shape[0])
        c = np.clip(c, 0, pm.shape[1] - 1); r = np.clip(r, 0, pm.shape[0] - 1)
        S = pm[r, c]
        if view == 'front': depth_q, depth_s = Q[:, 1], S[:, 1]
        elif view == 'side': depth_q, depth_s = -Q[:, 0], -S[:, 0]
        elif view == 'sideneg': depth_q, depth_s = Q[:, 0], S[:, 0]
        else: depth_q, depth_s = -Q[:, 1], -S[:, 1]
        vis = inb & (S[:, 3] > 0.5) & (depth_q <= depth_s + eps)
        # per-row warp from model silhouette to reference silhouette
        model_sil = pm[..., 3] > 0.5
        ref = masks['side' if view == 'sideneg' else view][:pm.shape[0], u0 * SS:u0 * SS + pm.shape[1]]
        ref = ref[:model_sil.shape[0], :model_sil.shape[1]]
        if ref.shape != model_sil.shape:
            pad = np.zeros_like(model_sil); pad[:ref.shape[0], :ref.shape[1]] = ref; ref = pad
        dxk = row_warp(model_sil, ref)
        uw = u + dxk[r, c] / K
        # reject samples that land on (or right next to) background in the sheet
        refe = ndi.binary_erosion(ref, iterations=3)
        cc = np.clip(np.round((uw - u0) * K - 0.5).astype(int), 0, ref.shape[1] - 1)
        inside = refe[r, cc]
        w = w * vis * inside
        best = np.maximum(best, cosv * vis * inside)
        img = sheet_m if mirror else sheet
        col = bilinear(img, uw - 0.5, v - 0.5)
        acc += col * w[:, None]; wsum += w
        stats[view] = float((w > 0.05).mean())
    print('texels', n, 'view coverage', stats)
    conf = np.clip((best - 0.08) / 0.17, 0, 1)
    proj = acc / np.maximum(wsum, 1e-30)[:, None]
    # fallback = per-material median of confidently projected texels, so
    # occluded areas sit in the same tonal range as the projected sheet colours
    key = np.round(base * 20).astype(np.int32)
    kid = key[:, 0] * 10000 + key[:, 1] * 100 + key[:, 2]
    fb = base * 0.85
    good = conf >= 0.999
    for k in np.unique(kid):
        sel = kid == k
        g = sel & good
        if g.sum() > 500:
            cand = proj[g]
            # keep the half of the projected texels closest in colour to this material
            d = np.linalg.norm(cand - base[sel][0], axis=1)
            cand = cand[d <= np.median(d)]
            fb[sel] = np.median(cand, axis=0)
            print('fallback class', k, 'n', int(sel.sum()), '->', (fb[sel][0] * 255).round())
    out = proj * conf[:, None] + fb * (1 - conf[:, None])
    out[emit] = np.clip(out[emit] * 1.25 + 0.05, 0, 1)
    print('fully projected %.1f%%, partial %.1f%%, fallback %.1f%%' % (
        100 * (conf >= 0.999).mean(), 100 * ((conf > 0.01) & (conf < 0.999)).mean(), 100 * (conf <= 0.01).mean()))
    tex = np.zeros((T * T, 3), np.float32); tex[ii] = out
    tex = tex.reshape(T, T, 3)
    # dilate into empty UV space (nearest covered texel) to hide seams
    idx = ndi.distance_transform_edt(~cov, return_distances=False, return_indices=True)
    tex = tex[idx[0], idx[1]]
    Image.fromarray((np.clip(tex, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out_png)
    cf = np.zeros(T * T, np.float32); cf[ii] = conf
    Image.fromarray((cf.reshape(T, T) * 255).astype(np.uint8)).save(out_png.replace('.png', '_confidence.png'))
    print('wrote', out_png)

if __name__ == '__main__':
    main(*sys.argv[1:5])
