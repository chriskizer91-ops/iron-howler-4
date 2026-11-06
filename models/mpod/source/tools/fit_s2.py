"""Session 2's fit check (after pipeline/fit_check.py): the Wraith from its full GLB, session 2's kit placed at the mounts,
and the drone on the jet pack's drone_dock. Every piece's `mount` empty is put exactly on its target, frames matched.
usage: python3 -I fit_s2.py wraith_full.glb wraith_print.png out.jpg  item.blend:albedo.png:target ...
target = a Wraith mount (sh_L, sh_R, bk, fa_L, fa_R) or @<n>:<empty> for an empty of item n (counted from 0),
e.g. @2:drone_dock. Renders a front three-quarter view, a back three-quarter view and a close-up of the back."""
import sys, os, math
import bpy
from mathutils import Vector
from PIL import Image
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
wglb, walb, out = a[:3]; items = a[3:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=wglb)
HI = bpy.data.collections.new('HI'); bpy.context.scene.collection.children.link(HI)
def texmat(name, path):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path); nt.nodes.active = t
    nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color']); return m
wm = texmat('wraith_print', walb)
for o in list(bpy.data.objects):
    if o.type == 'MESH':
        for c in o.users_collection: c.objects.unlink(o)
        HI.objects.link(o); o.data.materials.clear(); o.data.materials.append(wm)
bpy.context.view_layer.update()
placed = []
for k, it in enumerate(items):
    blend, alb, tgt = it.split(':', 2)
    with bpy.data.libraries.load(blend) as (df, dt): dt.objects = list(df.objects)
    objs = [o for o in dt.objects if o is not None and o.type in ('MESH', 'EMPTY')]
    im = texmat('kit%d' % k, alb); names = {}
    for o in objs:
        base = o.name; o.name = 'k%d_%s' % (k, base); names[base] = o
        if o.type == 'MESH': HI.objects.link(o); o.data.materials.clear(); o.data.materials.append(im)
        else: bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.update()
    target = placed[int(tgt[1:].split(':')[0])][tgt.split(':')[1]] if tgt.startswith('@') else bpy.data.objects[tgt]
    T = target.matrix_world @ names['mount'].matrix_world.inverted()
    for o in objs:
        if o.parent is None: o.matrix_world = T @ o.matrix_world
    bpy.context.view_layer.update(); placed.append(names)
    print('placed', os.path.basename(blend), 'on', tgt, 'at', tuple(round(v, 3) for v in target.matrix_world.translation))
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.show_shadows = False
sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = .3; sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y = 700, 900
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 45
shots = []
for az, el, d, tgt in ((-35, 4.4, 13.5, (0, 0, 3.3)), (150, 5.6, 13.5, (0, 0, 3.6)), (165, 6.2, 5.2, (0, -1.4, 4.9))):
    t = math.radians(az); cam.location = (tgt[0] - math.sin(t) * d, tgt[1] + math.cos(t) * d, el)
    cam.rotation_euler = (Vector(tgt) - Vector(cam.location)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = '/tmp/_fit2_%d.png' % az; bpy.ops.render.render(write_still=True)
    im = Image.open(sc.render.filepath).convert('RGBA'); bg = Image.new('RGBA', im.size, (34, 36, 40, 255)); bg.alpha_composite(im); shots.append(bg.convert('RGB'))
W = sum(s.width for s in shots) + 20 * 4; can = Image.new('RGB', (W, shots[0].height + 40), (196, 196, 198)); x = 20
for s in shots: can.paste(s, (x, 20)); x += s.width + 20
can.save(out, quality=88); print('fit check', out)
