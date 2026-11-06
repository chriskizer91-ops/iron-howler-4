"""Render the textured model UNLIT (texture colour only) with the sheet-matched
ortho cameras and measure per-pixel colour error against the sheet.
usage: python unlit_compare.py textured.blend sheet.png masks4x.npz out_prefix"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
from PIL import Image
import views

def main(blend, sheet, masks_path, prefix):
    bpy.ops.wm.open_mainfile(filepath=blend)
    sc = bpy.context.scene
    for m in bpy.data.materials:
        if not m.node_tree: continue
        nt = m.node_tree
        b = nt.nodes.get('Principled BSDF'); tex = [n for n in nt.nodes if n.bl_idname == 'ShaderNodeTexImage' and n.name != 'BAKE_TARGET']
        if not b or not tex: continue
        e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.get('Material Output')
        nt.links.new(tex[0].outputs['Color'], e.inputs['Color'])
        nt.links.new(e.outputs[0], o.inputs['Surface'])
    for o in list(bpy.data.objects):
        if o.type == 'LIGHT': bpy.data.objects.remove(o)
    w = bpy.data.worlds.new('Black'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 16; sc.cycles.use_denoising = False
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    ref = np.asarray(Image.open(sheet).convert('RGB')).astype(np.float32)
    M = np.load(masks_path)
    for view in ('front', 'side', 'rear'):
        views.make_camera(view, 1)
        fp = f'{prefix}_{view}.png'; sc.render.filepath = fp
        bpy.ops.render.render(write_still=True)
        im = np.asarray(Image.open(fp)).astype(np.float32)
        u0, u1 = views.VIEW_BOX[view]
        R = ref[:520, u0:u1]
        m = M[view][:520 * 4, u0 * 4:u1 * 4].reshape(520, 4, u1 - u0, 4).mean((1, 3)) > 0.5
        a = im[..., 3] > 127
        both = m & a
        err = np.abs(im[..., :3] - R).mean(2)
        print(f'{view}: mean abs colour error inside silhouette = {err[both].mean():.1f}/255, '
              f'pixels within 25/255: {(err[both] < 25).mean() * 100:.1f}%')
        bg = np.full_like(R, 190.0)
        comp = np.where(a[..., None], im[..., :3], bg)
        Image.fromarray(np.concatenate([R, comp], 1).astype(np.uint8)).save(f'{prefix}_{view}_cmp.png')

if __name__ == '__main__':
    main(*sys.argv[1:5])
