"""FORGE spawner pod (Ironhowl 4, session 3): every part traced on spod_sheet.png (make_views.py from F05 front, F06 side, and
F06 again as the back, 346 px per metre, 2.6 m tall). Writes parts.json in the v2.1 format, built with tools/build_round.py.

The back: ChatGPT's character sheet F00 draws the pod's back like its side (a vent grille), so F06 is used for the back view.
The anchors, read from all three views: five posts in a ring - a front pair (30 degrees either side of the hatch), one on each
side (under the side grilles) and one at the back. From the front: the front pair, the side posts at the edges, the back post
seen under the ring between the front pair. From the side: the front pair (one behind the other), the side post in the middle,
the back post. Each anchor is kept square to the views (not turned to the ring).
Sheet: front view x 0-800 (centre u 400), side view x 800-1600 (centre u 1200, the pod's left side, front to the left),
back view x 1600-2400 (centre u 2000). Ground row 954. round: n -> built as superellipses (build_round.py)."""
import json, sys, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))

EGG_F = [[340, 48], [460, 48], [545, 140], [590, 190], [628, 260], [660, 330], [673, 370], [675, 650], [662, 700], [640, 760],
         [600, 792], [200, 792], [160, 760], [138, 700], [125, 650], [127, 370], [140, 330], [172, 260], [210, 190], [255, 140]]
EGG_S = [[1140, 48], [1260, 48], [1345, 140], [1395, 200], [1430, 270], [1455, 330], [1463, 380], [1463, 640], [1450, 700],
         [1420, 760], [1380, 796], [1020, 796], [980, 760], [950, 700], [937, 640], [937, 380], [945, 330], [970, 270], [1005, 200], [1055, 140]]

# the hatch: a plate on the front of the shell, its face on the shell's front edge in the side view (measured from the outline)
m = np.asarray(Image.open(os.path.join(HERE, 'spod_sheet_mask.png')).convert('L')) > 110
def front_edge(v):
    if v <= 676:
        return float(np.argmax(m[v, 800:1200]) + 800)
    a, b = (950, 700), (980, 760)                     # behind the front anchor: the egg outline as traced
    return a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1])
HR = list(range(322, 746, 12)) + [745]
HATCH_S = [[round(front_edge(v) - 6, 1), v] for v in HR] + [[round(front_edge(v) + 40, 1), v] for v in reversed(HR)]

def mirror_side(poly):                                  # the side view's back anchor mirrors its front anchor about u 1200
    return [[2400 - u, v] for u, v in reversed(poly)]
ANCH_FRONT_S = [[912, 680], [962, 680], [975, 700], [980, 740], [985, 880], [990, 954], [852, 954], [852, 885], [862, 860], [905, 705]]

P = {
 'shell':  dict(kind='c', j='spod', round=2, front=EGG_F, side=EGG_S),
 'ring':   dict(kind='c', j='spod', round=2, front=[[126, 766], [674, 766], [674, 864], [126, 864]],
                side=[[948, 774], [1452, 774], [1452, 888], [948, 888]]),
 'hatch':  dict(kind='c', j='hatch', round=2,           # curved with the shell, about 1 cm proud of it
                front=[[283, 322], [517, 322], [523, 340], [523, 700], [505, 744], [295, 744], [277, 700], [277, 340]],
                side=HATCH_S),
 'anchor_f': dict(kind='m', j='spod', n=5,
                front=[[222, 694], [277, 694], [290, 712], [298, 748], [298, 862], [312, 885], [312, 954], [178, 954], [178, 885], [204, 862], [204, 748], [212, 712]],
                side=ANCH_FRONT_S),
 'anchor_s': dict(kind='m', j='spod', n=5, zfrom='side',   # the front view draws these short (they stand further back)
               
                front=[[102, 686], [150, 686], [153, 865], [151, 934], [50, 934], [50, 868], [62, 850], [95, 720]],
                side=[[1166, 690], [1235, 690], [1248, 710], [1255, 750], [1258, 880], [1282, 890], [1282, 954], [1118, 954], [1118, 890], [1145, 880], [1148, 750], [1155, 710]]),
 'anchor_b': dict(kind='c', j='spod', n=5,
                rear=[[1966, 690], [2035, 690], [2048, 710], [2055, 750], [2058, 880], [2082, 890], [2082, 954], [1918, 954], [1918, 890], [1945, 880], [1948, 750], [1955, 710]],
                side=mirror_side(ANCH_FRONT_S)),
}
SK = [dict(name='spod'),
      dict(name='hatch', parent='spod', side=[round(front_edge(532), 1), 532], front=400),     # the hatch slides on this
      dict(name='spawn', parent='spod', side=[880, 954], front=400)]                              # where a new Skitter steps out, on the ground in front of the hatch
J = {'format': 'v2.1', 'views': 'spod_views.json', 'S': 2, 'target': 150000, 'lo_target': 1800, 'skeleton': SK, 'mounts': [], 'parts': P}
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'parts.json')
json.dump(J, open(out, 'w'), indent=0)
print(len(P), 'parts ->', out, ' hatch face at side u %.0f-%.0f' % (min(p[0] for p in HATCH_S), max(p[0] for p in HATCH_S[:len(HR)])))
