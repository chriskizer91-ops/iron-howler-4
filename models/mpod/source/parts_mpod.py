"""MP-9 missile pod: every part traced on mpod_sheet.png (made by pipeline/make_views.py from B01-B03 at their own
680 px per metre). Writes parts.json (format v2.1). Sheet pixels: front box 0-768 (cu 384), side 768-1740 (cu 1254),
rear 1740-2508 (cu 2124), ground row 792. +x = the pod's right (image left in the front view), +y = forward (launch face).
kind: c = centre part (made symmetric), m = mirrored pair traced on the pod's right. j = the joint it turns with.
round: slices are ellipses (2) or rounded boxes (3-4). plan: top-down outline in metres (for the open doors)."""
import json, sys

ppm = 680.0
def X(u): return round((384 - u) / ppm, 4)          # front-view column -> x (m)
def Y(u): return round((1254 - u) / ppm, 4)         # side-view column -> y (m)

# the open doors: each swings forward and out about a hinge at the corner of the launch face (about 120 degrees open)
HINGE = (X(184), Y(1000))                           # (0.294, 0.374)
DOOR_PLAN = [[0.268, 0.338], [0.462, 0.676], [0.522, 0.642], [0.328, 0.304]]   # inner face, free edge, outer face (t = 6.5 cm)

P = {
 # swivel base (stays on the shoulder socket) and the turning neck
 'base':  dict(kind='c', j='root', round=2, k=.006,
               front=[[200, 696], [566, 696], [566, 800], [200, 800]], side=[[1095, 698], [1452, 698], [1452, 800], [1095, 800]]),
 'neck':  dict(kind='c', j='swivel', round=2, k=.005,
               front=[[244, 652], [524, 652], [524, 709], [244, 709]], side=[[1124, 652], [1426, 652], [1426, 709], [1124, 709]]),
 # the armoured box, traced on the rear view (the open doors hide its sides in the front view)
 'body':  dict(kind='c', j='swivel', n=4, k=.012,
               rear=[[1874, 124], [2374, 124], [2415, 182], [2415, 562], [2352, 650], [1896, 650], [1833, 562], [1833, 182]],
               side=[[1012, 128], [1100, 122], [1100, 28], [1712, 28], [1712, 600], [1602, 674], [1090, 674], [1046, 600], [1046, 216], [1012, 200]]),
 # the raised top: two armoured caps at the back corners and the gunmetal spine between them. The front and back views
 # disagree on the caps' width (front +-0.27 m, back +-0.35 m): the front view wins for widths.
 'top':   dict(kind='c', j='swivel', n=4, k=.01,
               front=[[203, 38], [303, 38], [303, 50], [465, 50], [465, 38], [575, 38], [586, 150], [182, 150]],
               side=[[1012, 128], [1100, 116], [1100, 24], [1716, 24], [1716, 200], [1012, 200]]),
 # the launch face: the dark octagonal frame around the 3 x 3 tubes, standing proud of the armour
 'frame': dict(kind='c', j='swivel', n=5, k=.008, remap=True,
               front=[[228, 176], [540, 176], [584, 218], [584, 640], [550, 674], [218, 674], [184, 640], [184, 218]],
               side=[[1008, 168], [1078, 168], [1078, 676], [1008, 676]]),
 # the doors ('leaf_R' / 'leaf_L', on the joints door_R / door_L) and their hinges (the right door is traced; the left one is its mirror)
 'leaf':  dict(kind='m', j='door', n=5, k=.008, remap=True, plan=DOOR_PLAN,
               front=[[36, 136], [140, 132], [212, 182], [212, 668], [140, 704], [36, 704]],
               side=[[798, 128], [1014, 128], [1014, 712], [798, 712]]),
 'hinge': dict(kind='m', j='door', round=2, k=.004, remap=True,
               front=[[160, 196], [210, 196], [210, 646], [160, 646]], side=[[984, 196], [1016, 196], [1016, 646], [984, 646]]),
}

# joints (parent first): front = front-view column, side = [side-view column, row]
skeleton = [
 {'name': 'root'},
 {'name': 'swivel', 'parent': 'root', 'side': [1274, 668], 'front': 384},                       # yaw: the pod turns on its base
 {'name': 'door', 'parent': 'swivel', 'side': [1000, 420], 'front': 184, 'mirror': True},       # door_R / door_L hinges (z axis)
]
I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
mounts = [{'name': 'mount', 'parent': 'root', 'side': [1274, 792], 'front': 384, 'axes': I3}]    # sits on the Wraith's sh_L / sh_R
# the nine launch tubes (missiles leave along +y)
for r, v in enumerate((290, 412, 535)):
    for c, u in enumerate((285, 384, 483)):
        mounts.append({'name': 'tube%d' % (r * 3 + c), 'parent': 'swivel', 'side': [1010, v], 'front': u, 'axes': I3})

J = {'format': 'v2.1', 'views': 'mpod_views.json', 'S': 2, 'target': 90000, 'lo_target': 1800,
     'h_full': .005, 'h_lo': .012, 'h_block': .01, 'skeleton': skeleton, 'mounts': mounts, 'parts': P}
json.dump(J, open(sys.argv[1] if len(sys.argv) > 1 else 'parts.json', 'w'), indent=0)
print(len(P), 'parts; hinge at x %.3f y %.3f' % HINGE)
