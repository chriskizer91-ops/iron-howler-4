"""One board per scheme: the Wraith, its kit and the FORGE machines, each in its most telling view."""
import os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from recolor import recolor
R = '/home/claude/iron-howler-4'; A = R + '/art/kit-and-foes/'; OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ITEMS = [('WRAITH', R + '/models/wraith-v2-hd/source/sharper-pictures/hd_front.png', 0),
 ('AUTOCANNON', A + 'A_wraith_forearm/A02_autocannon_side.png', 0), ('LANCE', A + 'A_wraith_forearm/A05_lance_side.png', 0),
 ('ARC', A + 'A_wraith_forearm/A08_arc_side.png', 0), ('MISSILE POD', A + 'B_wraith_shoulder_back/B01_missilepod_front.png', 0),
 ('WATCHER', A + 'B_wraith_shoulder_back/B04_watcher_front.png', 0), ('JET PACK', A + 'B_wraith_shoulder_back/B09_jetpack_back.png', 0),
 ('DRONE', A + 'C_drone/C04_drone_top.png', 0), ('GUNNER', A + 'D_gunner/D01_gunner_front.png', 1),
 ('HOUND', A + 'E_hound/E02_hound_side.png', 1), ('SKITTER', A + 'F_skitter/F01_skitter_front.png', 1),
 ('SPAWNER POD', A + 'F_skitter/F05_spawnerpod_front.png', 1)]
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 44)
def crop(img):
    a = np.asarray(img.convert('RGB')).astype(int); d = np.abs(a - [200, 200, 202]).sum(2) > 24
    ys, xs = np.nonzero(d); m = 20
    return img.crop((max(xs.min() - m, 0), max(ys.min() - m, 0), min(xs.max() + m, img.width), min(ys.max() + m, img.height)))
def cell(img, W, H):
    img = crop(img); s = min(W / img.width, H / img.height); img = img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS)
    c = Image.new('RGB', (W, H), (200, 200, 203)); c.paste(img, ((W - img.width) // 2, (H - img.height) // 2)); return c
W, H, LAB, TOP = 540, 430, 40, 70
for liv in (sys.argv[2:] or ['original', 'survey', 'ranger', 'cobalt']):
    b = Image.new('RGB', (2 * W, TOP + 6 * (H + LAB)), (200, 200, 203)); d = ImageDraw.Draw(b)
    d.rectangle((0, 0, 2 * W, TOP - 8), fill=(34, 34, 38)); d.text((20, 10), {'original': 'FRONT LINES (TODAY)'}.get(liv, liv.upper()), font=fb, fill=(245, 245, 245))
    for i, (name, p, foe) in enumerate(ITEMS):
        if liv == 'original': img = Image.open(p).convert('RGB')
        else:
            tmp = '/tmp/_rc.png'; recolor(p, liv, tmp, foe=bool(foe)); img = Image.open(tmp).convert('RGB')
        x, y = (i % 2) * W, TOP + (i // 2) * (H + LAB)
        b.paste(cell(img, W - 20, H), (x + 10, y + LAB)); d.text((x + 16, y + 6), name, font=f, fill=(30, 30, 32))
    b.save(f'{OUT}/board_{liv}.jpg', quality=86); print('board', liv)
