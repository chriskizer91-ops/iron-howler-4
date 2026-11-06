"""Session 2 copy of pipeline/v2_print.py: uses project_sheet_s2 (the "alpha" print setting). Otherwise unchanged.
Wraith V2 step 3: give the large model one UV atlas and print sheet 90 (or any matching picture set) onto it.
usage: python3 -I v2_print.py wv2_full.blend images.json outdir name [size]
writes outdir/<name>_uv.blend (the model with its atlas), <name>_albedo.png, <name>_cover.png, <name>_map.json"""
import sys, os, math, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'pipeline'))); sys.path.insert(0, HERE)
import json
import numpy as np
from PIL import Image
import bpy
a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, images, outdir, name = a[:4]; size = int(a[4]) if len(a) > 4 else 4096
os.makedirs(outdir, exist_ok=True); t = time.time()
bpy.ops.wm.open_mainfile(filepath=blend)
objs = [o for o in bpy.data.collections['HI'].objects if o.type == 'MESH']
for o in bpy.data.objects: o.select_set(False)
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=.0015, area_weight=0., correct_aspect=True, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
print('atlas made in %.0f s' % (time.time() - t), flush=True)
uvb = os.path.join(outdir, name + '_uv.blend'); bpy.ops.wm.save_as_mainfile(filepath=uvb)
# a flat grey starting colour (where no view sees the model, the painter re-tints it to the sheet's frame colour)
base = os.path.join(outdir, '_base.png'); Image.new('RGB', (size, size), (128, 128, 132)).save(base)
import project_sheet_s2 as PS
PS.COLL, PS.MAT = 'HI', None
I = json.load(open(images)); PS.UNMIRROR[:] = I.get('unmirror', []); PS.ALPHA[0] = float(I.get('alpha', .35)); PS.POWER[0] = float(I.get('power', 3.0))
PS.project(uvb, base, I, outdir, name, float(I.get('H', 6.6)), json.load(open(I['map'])) if 'map' in I else None, size=size)
print('printed in %.0f s' % (time.time() - t))
