"""Guide pictures for repainting a chassis with an image AI (ChatGPT): front, left side and rear, orthographic, on a plain
light-grey background, at an exact known scale, so a repainted picture lines up with the model and can be painted
back onto it (project_sheet.py). Also writes the outline masks and the mapping.

usage: python3 -I guide_shots.py baked.blend albedo.png outdir name [W H]
writes <name>_front.png, <name>_side.png, <name>_rear.png (W x H, default 1024 x 1536), <name>_sheet.png (all three
side by side), <name>_guide.json (mapping per view: u = cu - x*ppm (front), cu - y*ppm (side), cu + x*ppm (rear), v = vg - z*ppm)
"""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import bpy
import sheetfit as SF

a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
blend, alb, outdir, name = a[:4]; W, H = (int(a[4]), int(a[5])) if len(a) > 5 else (1024, 1536)
BG = (200, 200, 202)
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=blend)
SF.textured_materials(alb)
sc, cam = SF.setup('HI', textured=True)
sc.display.shading.show_shadows = False; sc.view_settings.exposure = .45
mn, mx = SF.model_bounds('HI')
top, ground = int(H * .06), int(H * .93)
ppm = (ground - top) / mx.z
J = {}; tiles = []
for v in SF.VIEWS:
    cu = W / 2 + ({'front': 0, 'side': (mn.y + mx.y) / 2, 'rear': 0}[v]) * ppm
    rgba = SF.render_view(v, (0, 0, W, H), ppm, cu, ground, os.path.join(outdir, '_g_%s.png' % v), 2)
    im = Image.fromarray(rgba).resize((W, H), Image.LANCZOS)
    bg = Image.new('RGBA', (W, H), BG + (255,)); bg.alpha_composite(im); bg = bg.convert('RGB')
    p = os.path.join(outdir, '%s_%s.png' % (name, v)); bg.save(p); tiles.append(bg)
    Image.fromarray(((np.asarray(im)[:, :, 3] > 100) * 255).astype(np.uint8)).save(os.path.join(outdir, '%s_%s_mask.png' % (name, v)))
    J[v] = dict(image=os.path.basename(p), mask='%s_%s_mask.png' % (name, v), ppm=ppm, cu=cu, vg=ground, size=[W, H])
sheet = Image.new('RGB', (W * 3, H), BG)
for i, t in enumerate(tiles): sheet.paste(t, (i * W, 0))
sheet.save(os.path.join(outdir, name + '_sheet.png'))
json.dump(J, open(os.path.join(outdir, name + '_guide.json'), 'w'), indent=1)
print('guide pictures written, scale %.1f px per metre' % ppm)
