"""Render ortho silhouettes of a .blend and compare to the sheet silhouettes.
usage: python render_check.py model.blend masks4x.npz outdir [k]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
from PIL import Image
import views

def setup_sil(scene):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 4
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 0
    scene.render.film_transparent = True
    scene.render.filter_size = 0.5
    m = bpy.data.materials.new('SIL'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(e.outputs[0], o.inputs[0])
    bpy.context.view_layer.material_override = m
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

def main(blend, masks_path, out, k=2):
    bpy.ops.wm.open_mainfile(filepath=blend)
    scene = bpy.context.scene
    for ob in bpy.data.objects:
        if ob.type == 'MESH' and ob.name.startswith('REF_'): ob.hide_render = True
    setup_sil(scene)
    M = np.load(masks_path)
    SS = 4
    res = {}
    for view in ('front', 'side', 'rear'):
        views.make_camera(view, k)
        fp = os.path.join(out, f'sil_{view}.png')
        scene.render.filepath = fp
        bpy.ops.render.render(write_still=True)
        a = np.asarray(Image.open(fp))[..., 3] > 127
        u0, u1 = views.VIEW_BOX[view]
        ref = M[view][:views.V1 * SS, u0 * SS:u1 * SS].astype(float)
        H = min(ref.shape[0], views.V1 * SS)
        ref = ref.reshape(H // (SS // k), SS // k, ref.shape[1] // (SS // k), SS // k).mean((1, 3)) > 0.5
        hh = min(ref.shape[0], a.shape[0]); ww = min(ref.shape[1], a.shape[1])
        ref = ref[:hh, :ww]; a = a[:hh, :ww]
        inter = (ref & a).sum(); uni = (ref | a).sum()
        iou = inter / uni
        miss = (ref & ~a).sum() / k / k; extra = (a & ~ref).sum() / k / k
        res[view] = (iou, miss, extra)
        vis = np.zeros((hh, ww, 3), np.uint8)
        vis[ref & a] = (90, 90, 90); vis[ref & ~a] = (255, 40, 40); vis[a & ~ref] = (40, 140, 255)
        Image.fromarray(vis).save(os.path.join(out, f'diff_{view}.png'))
        print(f'{view}: IoU={iou:.4f}  missing={miss:.0f}px  extra={extra:.0f}px')
    return res

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 2)
