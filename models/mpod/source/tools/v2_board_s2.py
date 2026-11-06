"""Session 2 copy of pipeline/v2_board.py: the three-quarter views get the room they need on wide boards, the model tiles
use the pictures' grey background, and the camera stands a little further back. Otherwise unchanged.
Board for Wraith V2: per view the sheet, the model (plain grey, or textured), and where they differ; plus two
three-quarter views. usage: python3 -I v2_board.py model.blend parts.json sheet.png out.jpg "title" [--tex albedo.png] [--iou iou.json]"""
import sys, os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.dirname(HERE))
import numpy as np
from PIL import Image, ImageDraw
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'pipeline')))
import sheetfit as SF

a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, pj, sheet, out, title = a[:5]
TEX = a[a.index('--tex') + 1] if '--tex' in a else None
IOU = json.load(open(a[a.index('--iou') + 1])) if '--iou' in a else None
PIPE = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'pipeline')); sys.path.insert(0, PIPE)
src = open(os.path.join(PIPE, 'build_v2.py')).read().split("if __name__ == '__main__':")[0]
ns = {'__file__': os.path.join(PIPE, 'build_v2.py')}; exec(compile(src, 'build_v2', 'exec'), ns)
J0 = json.load(open(pj)); J0['_path'] = pj
VMASK = ns['setup_views'](J0, sheet)      # v2.1 items bring their own boxes and figure mask
BOX = ns['BOX']; Vw = J0['view']
bpy.ops.wm.open_mainfile(filepath=blend)
if TEX:
    img = bpy.data.images.load(TEX)
    for m in bpy.data.materials:
        if not m.use_nodes: m.use_nodes = True
        nt = m.node_tree; t = nt.nodes.get('ptex') or nt.nodes.new('ShaderNodeTexImage'); t.name = 'ptex'; t.image = img; nt.nodes.active = t
        if 'Principled BSDF' in nt.nodes: nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
LOD = 'HI' if 'HI' in bpy.data.collections else 'LO'
sc, cam = SF.setup(LOD, textured=bool(TEX))
sh = sc.display.shading; sh.light = 'STUDIO'; sh.show_cavity = True; sh.cavity_type = 'BOTH'
if not TEX: sh.color_type = 'SINGLE'; sh.single_color = (.6, .6, .62)
sc.view_settings.exposure = .25 if TEX else 0
mask, im = VMASK
rows = []
for v in [x for x in ('front', 'side', 'rear', 'top') if x in BOX]:
    x0, y0, x1, y1 = BOX[v]
    r = SF.render_view(v, (x0, y0, x1, y1), Vw['ppm'], Vw[v]['cu'], Vw[v]['vg'], '/tmp/_v2b_%s.png' % v, 2)
    r = Image.fromarray(r).resize((x1 - x0, y1 - y0), Image.LANCZOS)
    base = im[y0:y1, x0:x1]; bgc = tuple(int(c) for c in np.median(np.concatenate([base[:6].reshape(-1, 3), base[-6:].reshape(-1, 3)]), 0))
    bg = Image.new('RGBA', r.size, bgc + (255,)); bg.alpha_composite(r)
    mm = np.asarray(r)[:, :, 3] > 100; shm = mask[y0:y1, x0:x1]
    ov = (base * .35 + 140).astype(np.uint8); ov[mm & shm] = (base[mm & shm] * .5 + 90).astype(np.uint8); ov[shm & ~mm] = (230, 40, 40); ov[mm & ~shm] = (40, 120, 255)
    rows.append((v, Image.fromarray(base), bg.convert('RGB'), Image.fromarray(ov), float((mm & shm).sum() / max(1, (mm | shm).sum()))))
# three-quarter views
sc.render.resolution_x, sc.render.resolution_y = 520, 720; cam.data.type = 'PERSP'; cam.data.lens = 50
hero = []
pts = [o.matrix_world @ Vector(c) for o in bpy.data.collections[LOD].objects if o.type == 'MESH' for c in o.bound_box]
lo_ = Vector([min(p[i] for p in pts) for i in range(3)]); hi_ = Vector([max(p[i] for p in pts) for i in range(3)])
ctr = (lo_ + hi_) / 2; ext = max(hi_ - lo_)          # frame any item, not just the 6.6 m Wraith
for az in (-35, 145):
    t = math.radians(az); d = ext * 2.7; cam.location = (ctr.x - math.sin(t) * d, ctr.y + math.cos(t) * d, ctr.z + ext * .19)
    f = ctr - Vector(cam.location); cam.rotation_euler = f.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = '/tmp/_v2b_h%d.png' % az; bpy.ops.render.render(write_still=True)
    h = Image.open(sc.render.filepath).convert('RGBA'); bg = Image.new('RGBA', h.size, (34, 36, 40, 255)); bg.alpha_composite(h); hero.append(bg.convert('RGB'))
F = SF.font
th0 = rows[0][1].height
if th0 > 540:            # big v2.1 sheets: shrink the tiles so the board still reads on a phone
    k_ = 540 / th0; rows = [(v, *[t.resize((max(1, int(t.width * k_)), 540), Image.LANCZOS) for t in (a, b, c)], iou) for v, a, b, c, iou in rows]
# portrait layout (reads on a phone): one row per view - sheet, model, overlap - then the two three-quarter views
tw = max(r[1].width for r in rows); th = rows[0][1].height; gap = 10
W = 20 + 3 * tw + 2 * gap + 20; hh = int(hero[0].height * (W - 60) / 2 / hero[0].width)
H = 60 + len(rows) * (th + 40) + hh + 70
can = Image.new('RGB', (W, H), (196, 196, 198)); d = ImageDraw.Draw(can)
d.text((20, 14), title, fill=(25, 25, 25), font=F(26))
y = 60
for v, s_, m_, o_, iou in rows:
    x = 20
    for t_, lab in ((s_, v.upper() + ' - SHEET'), (m_, 'MODEL'), (o_, 'OVERLAP %.0f%%' % (iou * 100))):
        ox = x + (tw - t_.width) // 2; can.paste(t_, (ox, y + 26)); d.text((ox, y + 2), lab, fill=(25, 25, 25), font=F(18)); x += tw + gap
    y += th + 40
x = 20
for h in hero: can.paste(h.resize((int(h.width * (W - 60) / 2 / h.width), int(h.height * (W - 60) / 2 / h.width))), (x, y)); x += (W - 60) // 2 + 20
d.text((20, H - 40), 'red = on the sheet but missing on the model     blue = on the model but not on the sheet', fill=(25, 25, 25), font=F(18))
can.save(out, quality=88); print('board', out, ' '.join('%s %.3f' % (r[0], r[4]) for r in rows))
