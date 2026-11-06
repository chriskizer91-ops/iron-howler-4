"""Make the mirror-image twin of an item (a left-arm weapon -> its right-arm copy): every mesh and empty mirrored across
x = 0, normals kept pointing out, mounts kept right-handed. Print the twin with its own pictures afterwards, so numbers and
emblems read the right way on its outer face (a mirrored texture would show them backwards).
usage: python3 -I mirror_item.py in.blend out.blend"""
import sys, os
import bpy, bmesh
from mathutils import Matrix
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
src, out = a[:2]
bpy.ops.wm.open_mainfile(filepath=src)
S = Matrix.Diagonal((-1, 1, 1, 1))
W = {o.name: o.matrix_world.copy() for o in bpy.data.objects}
PAR = {o.name: o.parent.name for o in bpy.data.objects if o.parent}
for o in bpy.data.objects:
    o.parent = None
for o in bpy.data.objects:
    M = S @ W[o.name] @ S       # the mirrored place; its axes stay right-handed (mirrored, with x flipped back)
    if o.type == 'MESH':        # the geometry carries the mirror itself: world = S W S (S p) = S (W p)
        me = o.data; me.transform(S); bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free(); me.update()
    o.matrix_world = M
bpy.context.view_layer.update()
for n, p in PAR.items():            # the joint tree back as it was
    o, q = bpy.data.objects[n], bpy.data.objects[p]; mw = o.matrix_world.copy()
    o.parent = q; o.matrix_parent_inverse = q.matrix_world.inverted(); o.matrix_world = mw
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=out); print('mirrored', len(bpy.data.objects), 'objects ->', out)
