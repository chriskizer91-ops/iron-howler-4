"""Stage 1 of the projection bake (bpy): join the blank model into one mesh,
UV-unwrap it, bake per-texel world position / normal / base colour, and
render per-view position maps for occlusion testing.
usage: python prep_bake.py model.blend out_dir tex_size"""
import sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
import views

def uv_weight(name):
    if name.startswith('Detail_steel'): return 0.35   # bolts, slats, rods
    if name.startswith('Detail_'): return 0.55
    if name.endswith('_core'): return 0.3
    return 1.0

def smart(ob, margin=0.003):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')

def joined_mesh(coll_name='Wraith'):
    """Apply modifiers, smart-UV each object (scaled by importance), join."""
    t = time.time()
    dg = bpy.context.evaluated_depsgraph_get()
    objs = [o for o in bpy.data.collections[coll_name].objects if o.type == 'MESH']
    new = []
    for o in objs:
        ev = o.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
        me.transform(o.matrix_world)
        no = bpy.data.objects.new(o.name + '_J', me)
        bpy.context.scene.collection.objects.link(no)
        new.append((no, uv_weight(o.name)))
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()
    # Smart UV per object, then rescale UV islands by importance (area ~ w^2)
    for no, w in new:
        smart(no)
        uv = no.data.uv_layers.active
        a = np.empty(len(uv.data) * 2, np.float32); uv.data.foreach_get('uv', a)
        # smart_project normalises each object to [0,1]; restore true texel density
        me = no.data
        area3 = sum(p.area for p in me.polygons)
        a2 = a.reshape(-1, 2)
        tri_area_uv = 0.0
        for p in me.polygons:
            idx = list(p.loop_indices)
            q = a2[idx]
            x, y = q[:, 0], q[:, 1]
            tri_area_uv += 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))
        sc = math.sqrt(area3 / max(tri_area_uv, 1e-9)) * w
        a2 *= sc
        uv.data.foreach_set('uv', a2.ravel())
    print('per-object unwrap %.1fs' % (time.time() - t))
    bpy.ops.object.select_all(action='DESELECT')
    for no, w in new: no.select_set(True)
    bpy.context.view_layer.objects.active = new[0][0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = 'Wraith'; ob.data.name = 'Wraith'
    fallback = bpy.data.materials.get('Frame_Gunmetal')
    for slot in ob.material_slots:
        if slot.material is None: slot.material = fallback
    return ob

def unwrap(ob, margin=0.0012):
    t = time.time()
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    try:
        bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=True, rotate_method='ANY', scale=True,
                                merge_overlap=False, margin_method='SCALED', margin=margin, shape_method='CONCAVE')
    except TypeError:
        bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = ob.data.uv_layers.active
    a = np.empty(len(uv.data) * 2, np.float32); uv.data.foreach_get('uv', a)
    print('pack %.1fs' % (time.time() - t), 'uv range', a.min(), a.max())

def float_img(name, size, fill):
    img = bpy.data.images.new(name, size, size, alpha=True, float_buffer=True)
    img.colorspace_settings.name = 'Non-Color'
    a = np.empty((size * size * 4,), np.float32); a[:] = np.tile(np.array(fill, np.float32), size * size)
    img.pixels.foreach_set(a)
    return img

def bake(ob, img, btype, **kw):
    for slot in ob.material_slots:
        m = slot.material
        nt = m.node_tree
        n = nt.nodes.get('BAKE_TARGET') or nt.nodes.new('ShaderNodeTexImage')
        n.name = 'BAKE_TARGET'; n.image = img
        nt.nodes.active = n
    t = time.time()
    bpy.ops.object.bake(type=btype, margin=0, use_clear=False, target='IMAGE_TEXTURES', **kw)
    print('bake', btype, '%.1fs' % (time.time() - t))
    a = np.empty((img.size[0] * img.size[1] * 4,), np.float32); img.pixels.foreach_get(a)
    return a.reshape(img.size[1], img.size[0], 4)

def render_positions(out_dir, k=4):
    sc = bpy.context.scene
    m = bpy.data.materials.new('POSOUT'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    g = nt.nodes.new('ShaderNodeNewGeometry'); e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(g.outputs['Position'], e.inputs['Color']); nt.links.new(e.outputs[0], o.inputs[0])
    bpy.context.view_layer.material_override = m
    sc.cycles.samples = 1; sc.render.filter_size = 0.01
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'OPEN_EXR'
    sc.render.image_settings.color_depth = '32'
    sc.render.image_settings.color_mode = 'RGBA'
    for v in ('front', 'side', 'rear', 'sideneg'):
        views.make_camera(v, k)
        fp = os.path.join(out_dir, f'pos_{v}.exr')
        sc.render.filepath = fp
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(fp)
        a = np.empty((im.size[0] * im.size[1] * 4,), np.float32); im.pixels.foreach_get(a)
        a = a.reshape(im.size[1], im.size[0], 4)[::-1]   # top row first
        if v == 'sideneg': a = a[:, ::-1]
        np.save(os.path.join(out_dir, f'pos_{v}.npy'), a)
        print('view', v, a.shape)
    bpy.context.view_layer.material_override = None

def main(blend, out_dir, size=4096):
    os.makedirs(out_dir, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=blend)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    sc.cycles.use_denoising = False
    ob = joined_mesh()
    print('tris', sum(len(p.vertices) - 2 for p in ob.data.polygons))
    unwrap(ob)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, 'joined_uv.blend'))
    P = bake(ob, float_img('POS', size, (0, 0, 0, -1)), 'POSITION')
    np.save(os.path.join(out_dir, 'tex_pos.npy'), P[::-1])
    N = bake(ob, float_img('NRM', size, (0, 0, 0, -1)), 'NORMAL', normal_space='OBJECT')
    np.save(os.path.join(out_dir, 'tex_nrm.npy'), N[::-1])
    sc.render.bake.use_pass_direct = False; sc.render.bake.use_pass_indirect = False; sc.render.bake.use_pass_color = True
    C = bake(ob, float_img('COL', size, (0, 0, 0, -1)), 'DIFFUSE', pass_filter={'COLOR'})
    np.save(os.path.join(out_dir, 'tex_col.npy'), C[::-1])
    E = bake(ob, float_img('EMI', size, (0, 0, 0, -1)), 'EMIT')
    np.save(os.path.join(out_dir, 'tex_emit.npy'), E[::-1].astype(np.float16))
    render_positions(out_dir)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4096)
