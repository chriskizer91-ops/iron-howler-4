"""Bake a built chassis: the HI (full) model onto the LO (combat) model, then export both GLBs.
usage: python3 -I bake.py model.blend outdir name [size]
writes  <name>_albedo.webp  <name>_normal.webp  <name>_orm.webp  (one atlas for the whole combat model)
        <name>_full.glb  (HI, tiled paint, shading baked into vertex colours)   <name>_combat.glb  (LO, material 'atlas')
The bake works on joined copies (HI copy = rays' target, LO copy = the atlas), so every joint keeps its own meshes.
"""
import sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector

args = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, outdir, name = args[0], args[1], args[2]; SZ = int(args[3]) if len(args) > 3 else 2048
T0 = time.time()
def log(*a): print('[bake %5.0fs]' % (time.time() - T0), *a, flush=True)

bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene; vl = bpy.context.view_layer
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
GLOW = {'eye', 'jetcore'}; SKIP = GLOW | {'decal', 'cdecal'}
HI = [o for o in bpy.data.collections['HI'].objects if o.type == 'MESH']
LO = [o for o in bpy.data.collections['LO'].objects if o.type == 'MESH']

def select(objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    vl.objects.active = active or objs[0]

# ---------------- 1. combat model: one 'atlas' mesh per joint (glow and decal pieces stay apart)
atlas = bpy.data.materials.get('atlas') or bpy.data.materials.new('atlas')
atlas.use_nodes = True
groups = {}
for o in LO:
    if o.data.materials[0].name in SKIP: continue
    groups.setdefault(o.parent.name, []).append(o)
LOA = []
for jn, objs in groups.items():
    select(objs); bpy.ops.object.join(); o = vl.objects.active
    o.name = o.data.name = jn + '.LO'; o.data.materials.clear(); o.data.materials.append(atlas)
    for p in o.data.polygons: p.material_index = 0
    LOA.append(o)
LO = [o for o in bpy.data.collections['LO'].objects if o.type == 'MESH']
from mathutils.bvhtree import BVHTree
def hemi(n, k=16):
    t = n.orthogonal().normalized(); b = n.cross(t); out = [n]
    for i in range(k - 1):
        a = i * 2.39996; z = .25 + .75 * (i + .5) / (k - 1); r = math.sqrt(1 - z * z)
        out.append((n * z + t * math.cos(a) * r + b * math.sin(a) * r).normalized())
    return out
def cull_hidden(o, reach=.12):
    """delete faces that cannot be seen: every ray out of them hits the same joint's geometry within reach"""
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); tree = BVHTree.FromBMesh(bm)
    dead = []
    for f in bm.faces:
        c = f.calc_center_median(); n = f.normal
        if n.length < .5: continue
        hits = 0
        for d in hemi(n):
            h = tree.ray_cast(c + n * .004, d, reach)
            if h[0] is not None and h[2] != f.index: hits += 1
            else: break
        if hits == 16: dead.append(f)
    bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(o.data); bm.free(); return len(dead)
before = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in LOA)
culled = sum(cull_hidden(o) for o in LOA)
log('hidden faces removed', culled, 'triangles %d -> %d' % (before, sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in LOA)))
log('combat meshes', len(LOA), 'triangles', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in LOA))

# ---------------- 2. one shared UV atlas for all of them
select(LOA); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.003, area_weight=.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.pack_islands(rotate=True, margin=.004)
bpy.ops.object.mode_set(mode='OBJECT')
log('uv atlas packed')

# ---------------- 3. joined copies to bake between
def joined_copy(objs, nm):
    cps = []
    for o in objs:
        c = o.copy(); c.data = o.data.copy(); sc.collection.objects.link(c)
        c.parent = None; c.matrix_world = o.matrix_world.copy(); cps.append(c)
    select(cps); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join(); j = vl.objects.active; j.name = nm; return j
src = joined_copy([o for o in HI if o.data.materials[0].name != 'decal'], 'BAKE_HI')
dst = joined_copy(LOA, 'BAKE_LO')
for o in HI + LO: o.hide_render = True
for attr in ('visible_camera', 'visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
    setattr(dst, attr, False)          # the atlas copy must not shade the detail it is baking
log('bake source triangles', sum(len(p.vertices) - 2 for p in src.data.polygons))

bm_ = bpy.data.materials.new('bake_target'); bm_.use_nodes = True
tn = bm_.node_tree.nodes.new('ShaderNodeTexImage'); bm_.node_tree.nodes.active = tn
dst.data.materials.clear(); dst.data.materials.append(bm_)

def image(nm, color=True):
    im = bpy.data.images.new(nm, SZ, SZ, alpha=False, float_buffer=not color)
    im.colorspace_settings.name = 'sRGB' if color else 'Non-Color'; return im

def run(kind, im, samples=1, extr=.12, dist=.3):
    tn.image = im; sc.cycles.samples = samples
    bk = sc.render.bake; bk.use_selected_to_active = True; bk.cage_extrusion = extr; bk.max_ray_distance = dist
    bk.margin = 8; bk.use_clear = True; bk.target = 'IMAGE_TEXTURES'
    select([src, dst], dst)
    if kind == 'NORMAL': bk.normal_space = 'TANGENT'
    bpy.ops.object.bake(type=kind, pass_filter={'COLOR'} if kind == 'DIFFUSE' else set())
    log('baked', kind, im.name)

# ---------------- 4. colour (emission = base colour), metal (emission = metallic), normal, roughness, shading
orig = {}
def emission_mode(what):
    for m in {s.material for s in src.material_slots if s.material}:
        nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); out = nt.nodes.get('Material Output')
        if m.name not in orig: orig[m.name] = [l for l in out.inputs['Surface'].links][0].from_socket if out.inputs['Surface'].links else None
        em = nt.nodes.get('bk_em') or nt.nodes.new('ShaderNodeEmission'); em.name = 'bk_em'
        for l in list(em.inputs['Color'].links): nt.links.remove(l)
        if what == 'color':
            if b.inputs['Base Color'].links: nt.links.new(b.inputs['Base Color'].links[0].from_socket, em.inputs['Color'])
            else: em.inputs['Color'].default_value = b.inputs['Base Color'].default_value
            if b.inputs['Emission Strength'].default_value > 0: em.inputs['Color'].default_value = b.inputs['Emission Color'].default_value
        else:
            v = b.inputs['Metallic'].default_value; em.inputs['Color'].default_value = (v, v, v, 1)
        em.inputs['Strength'].default_value = 1; nt.links.new(em.outputs[0], out.inputs['Surface'])
def shader_mode():
    for m in {s.material for s in src.material_slots if s.material}:
        if orig.get(m.name) is not None: m.node_tree.links.new(orig[m.name], m.node_tree.nodes['Material Output'].inputs['Surface'])

alb, met, nor, rou, ao = image(name + '_albedo'), image(name + '_metal', False), image(name + '_normal', False), image(name + '_rough', False), image(name + '_ao', False)
emission_mode('color'); run('EMIT', alb)
emission_mode('metal'); run('EMIT', met)
shader_mode(); run('NORMAL', nor); run('ROUGHNESS', rou)
sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.light_settings.distance = .6
run('AO', ao, samples=24)

def save(im, path):
    im.filepath_raw = path; im.file_format = 'PNG'; im.save()
tmp = os.path.join(outdir, '_bake'); os.makedirs(tmp, exist_ok=True)
for im in (alb, met, nor, rou, ao): save(im, os.path.join(tmp, im.name + '.png'))
log('maps saved')

# ---------------- 5. full model: shading into vertex colours (the viewer multiplies them in)
for o in (src, dst): bpy.data.objects.remove(o)
for o in HI + LO: o.hide_render = False
hiv = [o for o in HI if o.data.materials[0].name not in SKIP]
for o in hiv:
    if 'AO' not in o.data.color_attributes: o.data.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
    o.data.color_attributes.active_color = o.data.color_attributes['AO']
for o in LO: o.hide_render = True
select(hiv); sc.render.bake.use_selected_to_active = False; sc.render.bake.target = 'VERTEX_COLORS'; sc.cycles.samples = 16
sc.world.light_settings.distance = .3
bpy.ops.object.bake(type='AO')
import numpy as np
for o in hiv:
    ca = o.data.color_attributes['AO']; a_ = np.zeros(len(ca.data) * 4, np.float32); ca.data.foreach_get('color', a_); a_ = a_.reshape(-1, 4)
    a_[:, :3] = .42 + .58 * np.clip(a_[:, :3], 0, 1) ** .7; a_[:, 3] = 1; ca.data.foreach_set('color', a_.ravel())
log('full model shading baked to vertex colours')

# ---------------- 6. export both, without embedded images (the viewer brings its own textures)
def export(objs, path, colors):
    keep = set(objs) | {o for o in bpy.data.objects if o.type == 'EMPTY'}
    select(list(keep))
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_texcoords=True, export_materials='EXPORT', export_image_format='NONE',
                              export_vertex_color='ACTIVE' if colors else 'NONE')
    log('exported', os.path.basename(path), os.path.getsize(path) // 1024, 'KB')
for o in bpy.data.objects:
    if o.type == 'EMPTY': o.rotation_euler = o.rotation_euler if o.name.startswith('fa_') else (0, 0, 0)
export(HI, os.path.join(outdir, name + '_full.glb'), True)
export(LOA + [o for o in LO if o.data.materials[0].name in SKIP], os.path.join(outdir, name + '_combat.glb'), False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, name + '_baked.blend'))
log('done')
