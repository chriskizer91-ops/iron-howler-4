"""session 3: for every part with remap: True, the sheet rows its front (or rear) outline covers and the rows its side
outline covers, measured exactly as build_v2.py measures them. The model's shape maps one range onto the other, so the
side picture is printed onto that part with the same stretch (PART_REMAP in this folder's project_sheet.py).
usage: python3 -I remap_rows.py parts.json sheet.png print.json      (adds / updates "part_remap" -> "side" in print.json)"""
import sys, os, json
PIPE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'pipeline')
import numpy as np

pj, sheet, pr = sys.argv[1:4]
src = open(os.path.join(PIPE, 'build_v2.py')).read().split("if __name__ == '__main__':")[0]
ns = {'__file__': os.path.join(PIPE, 'build_v2.py')}; exec(compile(src, 'build_v2', 'exec'), ns)
J = json.load(open(pj)); J['_path'] = pj
m, _ = ns['setup_views'](J, sheet); BOX = ns['BOX']; S = ns['S']
MU = {v: ns['upmask'](m, v) for v in BOX}
def rows(poly, view, tol):
    R = ns['clean_region'](ns['poly_mask'](poly, view) & MU[view], tol)
    r = np.where(R.any(1))[0]; y0 = BOX[view][1]
    return [round(y0 + r[0] / S, 1), round(y0 + (r[-1] + 1) / S, 1)]
P = json.load(open(pr)); RM = P.setdefault('part_remap', {})
for name, p in J['parts'].items():
    if not p.get('remap'): continue
    view = 'front' if 'front' in p else 'rear'
    d = rows(p[view], view, p.get('tol', 2.2)); s = rows(p['side'], 'side', p.get('tol', 2.2))
    RM.setdefault(name, {})['side'] = [d, s]
    print('%-9s model rows %s  <- side picture rows %s' % (name, d, s))
json.dump(P, open(pr, 'w'), indent=1)
