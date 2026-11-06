"""Session 2 copy of pipeline/v2_bake.py: the bake cage and ray length can be set for small items
(usage adds [cage_m] [ray_m] after size; the pipeline uses 0.06 and 0.25 for the 6.6 m Wraith). Otherwise unchanged.
Bake a printed large model onto its combat model (Wraith V2 pipeline): one UV atlas for the combat model, then the
printed colour and the large model's surface (normal map) baked across. Exports the combat GLB with the joints.

usage: python3 -I v2_bake.py print_uv.blend print_albedo.png combat.blend outdir name [size]
writes outdir/<name>_combat.glb, <name>_albedo.png, <name>_normal.png, <name>_combat_baked.blend
"""
import sys, os, math, time
import bpy
import numpy as np

a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
pblend, palb, lblend, outdir, name = a[:5]; size = int(a[5]) if len(a) > 5 else 2048
CAGE = float(a[6]) if len(a) > 6 else .06; RAY = float(a[7]) if len(a) > 7 else .25
os.makedirs(outdir, exist_ok=True); t0 = time.time()
log = lambda *m: print('[v2bake %4.0fs]' % (time.time() - t0), *m, flush=True)

def select(objs, active=None):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]

# 1. the printed large model as one bake source, glowing with its own printed colour
bpy.ops.wm.open_mainfile(filepath=pblend)
hi = [o for o in bpy.data.collections['HI'].objects if o.type == 'MESH']
src = bpy.data.materials.new('bsrc'); src.use_nodes = True; nt = src.node_tree; nt.nodes.clear()
ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(palb)
em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(ti.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
for o in hi:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    o.data.materials.clear(); o.data.materials.append(src)
select(hi); bpy.ops.object.join(); bh = bpy.context.view_layer.objects.active; bh.name = 'BAKE_HI'
tmp = os.path.join(outdir, '_bake_hi.blend'); bpy.ops.wm.save_as_mainfile(filepath=tmp)
log('bake source ready', len(bh.data.polygons), 'triangles')

# 2. the combat model: one atlas over all its parts
bpy.ops.wm.open_mainfile(filepath=lblend)
with bpy.data.libraries.load(tmp) as (df, dt): dt.objects = ['BAKE_HI']
bh = dt.objects[0]; bpy.context.scene.collection.objects.link(bh)
lo = [o for o in bpy.data.collections['LO'].objects if o.type == 'MESH']
atlas = bpy.data.materials.new('atlas'); atlas.use_nodes = True
img = bpy.data.images.new(name + '_bake', size, size, alpha=False); img.generated_color = (.3, .3, .32, 1)
tn = atlas.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = img; atlas.node_tree.nodes.active = tn
for o in lo: o.data.materials.clear(); o.data.materials.append(atlas)
select(lo); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.004, area_weight=0., correct_aspect=True, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
# a joined copy to bake onto (same UVs as the parts)
copies = []
for o in lo:
    c = o.copy(); c.data = o.data.copy(); c.parent = None; c.matrix_world = o.matrix_world.copy(); bpy.context.scene.collection.objects.link(c); copies.append(c)
select(copies); bpy.ops.object.join(); bl = bpy.context.view_layer.objects.active; bl.name = 'BAKE_LO'
for o in lo: o.hide_render = True
log('combat atlas ready', sum(len(o.data.polygons) for o in lo), 'triangles')

# 3. bake colour and surface across
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4
bk = sc.render.bake; bk.use_selected_to_active = True; bk.cage_extrusion = CAGE; bk.max_ray_distance = RAY; bk.margin = 8
select([bh, bl], bl)
def bake(kind, fn, colorspace='sRGB', **kw):
    img.colorspace_settings.name = colorspace
    bpy.ops.object.bake(type=kind, **kw)
    img.filepath_raw = os.path.join(outdir, fn); img.file_format = 'PNG'; img.save(); log('baked', kind, fn)
bake('EMIT', name + '_albedo.png')
img2 = bpy.data.images.new(name + '_nrm', size, size, alpha=False); img2.colorspace_settings.name = 'Non-Color'; tn.image = img2; img = img2
bake('NORMAL', name + '_normal.png', 'Non-Color', normal_space='TANGENT')

# 4. export the combat model (parts on their joints)
bpy.data.objects.remove(bl); bpy.data.objects.remove(bh)
for o in lo: o.hide_render = False
tn.image = None
for o in bpy.data.objects: o.select_set(False)
for o in lo + [o for o in bpy.data.objects if o.type == 'EMPTY']: o.select_set(True)
glb = os.path.join(outdir, name + '_combat.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_normals=True,
                          export_texcoords=True, export_materials='EXPORT', export_image_format='NONE', export_vertex_color='NONE')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, name + '_combat_baked.blend'))
log('exported', os.path.basename(glb), os.path.getsize(glb) // 1024, 'KB')
