"""Export the combat model from a baked .blend again, optionally without its number/stripe decals (for a version whose
painted texture already carries them, like a sheet painted onto the model).
usage: python3 -I export_combat.py name_baked.blend out.glb [--nodecals]"""
import sys, os
import bpy
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, out = a[:2]; nodec = '--nodecals' in a
bpy.ops.wm.open_mainfile(filepath=blend)
lo = [o for o in bpy.data.collections['LO'].objects if o.type == 'MESH']
if nodec: lo = [o for o in lo if not (o.data.materials and o.data.materials[0].name in ('decal', 'cdecal'))]
for o in bpy.data.objects: o.select_set(False)
for o in lo + [o for o in bpy.data.objects if o.type == 'EMPTY']:
    o.hide_set(False); o.hide_viewport = False; o.select_set(True)
for o in bpy.data.objects:
    if o.type == 'EMPTY': o.rotation_euler = o.rotation_euler if o.name.startswith('fa_') else (0, 0, 0)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                          export_normals=True, export_texcoords=True, export_materials='EXPORT', export_image_format='NONE', export_vertex_color='NONE')
print('exported', out, os.path.getsize(out) // 1024, 'KB', len(lo), 'meshes')
