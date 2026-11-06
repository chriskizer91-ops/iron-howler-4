"""Export a .blend's Wraith collection to GLB (modifiers applied).
usage: python export_glb.py in.blend out.glb [jpeg_quality]"""
import sys, os
import bpy

def main(blend, out, q=92):
    bpy.ops.wm.open_mainfile(filepath=blend)
    # only export the mech (no cameras / lights / ground)
    for o in list(bpy.data.objects):
        if o.type != 'MESH' or o.name in ('Ground',):
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=int(q),
                              export_yup=True, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT')
    print('exported', out, round(os.path.getsize(out) / 1e6, 1), 'MB')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], *(sys.argv[3:4]))
