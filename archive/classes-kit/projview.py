"""Preview a painted combat model next to the pictures it was painted from: per view the picture, the model seen the
same way (texture only, no lighting), and a lit three-quarter view.
usage: python3 -I projview.py baked.blend albedo.png map.json picture.png out.png "title" [--nodecals]"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image, ImageDraw
import bpy
import sheetfit as SF

a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, alb, mapj, pic, out, title = a[:6]; NODEC = '--nodecals' in a
bpy.ops.wm.open_mainfile(filepath=blend)
if NODEC:
    for o in bpy.data.collections['LO'].objects:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0].name in ('decal', 'cdecal'): o.hide_render = True
SF.textured_materials(alb)
M = json.load(open(mapj))
PICS = dict(zip(SF.VIEWS, pic.split(','))) if ',' in pic else None          # one picture per view (guide pictures)
sheet = None if PICS else np.asarray(Image.open(pic).convert('RGB'))
tmp = os.path.join(os.path.dirname(os.path.abspath(out)), '_pv'); os.makedirs(tmp, exist_ok=True)

def setup_tex(flat):
    sc, cam = SF.setup('LO', textured=True)
    if NODEC:
        for o in bpy.data.collections['LO'].objects:
            if o.type == 'MESH' and o.data.materials and o.data.materials[0].name in ('decal', 'cdecal'): o.hide_render = True
    sh = sc.display.shading; sc.view_settings.exposure = .7
    if flat: sh.light = 'FLAT'; sh.show_cavity = False; sc.view_settings.exposure = 0
    return sc, cam

rows = []
setup_tex(True)
for v in SF.VIEWS:
    r = M[v]; c = r['crop']
    if PICS: base = np.asarray(Image.open(PICS[v]).convert('RGB').resize((c[2] - c[0], c[3] - c[1]), Image.LANCZOS))
    else: base = sheet[c[1]:c[3], c[0]:c[2]]
    im = Image.fromarray(SF.render_view(v, c, r['ppm'], r['cu'], r['vg'], os.path.join(tmp, v + '.png'), 2)).resize((c[2] - c[0], c[3] - c[1]), Image.LANCZOS)
    bg = Image.new('RGBA', im.size, tuple(int(x) for x in np.median(base.reshape(-1, 3), 0)) + (255,)); bg.alpha_composite(im)
    pa, pb = Image.fromarray(base), bg.convert('RGB')
    if pa.height > 600: f_ = 540 / pa.height; pa, pb = pa.resize((int(pa.width * f_), 540)), pb.resize((int(pb.width * f_), 540))
    rows.append((pa, pb))
# lit three-quarter views (front-left and rear-right)
sc, cam = setup_tex(False)
sc.render.resolution_x, sc.render.resolution_y = 560, 760
cam.data.type = 'PERSP'; cam.data.lens = 50
hero = []
for az in (-35, 145):
    t = math.radians(az); d = 12.5; cam.location = (math.sin(t) * d * -1, math.cos(t) * d, 4.6)
    tgt = np.array((0, 0, 3.1)); p = np.array(cam.location); f = tgt - p; f /= np.linalg.norm(f)
    from mathutils import Vector
    cam.rotation_euler = Vector(tuple(f)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(tmp, 'hero%d.png' % az); bpy.ops.render.render(write_still=True)
    im = Image.open(sc.render.filepath).convert('RGBA'); bg = Image.new('RGBA', im.size, (40, 42, 46, 255)); bg.alpha_composite(im); hero.append(bg.convert('RGB'))
th = rows[0][0].height; tw = sum(r[0].width + r[1].width + 30 for r in rows) + 20
hh = hero[0].height; W = max(tw, 20 + sum(h.width + 20 for h in hero))
can = Image.new('RGB', (W, 50 + th + 40 + hh + 20), (196, 196, 198)); d = ImageDraw.Draw(can); d.text((20, 10), title, fill=(30, 30, 30), font=SF.font(22))
x = 20
for v, (s_, m_) in zip(SF.VIEWS, rows):
    can.paste(s_, (x, 80)); d.text((x, 56), v.upper() + (' - PICTURE' if PICS else ' - SHEET'), fill=(30, 30, 30), font=SF.font(15)); x += s_.width + 6
    can.paste(m_, (x, 80)); d.text((x, 56), 'MODEL', fill=(30, 30, 30), font=SF.font(15)); x += m_.width + 24
x = 20
for h in hero: can.paste(h, (x, 80 + th + 30)); x += h.width + 20
can.save(out); print('preview written', out)
