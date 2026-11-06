"""Autocannon tiers I-IV on one model: the traced tier IV barrels (2 x 2) are copied, with their own print, into the
tier I (one big barrel), II (two stacked) and III (one above two) layouts. Objects are named t1_ .. t4_ so the model bay
and the game show one tier at a time (hide the other prefixes).
usage: python3 -I ac_tiers.py printed_or_baked.blend collection out.glb [out.blend]"""
import sys, os
import bpy
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
src, coll, out = a[:3]
bpy.ops.wm.open_mainfile(filepath=src)
C = bpy.data.collections[coll]
B = {n: bpy.data.objects[n] for n in ('barrel_ul', 'barrel_ur', 'barrel_ll', 'barrel_lr')}
def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
lo, hi = bounds(B.values()); ctr = (lo + hi) / 2
def cen(o): l, h = bounds([o]); return (l + h) / 2
def copy(o, name, move=Vector(), scale=1.0):
    c = o.copy(); c.data = o.data.copy(); c.name = name; C.objects.link(c)
    m = cen(o)
    S = Matrix.Translation(m + move) @ Matrix.Diagonal((scale, 1, scale, 1)) @ Matrix.Translation(-m)   # bigger across, same length
    c.matrix_world = S @ o.matrix_world
    return c
dx = Vector((ctr.x, 0, 0))
copy(B['barrel_ul'], 't1_barrel', Vector((ctr.x - cen(B['barrel_ul']).x, 0, ctr.z - cen(B['barrel_ul']).z)), 1.5)
copy(B['barrel_ul'], 't2_barrel_u', Vector((ctr.x - cen(B['barrel_ul']).x, 0, 0)))
copy(B['barrel_ll'], 't2_barrel_l', Vector((ctr.x - cen(B['barrel_ll']).x, 0, 0)))
copy(B['barrel_ul'], 't3_barrel_u', Vector((ctr.x - cen(B['barrel_ul']).x, 0, 0)))
copy(B['barrel_ll'], 't3_barrel_ll'); copy(B['barrel_lr'], 't3_barrel_lr')
for n, o in B.items(): o.name = 't4_' + n
bpy.context.view_layer.update()
for o in bpy.data.objects: o.select_set(False)
for o in list(C.objects) + [o for o in bpy.data.objects if o.type == 'EMPTY']: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True, export_normals=True,
                          export_texcoords=True, export_materials='EXPORT', export_image_format='NONE', export_vertex_color='NONE')
if len(a) > 3: bpy.ops.wm.save_as_mainfile(filepath=a[3])
print('tiers added:', sorted(o.name for o in C.objects if o.name[:3] in ('t1_', 't2_', 't3_', 't4_')), os.path.getsize(out) // 1024, 'KB')
