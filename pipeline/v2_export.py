"""Export Wraith V2's large model (with its print atlas UVs) and joints to a GLB for the model bay.
usage: python3 -I v2_export.py wv2_uv.blend out.glb"""
import sys, os
import bpy
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, out = a[:2]
bpy.ops.wm.open_mainfile(filepath=blend)
for o in bpy.data.objects: o.select_set(False)
keep = [o for o in bpy.data.collections['HI'].objects if o.type == 'MESH'] + [o for o in bpy.data.objects if o.type == 'EMPTY']
for o in keep: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_normals=True, export_texcoords=True, export_materials='EXPORT', export_image_format='NONE', export_vertex_color='NONE')
print('exported', out, os.path.getsize(out) // 1024, 'KB', sum(len(o.data.polygons) for o in keep if o.type == 'MESH'), 'triangles')
