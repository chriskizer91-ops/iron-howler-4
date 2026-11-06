"""Assign the projected texture to the joined/UV'd model -> textured .blend.
usage: python apply_texture.py joined_uv.blend texture.png out.blend"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

def main(blend, tex, out):
    bpy.ops.wm.open_mainfile(filepath=blend)
    img = bpy.data.images.load(os.path.abspath(tex))
    img.colorspace_settings.name = 'sRGB'
    ob = bpy.data.objects['Wraith']
    m = bpy.data.materials.new('Wraith_Projected')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = 0.25
    b.inputs['Roughness'].default_value = 0.55
    g = bpy.data.materials.new('Wraith_Projected_Glow'); g.use_nodes = True
    gt = g.node_tree; gb = gt.nodes['Principled BSDF']
    t2 = gt.nodes.new('ShaderNodeTexImage'); t2.image = img; t2.interpolation = 'Cubic'
    gt.links.new(t2.outputs['Color'], gb.inputs['Base Color'])
    gt.links.new(t2.outputs['Color'], gb.inputs['Emission Color'])
    gb.inputs['Emission Strength'].default_value = 2.5
    for i, slot in enumerate(ob.material_slots):
        mm = slot.material
        slot.material = g if (mm and mm.name.startswith('Glow')) else m
    # clean bake helper nodes
    for mm in bpy.data.materials:
        if mm.node_tree and 'BAKE_TARGET' in mm.node_tree.nodes:
            mm.node_tree.nodes.remove(mm.node_tree.nodes['BAKE_TARGET'])
    coll = bpy.data.collections.get('Wraith') or bpy.data.collections.new('Wraith')
    if coll.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(coll)
    if ob.name not in coll.objects:
        for c in ob.users_collection: c.objects.unlink(ob)
        coll.objects.link(ob)
    img.pack()
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('saved', out)

if __name__ == '__main__':
    main(*sys.argv[1:4])
