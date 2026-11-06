"""Fast preview renders (Blender's Workbench engine) for the blockouts.
usage:
  python3 -I render.py views <chassis> outdir          front / side / rear orthographic, transparent background
  python3 -I render.py lineup outdir [howler_ref.glb]   all four chassis side by side with a 1.8 m person (and the current Howler)
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import blk, chassis

def scene_setup(res=(900, 900), bg=None):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.shadow_intensity = .35
    sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.cavity_ridge_factor = 1.2; sh.cavity_valley_factor = 1.2
    sh.show_specular_highlight = True
    sc.display.light_direction = (.45, -.35, .82)
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.film_transparent = bg is None
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = .55
    if bg is not None:
        if not sc.world: sc.world = bpy.data.worlds.new('w')
        sc.world.color = bg
    sc.render.use_freestyle = False
    sh.render_pass = 'COMBINED'
    return sc

def camera(loc, rot, ortho=None, lens=50):
    sc = bpy.context.scene
    cam = bpy.data.objects.get('cam')
    if cam is None:
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    sc.camera = cam; cam.location = loc; cam.rotation_euler = rot
    cam.data.clip_end = 400
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else: cam.data.type = 'PERSP'; cam.data.lens = lens
    return cam

def shot(path):
    bpy.context.scene.render.filepath = path; bpy.ops.render.render(write_still=True)

def bounds():
    pts = [o.matrix_world @ Vector(c) for o in bpy.context.scene.objects if o.type == 'MESH' for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

def views(cid, outdir, tag=''):
    bpy.context.view_layer.update()
    mn, mx = bounds(); H = mx.z; cz = H / 2
    o = max(H, mx.x - mn.x, mx.y - mn.y) * 1.08
    R = math.radians
    for name, loc, rot in (('front', (0, 60, cz), (R(90), 0, R(180))),
                           ('side', (-60, 0, cz), (R(90), 0, R(-90))),
                           ('rear', (0, -60, cz), (R(90), 0, 0))):
        camera(loc, rot, ortho=o); shot(os.path.join(outdir, '%s%s_%s.png' % (cid, tag, name)))
    return o

if __name__ == '__main__':
    mode = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1] if os.path.abspath(__file__) in sys.argv else sys.argv[1]
    args = sys.argv[sys.argv.index(mode) + 1:]
    if mode == 'views':
        cid, outdir = args[0], args[1]
        blk.reset(); blk.JW.clear(); chassis.build(cid); scene_setup()
        print(cid, 'tris', blk.tris(), 'ortho', views(cid, outdir))

# ------------------------------------------------------------------ lineup, module rack, loaded test fit
import json, modules

def person(x, M_):
    r = blk.joint('person', (x, 0, 0))
    blk.cyl('pLegs', .16, .85, (0, 0, .43), r, M_['white'], seg=12)
    blk.cyl('pBody', .22, .65, (0, 0, 1.18), r, M_['white'], seg=12)
    blk.ball('pHead', .12, (0, 0, 1.66), r, M_['white'], 12)
    return r

def look(target, d, ortho=None, lens=50, dist=40):
    t = Vector(target); dv = Vector(d).normalized(); loc = t + dv * dist
    rot = (-dv).to_track_quat('-Z', 'Y').to_euler()
    return camera(tuple(loc), rot, ortho=ortho, lens=lens)

def lineup(outdir, ref=None):
    """front view, left to right: person, Strider, Howler, Wraith, Bastion, and the current Howler 4 build.
    The camera looks along -y, so world -x is image right: things are placed at negative x."""
    blk.reset(); blk.JW.clear(); M_ = blk.palette()
    info = {}
    x = 0.0
    person(0, M_); info['person'] = dict(x=0.0, h=1.8, w=.44)
    x = 2.4
    for cid in ['strider', 'howler', 'wraith', 'bastion']:
        r = chassis.build(cid, M_); bpy.context.view_layer.update()
        mn, mx = bounds_of(r); w = mx.x - mn.x
        x += w / 2; r.location.x = -x; info[cid] = dict(x=-x, h=mx.z, w=w); x += w / 2 + 1.4
    if ref:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=ref)
        new = [o for o in bpy.data.objects if o not in before]
        for o in new:
            if o.type == 'MESH':
                for m in o.data.materials: m.diffuse_color = (.6, .6, .63, 1)
        bpy.context.view_layer.update()
        pts = [o.matrix_world @ Vector(cc) for o in new if o.type == 'MESH' for cc in o.bound_box]
        w = max(p.x for p in pts) - min(p.x for p in pts); hh = max(p.z for p in pts)
        x += w / 2
        for o in new:
            if o.parent is None: o.location.x -= x
        info['current'] = dict(x=-x, h=hh, w=w); x += w / 2 + .5
    blk.box('ground', (x + 4.4, 3, .04), (-(x - 2.2) / 2, 0, -.02), None, M_['gun'], .0)
    for k in range(9): blk.box('tick%d' % k, (.5, .05, .05), (1.4, 0, k), None, M_['red'] if k % 5 == 0 else M_['dark'], 0)
    blk.box('ruler', (.06, .05, 8.0), (1.4, 0, 4.0), None, M_['dark'], 0)
    scene_setup((2400, 1000))
    left, right = 2.2, -x
    X0 = (left + right) / 2; o = (left - right) * 1.02
    camera((X0, 60, 4.0), (math.radians(90), 0, math.radians(180)), ortho=o)
    shot(os.path.join(outdir, 'lineup.png'))
    for k, v in info.items(): v['fx'] = .5 - (v['x'] - X0) / o
    info['_px_per_m'] = 2400 / o; info['_ground_y'] = 500 + 4.0 * 2400 / o
    json.dump(info, open(os.path.join(outdir, 'lineup.json'), 'w'), indent=1)

def bounds_of(root):
    objs = [o for o in bpy.data.objects if o.type == 'MESH' and root in parents(o)]
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

def parents(o):
    out = []
    while o.parent is not None: o = o.parent; out.append(o)
    return out

VIEW = {'fa': (-1, .6, .5), 'sh': (-.9, 1, .55), 'bk': (.85, -1, .55)}

def rack(outdir, ortho=3.6):
    for mid, (name, slot, fn) in modules.MODS.items():
        blk.reset(); blk.JW.clear(); M_ = blk.palette()
        r = modules.make(mid, M_)
        if mid == 'DF-01': r.rotation_euler.x = math.radians(-90)   # stand the shield up, as on a hanging arm
        bpy.context.view_layer.update()
        mn, mx = bounds_of(r); c = (mn + mx) / 2
        scene_setup((520, 520)); look(c, (-1, .35, .3) if mid == 'DF-01' else VIEW[slot], ortho=ortho)
        shot(os.path.join(outdir, 'mod_%s.png' % mid))
        print(mid, name, slot, 'size %.2f x %.2f x %.2f m' % tuple(mx - mn), 'tris', blk.tris())

LOADS = {
    'howler': {'fa_L': 'FA-04', 'fa_R': 'FA-04', 'sh_L': 'SH-01', 'sh_R': 'SH-03', 'bk': 'BK-02'},
    'bastion': {'fa_L': 'DF-01', 'fa_R': 'FA-04', 'sh_L': 'SH-02', 'sh_R': 'SH-04', 'bk': 'BK-03'},
    'strider': {'fa_L': 'FA-01', 'fa_R': 'FA-07', 'sh_R': 'SH-05', 'bk': 'BK-01'},
    'wraith': {'fa_L': 'FA-02', 'fa_R': 'FA-06', 'sh_L': 'SH-06', 'bk': 'BK-04'},
}

def fit(cid, outdir, d=(-.75, 1, .38)):
    blk.reset(); blk.JW.clear(); M_ = blk.palette()
    chassis.build(cid, M_); ms = chassis.C[cid]['mscale']
    for slot, mid in LOADS[cid].items():
        kw = {'side': -1 if slot.endswith('L') else 1} if mid == 'DF-01' else {}
        r = modules.make(mid, M_, tag='%s_%s' % (slot, mid), **kw); modules.attach(r, slot, ms)
    chassis.pose_aim(cid); bpy.context.view_layer.update()
    mn, mx = bounds(); c = (mn + mx) / 2
    scene_setup((900, 900)); look(c, d, ortho=max(mx - mn) * 1.05)
    shot(os.path.join(outdir, 'fit_%s.png' % cid)); print('fit', cid, 'tris', blk.tris())

if __name__ == '__main__':
    if mode == 'lineup': lineup(args[0], args[1] if len(args) > 1 else None)
    if mode == 'rack': rack(args[0])
    if mode == 'fit':
        for cid in args[1:]: fit(cid, args[0])
