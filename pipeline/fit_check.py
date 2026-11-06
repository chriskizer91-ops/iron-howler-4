"""Fit check: put kit pieces on the Wraith at their mounts and render it (textured, two angles + a close-up).
usage: python3 -I fit_check.py wraith_uv.blend wraith_albedo.png out.jpg  item.blend:albedo.png:mount_on_wraith[:hide_prefixes] ...
A kit piece's `mount` empty is placed exactly on the Wraith's mount (fa_L, fa_R, sh_L, sh_R, bk), frames matched."""
import sys, os, math
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
from mathutils import Vector, Matrix
from PIL import Image
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
wb, walb, out = a[:3]; items = a[3:]
bpy.ops.wm.open_mainfile(filepath=wb)
def texmat(name, path):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path); nt.nodes.active = t
    nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color']); return m
wm = texmat('wraith_print', walb)
for o in bpy.data.collections['HI'].objects:
    if o.type == 'MESH': o.data.materials.clear(); o.data.materials.append(wm)
for k, it in enumerate(items):
    p = it.split(':'); blend, alb, mt = p[:3]; hide = p[3].split(',') if len(p) > 3 and p[3] else []
    with bpy.data.libraries.load(blend) as (df, dt): dt.objects = list(df.objects)
    objs = [o for o in dt.objects if o is not None]
    im = texmat('kit%d' % k, alb); mount = None
    for o in objs:
        o.name = 'k%d_' % k + o.name
        if o.type == 'MESH':
            if any(o.name[len('k%d_' % k):].startswith(h) for h in hide): continue
            bpy.data.collections['HI'].objects.link(o); o.data.materials.clear(); o.data.materials.append(im)
        else: bpy.context.scene.collection.objects.link(o)
        if o.name.endswith('_mount') or o.name.split('_', 1)[1] == 'mount': mount = o
    bpy.context.view_layer.update()
    T = bpy.data.objects[mt].matrix_world @ mount.matrix_world.inverted()
    for o in objs:
        if o.parent is None: o.matrix_world = T @ o.matrix_world
    bpy.context.view_layer.update()
    print('placed', blend, 'on', mt)
import sheetfit as SF
sc, cam = SF.setup('HI', textured=True); sh = sc.display.shading; sh.light = 'STUDIO'; sh.show_cavity = True; sc.view_settings.exposure = .3
sc.render.resolution_x, sc.render.resolution_y = 700, 900; cam.data.type = 'PERSP'; cam.data.lens = 45
shots = []
for az, el, d, tgt in ((-35, 4.4, 13.5, (0, 0, 3.3)), (40, 4.0, 13.5, (0, 0, 3.3)), (-60, 3.9, 5.0, (-1.6, .4, 3.6))):
    t = math.radians(az); cam.location = (tgt[0] - math.sin(t) * d, tgt[1] + math.cos(t) * d, el)
    cam.rotation_euler = (Vector(tgt) - Vector(cam.location)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = '/tmp/_fit%d.png' % az; bpy.ops.render.render(write_still=True)
    im = Image.open(sc.render.filepath).convert('RGBA'); bg = Image.new('RGBA', im.size, (34, 36, 40, 255)); bg.alpha_composite(im); shots.append(bg.convert('RGB'))
W = sum(s.width for s in shots) + 20 * 4; can = Image.new('RGB', (W, shots[0].height + 40), (196, 196, 198)); x = 20
for s in shots: can.paste(s, (x, 20)); x += s.width + 20
can.save(out, quality=88); print('fit check', out)
