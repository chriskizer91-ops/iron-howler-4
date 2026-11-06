"""Detail kit for the Ironhowl 4 chassis (sheets 87-90).
Every part is built twice under the same joint: HI (the full model for the modification bay) and LO (the combat model the
HI detail is baked onto). Pieces are merged as they are made: one mesh per joint, material and level of detail.
Material names match the model bay viewer: org grey gun dark steel trim rubber eye jetcore decal (LO uses 'atlas' after baking).
Blender axes: x right, y forward, z up. Joints are empties with zero rotation, so joint space = world - joint position.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
from blk import JW, joint, frame

V = lambda *a: Vector(a[0] if len(a) == 1 else a)
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
UVS = 1 / 2.2               # tiled paint repeats every 2.2 m
ACC = {}                    # (joint name, material name, lod) -> bmesh
M = {}                      # material name -> material
STEEL_BOLT = 'steel'

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ACC.clear(); M.clear(); JW.clear()
    for n in ('HI', 'LO'):
        c = bpy.data.collections.new(n); bpy.context.scene.collection.children.link(c)

# ------------------------------------------------------------------ materials
def _img(fn):
    return bpy.data.images.get(fn) or bpy.data.images.load(os.path.join(TEX, fn))

def material(name, col=(.5, .5, .5), rough=.5, metal=0., tex=None, tint=1.0, emit=0., coat=0., alpha=False):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if coat:
        try: b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Roughness'].default_value = .2
        except KeyError: pass
    src = None
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = _img(tex); t.name = 'albedo'
        if alpha:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
        if isinstance(tint, tuple):
            mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = tint
            nt.links.new(t.outputs['Color'], mul.inputs[0]); src = mul.outputs[0]
        elif tint != 1.0:
            mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'SCALE'; mul.inputs['Scale'].default_value = tint
            nt.links.new(t.outputs['Color'], mul.inputs[0]); src = mul.outputs[0]
        else:
            src = t.outputs['Color']
        nt.links.new(src, b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = (*col, 1)
    if emit:
        b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = emit
    k3 = tint if isinstance(tint, tuple) else (tint,) * 3
    m.diffuse_color = (*[c * (k3[i] if tex else 1) for i, c in enumerate(col)], 1)
    m['rough'] = rough; m['metal'] = metal; m['glow'] = bool(emit); m['decal'] = alpha
    M[name] = m; return m

def materials():
    material('org', (1.0, .36, .04), .42, .15, 'paint_orange.webp', coat=.3)
    material('grey', (.42, .42, .44), .48, .3, 'paint_grey.webp')
    material('gun', (.21, .22, .24), .38, .75, 'metal_dark.webp', tint=1.5)
    material('dark', (.09, .095, .1), .5, .6, 'metal_dark.webp', tint=.6)
    material('steel', (.7, .7, .72), .22, 1.0, 'steel.webp')
    material('trim', (.85, .63, .07), .5, .1)
    material('rubber', (.025, .025, .025), .85, 0.)
    material('eye', (1.0, .62, .22), emit=12)
    material('jetcore', (1.0, .55, .18), emit=10)
    material('decal', (1, 1, 1), .6, .1, 'howler-decals.webp', alpha=True)
    material('cdecal', (1, 1, 1), .6, .1, 'classes-decals.webp', alpha=True)
    material('bred', (.55, .08, .07), .5, .25, 'paint_grey.webp', tint=(2.0, .3, .26), coat=.15)
    material('atlas', (.5, .5, .5), .5, .5)
    return M

# ------------------------------------------------------------------ merging pieces into joint meshes
def coll(lod): return bpy.data.collections[lod]

def boxuv(bm):
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i])); a, b = [(1, 2), (0, 2), (0, 1)][ax]
        for l in f.loops: co = l.vert.co; l[uv].uv = (co[a] * UVS + .5, co[b] * UVS + .5)

def R3(rot):
    if rot is None: return Matrix.Identity(3)
    if isinstance(rot, Matrix): return rot.to_3x3()
    return Euler(rot).to_matrix()

def emit(bm, m, parent, p=(0, 0, 0), rot=None, lod='HI', uv=True):
    """move a finished piece (built round its own origin) to world point p, then file it under its joint"""
    T = Matrix.Translation(Vector(p) - JW[parent.name]) @ R3(rot).to_4x4()
    bmesh.ops.transform(bm, matrix=T, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv: boxuv(bm)
    else: bm.loops.layers.uv.verify()
    me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free()
    mn = m if isinstance(m, str) else m.name
    k = (parent.name, mn, lod)
    if k not in ACC:
        a = bmesh.new(); a.loops.layers.uv.verify(); ACC[k] = a
    ACC[k].from_mesh(me); bpy.data.meshes.remove(me)

def flush():
    out = []
    for (pn, mn, lod), a in ACC.items():
        me = bpy.data.meshes.new('%s.%s.%s' % (pn, mn, lod)); a.to_mesh(me); a.free()
        me.materials.append(M[mn])
        for p in me.polygons: p.use_smooth = True
        try: me.set_sharp_from_angle(angle=math.radians(46 if lod == 'HI' else 32))   # HI: the bevels carry the edges
        except Exception: pass
        o = bpy.data.objects.new(me.name, me); coll(lod).objects.link(o)
        o.parent = bpy.data.objects[pn]; o['lod'] = lod; out.append(o)
    ACC.clear(); return out

def LODS(hi, lo): return (('HI',) if hi else ()) + (('LO',) if lo else ())

def count(lod):
    return sum(len(o.data.polygons) and sum(len(p.vertices) - 2 for p in o.data.polygons) for o in coll(lod).objects if o.type == 'MESH')

def pending(lod):
    return sum(sum(len(f.verts) - 2 for f in a.faces) for (pn, mn, l), a in ACC.items() if l == lod)

# ------------------------------------------------------------------ raw shapes (built round the origin)
def bm_box(size, top=(1, 1), bot=(1, 1), shift=(0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); sx, sy, sz = size
    for v in bm.verts:
        up = v.co.z > 0; k = top if up else bot
        v.co.x *= sx * k[0]; v.co.y *= sy * k[1]; v.co.z *= sz
        if up: v.co.x += shift[0]; v.co.y += shift[1]
    return bm

def bm_bevel(bm, w, seg):
    if w > 1e-4:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=w, segments=seg, profile=.5, affect='EDGES', clamp_overlap=True)
    return bm

def bm_cyl(r, depth, seg, r2=None, cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    return bm

def bm_lathe(prof, seg, cap0=True, cap1=True):
    """surface of revolution round z from a list of (radius, z)"""
    bm = bmesh.new(); rings = []
    for r, z in prof:
        rings.append([bm.verts.new((math.cos(i / seg * 2 * math.pi) * r, math.sin(i / seg * 2 * math.pi) * r, z)) for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if cap0: bm.faces.new(list(reversed(rings[0])))
    if cap1: bm.faces.new(rings[-1])
    return bm

def bm_sweep(pts, radii, seg, cap0=True, cap1=True, squash=1.0, up=None):
    """a tube along a polyline, ring radius per point (a claw if the last radius is ~0)"""
    pts = [Vector(p) for p in pts]; bm = bmesh.new(); rings = []
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector(up) if up is not None else (Vector((0, 0, 1)) if abs(t0.z) < .9 else Vector((1, 0, 0)))
    n = (ref - t0 * ref.dot(t0)).normalized()
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = (n - t * n.dot(t)).normalized(); b = t.cross(n)
        r = radii[i]
        rings.append([bm.verts.new(p + (n * math.cos(k / seg * 2 * math.pi) * squash + b * math.sin(k / seg * 2 * math.pi)) * r) for k in range(seg)])
    for a, c in zip(rings, rings[1:]):
        for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], c[(k + 1) % seg], c[k]))
    if cap0: bm.faces.new(list(reversed(rings[0])))
    if cap1: bm.faces.new(rings[-1])
    return bm

def spline(pts, k=6):
    """Catmull-Rom through the points, k samples per span"""
    P = [Vector(p) for p in pts]; P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]; out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(k):
            t = j / k; t2, t3 = t * t, t * t * t
            out.append(.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2]); return out

def axis_rot(axis):
    """rotation taking +z to a direction"""
    return Vector(axis).normalized().to_track_quat('Z', 'Y').to_matrix()

# ------------------------------------------------------------------ parts (world points, parent joint)
def bm_oct(bm, axis, w):
    """clip the four edges that run along one axis: an octagonal outline seen down that axis"""
    es = [e for e in bm.edges if abs((e.verts[1].co - e.verts[0].co).normalized()[axis]) > .8]
    if es and w > 1e-4: bmesh.ops.bevel(bm, geom=es, offset=w, segments=1, profile=.5, affect='EDGES', clamp_overlap=True)

def plate(m, size, p, parent, bev=.04, rot=None, top=(1, 1), bot=(1, 1), shift=(0, 0), hi=True, lo=True, loseg=1, oct=None):
    """a chamfered armour plate or block. oct=(axis, width): clip the corners seen down that axis first"""
    for lod in LODS(hi, lo):
        bm = bm_box(size, top, bot, shift)
        if oct and (lod == 'HI' or (loseg and sorted(size)[1] > .6)):
            ow = min(oct[1], sorted([size[i] for i in range(3) if i != oct[0]])[0] * .4); bm_oct(bm, oct[0], ow)
        if lod == 'HI':
            w = min(bev, min(size) * .42)
            if w >= .03 and min(size) > .07:
                bm_bevel(bm, w * .6, 1); bm_bevel(bm, min(w * .18, .016), 4)
            else:
                bm_bevel(bm, w, 3 if min(size) > .05 else 2)
        elif loseg and min(size) > .1: bm_bevel(bm, min(bev, min(size) * .4) * .8, 1)
        emit(bm, m, parent, p, rot, lod)

def splate(m, a, b, w, d, parent, bev=.04, off=(0, 0, 0), ext=0., top=(1, 1), bot=(1, 1), shift=(0, 0), hi=True, lo=True, loseg=1, side=(1, 0, 0), oct=None):
    """a plate running from world point a to b (w across, d deep)"""
    a, b = Vector(a), Vector(b); Mf = frame(a, b, Vector(side))
    c = (a + b) / 2 + Mf @ Vector(off)
    plate(m, (w, d, (b - a).length + 2 * ext), c, parent, bev, Mf, top, bot, shift, hi, lo, loseg, oct)
    return Mf

def tube(m, r, depth, p, parent, axis=(0, 0, 1), seg=None, r2=None, cap=True, hi=True, lo=True, loseg=None, bev=None, rot=None):
    for lod in LODS(hi, lo):
        s = seg if lod == 'HI' else (loseg or max(8, min(14, (seg or 32) // 3)))
        bm = bm_cyl(r, depth, s or 32, r2, cap)
        if lod == 'HI' and cap and (bev is None or bev > 0):
            bw = bev if bev is not None else min(r * .12, depth * .25)
            rim = [e for e in bm.edges if len(e.link_faces) == 2 and any(len(f.verts) > 4 for f in e.link_faces)]
            if rim: bmesh.ops.bevel(bm, geom=rim, offset=bw, segments=2, profile=.5, affect='EDGES', clamp_overlap=True)
        emit(bm, m, parent, p, rot if rot is not None else axis_rot(axis), lod)

def rod(m, a, b, r, parent, seg=None, r2=None, hi=True, lo=True, loseg=None, cap=True, bev=None):
    a, b = Vector(a), Vector(b)
    tube(m, r, (b - a).length, (a + b) / 2, parent, b - a, seg, r2, cap, hi, lo, loseg, bev)

def ball(m, r, p, parent, hi=True, lo=True):
    for lod in LODS(hi, lo):
        bm = bmesh.new(); u, v = (32, 16) if lod == 'HI' else (10, 6)
        bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
        emit(bm, m, parent, p, None, lod)

def rivet(p, n, r, parent, m='steel'):
    n = Vector(n).normalized()
    bm = bm_lathe([(r, 0), (r, r * .25), (r * .8, r * .5), (r * .4, r * .62)], 8, True, True)
    emit(bm, m, parent, Vector(p), axis_rot(n), 'HI')

def rivet_row(a, b, n, r, parent, step=.085, m='steel'):
    a, b = Vector(a), Vector(b); k = max(2, int((b - a).length / step) + 1)
    for i in range(k): rivet(a + (b - a) * (i / (k - 1)), n, r, parent, m)

def bolt(p, n, r, parent, m='steel'):
    n = Vector(n).normalized(); R = axis_rot(n)
    bm = bm_cyl(r, r * .75, 6)
    top = [f for f in bm.faces if f.normal.z > .9]
    if top: bmesh.ops.bevel(bm, geom=list(top[0].edges), offset=r * .18, segments=1, affect='EDGES', clamp_overlap=True)
    w = bm_cyl(r * 1.35, r * .22, 8); me = bpy.data.meshes.new('w')
    bmesh.ops.translate(w, verts=w.verts, vec=(0, 0, -r * .45)); w.to_mesh(me); w.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    emit(bm, m, parent, Vector(p) + n * r * .45, R, 'HI')

def bolt_row(a, b, n, count, r, parent, m='steel'):
    a, b = Vector(a), Vector(b)
    for i in range(count):
        t = i / (count - 1) if count > 1 else .5; bolt(a + (b - a) * t, n, r, parent, m)

def bolt_ring(c, axis, rad, count, r, parent, m='steel', phase=0.):
    c = Vector(c); ax = Vector(axis).normalized(); Rm = axis_rot(ax); u = Rm @ Vector((1, 0, 0)); w = Rm @ Vector((0, 1, 0))
    for i in range(count):
        a = phase + i / count * 2 * math.pi; bolt(c + (u * math.cos(a) + w * math.sin(a)) * rad, ax, r, parent, m)

def frame_pts(c, Rm, x, y, z):
    return Vector(c) + Rm @ Vector((x, y, z))

def armour(m, size, c, parent, Rm=None, face=(0, 1, 0), bev=.05, top=(1, 1), bot=(1, 1), layer=True, nb=2, br=None, seams=1,
           lo=True, hi=True, mlayer=None, inset=.12, rivets=True, hatch=True, oct=None):
    """an armour plate with a raised second layer on its outer face, seams across it and bolts in the corners.
    face is the outward direction in the plate's own axes. oct: clip width for the face outline (octagon), or None"""
    Rm = R3(Rm); sx, sy, sz = size; c = Vector(c)
    f0 = Vector(face); ax0 = max(range(3), key=lambda i: abs(f0[i]))
    plate(m, size, c, parent, bev, Rm, top, bot, hi=hi, lo=lo, oct=(ax0, oct) if oct else None)
    if not hi: return
    f = Vector(face); ax = max(range(3), key=lambda i: abs(f[i])); sg = 1 if f[ax] > 0 else -1
    dims = [sx, sy, sz]; t = dims[ax]; u_ax, v_ax = [i for i in range(3) if i != ax]
    kt = min(1.0, *top, *bot); du, dv = dims[u_ax] * kt, dims[v_ax] * kt
    def at(uu, vv, hh):
        q = [0, 0, 0]; q[ax] = sg * (t / 2 + hh); q[u_ax] = uu; q[v_ax] = vv; return frame_pts(c, Rm, *q)
    lt = min(.05, t * .35) if layer else 0
    if layer:
        ls = [0, 0, 0]; ls[ax] = lt; ls[u_ax] = du * (1 - inset * 2) * .92; ls[v_ax] = dv * (1 - inset * 2) * .92
        q = [0, 0, 0]; q[ax] = sg * (t / 2 + lt * .4)
        plate(mlayer or m, tuple(ls), frame_pts(c, Rm, *q), parent, min(.03, lt * .6), Rm, lo=False, oct=(ax, oct * .7) if oct else None)
    br = br or max(.018, min(.035, min(du, dv) * .035)); nrm = Rm @ f
    if nb:
        for su in (-1, 1):
            for sv in (-1, 1): bolt(at(su * du * .42, sv * dv * .42, 0), nrm, br, parent)
        if nb > 2:
            for su in (-1, 1): bolt(at(su * du * .42, 0, 0), nrm, br, parent)
            for sv in (-1, 1): bolt(at(0, sv * dv * .42, 0), nrm, br, parent)
    if rivets and min(du, dv) > .12:
        lu = du >= dv
        for sg2 in (-1, 1):
            if lu: rivet_row(at(-du * .34, sg2 * dv * .455, 0), at(du * .34, sg2 * dv * .455, 0), nrm, .014, parent)
            else: rivet_row(at(sg2 * du * .455, -dv * .34, 0), at(sg2 * du * .455, dv * .34, 0), nrm, .014, parent)
    if hatch and layer and du > .3 and dv > .3:
        hs = [0, 0, 0]; hs[ax] = .022; hs[u_ax] = du * .32; hs[v_ax] = dv * .24
        hq = [0, 0, 0]; hq[ax] = sg * (t / 2 + lt + .011); hq[u_ax] = du * .12; hq[v_ax] = dv * .14
        hc = frame_pts(c, Rm, *hq); plate(mlayer or m, tuple(hs), hc, parent, .01, Rm, lo=False)
        ua = Rm @ Vector([1 if i == u_ax else 0 for i in range(3)]); va = Rm @ Vector([1 if i == v_ax else 0 for i in range(3)])
        for k2 in (-1, 1):
            tube('gun', .016, du * .07, hc - va * dv * .125 + ua * k2 * du * .09 + nrm * .01, parent, ua, 12, lo=False)
        plate('gun', (.05, .05, .02) if ax == 2 else (.05, .02, .05) if ax == 1 else (.02, .05, .05), hc + va * dv * .1 + nrm * .014, parent, .006, None, lo=False)
        bolt(hc + ua * du * .13 + va * dv * .09, nrm, .014, parent); bolt(hc - ua * du * .13 + va * dv * .09, nrm, .014, parent)
    for i in range(seams):
        sz3 = [0, 0, 0]; sz3[ax] = .012; sz3[u_ax] = du * (1 - inset * 2) * .8; sz3[v_ax] = .014
        q = [0, 0, 0]; q[ax] = sg * (t / 2 + lt * .8 + .003)
        q[v_ax] = dv * (-.2 + .4 * i / (seams - 1)) if seams > 1 else -dv * .2
        plate('dark', tuple(sz3), frame_pts(c, Rm, *q), parent, .004, Rm, lo=False)

def piston(a, b, r, parent, frac=.5, boot=True, clevis=True, m='gun', lo=False):
    a, b = Vector(a), Vector(b); d = b - a; Ln = d.length; Rm = axis_rot(d); q = a + d * frac
    rod(m, a, q, r, parent, 32, lo=lo)
    tube('steel', r * 1.08, r * .5, a + d * (frac - .02), parent, d, 32, lo=False)
    for k in range(3): tube('dark', r * 1.03, r * .2, a + d * frac * (.2 + k * .25), parent, d, 32, lo=False, bev=0)
    rod('steel', q, b, r * .48, parent, 24, lo=False)
    cable([a + Rm @ Vector((r * 1.25, 0, r)), a + d * frac * .6 + Rm @ Vector((r * 1.5, 0, 0)), q + Rm @ Vector((r * 1.25, 0, -r * .5))], r * .18, parent, 'steel', seg=8, res=6)
    if boot:
        n = 9; z0, z1 = 0, Ln * (1 - frac) * .55; prof = []
        for i in range(n + 1):
            rr = r * (.78 if i % 2 else .62); prof.append((rr, z0 + (z1 - z0) * i / n))
        bm = bm_lathe(prof, 24, False, False); emit(bm, 'rubber', parent, q, Rm, 'HI')
    if clevis:
        for p, s in ((a, -1), (b, 1)):
            plate('gun', (r * 2.2, r * 1.3, r * 1.6), p + d.normalized() * s * r * .4, parent, r * .3, Rm, lo=False)
            tube('steel', r * .45, r * 2.6, p, parent, Rm @ Vector((1, 0, 0)), 12, lo=False)

def spring(a, b, r, parent, turns=7, wire=None):
    a, b = Vector(a), Vector(b); d = b - a; Rm = axis_rot(d); Ln = d.length; wire = wire or r * .16
    pts = [a + Rm @ Vector((math.cos(t / 40 * 2 * math.pi * turns) * r, math.sin(t / 40 * 2 * math.pi * turns) * r, Ln * t / (40))) for t in range(41)]
    pts = spline(pts, 3)
    emit(bm_sweep(pts, [wire] * len(pts), 8), 'trim', parent, (0, 0, 0), None, 'HI')

def cable(pts, r, parent, m='rubber', n=1, gap=None, res=10, seg=12, clamps=0):
    """a hose (or a bundle of n hoses side by side) through the points"""
    P = spline(pts, res); gap = gap or r * 2.3
    t0 = (P[1] - P[0]).normalized(); ref = Vector((0, 0, 1)) if abs(t0.z) < .9 else Vector((1, 0, 0)); side = t0.cross(ref).normalized()
    for k in range(n):
        o = side * (k - (n - 1) / 2) * gap
        Q = [p + o for p in P]
        emit(bm_sweep(Q, [r] * len(Q), seg), m, parent, (0, 0, 0), None, 'HI')
    for i in range(clamps):
        j = int((i + 1) / (clamps + 1) * (len(P) - 1)); t = (P[min(j + 1, len(P) - 1)] - P[max(j - 1, 0)]).normalized()
        tube('gun', r * (n * .85 + .55), r * 2.2, P[j], parent, t, 16, lo=False)

def claw(base, tip, r, parent, bend=(0, 0, -1), bendk=.35, m='steel', lo=True, seg=14, n=14, squash=.75):
    base, tip = Vector(base), Vector(tip); d = tip - base; mid = (base + tip) / 2 + Vector(bend).normalized() * d.length * bendk * .5
    pts = []
    for i in range(n + 1):
        t = i / n; pts.append(base * (1 - t) ** 2 + mid * 2 * t * (1 - t) + tip * t * t)
    for lod in LODS(True, lo):
        if lod == 'HI':
            rad = [r * (1 - (i / n) ** 1.3) + r * .02 for i in range(n + 1)]
            bm = bm_sweep(pts, rad, seg, True, True, squash, up=Vector(bend))
        else:
            P = [pts[0], pts[n // 2], pts[-1]]
            bm = bm_sweep(P, [r, r * .5, r * .04], 6, True, True, squash, up=Vector(bend))
        emit(bm, m, parent, (0, 0, 0), None, lod)

def jointcap(c, r, length, parent, axis=(1, 0, 0), m='gun', mc='dark', bolts_=14, lo=True):
    """a round joint: core, stepped end caps with a hub and a bolt circle"""
    c = Vector(c); ax = Vector(axis).normalized()
    tube(m, r * .86, length, c, parent, ax, 56, lo=lo, loseg=14)
    for s in (-1, 1):
        e = c + ax * s * length / 2
        tube(mc, r, length * .16, e - ax * s * length * .08, parent, ax, 56, lo=False)
        tube(m, r * .62, .05, e + ax * s * .02, parent, ax, 48, lo=False)
        tube('dark', r * .45, .03, e + ax * s * .05, parent, ax, 40, lo=False)
        Rm_ = axis_rot(ax); u_ = Rm_ @ Vector((1, 0, 0)); w_ = Rm_ @ Vector((0, 1, 0))
        for k in range(6):
            an_ = k / 6 * 2 * math.pi; d_ = (u_ * math.cos(an_) + w_ * math.sin(an_))
            plate('gun', (r * .1, r * .1, r * .1), e + ax * s * .04 + d_ * r * .52, parent, r * .03, axis_rot(ax), lo=False)
        tube('steel', r * .2, .08, e + ax * s * .05, parent, ax, 16, lo=False)
        if bolts_: bolt_ring(e + ax * s * .002, ax * s, r * .8, bolts_, max(.018, r * .06), parent)
        for k in range(3): tube('dark', r * .9, .012, c + ax * s * length * (.1 + k * .1), parent, ax, 56, lo=False, bev=0)

def vent(c, Rm, w, h, parent, n=None, depth=.08, mf='gun', ms='dark', lo=True, fins='h'):
    """a framed grille: four frame bars and louvres. Rm: plate axes (x across, z up, -y = outward? no: +y outward)"""
    Rm = R3(Rm); c = Vector(c); fb = min(w, h) * .1; n = n or max(3, int(h / .07))
    for x, z, sx, sz in ((0, h / 2 - fb / 2, w, fb), (0, -h / 2 + fb / 2, w, fb), (-w / 2 + fb / 2, 0, fb, h), (w / 2 - fb / 2, 0, fb, h)):
        plate(mf, (sx, depth, sz), frame_pts(c, Rm, x, 0, z), parent, fb * .3, Rm, lo=False)
    plate(ms, (w - fb * 1.6, depth * .3, h - fb * 1.6), frame_pts(c, Rm, 0, -depth * .35, 0), parent, .004, Rm, lo=False)
    inner = h - fb * 2
    for i in range(n):
        z = -inner / 2 + (i + .5) * inner / n
        plate(ms if mf != ms else 'gun', (w - fb * 2.1, depth * .25, inner / n * .55), frame_pts(c, Rm, 0, -depth * .05, z), parent, .004,
              Rm @ Euler((.5, 0, 0)).to_matrix(), lo=False)
    if lo: plate(ms, (w, depth * .6, h), frame_pts(c, Rm, 0, -depth * .2, 0), parent, 0, Rm, hi=False, loseg=0)

def greeble(c, size, parent, seed=1, n=14, Rm=None, ms=('gun', 'dark', 'steel'), lo=False, k=3):
    """machinery packed into a gap: motors, blocks, pipes and brackets, kept inside the box c +- size/2"""
    rnd = random.Random(seed); Rm = R3(Rm); c = Vector(c); sx, sy, sz = size
    for i in range(n * k):
        k = rnd.random(); p = frame_pts(c, Rm, (rnd.random() - .5) * sx * .8, (rnd.random() - .5) * sy * .8, (rnd.random() - .5) * sz * .8)
        m = ms[rnd.randrange(len(ms))] if k > .3 else 'dark'
        if k < .38:
            ax = Rm @ [Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))][rnd.randrange(3)]
            r = min(sx, sy, sz) * (.12 + rnd.random() * .16); L_ = min(sx, sy, sz) * (.3 + rnd.random() * .5)
            tube('gun', r, L_, p, parent, ax, 32, lo=False)
            for s in (-1, 1): tube('dark', r * 1.08, L_ * .12, p + ax * s * L_ * .4, parent, ax, 32, lo=False)
            for k2 in range(3): tube('dark', r * 1.03, L_ * .04, p + ax * (k2 - 1) * L_ * .18, parent, ax, 32, lo=False, bev=0)
            if rnd.random() < .5: bolt_ring(p + ax * L_ * .5, ax, r * .7, 6, max(.012, r * .1), parent)
        elif k < .75:
            s3 = (sx * (.12 + rnd.random() * .25), sy * (.12 + rnd.random() * .25), sz * (.1 + rnd.random() * .25))
            plate(m, s3, p, parent, min(s3) * .15, Rm, lo=False)
            if rnd.random() < .5: bolt(p + Rm @ Vector((0, 0, s3[2] / 2)), Rm @ Vector((0, 0, 1)), max(.012, min(s3) * .08), parent)
        else:
            q = p + Rm @ Vector(((rnd.random() - .5) * sx * .7, (rnd.random() - .5) * sy * .7, (rnd.random() - .5) * sz * .7))
            mid = (p + q) / 2 + Rm @ Vector((0, 0, sz * .1))
            cable([p, mid, q], min(sx, sy, sz) * (.03 + rnd.random() * .03), parent, 'rubber' if rnd.random() < .6 else 'steel', seg=10)
    if lo: plate('dark', size, c, parent, 0, Rm, hi=False, loseg=0)

def lamp(c, size, parent, Rm=None, lo=True):
    plate('eye', size, c, parent, min(size) * .3, Rm, lo=lo, loseg=0)

DECAL_MAT = 'decal'

def decal(rect, w, h, c, n, parent, up=(0, 0, 1), lo=True, off=.006, mat=None):
    """a flat quad facing n showing rect (u0, v0, u1, v1) of the decal sheet (v measured from the bottom)"""
    n = Vector(n).normalized(); upv = Vector(up); upv = (upv - n * upv.dot(n)).normalized(); rt = upv.cross(n)
    u0, v0, u1, v1 = rect; c = Vector(c) + n * off
    for lod in LODS(True, lo):
        bm = bmesh.new(); uv = bm.loops.layers.uv.verify()
        vs = [bm.verts.new(c + rt * x * w / 2 + upv * z * h / 2) for x, z in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        f = bm.faces.new(vs)
        for l, (a, b) in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))): l[uv].uv = (a, b)
        if f.normal.dot(n) < 0: bmesh.ops.reverse_faces(bm, faces=[f])
        T = Matrix.Translation(-JW[parent.name]); bmesh.ops.transform(bm, matrix=T, verts=bm.verts)
        me = bpy.data.meshes.new('t'); bm.to_mesh(me); bm.free()
        k = (parent.name, mat or DECAL_MAT, lod)
        if k not in ACC: a = bmesh.new(); a.loops.layers.uv.verify(); ACC[k] = a
        ACC[k].from_mesh(me); bpy.data.meshes.remove(me)

# areas of the decal sheet (tex/howler-decals.webp, 1024 px), v from the bottom
D = {
    '07': (.04, .64, .50, .965), 'hazard': (.04, .585, .45, .64), 'wolf': (.52, .58, .98, .975),
    'warn': (.035, .3, .18, .47), 'hot': (.21, .3, .36, .47), 'volt': (.39, .3, .54, .47), 'pinch': (.56, .3, .71, .47),
    'armor': (.74, .475, .97, .53), 'pwr': (.74, .42, .97, .465), 'cool': (.74, .365, .97, .41), 'hyd': (.74, .305, .97, .355),
    'maint': (.035, .19, .35, .275), 'service': (.39, .19, .70, .275), 'lift': (.74, .175, .97, .27),
    '12': (.029, .748, .309, .951), '09': (.347, .748, .646, .951), '31': (.686, .748, .979, .951),     # classes-decals.webp only
    'wstripes': (.01, .59, .485, .66), 'ystripes': (.518, .59, .992, .66),
    'intake': (.035, .12, .25, .165), 'exhaust': (.27, .12, .50, .165), 'stripes': (.035, .015, .37, .105), 'nostep': (.40, .02, .78, .1),
}

def frame_rivets(c, F, w, d, Ln, parent, step=.09):
    """rivet lines down the four long edges of a frame member (axes F: x across, y front, z along)"""
    c = Vector(c)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = c + F @ Vector((sx * (w / 2 + .004), sy * d * .36, -Ln * .4)); b = c + F @ Vector((sx * (w / 2 + .004), sy * d * .36, Ln * .4))
            rivet_row(a, b, F @ Vector((sx, 0, 0)), .013, parent, step)

def pipe(pts, r, parent, clamps=3, m='steel'):
    """a hydraulic line with bolted clamps"""
    cable(pts, r, parent, m, n=1, seg=12, clamps=0)
    P = spline(pts, 10)
    for i in range(clamps):
        j = int((i + 1) / (clamps + 1) * (len(P) - 1)); t = (P[min(j + 1, len(P) - 1)] - P[max(j - 1, 0)]).normalized()
        tube('gun', r * 2.2, r * 2.4, P[j], parent, t, 16, lo=False)
        nrm = t.cross(Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0))).normalized()
        plate('dark', (r * 5, r * 1.2, r * 2), P[j] + nrm * r * 2.5, parent, r * .3, axis_rot(nrm), lo=False)
        bolt(P[j] + nrm * r * 3.2, nrm, r * .7, parent)
