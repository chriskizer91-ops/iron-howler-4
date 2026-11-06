"""Small bpy helpers shared by the build / render / bake scripts."""
import bpy, bmesh, math
from mathutils import Vector, Matrix

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def link(ob, coll=None):
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob

def get_coll(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(c)
    return c

def mesh_from_bm(name, bm, coll=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    return link(ob, coll)

def prism(name, polys, axis, a0, a1, coll=None):
    """polys: list of [outer, holes] in 2D.  axis 'Y': coords (x,z) extruded
    along y in [a0,a1]; 'X': coords (y,z) along x; 'Z': coords (x,y) along z."""
    bm = bmesh.new()
    def co(p, q, a):
        if axis == 'Y': return (p, a, q)
        if axis == 'X': return (a, p, q)
        return (p, q, a)
    for outer, holes in polys:
        pts = [tuple(c) for c in outer]
        # drop duplicate consecutive points
        clean = [pts[0]]
        for p in pts[1:]:
            if (p[0]-clean[-1][0])**2 + (p[1]-clean[-1][1])**2 > 1e-10: clean.append(p)
        if (clean[0][0]-clean[-1][0])**2 + (clean[0][1]-clean[-1][1])**2 < 1e-10: clean.pop()
        if len(clean) < 3: continue
        v0 = [bm.verts.new(co(p, q, a0)) for p, q in clean]
        v1 = [bm.verts.new(co(p, q, a1)) for p, q in clean]
        bm.faces.new(v0); bm.faces.new(list(reversed(v1)))
        n = len(v0)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([v0[i], v0[j], v1[j], v1[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_from_bm(name, bm, coll)

def apply_modifiers(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    if old.users == 0: bpy.data.meshes.remove(old)
    return ob

def boolean(ob, cutter, op='INTERSECT', solver='EXACT', remove_cutter=True):
    m = ob.modifiers.new('bool', 'BOOLEAN')
    m.operation = op; m.solver = solver; m.object = cutter
    apply_modifiers(ob)
    if remove_cutter:
        me = cutter.data
        bpy.data.objects.remove(cutter, do_unlink=True)
        if me.users == 0: bpy.data.meshes.remove(me)
    return ob

def bbox(ob):
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    if not vs: return None
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return mn, mx

def mat(name, base, metal=0.0, rough=0.5, emit=None, emit_strength=0.0, coat=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    return m

def tri_count(objs):
    n = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in objs:
        if ob.type != 'MESH': continue
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        n += sum(len(p.vertices) - 2 for p in me.polygons)
        ev.to_mesh_clear()
    return n
