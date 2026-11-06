"""Fit a chassis' proportions to its concept sheet: nudge every measurement of chassis.C[cid] (and a few look settings),
keep each nudge that makes the model's outline overlap the sheet's figure better (front + side + rear), repeat with
smaller nudges. Builds only the combat shapes while searching (0.3 s a build). Saves fit/<cid>.json, which
build_class.py uses when run with --fit.

usage: python3 -I fit_sheet.py wraith sheet.png boxes.json outdir [passes] [--eval]
"""
import sys, os, json, math, time, copy
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw
import bpy
import hd
hd.LO_ONLY = True
import build_class as B
import sheetfit as SF

a = [x for x in sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:]] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
EVAL = '--eval' in a; RESUME = '--resume' in a; a = [x for x in a if not x.startswith('--')]
cid, sheet, boxes, outdir = a[:4]; passes = int(a[4]) if len(a) > 4 else 4
os.makedirs(outdir, exist_ok=True); TMP = os.path.join(outdir, '_tmp'); os.makedirs(TMP, exist_ok=True)
SM, SHEET = SF.sheet_masks(sheet, json.load(open(boxes)))
H = B.P['H']
PPM = (SM['side']['y1'] - SM['side']['y0']) / H        # the sheet's tallest point (ear tip) = H; same scale in every view
POS = {'legX': 'all', 'hip': 'all', 'knee': 'all', 'hock': 'all', 'ankle': 'all', 'head': 'all', 'shoulder': 'all', 'elbow': 'all', 'wrist': 'all',
       'pauld': (3, 4, 5), 'chest': (3, 4), 'pelvis': (3,), 'waist': (3,), 'dock': (3, 4), 'vents': (2,)}
YK = dict(lf=(.5, 1.2), th=(.3, 1.2), cov=(.7, 1.15), ph=(.5, 1.3), hw=(.6, 1.3), pdx=(-.05, .05), mastk=(.2, 1.3), masth=(.3, 1.6), mastt=(.85, 1.05), mastx=(.0, .2), masty=(-.06, .1))
YD = dict(ph=1.0, hw=1.0, pdx=0.0, mastk=1.0, masth=1.0, mastt=1.03, mastx=.11, masty=.03)
BASEP = copy.deepcopy(chassis_P := B.P); BASEY = {k: B.Y.get(k, YD.get(k)) for k in YK}

def knobs():
    """every adjustable number: (kind, key, index, start, lo, hi, step)"""
    out = []
    for k, v in BASEP.items():
        if not isinstance(v, tuple): continue
        for i, x in enumerate(v):
            pos = k in POS and (POS[k] == 'all' or i in POS[k])
            if pos: out.append(('P', k, i, x, x - .07, x + .07, .012))
            else: out.append(('P', k, i, x, x * .55, x * 1.7, .1))       # sizes: relative step
    for k, (lo, hi) in YK.items():
        x = BASEY[k]; out.append(('Y', k, None, x, lo, hi, .1 if k not in ('pdx', 'mastx', 'masty') else .012))
    return out

def apply(st):
    P = {k: (list(v) if isinstance(v, tuple) else v) for k, v in BASEP.items()}; Yv = dict(BASEY)
    for (kind, k, i, *_), x in zip(KN, st):
        if kind == 'P': P[k][i] = x
        else: Yv[k] = x
    B.P = {k: (tuple(v) if isinstance(v, list) else v) for k, v in P.items()}
    B.Y.update(Yv); B.CV = B.Y['cov']; B.TH = B.Y['th']; B.LF = B.Y['lf']
    return P, Yv

def masks(lod='LO', k=1, keep=False):
    B.build(); SF.setup(lod)
    mn, mx = SF.model_bounds(lod); res = {}
    for v in SF.VIEWS:
        S = SM[v]; pad = 44; crop = (S['x0'] - pad, 0, S['x1'] + pad, S['y1'] + 12)
        cx = (S['x0'] + S['x1']) / 2
        cu0 = cx + {'front': (mx.x + mn.x) / 2, 'side': (mx.y + mn.y) / 2, 'rear': -(mx.x + mn.x) / 2}[v] * PPM
        m = SF.render_view(v, crop, PPM, cu0, S['y1'], os.path.join(TMP, '_%s.png' % v), k)
        if k > 1: m = np.asarray(Image.fromarray(m).resize((crop[2] - crop[0], crop[3] - crop[1]), Image.LANCZOS))
        res[v] = dict(m=m[:, :, 3] > 100, crop=crop, cu0=cu0)
    return res

def score(res, search=30):
    out = {}
    for v in SF.VIEWS:
        r = res[v]; c = r['crop']; sh = SM[v]['mask'][c[1]:c[3], c[0]:c[2]]; a_ = r['m']; best = (-1, 0)
        for dx in range(-search, search + 1):
            b = np.roll(a_, dx, 1); iou = (b & sh).sum() / max(1, (b | sh).sum())
            if iou > best[0]: best = (iou, dx)
        out[v] = dict(iou=float(best[0]), dx=best[1], cu=r['cu0'] + best[1], crop=c, ppm=PPM, vg=SM[v]['y1'])
    return out

def ev(st):
    apply(st); sc = score(masks()); return float(np.mean([sc[v]['iou'] for v in SF.VIEWS])), sc

def overlay(sc, res, out, title):
    tiles = []
    for v in SF.VIEWS:
        c = sc[v]['crop']; base = SHEET[c[1]:c[3], c[0]:c[2]]
        tiles.append(SF.outline(base, np.roll(res[v]['m'], sc[v]['dx'], 1), (255, 120, 0)))
    Hh = max(t.shape[0] for t in tiles); W = sum(t.shape[1] for t in tiles) + 80
    can = Image.new('RGB', (W, Hh + 70), (196, 196, 198)); d = ImageDraw.Draw(can); x = 20
    for v, t in zip(SF.VIEWS, tiles):
        can.paste(Image.fromarray(t), (x, 60)); d.text((x, 30), '%s  %.0f%%' % (v.upper(), sc[v]['iou'] * 100), fill=(30, 30, 30), font=SF.font(22)); x += t.shape[1] + 20
    d.text((20, 4), title, fill=(30, 30, 30), font=SF.font(18)); can.save(out)

def save(st, sc, tag):
    P, Yv = apply(st)
    ch = {k: v for k, v in P.items() if isinstance(v, list) and tuple(round(x, 4) for x in v) != tuple(round(x, 4) for x in BASEP[k])}
    json.dump({'P': {k: [round(x, 4) for x in v] for k, v in ch.items()}, 'Y': {k: round(v, 4) for k, v in Yv.items()},
               'iou': {v: round(sc[v]['iou'], 4) for v in SF.VIEWS}, 'ppm': PPM, 'note': tag}, open(os.path.join(HERE, 'fit', cid + '.json'), 'w'), indent=1)

KN = knobs()
st = [k[3] for k in KN]
if RESUME:        # start from the last saved fit
    F = json.load(open(os.path.join(HERE, 'fit', cid + '.json')))
    st = [(F['P'][k][i] if k in F['P'] else x) if kind == 'P' else F['Y'].get(k, x) for (kind, k, i, x, *_) in KN]
f0, sc0 = ev(st)
print('START mean %.4f  ' % f0 + ' '.join('%s %.3f' % (v, sc0[v]['iou']) for v in SF.VIEWS), ' knobs', len(KN), ' ppm %.2f' % PPM, flush=True)
overlay(sc0, masks(), os.path.join(outdir, 'fit_start.png'), 'before fitting (combat shapes): model outline (orange) on the sheet')
if EVAL: sys.exit()
best = f0; steps = [k[6] for k in KN]; t0 = time.time(); n = 0
for p in range(passes):
    gain = 0
    for j, (kind, k, i, x0, lo, hi, _) in enumerate(KN):
        for sgn in (1, -1):
            cand = list(st)
            d = steps[j] * (abs(st[j]) if (kind == 'P' and not (k in POS and (POS[k] == 'all' or i in POS[k]))) or (kind == 'Y' and k not in ('pdx', 'mastx', 'masty')) else 1)
            cand[j] = min(hi, max(lo, st[j] + sgn * d))
            if cand[j] == st[j]: continue
            try: f, sc = ev(cand)
            except Exception as e: print('fail', k, i, e, flush=True); continue
            n += 1
            if f > best + 1e-4:
                gain += f - best; best = f; st = cand
                print('p%d %-9s %s %.4f -> %.4f  mean %.4f  (%d builds, %.0f s)' % (p, k, '' if i is None else i, x0, cand[j], best, n, time.time() - t0), flush=True)
                save(st, sc, 'pass %d' % p)
                break
    print('PASS', p, 'gain %.4f mean %.4f' % (gain, best), flush=True)
    steps = [s_ * (.6 if gain < .01 else .85) for s_ in steps]
f, sc = ev(st); save(st, sc, 'done'); overlay(sc, masks(), os.path.join(outdir, 'fit_end.png'), 'after fitting (combat shapes): model outline (orange) on the sheet')
print('END mean %.4f  ' % f + ' '.join('%s %.3f' % (v, sc[v]['iou']) for v in SF.VIEWS), flush=True)
