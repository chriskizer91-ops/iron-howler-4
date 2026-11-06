"""FORGE Hound (Ironhowl 4, session 4): every part traced on fhound_sheet.png (made by make_views.py from E01-E03).
Sheet pixel coordinates (u = column, v = row). 300 px per metre; the Hound is 2.4 m tall at the horn tips.
front / rear: the part's outline in the front or rear view (width and height); side: in the side view (the Hound's left
side, nose to the LEFT) for depth. The front view only shows the head, chest, shoulders and front legs; the hind legs,
hips and tail are traced in the rear view.
kind: c = centre part (made symmetric), m = mirrored pair, traced on the Hound's RIGHT side, which is the image LEFT in
the front view and the image RIGHT in the rear view.
n: roundness (2 round ... 6 boxy). nomask: may rise above the front view's outline (the spines, hidden there).
Writes parts.json."""
import json, math, sys

def circ(cx, cy, r, k=16):
    return [[round(cx + r * math.cos(2 * math.pi * i / k), 1), round(cy + r * math.sin(2 * math.pi * i / k), 1)] for i in range(k)]

def box(u0, v0, u1, v1):
    return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]

def blade(v0, v1, w0=24, w1=6, cu=253):
    """a thin centre blade in the front view: w0 px wide at its base (v0), w1 at its tip (v1)"""
    return [[cu - w0 / 2, v0], [cu + w0 / 2, v0], [cu + w1 / 2, v1], [cu - w1 / 2, v1]]

P = {
 # ---- head (head joint; the jaw has its own)
 'nose':   dict(kind='c', j='head', n=4, front=[[221, 230], [285, 230], [287, 336], [219, 336]],          # the narrow tip of the snout
                side=[[548, 290], [560, 279], [600, 258], [604, 258], [604, 335], [560, 336], [548, 312]]),
 'snout':  dict(kind='c', j='head', n=4, front=[[200, 160], [306, 160], [310, 250], [302, 336], [204, 336], [196, 250]],
                side=[[598, 262], [605, 255], [650, 217], [690, 180], [712, 162], [712, 334], [598, 335]]),
 'skull':  dict(kind='c', j='head', n=4, front=[[195, 138], [311, 138], [352, 175], [352, 300], [300, 318], [206, 318], [152, 300], [152, 175]],
                side=[[690, 178], [712, 160], [745, 150], [790, 150], [802, 172], [800, 272], [772, 300], [722, 318], [690, 320]]),
 'jaw':    dict(kind='c', j='jaw', n=4, front=[[221, 284], [285, 284], [292, 362], [214, 362]],
                side=[[553, 330], [692, 328], [716, 306], [724, 320], [702, 346], [640, 356], [572, 361], [558, 350]]),
 'horn':   dict(kind='m', j='head', n=3, front=[[176, 45], [192, 44], [202, 80], [212, 120], [225, 160], [225, 186], [196, 186], [172, 140], [168, 90]],
                side=[[737, 182], [755, 140], [774, 107], [830, 75], [885, 44], [889, 48], [840, 90], [812, 117], [800, 150], [790, 184]]),
 # ---- body (body joint): neck, torso, spines, shoulder and hip housings
 'neck':   dict(kind='c', j='body', n=4, front=[[180, 150], [326, 150], [326, 422], [180, 422]],
                side=[[745, 176], [800, 158], [842, 154], [846, 420], [800, 410], [760, 352], [745, 300]]),
 'torso':  dict(kind='c', j='body', n=4, front=[[152, 150], [354, 150], [354, 420], [330, 455], [290, 468], [216, 468], [176, 455], [152, 420]],
                side=[[820, 160], [1000, 150], [1060, 157], [1100, 171], [1200, 188], [1300, 203], [1440, 214], [1465, 250], [1468, 350],
                      [1440, 440], [1400, 470], [1330, 470], [1282, 412], [1232, 390], [1140, 425], [1030, 466], [900, 472], [850, 470], [808, 450], [790, 400], [795, 300]]),
 'spine1': dict(kind='c', j='body', n=3, nomask=True, front=blade(170, 104), side=[[925, 158], [955, 122], [985, 110], [1021, 106], [990, 126], [992, 165]]),
 'spine2': dict(kind='c', j='body', n=3, nomask=True, front=blade(168, 112), side=[[1020, 164], [1050, 130], [1080, 118], [1115, 114], [1087, 132], [1086, 166]]),
 'spine3': dict(kind='c', j='body', n=3, nomask=True, front=blade(186, 131), side=[[1108, 184], [1135, 147], [1162, 137], [1196, 133], [1170, 147], [1173, 186]]),
 'spine4': dict(kind='c', j='body', n=3, nomask=True, front=blade(204, 156), side=[[1183, 204], [1210, 170], [1235, 162], [1263, 158], [1240, 171], [1241, 206]]),
 'shoulder': dict(kind='m', j='body', n=3, front=[[90, 218], [152, 184], [152, 408], [95, 408], [70, 380], [50, 340], [50, 270], [70, 248]],
                side=[[860, 250], [900, 225], [940, 208], [990, 212], [1006, 260], [1006, 370], [985, 400], [940, 410], [890, 402], [850, 375], [835, 320]]),
 'hip':    dict(kind='m', j='body', n=3, rear=[[2298, 178], [2328, 178], [2342, 212], [2368, 212], [2388, 240], [2392, 300], [2390, 352], [2382, 395], [2388, 490], [2298, 490]],     # inside the gear emblem's teeth on the outer edge
                side=[[1290, 185], [1345, 175], [1400, 185], [1445, 210], [1470, 245], [1475, 330], [1460, 375], [1430, 410], [1390, 440],
                      [1360, 486], [1330, 482], [1280, 430], [1268, 380], [1268, 260]]),
 'throat': dict(kind='c', j='body', n=4, front=box(205, 300, 301, 410),
                side=[[705, 320], [760, 300], [800, 330], [806, 402], [760, 396], [716, 362]]),
 'rump':   dict(kind='c', j='body', n=4, rear=[[2098, 182], [2300, 182], [2300, 420], [2275, 460], [2235, 478], [2165, 478], [2125, 460], [2098, 420]],
                side=[[1280, 203], [1440, 214], [1465, 250], [1468, 350], [1440, 440], [1400, 478], [1330, 478], [1282, 412]]),
 # ---- front legs (traced in the front view; image left = the Hound's right)
 'upperF': dict(kind='m', j='legF', n=4, front=box(70, 318, 150, 532),
                side=[[885, 330], [945, 320], [975, 380], [992, 470], [990, 505], [960, 530], [885, 528], [878, 480], [882, 420]]),
 'elbowF': dict(kind='m', j='kneeF', n=2.5, front=[[58, 450], [168, 450], [172, 490], [168, 540], [58, 540], [54, 490]], side=circ(965, 502, 33)),
 'foreF':  dict(kind='m', j='kneeF', n=4, front=box(68, 525, 156, 690),
                side=[[897, 515], [960, 525], [985, 540], [975, 590], [952, 645], [935, 668], [900, 672], [850, 660], [858, 620], [880, 575]]),
 'wristF': dict(kind='m', j='hockF', n=2.5, front=box(66, 655, 170, 714), side=circ(927, 685, 24)),
 'pawF':   dict(kind='m', j='pawF', n=3.5, front=[[50, 678], [186, 678], [189, 766], [45, 766]],
                side=[[762, 765], [772, 735], [798, 712], [806, 692], [832, 684], [880, 682], [908, 686], [946, 698], [950, 765]]),
 # ---- hind legs (traced in the rear view; image right = the Hound's right)
 'thighB': dict(kind='m', j='legB', n=4, rear=box(2295, 385, 2385, 545),
                side=[[1360, 430], [1430, 392], [1465, 420], [1490, 450], [1498, 478], [1530, 510], [1500, 540], [1445, 542], [1400, 517], [1360, 492]]),
 'kneeB':  dict(kind='m', j='kneeB', n=2.5, rear=[[2285, 440], [2392, 440], [2396, 478], [2392, 540], [2285, 540], [2282, 478]], side=circ(1512, 505, 30)),
 'shinB':  dict(kind='m', j='kneeB', n=4, rear=box(2297, 500, 2383, 686),
                side=[[1445, 535], [1520, 532], [1533, 555], [1512, 640], [1500, 672], [1412, 664], [1425, 635], [1440, 595]]),
 'hockB':  dict(kind='m', j='hockB', n=2.5, rear=box(2290, 660, 2390, 712), side=circ(1490, 687, 24)),
 'pawB':   dict(kind='m', j='pawB', n=3.5, rear=box(2273, 678, 2408, 766),
                side=[[1329, 765], [1345, 730], [1365, 705], [1372, 680], [1400, 676], [1440, 680], [1480, 698], [1505, 725], [1509, 765]]),
 # ---- tail (a chain tail0..4; the bands are wider than the core between them; traced in the rear view at the side's heights)
 'tailcore0': dict(kind='c', j='tail0', n=6, rear=box(2162, 240, 2236, 335), side=box(1440, 240, 1500, 335)),
 'tailband1': dict(kind='c', j='tail1', n=6, rear=box(2160, 242, 2238, 332), side=box(1497, 242, 1553, 332)),
 'tailcore1': dict(kind='c', j='tail1', n=4, rear=box(2172, 257, 2226, 320), side=box(1550, 257, 1580, 320)),
 'tailband2': dict(kind='c', j='tail2', n=6, rear=box(2162, 250, 2236, 327), side=box(1577, 250, 1631, 327)),
 'tailcore2': dict(kind='c', j='tail2', n=4, rear=box(2174, 262, 2224, 317), side=box(1628, 262, 1655, 317)),
 'tailband3': dict(kind='c', j='tail3', n=6, rear=box(2164, 256, 2234, 322), side=box(1652, 256, 1701, 322)),
 'tailcore3': dict(kind='c', j='tail3', n=4, rear=box(2176, 266, 2222, 316), side=box(1698, 266, 1740, 316)),
 'spear':  dict(kind='c', j='tail4', n=6, rear=[[2199, 244], [2239, 293], [2199, 343], [2159, 293]],
                side=[[1731, 265], [1760, 244], [1790, 250], [1840, 262], [1870, 274], [1904, 285], [1870, 297], [1840, 311], [1790, 331], [1760, 343], [1734, 320]]),
}

FU = 253       # the front view's centre column (x = 0)
SK = [dict(name='fhound'),
      dict(name='body', parent='fhound', side=[1100, 300], front=FU),
      dict(name='head', parent='body', side=[780, 240], front=FU),
      dict(name='jaw', parent='head', side=[705, 312], front=FU),
      # front legs: shoulder, elbow, wrist, toes (the front-view column of the Hound's right front leg)
      dict(name='legF', parent='body', side=[920, 320], front=111, mirror=True),
      dict(name='kneeF', parent='legF', side=[965, 502], front=111, mirror=True),
      dict(name='hockF', parent='kneeF', side=[927, 685], front=111, mirror=True),
      dict(name='pawF', parent='hockF', side=[900, 715], front=111, mirror=True),
      # hind legs: hip, knee, hock, toes (rear-view column 2340 = 0.47 m to the right = front-view column 112)
      dict(name='legB', parent='body', side=[1387, 312], front=112, mirror=True),
      dict(name='kneeB', parent='legB', side=[1512, 505], front=112, mirror=True),
      dict(name='hockB', parent='kneeB', side=[1490, 687], front=112, mirror=True),
      dict(name='pawB', parent='hockB', side=[1430, 712], front=112, mirror=True),
      dict(name='tail0', parent='body', side=[1445, 290], front=FU),
      dict(name='tail1', parent='tail0', side=[1500, 290], front=FU),
      dict(name='tail2', parent='tail1', side=[1578, 290], front=FU),
      dict(name='tail3', parent='tail2', side=[1653, 290], front=FU),
      dict(name='tail4', parent='tail3', side=[1712, 291], front=FU)]

J = dict(format='v2.1', views='fhound_views.json', S=2, target=900000, lo_target=7200, skeleton=SK, mounts=[], parts=P)
json.dump(J, open(sys.argv[1] if len(sys.argv) > 1 else 'parts.json', 'w'), indent=0)
print(len(P), 'parts')
