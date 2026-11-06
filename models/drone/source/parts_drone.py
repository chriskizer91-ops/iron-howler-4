"""DR-1 assist drone: every part traced on drone_sheet.png (made by make_views_s2.py from C01-C03 and a copy of C04 with
the fans moved back to where the side view has them, tools/shift_fans.py; all at their own 1000 px per metre).
Writes parts.json (format v2.1). Sheet pixels: front box 0-1154 (cu 577), side 1154-2108 (cu 1631; nose at the left),
rear 2108-3262 (cu 2685), top 3262-4416 (cu 3839, row 477 = y 0, nose at the top); ground row 477.
+x = the drone's right (image left in the front view), +y = forward (the nose and gun), z up.
kind: c = centre part (one piece per row, made symmetric), m = mirrored pair traced on the drone's right.
round: slices are ellipses (2). The whole top outline also trims every part (v2.1)."""
import json, sys

P = {
 # the body: armoured nose with the sensor eye, the DR-1 panels, the gunmetal back, the top light
 'hull':  dict(kind='c', j='root', n=4, k=.006,
               front=[[384, 24], [770, 24], [770, 360], [754, 416], [400, 416], [384, 360]],
               side=[[1170, 30], [2095, 30], [2095, 420], [1384, 420], [1384, 384], [1170, 384]]),
 # the ducted fans' armoured rings, one each side (the fan blades are printed on from the top view)
 'ring':  dict(kind='m', j='root', round=2, k=.005,
               front=[[14, 188], [393, 188], [393, 334], [14, 334]], side=[[1585, 190], [2090, 190], [2090, 334], [1585, 334]]),
 # the two amber fins on top at the back
 'fin':   dict(kind='m', j='root', n=4, k=.004,
               front=[[402, 36], [468, 36], [468, 132], [402, 132]], side=[[1962, 38], [2052, 38], [2052, 182], [1962, 182]]),
 # the small gun pod under the nose, extended, with twin barrels
 'gunpod': dict(kind='c', j='gun', n=4, k=.004,
               front=[[516, 330], [642, 330], [642, 420], [516, 420]], side=[[1176, 384], [1386, 384], [1386, 452], [1176, 452]]),
 # the repair arm, folded under the body
 'repair': dict(kind='c', j='arm', n=4, k=.004,
               front=[[525, 414], [629, 414], [629, 482], [525, 482]], side=[[1436, 418], [1702, 418], [1702, 482], [1436, 482]]),
}

skeleton = [
 {'name': 'root'},
 {'name': 'fan', 'parent': 'root', 'side': [1831, 262], 'front': 577 - 367, 'mirror': True},   # fan_R / fan_L: the fan centres (spin axis z)
 {'name': 'gun', 'parent': 'root', 'side': [1386, 418], 'front': 577},                        # the gun pod (aims: yaw z, pitch x)
 {'name': 'arm', 'parent': 'root', 'side': [1450, 452], 'front': 577},                        # the repair arm (unfolds: x axis)
]
I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
mounts = [
 {'name': 'mount', 'parent': 'root', 'side': [1541, 477], 'front': 577, 'axes': I3},    # sits on the jet pack's drone_dock (bottom of the drone)
 {'name': 'muzzle', 'parent': 'gun', 'side': [1180, 418], 'front': 577, 'axes': I3},    # where its small rounds leave (+y)
 {'name': 'eye', 'parent': 'root', 'side': [1180, 250], 'front': 577, 'axes': I3},      # the amber sensor eye: target marking (+y)
]
J = {'format': 'v2.1', 'views': 'drone_views.json', 'S': 2, 'target': 70000, 'lo_target': 1700,
     'h_full': .004, 'h_lo': .01, 'h_block': .007, 'skeleton': skeleton, 'mounts': mounts, 'parts': P}
json.dump(J, open(sys.argv[1] if len(sys.argv) > 1 else 'parts.json', 'w'), indent=0)
print(len(P), 'parts')
