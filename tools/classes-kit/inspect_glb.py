"""Load a GLB in Blender and print its size, triangle count and joint (empty) positions.
usage: python3 -I inspect_glb.py model.glb"""
import sys, bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
bpy.context.view_layer.update()
pts, tris = [], 0
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
mn = [min(p[i] for p in pts) for i in range(3)]; mx = [max(p[i] for p in pts) for i in range(3)]
print('triangles', tris)
print('size x %.2f  y %.2f  z %.2f m' % tuple(mx[i] - mn[i] for i in range(3)), ' min', [round(v, 2) for v in mn], ' max', [round(v, 2) for v in mx])
for o in sorted(bpy.context.scene.objects, key=lambda o: o.name):
    if o.type == 'EMPTY':
        w = o.matrix_world.translation
        print('  %-14s %6.2f %6.2f %6.2f' % (o.name, w.x, w.y, w.z))
