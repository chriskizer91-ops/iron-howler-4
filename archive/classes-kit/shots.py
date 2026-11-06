"""Preview renders of a built chassis .blend (fast Workbench, or Cycles with --cycles).
usage: python3 -I shots.py model.blend outdir prefix [HI|LO] [--cycles]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
args = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, outdir, pre, lod = args[0], args[1], args[2], (args[3] if len(args) > 3 else 'HI')
cyc = '--cycles' in args
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
for c in bpy.data.collections:
    if c.name in ('HI', 'LO'):
        c.hide_render = c.name != lod
pts = [o.matrix_world @ Vector(b) for o in bpy.data.collections[lod].objects for b in o.bound_box]
mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
c = (mn + mx) / 2; Hh = mx.z
sc.render.resolution_x = sc.render.resolution_y = 1000; sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
if cyc:
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.view_settings.view_transform = 'AgX'
    w = sc.world or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (.32, .33, .35, 1); bg.inputs['Strength'].default_value = .6
    for nm, loc, en, sz in (('key', (6, 9, 11), 2600, 5), ('fill', (-9, 5, 5), 900, 7), ('rim', (-3, -10, 9), 1800, 5)):
        L = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'AREA')); sc.collection.objects.link(L)
        L.data.energy = en; L.data.size = sz; L.location = loc
        L.rotation_euler = (Vector((0, 0, 3)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
else:
    sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.shadow_intensity = .35
    sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.cavity_ridge_factor = 1.3; sh.cavity_valley_factor = 1.3
    sc.display.light_direction = (.45, -.35, .82); sc.view_settings.exposure = .55
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
R = math.radians
views = [('front', (0, 60, c.z), (R(90), 0, R(180)), True), ('side', (-60, 0, c.z), (R(90), 0, R(-90)), True),
         ('rear', (0, -60, c.z), (R(90), 0, 0), True), ('hero', None, None, False)]
for nm, loc, rot, ortho in views:
    if '--hero' in args and nm != 'hero': continue
    if ortho:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(Hh, mx.x - mn.x) * 1.08; cam.location = loc; cam.rotation_euler = rot
    else:
        cam.data.type = 'PERSP'; cam.data.lens = 50
        d = Vector((-.75, 1, .32)).normalized(); t = Vector((c.x, c.y, Hh * .5)); cam.location = t + d * Hh * 1.8
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(outdir, '%s_%s.png' % (pre, nm)); bpy.ops.render.render(write_still=True)
print('rendered', pre, lod)
