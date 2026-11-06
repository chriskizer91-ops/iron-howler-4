"""session 3: close-up renders of a printed (or plain) model, for checking surfaces.
usage: python3 -I closeup.py model.blend out.png az el dist cx cy cz [--tex albedo.png] [--plain] [--size 900] [--coll HI]
az / el in degrees (az 0 = looking at the front, 90 = from the mech's left), dist in metres, (cx, cy, cz) the point looked at."""
import sys, os, math
import bpy
from mathutils import Vector
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, out = a[:2]; az, el, dist, cx, cy, cz = map(float, a[2:8])
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
TEX = opt('--tex', None); size = int(opt('--size', 900)); coll = opt('--coll', 'HI')
bpy.ops.wm.open_mainfile(filepath=blend)
if TEX:
    img = bpy.data.images.load(TEX)
    for m in bpy.data.materials:
        m.use_nodes = True; nt = m.node_tree
        t = nt.nodes.get('ptex') or nt.nodes.new('ShaderNodeTexImage'); t.name = 'ptex'; t.image = img; nt.nodes.active = t
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = sc.render.resolution_y = size; sc.render.film_transparent = False
sh = sc.display.shading; sh.light = 'STUDIO'; sh.show_cavity = True; sh.cavity_type = 'BOTH'
sh.color_type = "TEXTURE" if TEX else ("RANDOM" if "--random" in a else "SINGLE"); sh.single_color = (.6, .6, .62); sh.background_type = 'VIEWPORT'
sc.world = sc.world or bpy.data.worlds.new('w'); sh.background_color = (.13, .14, .16)
sc.view_settings.exposure = .25 if TEX else 0
for c in bpy.data.collections:
    if c.name != coll:
        for o in c.objects: o.hide_render = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
t, e = math.radians(az), math.radians(el); C = Vector((cx, cy, cz))
cam.location = C + Vector((-math.sin(t) * math.cos(e), math.cos(t) * math.cos(e), math.sin(e))) * dist
cam.rotation_euler = (C - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = out; bpy.ops.render.render(write_still=True); print('wrote', out)
