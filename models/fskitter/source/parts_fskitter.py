"""FORGE Skitter (Ironhowl 4, session 4): every part traced on fskitter_sheet.png (make_views.py from F01-F04).
Sheet pixel coordinates (u = column, v = row), 468.9 px per metre; the Skitter is 0.9 m tall, 1.9 m across its legs.
front / rear: width and height; side: depth (the Skitter's left side, head to the LEFT); top: the plan (head toward the top).
kind: c = centre part (traced whole, made symmetric), m = mirrored pair traced on the Skitter's RIGHT side (image left in the
front view, image right in the rear and top views). The front legs are traced in the front view, the back legs in the rear view.

The four views disagree along the body (AI art). The top view packs the body and legs into less length than the side view
(the back hips sit 0.16 m further forward there, the head front 0.12 m further back), and its head is narrower than the front
view's. The plan's rule: the front view sets heights and widths, the side view sets depths. So:
- tools/top_fix.py moves the top view's rows front to back (one map for the body, one per pair of legs, tools/topmaps.py) so
  its landmarks land where the side view puts them, and writes fskitter_sheet_fix.png. Everything is built and printed from it.
- the shell and the legs keep the (fixed) top view's plan shape: the shell's cut corners, the legs' diagonal;
- the head, prongs, vents, chassis and hip discs ignore the top view (notop).
In the front and rear views the far pair of feet is drawn tucked in (as if in perspective); those feet are left out of the traces.
Writes parts.json."""
import json, math, sys

def circ(cx, cy, r, k=16):
    return [[round(cx + r * math.cos(2 * math.pi * i / k), 1), round(cy + r * math.sin(2 * math.pi * i / k), 1)] for i in range(k)]
def box(u0, v0, u1, v1):
    return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]

FU, RU, TU, TV, PPM = 470.5, 2352.5, 3293.5, 470.5, 468.89       # centre columns (front, rear, top), the top view's y = 0 row
def sym(left, cu=FU):
    """a centre part's full outline from its left half (traced top centre -> around the image-left side -> bottom centre)"""
    return left + [[2 * cu - u, v] for u, v in reversed(left[1:-1])]

sys.path.insert(0, 'tools'); import topmaps as TM          # the front-to-back landmarks (shared with tools/top_fix.py)
# top outlines are traced on the top view as drawn, then moved the same way tools/top_fix.py moves the picture
TOP_LEGF = TM.warp_poly(TM.LEGF, TM.ZONE_F)
TOP_LEGB = TM.warp_poly(TM.LEGB, TM.ZONE_B)
BODY = lambda poly: TM.warp_poly(TM.BODY, poly)

P = {
 # ---- body: the riveted shell, the head with its three eyes, the zap prongs, the side vents, the chassis under the shell
 'shell':   dict(kind='c', j='body', n=6, front=sym([[FU, 28], [380, 31], [300, 48], [245, 75], [228, 100], [232, 216], [FU, 216]]),
                 side=[[1061, 138], [1191, 100], [1231, 70], [1361, 32], [1400, 31], [1595, 43], [1640, 63], [1770, 103], [1790, 117], [1790, 150],
                       [1750, 172], [1630, 182], [1400, 200], [1286, 211], [1086, 211], [1060, 175]],
                 top=BODY(sym([[TU, 150], [3415, 150], [3430, 280], [3520, 370], [3530, 560], [3440, 650], [3380, 710], [3355, 800], [TU, 815]], TU))),
 'head':    dict(kind='c', j='body', n=5, notop=True, front=sym([[FU, 114], [395, 115], [370, 150], [368, 250], [385, 282], [FU, 284]]),
                 side=[[1006, 150], [1030, 136], [1150, 136], [1150, 278], [1040, 278], [1006, 252]]),
 'prong':   dict(kind='m', j='body', n=6, notop=True, zfrom='side', front=box(408, 248, 447, 367),     # slanted: the side view sets its heights
                 side=[[966, 300], [1030, 252], [1092, 252], [1094, 282], [1000, 336], [966, 333]]),
 'vent':    dict(kind='m', j='body', n=6, notop=True, front=box(203, 100, 262, 262), side=box(1398, 155, 1548, 260)),
 'chassis': dict(kind='c', j='body', n=5, notop=True, front=sym([[FU, 195], [262, 195], [262, 336], [FU, 336]]),
                 side=[[1090, 205], [1600, 190], [1640, 240], [1640, 332], [1290, 332], [1100, 290]]),
 'rearhull': dict(kind='c', j='body', n=5, notop=True, rear=sym([[RU, 140], [2440, 140], [2470, 170], [2470, 300], [RU, 300]], RU),   # under the back of the shell
                 side=[[1640, 170], [1790, 150], [1795, 180], [1770, 240], [1720, 272], [1640, 272]]),
 # ---- front legs (front view, image left = the Skitter's right): hip disc, upper leg, lower leg, foot pad
 'hipF':    dict(kind='m', j='legF', n=2.5, notop=True, front=circ(232, 250, 33), side=circ(1273, 272, 38)),
 'thighF':  dict(kind='m', j='legF', n=5, top=TOP_LEGF, front=[[330, 170], [330, 290], [205, 300], [160, 330], [140, 345], [15, 345], [15, 170]],   # in to the shell's corner, behind the hip disc
                 side=[[1098, 345], [1130, 262], [1150, 220], [1215, 214], [1250, 238], [1290, 240], [1315, 270], [1300, 300], [1255, 314], [1235, 332], [1205, 348]]),
 'shinF':   dict(kind='m', j='kneeF', n=5, top=TOP_LEGF, front=box(15, 330, 140, 398), side=[[1094, 330], [1210, 330], [1210, 400], [1094, 402]]),
 'padF':    dict(kind='m', j='footF', n=6, top=TOP_LEGF, front=box(15, 394, 183, 452), side=box(1048, 400, 1240, 452)),
 # ---- back legs (rear view, image right = the Skitter's right)
 'hipB':    dict(kind='m', j='legB', n=2.5, notop=True, rear=circ(2570, 255, 32), side=circ(1632, 267, 37)),
 'thighB':  dict(kind='m', j='legB', n=5, top=TOP_LEGB, rear=[[2490, 180], [2805, 180], [2805, 345], [2700, 345], [2660, 320], [2600, 300], [2490, 290]],
                 side=[[1595, 268], [1610, 240], [1660, 230], [1690, 214], [1745, 220], [1795, 290], [1820, 340], [1715, 348], [1680, 322], [1615, 306]]),
 'shinB':   dict(kind='m', j='kneeB', n=5, top=TOP_LEGB, rear=box(2650, 330, 2805, 405), side=box(1712, 330, 1822, 405)),
 'padB':    dict(kind='m', j='footB', n=6, top=TOP_LEGB, rear=box(2636, 402, 2805, 452), side=box(1672, 400, 1860, 452)),
}

SK = [dict(name='fskitter'),
      dict(name='body', parent='fskitter', side=[1420, 200], front=FU),
      dict(name='legF', parent='body', side=[1273, 272], front=232, mirror=True),     # front hip
      dict(name='kneeF', parent='legF', side=[1120, 335], front=78, mirror=True),
      dict(name='footF', parent='kneeF', side=[1171, 392], front=112, mirror=True),
      dict(name='legB', parent='body', side=[1632, 267], front=253, mirror=True),     # back hip (rear column 2570 = 0.464 m right)
      dict(name='kneeB', parent='legB', side=[1800, 335], front=73, mirror=True),
      dict(name='footB', parent='kneeB', side=[1735, 392], front=147, mirror=True)]
# Ironhowl 3's names: legs 0 and 3 move together, and 1 and 2 (the diagonal pairs): 0 front right, 1 front left, 2 back right, 3 back left
RENAME = {}
for j in ('leg', 'knee', 'foot'):
    for k, (fb, s) in enumerate((('F', 'R'), ('F', 'L'), ('B', 'R'), ('B', 'L'))): RENAME['%s%s_%s' % (j, fb, s)] = '%s%d' % (j, k)

J = dict(format='v2.1', views='fskitter_views.json', S=2, target=300000, lo_target=1350, skeleton=SK, mounts=[], parts=P, rename=RENAME)
json.dump(J, open(sys.argv[1] if len(sys.argv) > 1 else 'parts.json', 'w'), indent=0)
print(len(P), 'parts')
