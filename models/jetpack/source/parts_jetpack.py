"""JP-2 jet pack: every part traced on jetpack_sheet.png (made by make_views_s2.py from B07-B09 at their own 500 px per
metre; the side picture B08 shows the pack's RIGHT side, so it is flipped to face left for tracing and printed as the right
side: --flip side --sideR). Writes parts.json (format v2.1).
Sheet pixels: front box 0-908 (cu 454; the docking face), side 908-1516 (cu 1212; front = the docking face, at the left),
rear 1516-2424 (cu 1970; the nozzle face), ground row 954. +x = the pack's right (the Wraith's right), +y = forward (toward the
Wraith's back), z up. kind: c = centre part (one piece per row, made symmetric), m = mirrored pair (traced on the pack's
right: image left in the front view, image right in the rear view). round: slices are ellipses (2) or rounded boxes (3-4).
Edges were checked against the measured outline, row by row."""
import json, sys, math

NC, NR = 2141, 129          # main nozzles in the back view: centres 171 px either side of the middle, 257 px across
P = {
 # the docking plate that bolts to the Wraith's back dock. The side view shows it from row 165 to 672; the front view draws
 # its frame from 272, with dark gunmetal above it, so the plate is taken from 190 (it matches both pictures).
 'plate':  dict(kind='c', j='root', n=5, k=.01,
                front=[[213, 190], [697, 190], [697, 676], [213, 676]], side=[[956, 165], [1030, 165], [1030, 672], [956, 672]]),
 # the main body: the lower orange plates, the bottom frame, the slanted outer armour at the back
 'core':   dict(kind='c', j='root', n=4, k=.014,
                front=[[102, 296], [808, 296], [808, 842], [764, 916], [146, 916], [102, 842]],
                side=[[1028, 148], [1272, 148], [1474, 330], [1474, 640], [1404, 636], [1300, 690], [1262, 722], [1262, 882],
                      [1104, 876], [1054, 750], [1048, 676], [1028, 672]]),
 # the armour caps at the top corners (orange blocks with the fuel tanks along their sides)
 'cap':    dict(kind='m', j='root', n=4, k=.012,
                front=[[98, 124], [250, 124], [250, 342], [98, 342]], side=[[1026, 144], [1276, 144], [1300, 240], [1300, 342], [1026, 342]]),
 # the empty drone cradle on top: the tray, and its two posts
 'tray':   dict(kind='c', j='root', n=5, k=.008,
                front=[[236, 108], [672, 108], [672, 304], [236, 304]],
                side=[[1006, 70], [1106, 70], [1106, 80], [1260, 104], [1284, 112], [1332, 150], [1332, 198], [1006, 198]]),
 'post':   dict(kind='m', j='root', n=5, k=.006,
                front=[[272, 50], [349, 50], [349, 112], [238, 112], [238, 94], [272, 94]], side=[[1030, 50], [1110, 50], [1110, 118], [1030, 118]]),
 # the steering jets on each side (amber jets front, back and out). The front view draws them from row 336 to 608, the
 # side view from 326 to 578: the front wins for heights (remap).
 'jet':    dict(kind='m', j='root', n=4, k=.01, remap=True,
                front=[[50, 336], [168, 336], [168, 608], [50, 608]], side=[[1048, 326], [1252, 326], [1252, 578], [1048, 578]]),
 # the two main thrust nozzles, angled down and back, on their gimbals
 'bell':   dict(kind='m', j='nozzle', round=2, k=.006, remap=True,
                rear=[[NC - NR, 618], [NC + NR, 618], [NC + NR, 958], [NC - NR, 958]],
                side=[[1262, 724], [1300, 692], [1404, 634], [1482, 634], [1482, 964], [1262, 964]]),
}

# thrust direction: the nozzle mouth faces down and back. In the side view its rim runs from (1461, 780) to (1321, 951);
# the mouth faces along the normal to that line, away from the pack (sheet u to the right = -y, rows down = -z)
rx, rz = 1321 - 1461, 951 - 780; L = math.hypot(rx, rz)
dy, dz = round(-abs(rz) / L, 4), round(-abs(rx) / L, 4)
skeleton = [
 {'name': 'root'},
 {'name': 'nozzle', 'parent': 'root', 'side': [1330, 672], 'front': 454 - 171, 'mirror': True},   # nozzle_R / nozzle_L gimbals
]
I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
mounts = [
 # the docking face: bolts to the Wraith's bk (turned the same way: +y forward into the Wraith's back, +z up)
 {'name': 'mount', 'parent': 'root', 'side': [956, 418], 'front': 454, 'axes': I3},
 # where the assist drone sits when docked (on the cradle's tray, facing forward like the Wraith)
 {'name': 'drone_dock', 'parent': 'root', 'side': [1150, 108], 'front': 454, 'axes': I3},
 # where the thrust comes out of each nozzle: +y points along the exhaust
 {'name': 'exhaust', 'parent': 'nozzle', 'side': [1392, 872], 'front': 454 - 171, 'mirror': True,
  'axes': [[1, 0, 0], [0, dy, dz], [0, -dz, dy]]},
]
J = {'format': 'v2.1', 'views': 'jetpack_views.json', 'S': 2, 'target': 100000, 'lo_target': 1850,
     'h_full': .007, 'h_lo': .016, 'h_block': .012, 'skeleton': skeleton, 'mounts': mounts, 'parts': P}
json.dump(J, open(sys.argv[1] if len(sys.argv) > 1 else 'parts.json', 'w'), indent=0)
print(len(P), 'parts; exhaust direction y %.2f z %.2f' % (dy, dz))
