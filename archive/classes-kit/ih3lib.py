"""Small modelling kit for Ironhowl 3 models, run inside Blender's Python (bpy).
Blender axes: x right, y forward, z up. The glTF export turns that into three.js axes (forward = -z).
Every part is a mesh parented to an empty; empties are the joints the game animates (keep their rotation zero at export).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Euler

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

MATS = {}
def mat(name, col=(.6, .6, .6), emit=0.0, metal=0.0, rough=.5):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m; return m

def link(o):
    bpy.context.scene.collection.objects.link(o); return o

def node(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    o = link(bpy.data.objects.new(name, None)); o.empty_display_size = .2
    o.parent = parent; o.location = loc; o.rotation_euler = rot; return o

UVS = 1 / 2.2   # texture repeats once every 2.2 m

def boxuv(bm):
    """box projection: each face takes the two axes its normal is not pointing along"""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][ax]
        for l in f.loops:
            co = l.vert.co; l[uv].uv = (co[a] * UVS + .5, co[b] * UVS + .5)

def finish(bm, name, m, parent, loc, rot, uv=True, smooth=35):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv: boxuv(bm)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); o.parent = parent; o.location = loc; o.rotation_euler = rot
    mod = o.modifiers.new('ws', 'WEIGHTED_NORMAL') if False else None
    try:
        me.set_sharp_from_angle(angle=math.radians(smooth))
    except Exception:
        pass
    return o

def bevel(bm, w, seg=2):
    if w > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=w, segments=seg, profile=.5, affect='EDGES', clamp_overlap=True)

def box(name, size, loc, parent, m, bev=.05, seg=2, rot=(0, 0, 0), top=(1, 1), shift=(0, 0), bot=(1, 1)):
    """chamfered box. top/bot scale the top/bottom face (taper), shift moves the top face (x, y)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    sx, sy, sz = size
    for v in bm.verts:
        up = v.co.z > 0
        k = top if up else bot
        v.co.x *= sx * k[0]; v.co.y *= sy * k[1]; v.co.z *= sz
        if up: v.co.x += shift[0]; v.co.y += shift[1]
    bevel(bm, min(bev, min(size) * .45), seg)
    return finish(bm, name, m, parent, loc, rot)

def cyl(name, r, depth, loc, parent, m, seg=16, r2=None, rot=(0, 0, 0), bev=.02, axis='z', cap=True, thick=0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    if thick:
        bmesh.ops.solidify(bm, geom=bm.faces, thickness=thick)
    elif bev and cap:
        caps = [e for e in bm.edges if all(abs(abs(v.co.z) - depth / 2) < 1e-4 for v in e.verts) and e.is_boundary is False]
        rim = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-5 and abs(abs(e.verts[0].co.z) - depth / 2) < 1e-4 and len(e.link_faces) == 2 and any(len(f.verts) > 4 for f in e.link_faces)]
        if rim: bmesh.ops.bevel(bm, geom=rim, offset=min(bev, depth * .3), segments=2, profile=.5, affect='EDGES', clamp_overlap=True)
    if axis == 'x': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    if axis == 'y': bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
    return finish(bm, name, m, parent, loc, rot)

def strut(name, p0, p1, r, parent, m, seg=10, sq=False):
    """a rod (or square beam when sq) from p0 to p1 in the parent's space"""
    a, b = Vector(p0), Vector(p1); d = b - a; L = d.length; mid = (a + b) / 2
    rot = d.to_track_quat('Z', 'Y').to_euler()
    if sq: return box(name, (r * 2, r * 2, L), mid, parent, m, r * .4, 1, rot=rot)
    return cyl(name, r, L, mid, parent, m, seg=seg, rot=rot, bev=r * .3)

def ball(name, r, loc, parent, m, seg=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    return finish(bm, name, m, parent, loc, (0, 0, 0))

def slats(name, n, size, gap, loc, parent, m, axis='z', rot=(0, 0, 0)):
    """a row of thin plates (vents, fins). size is one slat; they step along axis"""
    bm = bmesh.new()
    for i in range(n):
        t = bmesh.ops.create_cube(bm, size=1)['verts']
        off = (i - (n - 1) / 2) * gap
        for v in t:
            v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
            if axis == 'x': v.co.x += off
            elif axis == 'y': v.co.y += off
            else: v.co.z += off
    bevel(bm, min(size) * .3, 1)
    return finish(bm, name, m, parent, loc, rot)

def hose(name, pts, r, parent, m, res=6):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.resolution_u = res
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1)
    for p, c in zip(sp.bezier_points, pts):
        p.co = c; p.handle_left_type = p.handle_right_type = 'AUTO'
    co = link(bpy.data.objects.new(name + '_c', cu)); co.parent = parent
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(co.evaluated_get(dg))
    bpy.data.objects.remove(co)
    me.materials.clear(); me.materials.append(m)
    o = link(bpy.data.objects.new(name, me)); o.parent = parent
    return o

def decal(name, w, h, rect, loc, parent, m, rot):
    """flat quad showing rect (u0, v0, u1, v1) of the decal sheet"""
    bm = bmesh.new(); u0, v0, u1, v1 = rect
    vs = [bm.verts.new((x * w / 2, 0, z * h / 2)) for x, z in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]
    f = bm.faces.new(vs); uv = bm.loops.layers.uv.verify()
    for l, (a, b) in zip(f.loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]): l[uv].uv = (a, b)
    return finish(bm, name, m, parent, loc, rot, uv=False)

def mirror_x(fn, *args, **kw):
    """call fn for both sides: fn(sd) with sd = -1 (left) and +1 (right)"""
    return [fn(-1), fn(1)]

AUTO = None   # set by a build script: {'detail': material names, 'wear': material names}

def bake_ao(distance=.6, samples=24):
    if AUTO and AUTO.get('detail'): auto_detail(AUTO['detail'])
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    if not sc.world: sc.world = bpy.data.worlds.new('w')
    sc.world.light_settings.distance = distance
    meshes = [o for o in sc.objects if o.type == 'MESH']
    for o in meshes:
        me = o.data
        if 'AO' not in me.color_attributes: me.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER')
        me.color_attributes.active_color = me.color_attributes['AO']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    sc.render.bake.target = 'VERTEX_COLORS'
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    if AUTO and AUTO.get('wear'): edge_wear(AUTO['wear'])

def export(path):
    for o in bpy.context.scene.objects:
        if o.type == 'EMPTY': o.rotation_euler = (0, 0, 0)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True, export_apply=True,
                              export_vertex_color='ACTIVE', export_normals=True, export_texcoords=True, export_materials='EXPORT')

def stats():
    tris = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return tris

# ===================== detail kit (detail pass 2): bolts, pistons, seams, worn edges =====================
def bolts(name, pts, r, parent, m, axis='y', depth=.04, seg=8):
    """small bolt heads at each point, facing along axis"""
    for i, p in enumerate(pts): cyl('%s%d' % (name, i), r, depth, p, parent, m, seg=seg, axis=axis, bev=r * .25)

def bolt_grid(name, c, w, h, nx, nz, r, parent, m, axis='y'):
    """bolts in a grid on a face centred at c, spread w wide (x) and h tall (z), facing along y (or x)"""
    pts = []
    for i in range(nx):
        for j in range(nz):
            u = (i / (nx - 1) - .5) * w if nx > 1 else 0; v = (j / (nz - 1) - .5) * h if nz > 1 else 0
            pts.append((c[0] + u, c[1], c[2] + v) if axis == 'y' else (c[0], c[1] + u, c[2] + v))
    bolts(name, pts, r, parent, m, axis)

def piston(name, p0, p1, r, parent, mo, mi, frac=.55):
    """a hydraulic ram: thick sleeve from p0, polished rod on to p1, a ball joint at each end"""
    q = tuple(p0[i] + (p1[i] - p0[i]) * frac for i in range(3))
    strut(name + 'S', p0, q, r, parent, mo, seg=12); strut(name + 'R', q, p1, r * .5, parent, mi, seg=10)
    ball(name + 'A', r * 1.2, p0, parent, mo, 10); ball(name + 'B', r * .85, p1, parent, mo, 10)

def seam(name, size, loc, parent, m, rot=(0, 0, 0)):
    """a thin dark line that reads as a panel joint"""
    return box(name, size, loc, parent, m, min(size) * .3, 1, rot=rot)

def edge_wear(mat_names, amount=.9, seed=3.0):
    """after bake_ao: store worn paint in the vertex colour alpha (1 = clean, 0 = bare metal) on sharp outer edges,
    broken up with noise so it looks chipped, not outlined. The game's shader turns low alpha into bare steel."""
    import bmesh
    from mathutils import noise, Vector
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or not o.data.materials or o.data.materials[0].name not in mat_names: continue
        me = o.data; ca = me.color_attributes.get('AO')
        if ca is None: continue
        bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
        wear = {}
        for v in bm.verts:
            a = 0.0
            for e in v.link_edges:
                if len(e.link_faces) == 2:
                    s = e.calc_face_angle_signed(0.0)
                    if s > a: a = s
            k = max(0.0, min(1.0, (a - .22) / .5))
            n = noise.noise(Vector(v.co) * 6.0 + Vector((seed, seed * 2, 0))) * .5 + .5
            wear[v.index] = k * max(0.0, min(1.0, (n - .35) * 2.6)) * amount
        bm.free()
        for poly in me.polygons:
            for li, vi in zip(poly.loop_indices, poly.vertices):
                c = ca.data[li].color; ca.data[li].color = (c[0], c[1], c[2], 1.0 - wear.get(vi, 0.0))

def auto_detail(mat_names, min_area=.12, seed=5):
    """detail pass 2 for the machines: on large flat faces of armour pieces, add bolt heads near the corners and a panel seam
    across the middle. Pieces stay parented to the same joint, so nothing changes for the game."""
    import random
    from mathutils import Vector
    rnd = random.Random(seed); dark = MATS.get('edark') or MATS.get('dark'); stl = MATS.get('esteel') or MATS.get('steel')
    objs = [o for o in list(bpy.context.scene.objects) if o.type == 'MESH' and o.data.materials and o.data.materials[0].name in mat_names]
    bpy.context.view_layer.update()
    pts_all = [o.matrix_world @ Vector(c) for o in bpy.context.scene.objects if o.type == 'MESH' for c in o.bound_box]
    D = max(max(p[i] for p in pts_all) - min(p[i] for p in pts_all) for i in range(3)) if pts_all else 4
    min_area = min_area * max(1.0, D / 4.0)   # big machines get fewer, bigger bolts
    k = 0
    for o in objs:
        me = o.data; Mb = o.matrix_basis.copy(); M3 = Mb.to_3x3(); par = o.parent
        sc = max(o.dimensions) if max(o.dimensions) > 0 else 1
        for p in me.polygons:
            if p.area < min_area or len(p.vertices) != 4 or rnd.random() > .6: continue
            n = p.normal.copy(); c = p.center.copy(); vs = [me.vertices[i].co.copy() for i in p.vertices]
            e1, e2 = vs[1] - vs[0], vs[3] - vs[0]; L1, L2 = e1.length, e2.length
            r = max(.022, min(.06 * max(1.0, D / 6.0), min(L1, L2) * .06)); wn = (M3 @ n).normalized(); rot = wn.to_track_quat('Z', 'Y').to_euler()
            for v in vs:
                q = Mb @ (c + (v - c) * .8 + n * .01); k += 1
                cyl('ab%d' % k, r, .035 * max(1.0, D / 6.0), tuple(q), par, stl, seg=6, rot=rot, bev=0)
            if dark and rnd.random() < .7:
                e = (e1 if L1 > L2 else e2).normalized() if rnd.random() < .5 else (e2 if L1 > L2 else e1).normalized()
                span = (L1 if abs(e.dot(e1.normalized())) > .9 else L2) * .42
                a_ = Mb @ (c + e * span + n * .004); b_ = Mb @ (c - e * span + n * .004); k += 1
                strut('as%d' % k, tuple(a_), tuple(b_), max(.008, r * .3), par, dark, sq=True)
