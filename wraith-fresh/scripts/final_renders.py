"""Presentation renders: before (blank) vs after (projected) from matching
cameras, plus reference / blank / textured ortho comparisons.
usage: python final_renders.py blank.blend textured.blend sheet.png out_dir [samples]"""
import sys, os, math, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import preview as PV
import views

SHOTS = [  # name, azimuth, elevation, distance, target, lens, w, h
    ('three_quarter_front', -32, 10, 27, (0, 0.3, 5.0), 70, 900, 1100),
    ('three_quarter_back', 148, 14, 27, (0, 0.3, 5.0), 70, 900, 1100),
    ('side_left', 90, 4, 27, (0, 0.2, 5.0), 70, 900, 1100),
    ('head_torso', -28, 6, 13.5, (0.2, -0.3, 7.2), 70, 900, 1100),
    ('legs', 38, 4, 14, (0.6, 0.0, 2.6), 70, 900, 1100),
]

def render_set(blend, tag, out_dir, samples):
    bpy.ops.wm.open_mainfile(filepath=blend)
    sc = bpy.context.scene
    PV.setup(sc, samples)
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
    for name, az, el, d, t, lens, w, h in SHOTS:
        PV.persp_cam(sc, 'S_' + name, az, el, d, t, lens)
        sc.render.resolution_x = w; sc.render.resolution_y = h
        sc.render.filepath = os.path.join(out_dir, f'{tag}_{name}.png')
        bpy.ops.render.render(write_still=True)
    for v in ('front', 'side', 'rear'):
        views.make_camera(v, k=2)
        sc.render.filepath = os.path.join(out_dir, f'{tag}_ortho_{v}.png')
        bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    blank, textured, sheet, out = sys.argv[1:5]
    samples = int(sys.argv[5]) if len(sys.argv) > 5 else 64
    os.makedirs(out, exist_ok=True)
    render_set(blank, 'before', out, samples)
    render_set(textured, 'after', out, samples)
