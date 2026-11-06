"""FORGE Gunner (Ironhowl 4, session 3): every part traced on fgunner_sheet.png (made by make_views.py from D01-D03,
260 px per metre, 5.0 m tall). Writes parts.json in the v2.1 format (MODEL-PLAN.md).

Sheet: front view x 0-1040 (centre u 520), side view x 1040-2080 (centre u 1560, the Gunner's LEFT side, facing left),
rear view x 2080-3120 (centre u 2600). Ground row 1378 in every view.
kind: c = centre part (made symmetric), m = mirrored pair (traced on the Gunner's right: image LEFT in the front view,
image RIGHT in the rear view), one = a single part (the arms are not mirror images: cannon on the right, rotary guns on
the left). n: roundness (2 round ... 6 boxy). remap: the side outline is stretched to the front's height range.
The side view shows only the left side, so the right arm (cannon) uses the left arm's side outline."""
import json, math, sys, os

def circ(cx, cy, r, k=20):
    return [[round(cx + r * math.cos(2 * math.pi * i / k), 1), round(cy + r * math.sin(2 * math.pi * i / k), 1)] for i in range(k)]

ARM_SIDE = [[1112, 522], [1150, 520], [1225, 520], [1240, 497], [1335, 497], [1350, 520], [1452, 520], [1470, 482], [1572, 482], [1590, 520], [1615, 525], [1640, 565], [1640, 655], [1612, 705], [1500, 712], [1112, 712]]          # the arm, muzzle to shoulder joint (side view)
# the cannon and the rotary pods end in a flat face (the side picture's barrel tips belong to the rotary barrels only)
GUN_SIDE = [[1152, 520], [1225, 520], [1240, 497], [1335, 497], [1350, 520], [1452, 520], [1470, 482], [1572, 482], [1590, 520], [1615, 525], [1640, 565], [1640, 655], [1612, 705], [1500, 712], [1152, 712]]
BARREL_SIDE = [[1126, 515], [1158, 515], [1158, 712], [1126, 712]]      # the barrel tips stick out ~9 cm past the pod face
def ell(cx, cy, rx=16, ry=21, k=16):
    return [[round(cx + rx * math.cos(2 * math.pi * i / k), 1), round(cy + ry * math.sin(2 * math.pi * i / k), 1)] for i in range(k)]
BARRELS = [(755, 566), (721, 589), (787, 589), (720, 646), (787, 646), (755, 667)]     # rotary pod A (inner); pod B is 142 px further out
FRONT_TOES_SIDE = [[1298, 1265], [1345, 1228], [1430, 1222], [1518, 1250], [1518, 1382], [1298, 1382]]
REAR_TOE_SIDE = [[1690, 1235], [1790, 1238], [1842, 1300], [1842, 1382], [1690, 1382]]

P = {
 # ---- body (torso)
 'crown':  dict(kind='c', j='torso', n=4,
                front=[[445, 170], [595, 170], [640, 205], [690, 235], [700, 250], [700, 472], [340, 472], [340, 250], [350, 235], [400, 205]],
                side=[[1370, 300], [1500, 226], [1560, 213], [1620, 190], [1712, 190], [1712, 300], [1790, 300], [1790, 482], [1380, 482]]),
 'brow':   dict(kind='c', j='torso', n=4,
                front=[[400, 252], [640, 252], [662, 300], [662, 496], [378, 496], [378, 300]],
                side=[[1232, 372], [1300, 343], [1400, 303], [1500, 262], [1542, 300], [1542, 496], [1330, 496], [1330, 440], [1232, 432]]),
 'eyes':   dict(kind='c', j='torso', n=2.5,
                front=[[468, 428], [574, 428], [576, 502], [466, 502]],
                side=[[1296, 424], [1342, 424], [1342, 492], [1296, 492]]),
 'chest':  dict(kind='c', j='torso', n=4,
                front=[[338, 455], [702, 455], [706, 640], [690, 700], [640, 754], [400, 754], [350, 700], [334, 640]],
                side=[[1390, 468], [1790, 468], [1800, 690], [1906, 706], [1852, 738], [1792, 760], [1470, 760], [1420, 720], [1395, 640]]),
 'drum':   dict(kind='c', j='torso', n=2.2, rear=circ(2600, 507, 207, 28),
                side=[[1790, 248], [1880, 246], [1930, 278], [1975, 328], [2006, 410], [2006, 560], [1988, 616], [1952, 662], [1906, 708], [1850, 738], [1790, 752]]),
 'backplate': dict(kind='c', j='torso', n=5, rear=[[2530, 172], [2670, 172], [2682, 332], [2518, 332]],
                side=[[1700, 190], [1712, 190], [1842, 228], [1882, 244], [1932, 276], [1962, 305], [1962, 340], [1700, 340]]),
 'stack_R': dict(kind='one', j='torso', n=2, front=[[370, 72], [450, 72], [450, 300], [370, 300]],
                side=[[1703, 72], [1775, 72], [1775, 300], [1703, 300]]),
 'stack_L': dict(kind='one', j='torso', n=2, front=[[590, 72], [670, 72], [670, 300], [590, 300]],
                side=[[1769, 72], [1845, 72], [1845, 300], [1769, 300]]),
 'pad':    dict(kind='m', j='torso', n=4, remap=True,
                front=[[245, 198], [322, 198], [345, 210], [358, 250], [358, 370], [340, 400], [320, 418], [175, 424], [146, 402], [130, 340], [130, 280], [158, 233], [200, 213]],
                side=[[1588, 236], [1714, 236], [1735, 254], [1800, 390], [1806, 432], [1772, 468], [1700, 482], [1545, 480], [1497, 440], [1494, 398], [1568, 254]]),
 # ---- hips
 'belly':  dict(kind='c', j='hips', n=4,
                front=[[380, 738], [660, 738], [662, 800], [602, 874], [438, 874], [378, 800]],
                side=[[1458, 698], [1796, 698], [1796, 872], [1745, 872], [1700, 790], [1600, 832], [1458, 832]]),
 'pelvis': dict(kind='c', j='hips', n=4, front=[[477, 752], [563, 752], [566, 900], [474, 900]],
                side=[[1452, 742], [1560, 742], [1560, 906], [1458, 906]]),
 # ---- arms: shoulder housings mirrored, guns single
 'shoulder': dict(kind='m', j='arm', n=4,
                front=[[150, 400], [300, 400], [352, 438], [354, 706], [298, 706], [298, 482], [150, 482]],
                side=[[1585, 452], [1745, 452], [1762, 520], [1762, 632], [1722, 670], [1620, 670], [1585, 632]]),
 'cannon': dict(kind='one', j='arm_R', n=4, remap=True,
                front=[[145, 446], [268, 446], [290, 476], [323, 545], [323, 690], [295, 742], [265, 766], [140, 766], [108, 742], [72, 690], [72, 545], [108, 476]],
                side=GUN_SIDE),
 'rotary_a': dict(kind='one', j='arm_L', n=4, remap=True,
                front=[[712, 458], [792, 458], [802, 486], [822, 525], [822, 692], [800, 716], [702, 716], [678, 692], [676, 525], [698, 486]],
                side=GUN_SIDE),
 'rotary_b': dict(kind='one', j='arm_L', n=4, remap=True,
                front=[[855, 458], [932, 458], [942, 486], [966, 525], [966, 692], [942, 716], [845, 716], [826, 692], [826, 525], [845, 486]],
                side=GUN_SIDE),
 # ---- legs (bird legs: hip, knee forward, hock back, ankle)
 'hipj':   dict(kind='m', j='thigh', n=2, front=[[360, 768], [446, 768], [446, 870], [360, 870]], side=circ(1712, 812, 54)),
 'thigh':  dict(kind='m', j='thigh', n=4,
                front=[[282, 714], [392, 714], [418, 780], [418, 930], [366, 1050], [250, 1052], [200, 1042], [192, 905], [200, 790], [215, 772], [262, 768], [284, 752]],
                side=[[1640, 766], [1742, 780], [1778, 840], [1700, 950], [1600, 960], [1546, 1064], [1446, 1066], [1396, 1000], [1396, 913], [1460, 860], [1560, 798]]),
 'knee':   dict(kind='m', j='knee', n=2, front=[[344, 918], [394, 918], [394, 1014], [344, 1014]], side=circ(1560, 975, 48)),
 'shin':   dict(kind='m', j='knee', n=4,
                front=[[238, 938], [420, 938], [422, 1147], [238, 1147]],
                side=[[1600, 953], [1680, 943], [1732, 984], [1772, 1040], [1746, 1082], [1700, 1107], [1600, 1092], [1556, 1062], [1556, 1020], [1585, 1000]]),
 'hockcap': dict(kind='m', j='hock', n=4, front=[[250, 1031], [424, 1031], [424, 1225], [250, 1225]],
                side=[[1688, 1038], [1760, 1033], [1810, 1074], [1812, 1176], [1776, 1200], [1734, 1197], [1683, 1112]]),
 'meta':   dict(kind='m', j='hock', n=4, front=[[254, 1098], [346, 1098], [352, 1242], [254, 1242]],
                side=[[1580, 1076], [1660, 1088], [1705, 1098], [1740, 1150], [1705, 1205], [1640, 1236], [1563, 1242], [1546, 1190], [1546, 1108]]),
 'ankcap': dict(kind='m', j='ankle', n=4,
                front=[[236, 1146], [368, 1146], [376, 1200], [368, 1256], [236, 1256], [228, 1200]],
                side=[[1443, 1185], [1480, 1150], [1550, 1148], [1594, 1195], [1592, 1252], [1460, 1254], [1440, 1220]]),
 'ankle':  dict(kind='m', j='ankle', n=2, front=[[255, 1218], [345, 1218], [345, 1314], [255, 1314]], side=circ(1605, 1265, 46)),
 'foot':   dict(kind='m', j='ankle', n=5, front=[[194, 1158], [380, 1158], [380, 1382], [194, 1382]],
                side=[[1505, 1250], [1600, 1250], [1700, 1198], [1782, 1208], [1792, 1240], [1702, 1300], [1702, 1382], [1505, 1382]]),
 'toe0':   dict(kind='m', j='ankle', n=4, front=[[128, 1220], [244, 1220], [244, 1382], [126, 1382]], side=FRONT_TOES_SIDE),
 'toe1':   dict(kind='m', j='ankle', n=4, front=[[249, 1210], [350, 1210], [352, 1382], [249, 1382]], side=FRONT_TOES_SIDE),
 'toe2':   dict(kind='m', j='ankle', n=4, front=[[356, 1216], [456, 1216], [458, 1382], [356, 1382]], side=FRONT_TOES_SIDE),
 'heel0':  dict(kind='m', j='ankle', n=4, rear=[[2855, 1230], [2970, 1230], [2972, 1382], [2855, 1382]], side=REAR_TOE_SIDE),
 'heel1':  dict(kind='m', j='ankle', n=4, rear=[[2741, 1228], [2849, 1228], [2851, 1382], [2739, 1382]], side=REAR_TOE_SIDE),
 'heel2':  dict(kind='m', j='ankle', n=4, rear=[[2650, 1233], [2736, 1233], [2738, 1382], [2648, 1382]], side=REAR_TOE_SIDE),
}
for _i, (_u, _v) in enumerate(BARRELS):
    P['barrel_a%d' % _i] = dict(kind='one', j='arm_L', n=2.5, k=.012, front=ell(_u, _v), side=BARREL_SIDE)
    P['barrel_b%d' % _i] = dict(kind='one', j='arm_L', n=2.5, k=.012, front=ell(_u + 142, _v), side=BARREL_SIDE)

# joints: side (u, v) and front u (the mech's right member of a pair); every joint rests at zero rotation
SK = [dict(name='fgunner'),
      dict(name='hips', parent='fgunner', side=[1700, 800], front=520),
      dict(name='torso', parent='fgunner', side=[1680, 740], front=520),
      dict(name='thigh', parent='hips', side=[1712, 812], front=330, mirror=True),
      dict(name='knee', parent='thigh', side=[1560, 975], front=315, mirror=True),
      dict(name='hock', parent='knee', side=[1745, 1115], front=305, mirror=True),
      dict(name='ankle', parent='hock', side=[1605, 1265], front=300, mirror=True),
      dict(name='arm', parent='torso', side=[1680, 585], front=290, mirror=True),
      dict(name='muzzle_R', parent='arm_R', side=[1118, 600], front=198),          # the cannon's bore
      dict(name='muzzle_L', parent='arm_L', side=[1118, 600], front=821)]          # between the two rotary guns (each +-0.28 m across)

J = {'format': 'v2.1', 'views': 'fgunner_views.json', 'S': 2, 'target': 950000, 'lo_target': 7200,
     'skeleton': SK, 'mounts': [], 'parts': P}
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parts.json')
json.dump(J, open(out, 'w'), indent=0)
print(len(P), 'parts ->', out)
