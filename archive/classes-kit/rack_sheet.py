"""Lay the module renders out on one labelled sheet (all at the same scale, so sizes compare truly).
usage: python3 -I rack_sheet.py renders_dir out.png"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
ROWS = [('FOREARM WEAPONS', ['FA-01', 'FA-02', 'FA-03', 'FA-04', 'FA-05', 'FA-06']),
        ('FOREARM SPECIALISTS + DEFENCE + SUPPORT', ['FA-07', 'FA-08', 'DF-01', 'UT-01', 'UT-02', 'UT-03']),
        ('SHOULDER MODULES', ['SH-01', 'SH-02', 'SH-03', 'SH-04', 'SH-05', 'SH-06']),
        ('BACK MODULES', ['BK-01', 'BK-02', 'BK-03', 'BK-04', 'BK-05', 'BK-06'])]
NAMES = {'FA-01': 'Needle', 'FA-02': 'Fang', 'FA-03': 'Ripper', 'FA-04': 'Mauler', 'FA-05': 'Lance', 'FA-06': 'Arc', 'FA-07': 'Talon',
         'FA-08': 'Furnace', 'SH-01': 'Hive-6', 'SH-02': 'Hammer', 'SH-03': 'Storm-12', 'SH-04': 'Longtooth', 'SH-05': 'Sentry',
         'SH-06': 'Watcher', 'BK-01': 'Dash', 'BK-02': 'Howler', 'BK-03': 'Thunderspine', 'BK-04': 'Swarm', 'BK-05': 'Veil',
         'BK-06': 'Glacier', 'DF-01': 'Bulwark', 'UT-01': 'Ghost', 'UT-02': 'Mender', 'UT-03': 'Root'}
fb = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F1, F2, F3 = ImageFont.truetype(fb, 30), ImageFont.truetype(fb, 22), ImageFont.truetype(fb, 18)
C = 300; pad = 14; hh = 40
W = 6 * C + 7 * pad; H = 70 + len(ROWS) * (C + hh + 40) + 50
bg = (196, 196, 198)
can = Image.new('RGB', (W, H), bg); dr = ImageDraw.Draw(can)
dr.text((pad, 16), 'IRONHOWL 4  MODULES  -  BLOCKOUT (all at the same scale)', fill=(30, 30, 30), font=F1)
y = 70
for title, ids in ROWS:
    dr.rectangle([pad, y, W - pad, y + hh - 6], fill=(40, 40, 42)); dr.text((pad + 10, y + 6), title, fill=(255, 140, 30), font=F2)
    y += hh
    for i, mid in enumerate(ids):
        x = pad + i * (C + pad)
        dr.rectangle([x, y, x + C, y + C + 34], fill=(206, 206, 208))
        im = Image.open(os.path.join(d, 'mod_%s.png' % mid)).convert('RGBA').resize((C, C), Image.LANCZOS)
        can.paste(im, (x, y), im)
        dr.text((x + 8, y + C + 6), mid, fill=(200, 90, 0), font=F3); dr.text((x + 82, y + C + 6), NAMES[mid], fill=(30, 30, 30), font=F3)
    y += C + 40
dr.text((pad, H - 40), 'Grid cell = 3.6 m across.  Sizes are for the Howler; each chassis scales its mounts (Strider 0.85, Wraith 0.9, Bastion 1.35).', fill=(60, 60, 60), font=F3)
can.save(out); print(out, can.size)
