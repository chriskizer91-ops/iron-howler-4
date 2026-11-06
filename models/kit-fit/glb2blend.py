import bpy, sys
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0])
print([o.name for o in bpy.data.objects if o.type == 'EMPTY'][:12])
bpy.ops.wm.save_as_mainfile(filepath=a[1])
