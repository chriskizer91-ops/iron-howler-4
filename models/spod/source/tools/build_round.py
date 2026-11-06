"""session 3: pipeline/build_v2.py with one addition, round parts. Runs the pipeline's own build_v2.py (read fresh each time, so
pipeline changes still apply) with a part option "round": n. Such a part is not the solid inside both outlines (whose every
horizontal slice is a rounded rectangle) but, at every height, a superellipse exactly as wide as the front (or rear) outline
and as deep as the side outline there: n = 2 is an ellipse. For round things such as the spawner pod's egg-shaped shell and
its base ring. Every other part, and every option and output, is exactly build_v2.py's.
usage: the same as build_v2.py:  python3 -I build_round.py parts.json sheet.png out.blend [--fine | --lo] [--board outdir]"""
import sys, os
PIPE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'pipeline'))
import numpy as np
from scipy import ndimage

def round_mesh(F, Sd, k, h, remap=True, T=None, zfrom='front', n=2.0):
    """the part as a stack of superellipses: half-widths from the front outline, half-depths from the side outline, per height
    (heights, remap and zfrom exactly as in build_v2.hull_mesh; k and the top outline T are not used)"""
    from skimage import measure
    fs, FA, FZ = F; ss, SA, SZ = Sd
    MZ, OZ = (FZ, SZ) if zfrom == 'front' else (SZ, FZ)
    z0, z1 = MZ[0] - 2 * h, MZ[1] + 2 * h
    xs = np.arange(FA[0] - 2 * h, FA[1] + 2 * h, h); ys = np.arange(SA[0] - 2 * h, SA[1] + 2 * h, h); zs = np.arange(z0, z1, h)
    if min(len(xs), len(ys), len(zs)) < 3: return None
    if remap: zo = OZ[0] + (zs - MZ[0]) * (OZ[1] - OZ[0]) / max(1e-6, MZ[1] - MZ[0])
    else: e = min(.1 * (OZ[1] - OZ[0]), .03); zo = np.clip(zs, OZ[0] + e, OZ[1] - e)
    zf, zsd = (zs, zo) if zfrom == 'front' else (zo, zs)
    XZx, XZz = np.meshgrid(xs, zf, indexing='ij'); dF = fs(XZx.ravel(), XZz.ravel()).reshape(len(xs), len(zs))
    YZy, YZz = np.meshgrid(ys, zsd, indexing='ij'); dS = ss(YZy.ravel(), YZz.ravel()).reshape(len(ys), len(zs))
    def extent(d, c):          # outermost zero crossings of one column of signed distances (sub-voxel)
        ins = np.where(d > 0)[0]
        if len(ins) < 2 or ins[0] == 0 or ins[-1] == len(d) - 1: return None
        i, j = ins[0], ins[-1]
        a = c[i - 1] + h * (-d[i - 1]) / (d[i] - d[i - 1]); b = c[j] + h * d[j] / (d[j] - d[j + 1])
        return a, b
    E = np.full((len(zs), 4), np.nan)
    for iz in range(len(zs)):
        ex, ey = extent(dF[:, iz], xs), extent(dS[:, iz], ys)
        if ex and ey: E[iz] = ex + ey
    ok = ~np.isnan(E[:, 0])
    if ok.sum() < 3: return None
    # smooth the outlines along the height inside each run of valid slices (pixel steps would show as rings)
    lab, nl = ndimage.label(ok)
    for r in range(1, nl + 1):
        sl = lab == r
        if sl.sum() > 4:
            for c in range(4): E[sl, c] = ndimage.gaussian_filter1d(E[sl, c], 1.2, mode='nearest')
    f = np.full((len(xs), len(ys), len(zs)), -1.0, np.float32)
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    for iz in np.where(ok)[0]:
        xa, xb, ya, yb = E[iz]; ax, by = max(1e-3, (xb - xa) / 2), max(1e-3, (yb - ya) / 2)
        r = (np.abs((X - (xa + xb) / 2) / ax) ** n + np.abs((Y - (ya + yb) / 2) / by) ** n) ** (1 / n)
        f[:, :, iz] = (1 - r) * min(ax, by)
    f[0] = f[-1] = -1; f[:, 0] = f[:, -1] = -1; f[:, :, 0] = f[:, :, -1] = -1
    if f.max() <= 0: return None
    V, Fc, _, _ = measure.marching_cubes(f, 0.0, spacing=(h, h, h))
    V += np.array([xs[0], ys[0], zs[0]])
    return V, [tuple(int(i) for i in t) for t in Fc[:, ::-1]]

src = open(os.path.join(PIPE, 'build_v2.py')).read()
call = "hm = hull_mesh(Fd, Sdd,"
assert src.count(call) == 1, 'build_v2.py changed: update build_round.py'
src = src.replace(call, "hm = (lambda *a_: round_mesh(*a_, n=p['round']) if p.get('round') else hull_mesh(*a_))(Fd, Sdd,")
ns = {'__file__': os.path.join(PIPE, 'build_v2.py'), '__name__': '__main__', 'round_mesh': round_mesh}
sys.argv = [os.path.join(PIPE, 'build_v2.py')] + sys.argv[1:]
exec(compile(src, os.path.join(PIPE, 'build_v2.py'), 'exec'), ns)
