"""WT-1 Watcher sensor pod: every part traced on watcher_sheet.png (made by make_views_s2.py from B04-B06 at their own
850 px per metre). Writes parts.json (format v2.1). Sheet pixels: front box 0-782 (cu 391), side 782-1649 (cu 1215.5),
rear 1649-2431 (cu 2040), ground row 901. +x = the pod's right (image left in the front view), +y = forward (the lenses).
kind: c = centre part (made symmetric), one = a single part where it is traced (the lenses and the antenna, which the sheet
draws on one side only). j = the joint it turns with. round: slices are ellipses (2) or rounded boxes (3-4)."""
import json, sys

P = {
 # swivel base (stays on the shoulder socket) and the turning neck
 'base':    dict(kind='c', j='root', round=4, k=.006,
                 front=[[132, 804], [625, 804], [625, 906], [132, 906]], side=[[922, 808], [1384, 808], [1384, 906], [922, 906]]),
 'neck':    dict(kind='c', j='swivel', round=3, k=.005,
                 front=[[180, 740], [602, 740], [602, 812], [180, 812]], side=[[988, 740], [1312, 740], [1312, 814], [988, 814]]),
 # the armoured head: an orange shell, rounded in every direction
 'shell':   dict(kind='c', j='swivel', round=4, k=.01,
                 front=[[40, 440], [100, 372], [150, 331], [596, 331], [642, 368], [702, 398], [746, 440], [746, 702], [690, 756], [90, 756], [40, 702]],
                 side=[[876, 326], [1452, 326], [1452, 770], [876, 770]]),
 # the dark sensor block on the back (vents, amber lights), narrower than the shell and standing out behind it
 'back':    dict(kind='c', j='swivel', n=4, k=.01,
                 rear=[[1852, 372], [2228, 372], [2228, 712], [1852, 712]], side=[[1428, 376], [1610, 376], [1610, 722], [1428, 722]]),
 # the lens housings on the front face: the big lens (the pod's right) and the two small ones (its left)
 'lens':    dict(kind='one', j='swivel', n=3, k=.008,
                 front=[[198, 400], [376, 400], [442, 466], [442, 652], [376, 718], [198, 718], [118, 652], [118, 466]],
                 side=[[826, 420], [910, 420], [910, 684], [826, 684]]),
 'lens2':   dict(kind='one', j='swivel', n=4, k=.008,
                 front=[[440, 426], [580, 426], [580, 694], [440, 694]], side=[[826, 420], [910, 420], [910, 684], [826, 684]]),
 # the radar dish on its pivot bracket (it tilts on the 'dish' joint). The pictures draw it a little to the pod's right of the
 # centre line (front 2.5 cm, back 0.8 cm), so it is built where the front view draws it ('one'). The front view also draws
 # it about 3 cm higher than the side view: the front wins for heights (remap).
 'mast':    dict(kind='one', j='swivel', n=4, k=.006,
                 front=[[250, 278], [476, 278], [476, 348], [250, 348]], side=[[1086, 230], [1234, 230], [1254, 346], [1066, 346]]),
 'radar':   dict(kind='one', j='dish', n=5, k=.004, remap=True,
                 front=[[146, 138], [204, 72], [538, 72], [594, 138], [594, 212], [538, 278], [204, 278], [146, 212]],
                 side=[[986, 282], [1290, 92], [1318, 100], [1318, 152], [1012, 308], [986, 300]]),
 # the strut that holds the dish's tilt, from the pivot back to the top of the head
 'strut':   dict(kind='one', j='dish', n=4, k=.004,
                 front=[[366, 228], [416, 228], [416, 346], [366, 346]], side=[[1214, 236], [1242, 234], [1314, 298], [1314, 332], [1288, 332], [1214, 272]]),
 # the antenna on the pod's left: a glowing tube on a gunmetal base
 'antenna': dict(kind='one', j='swivel', round=2, k=.004,
                 front=[[630, 46], [688, 46], [688, 272], [630, 272]], side=[[1492, 46], [1576, 46], [1576, 272], [1492, 272]]),
 'antbase': dict(kind='one', j='swivel', round=2.5, k=.006,
                 front=[[616, 260], [704, 260], [704, 434], [616, 434]], side=[[1488, 260], [1610, 260], [1610, 448], [1488, 448]]),
}

skeleton = [
 {'name': 'root'},
 {'name': 'swivel', 'parent': 'root', 'side': [1153, 808], 'front': 391},       # yaw: the head turns on its base
 {'name': 'dish', 'parent': 'swivel', 'side': [1162, 270], 'front': 391},       # the radar dish tilts (x axis) or spins
]
I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
mounts = [
 {'name': 'mount', 'parent': 'root', 'side': [1153, 901], 'front': 391, 'axes': I3},   # sits on the Wraith's sh_L / sh_R
 {'name': 'eye', 'parent': 'swivel', 'side': [826, 560], 'front': 280, 'axes': I3},    # the big lens: where target-marking beams start (+y)
]
J = {'format': 'v2.1', 'views': 'watcher_views.json', 'S': 2, 'target': 80000, 'lo_target': 1800,
     'h_full': .005, 'h_lo': .011, 'h_block': .009, 'skeleton': skeleton, 'mounts': mounts, 'parts': P}
json.dump(J, open(sys.argv[1] if len(sys.argv) > 1 else 'parts.json', 'w'), indent=0)
print(len(P), 'parts')
