"""Mechanical detail layer for the Wraith, placed from reference-sheet pixel
coordinates by ray-casting onto the base parts (so every detail sits on the
surface exactly where the drawing shows it)."""
import math
import bpy, bmesh
from mathutils import Vector, Matrix
import blib

PX = 0.02
def X(u): return (u - 518.0) * PX
def Y(u): return (u - 930.0) * PX
def Z(v): return (519.5 - v) * PX
def XR(u): return (1382.0 - u) * PX

AX = Vector((1, 0, 0)); AY = Vector((0, 1, 0)); AZ = Vector((0, 0, 1))

class Buckets:
    """Accumulate generated geometry per (material, mirrored)."""
    def __init__(self, mats, coll):
        self.mats = mats; self.coll = coll; self.bms = {}
    def bm(self, mat, mirror):
        k = (mat, mirror)
        if k not in self.bms: self.bms[k] = bmesh.new()
        return self.bms[k]
    def finish(self, bevel=0.006, segs=3):
        out = []
        for (mat, mirror), bm in self.bms.items():
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bw = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
            for e in bm.edges:
                if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(28): e[bw] = 1.0
            for f in bm.faces: f.smooth = True
            name = f'Detail_{mat}' + ('_M' if mirror else '')
            ob = blib.mesh_from_bm(name, bm, self.coll)
            ob.data.materials.append(self.mats[mat])
            if mirror:
                m = ob.modifiers.new('mirror', 'MIRROR'); m.use_axis[0] = True; m.use_mirror_merge = False
            b = ob.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = segs
            b.limit_method = 'WEIGHT'; b.use_clamp_overlap = True; b.harden_normals = False
            wn = ob.modifiers.new('wnormal', 'WEIGHTED_NORMAL'); wn.mode = 'FACE_AREA'; wn.weight = 50; wn.keep_sharp = True
            out.append(ob)
        self.bms = {}
        return out

def basis_from(z, up_hint=AZ):
    z = z.normalized()
    x = up_hint.cross(z)
    if x.length < 1e-4: x = AY.cross(z)
    x.normalize(); y = z.cross(x)
    return Matrix((x, y, z)).transposed()   # columns x,y,z

def add_cyl(bm, p0, p1, r, seg=48, r1=None):
    p0 = Vector(p0); p1 = Vector(p1)
    d = p1 - p0; L = d.length
    R = basis_from(d, AX if abs(d.normalized().dot(AZ)) > 0.9 else AZ).to_4x4()
    M = Matrix.Translation((p0 + p1) / 2) @ R
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                          radius2=(r if r1 is None else r1), depth=L, matrix=M)

def add_box(bm, c, size, R=None):
    R = (R or Matrix.Identity(3)).to_4x4()
    M = Matrix.Translation(Vector(c)) @ R @ Matrix.Diagonal(Vector((*size, 1)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=M)

def add_ring(bm, c, axis, r_out, r_in, t, seg=64):
    """flat washer/ring (tube) centred at c along axis, thickness t"""
    axis = Vector(axis).normalized()
    R = basis_from(axis, AZ if abs(axis.dot(AZ)) < 0.9 else AX)
    vs_o0, vs_o1, vs_i0, vs_i1 = [], [], [], []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        d = R @ Vector((math.cos(a), math.sin(a), 0))
        vs_o0.append(bm.verts.new(Vector(c) + d * r_out - axis * t / 2))
        vs_o1.append(bm.verts.new(Vector(c) + d * r_out + axis * t / 2))
        vs_i0.append(bm.verts.new(Vector(c) + d * r_in - axis * t / 2))
        vs_i1.append(bm.verts.new(Vector(c) + d * r_in + axis * t / 2))
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new([vs_o0[i], vs_o0[j], vs_o1[j], vs_o1[i]])
        bm.faces.new([vs_i0[j], vs_i0[i], vs_i1[i], vs_i1[j]])
        bm.faces.new([vs_o1[i], vs_o1[j], vs_i1[j], vs_i1[i]])
        bm.faces.new([vs_o0[j], vs_o0[i], vs_i0[i], vs_i0[j]])

def add_hose(bm, pts, r, seg=16, res=10):
    """tube along a Catmull-Rom spline through pts"""
    P = [Vector(p) for p in pts]
    path = []
    for i in range(len(P) - 1):
        p0 = P[max(i - 1, 0)]; p1 = P[i]; p2 = P[i + 1]; p3 = P[min(i + 2, len(P) - 1)]
        for k in range(res):
            t = k / res
            t2, t3 = t * t, t * t * t
            path.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    path.append(P[-1])
    rings = []
    prev_x = None
    for i, p in enumerate(path):
        tdir = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        if prev_x is None:
            x = AZ.cross(tdir)
            if x.length < 1e-3: x = AX.cross(tdir)
        else:
            x = prev_x - tdir * prev_x.dot(tdir)
        x.normalize(); y = tdir.cross(x); prev_x = x
        rings.append([bm.verts.new(p + (x * math.cos(2 * math.pi * k / seg) + y * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(seg):
            j = (k + 1) % seg
            bm.faces.new([a[k], a[j], b[j], b[k]])
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])

# ---------------------------------------------------------------- ray utils
def ray(view, u, v, side=+1):
    """Cast from a reference view at pixel (u,v). side=-1 casts the side view
    from -X (for the mirrored half).  Returns (loc, normal, obj) or None."""
    dg = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    if view == 'front':
        o = Vector((X(u), -60, Z(v))); d = Vector((0, 1, 0))
    elif view == 'side':
        o = Vector((60 * side, Y(u), Z(v))); d = Vector((-side, 0, 0))
    elif view == 'rear':
        o = Vector((XR(u), 60, Z(v))); d = Vector((0, -1, 0))
    elif view == 'inner':   # from the centre plane outward to +X at side coords
        o = Vector((0.05, Y(u), Z(v))); d = Vector((1, 0, 0))
    hit, loc, nrm, idx, ob, mw = sc.ray_cast(dg, o, d)
    if not hit: return None
    return loc, nrm, ob

# ---------------------------------------------------------------- features
class Cutter:
    """Boolean pockets into the base parts (before mirror/bevel modifiers)."""
    def __init__(self, base_objs):
        self.base = [o for o in base_objs if o.type == 'MESH']
        self.bb = {o.name: blib.bbox(o) for o in self.base}
    def cut(self, bm_builder, name='pocket'):
        bm = bmesh.new(); bm_builder(bm)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        vs = [v.co.copy() for v in bm.verts]
        mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
        mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
        coll = self.base[0].users_collection[0]
        n = 0
        for o in self.base:
            a, b = self.bb[o.name]
            if a.x > mx.x or b.x < mn.x or a.y > mx.y or b.y < mn.y or a.z > mx.z or b.z < mn.z: continue
            bm2 = bm.copy()
            c = blib.mesh_from_bm(name, bm2, coll)
            blib.boolean(o, c, 'DIFFERENCE')
            n += 1
        bm.free()
        return n

def frame_at(n, up_hint=AZ):
    return basis_from(n, up_hint if abs(n.normalized().dot(up_hint)) < 0.95 else AY)

def box_pocket(C, loc, R, sx, sy, depth):
    n = R.col[2]
    ctr = loc + n * (0.06 - depth) / 2
    C.cut(lambda bm: add_box(bm, ctr, (sx, sy, depth + 0.06), R))

def disc_in_pocket(bms, C, surf, axis, r, depth=0.08, seg=128):
    """Recess a round pocket at surf (outward axis) and fill it with a joint disc."""
    bm_dark, bm_plate, bm_steel = bms
    a = Vector(axis).normalized(); surf = Vector(surf)
    C.cut(lambda bm: add_cyl(bm, surf - a * depth, surf + a * 0.08, r + 0.012, seg))
    b = surf - a * depth
    add_cyl(bm_dark, b - a * 0.01, b + a * depth * 0.45, r, seg)
    add_ring(bm_plate, b + a * depth * 0.55, a, r * 0.95, r * 0.64, depth * 0.3, seg)
    add_cyl(bm_dark, b + a * depth * 0.4, b + a * depth * 0.7, r * 0.6, seg)
    add_cyl(bm_plate, b + a * depth * 0.6, b + a * depth * 0.85, r * 0.36, seg)
    add_cyl(bm_steel, b + a * depth * 0.8, b + a * depth * 0.97, r * 0.17, 64)
    R = basis_from(a)
    n_b = 8 if r > 0.2 else 6
    for k in range(n_b):
        ang = 2 * math.pi * (k + 0.5) / n_b
        p = b + R @ Vector((math.cos(ang) * r * 0.8, math.sin(ang) * r * 0.8, 0))
        add_cyl(bm_steel, p + a * depth * 0.4, p + a * depth * 0.88, max(0.016, r * 0.055), 20)

def slats(bm, loc, R, w, h, nslat, depth, horizontal=True, thick=0.022):
    """Grille slats inside a pocket whose outer surface centre is loc."""
    n = R.col[2]
    for k in range(nslat):
        t = (-0.5 + (k + 0.5) / nslat)
        off = R @ Vector((0, t * h, 0)) if horizontal else R @ Vector((t * w, 0, 0))
        sz = (w, thick, depth * 0.7) if horizontal else (thick, h, depth * 0.7)
        add_box(bm, loc - n * depth * 0.5 + off, sz, R)

def build_details(mats, coll, base_objs):
    B = Buckets(mats, coll)
    C = Cutter(base_objs)
    dk = lambda m=True: B.bm('dark', m)
    pl = lambda m=True: B.bm('plate', m)
    st = lambda m=True: B.bm('steel', m)
    gl = lambda m=True: B.bm('glow', m)

    # ---- recessed joint discs on the legs (+X side; mirrored by modifier)
    joints = [('knee', 914, 331, 16, True, True), ('ankle', 985, 382, 14, True, True),
              ('hip', 945, 262, 13, True, False), ('footj', 940, 467, 9, True, True)]
    for name, us, v, rp, outer, inner in joints:
        r = rp * PX
        if outer:
            h = ray('side', us, v)
            if h: disc_in_pocket((dk(), pl(), st()), C, Vector((h[0].x, Y(us), Z(v))), AX, r)
            else: print('no hit outer', name)
        if inner:
            h = ray('inner', us, v)
            if h and h[0].x > 0.2: disc_in_pocket((dk(), pl(), st()), C, Vector((h[0].x, Y(us), Z(v))), -AX, r * 0.9)
            else: print('no hit inner', name)
    # axles (inside the silhouette)
    add_cyl(dk(), (X(541), Y(945), Z(257)), (X(570), Y(945), Z(257)), 17 * PX, 128)
    for k in range(3):
        add_ring(pl(), (X(546 + k * 9), Y(945), Z(257)), AX, 18.2 * PX, 15 * PX, 0.05, 128)
    add_cyl(dk(), (X(568), Y(950), Z(138)), (X(594), Y(950), Z(138)), 25 * PX, 128)
    for k in range(3):
        add_ring(pl(), (X(573 + k * 8), Y(950), Z(138)), AX, 26 * PX, 22 * PX, 0.06, 128)
    add_cyl(dk(), (X(605), Y(946), Z(201)), (X(631), Y(946), Z(201)), 9.5 * PX, 96)

    # ---- metatarsus pistons on the inner face (visible in 3/4 views)
    hp = ray('inner', 965, 425)
    if hp:
        xin = hp[0].x
        for (u0, v0, u1, v1, rr, dx) in ((978, 396, 942, 462, 3.0, 0.035), (962, 392, 926, 456, 2.4, 0.03)):
            p0 = Vector((xin + dx, Y(u0), Z(v0))); p1 = Vector((xin + dx, Y(u1), Z(v1)))
            mid = p0.lerp(p1, 0.55)
            add_cyl(dk(), p0, mid, rr * 1.5 * PX, 64)
            add_cyl(st(), mid - (p1 - p0).normalized() * 0.1, p1, rr * PX, 64)
            add_ring(pl(), mid, (p1 - p0), rr * 1.8 * PX, rr * 0.9 * PX, 0.03, 32)

    # ---- chest vents (front view, recessed, glowing)
    for uc in (486, 550):
        h = ray('front', uc, 155)
        if not h: continue
        loc, n, ob = h
        R = frame_at(n)
        w, hh, dep = 26 * PX, 11 * PX, 0.08
        box_pocket(C, loc, R, w, hh, dep)
        add_box(gl(False), loc - n * (dep - 0.015), (w, hh, 0.03), R)
        slats(dk(False), loc, R, w, hh, 4, dep)
    # chest centre grille
    h = ray('front', 518, 171)
    if h:
        loc, n, ob = h; R = frame_at(Vector((0, -1, 0)))
        box_pocket(C, loc, R, 15 * PX, 28 * PX, 0.09)
        slats(pl(False), loc, R, 15 * PX, 28 * PX, 6, 0.09)
    # abdomen ribs (recessed slots)
    for v in (193, 200, 207, 214):
        h = ray('front', 518, v)
        if h:
            loc = h[0]; R = frame_at(Vector((0, -1, 0)))
            box_pocket(C, loc, R, 34 * PX, 2.6 * PX, 0.05)
    # ---- head: eye glow stripe along the snout (both sides)
    for side in (1, -1):
        pts = []
        for (u, v) in ((836, 104), (858, 100.5), (880, 97)):
            hh_ = ray('side', u, v, side)
            if hh_: pts.append(hh_[0] - Vector((0.004 * side, 0, 0)))
        if len(pts) == 3: add_hose(gl(False), pts, 1.9 * PX, 12, 6)
    # ---- forearm attachment interface plate + glow slot (outer face)
    ang = math.atan2(Z(262) - Z(222), Y(890) - Y(940))
    h = ray('side', 912, 242)
    if h:
        loc, n, ob = h
        up = Vector((0, math.cos(ang), math.sin(ang)))
        R = Matrix((up.cross(AX).normalized(), up, AX)).transposed()
        box_pocket(C, loc, R, 17 * PX, 46 * PX, 0.05)
        add_box(pl(), loc - AX * 0.04, (15 * PX, 42 * PX, 0.07), R)
        box_pocket(C, loc - AX * 0.005, R, 4.5 * PX, 24 * PX, 0.03)
        add_box(gl(), loc - AX * 0.025, (4 * PX, 23 * PX, 0.02), R)
        for sgn in (-1, 1):
            add_cyl(st(), loc + up * sgn * 17 * PX - AX * 0.03, loc - AX * 0.004 + up * sgn * 17 * PX, 2.4 * PX, 24)
    # ---- backpack rear: recessed back plate, side vents, glow slits
    h = ray('rear', 1382, 138)
    if h:
        loc, n, ob = h
        yb = loc.y; R = frame_at(AY)
        surf = Vector((0, yb, Z(138)))
        box_pocket(C, surf, R, 58 * PX, 82 * PX, 0.07)
        add_box(pl(False), (0, yb - 0.045, Z(138)), (54 * PX, 0.06, 78 * PX))
        add_box(dk(False), (0, yb - 0.02, Z(105)), (18 * PX, 0.04, 5 * PX))
        add_box(dk(False), (0, yb - 0.02, Z(176)), (18 * PX, 0.04, 8 * PX))
        for sx in (-1, 1):
            for sz in (-1, 1):
                add_cyl(st(False), (sx * 23 * PX, yb - 0.03, Z(138) + sz * 35 * PX), (sx * 23 * PX, yb - 0.008, Z(138) + sz * 35 * PX), 2.2 * PX, 32)
    for uc in (1336, 1428):
        h = ray('rear', uc, 143)
        if not h: continue
        loc = h[0]; xc = XR(uc); R = frame_at(AY)
        surf = Vector((xc, loc.y, Z(143)))
        box_pocket(C, surf, R, 26 * PX, 48 * PX, 0.09)
        slats(st(False), surf, R, 25 * PX, 46 * PX, 9, 0.09)
        for v0, v1 in ((151, 163), (171, 181)):
            xg = XR(1345.5) if uc < 1382 else XR(1418.5)
            s2 = Vector((xg, loc.y, Z((v0 + v1) / 2)))
            box_pocket(C, s2, R, 3.6 * PX, (v1 - v0) * PX, 0.04)
            add_box(gl(False), s2 - AY * 0.025, (3.4 * PX, 0.03, (v1 - v0) * PX))
    # ---- backpack side glows (side view)
    for (u, v, w, hgt, ang) in ((1014, 54, 24, 5, 0.0), (1017, 188, 22, 6, 0.45), (1024, 160, 4, 18, 0.0)):
        h = ray('side', u, v)
        if h:
            loc = h[0]; R = Matrix.Rotation(ang, 3, 'X')
            box_pocket(C, loc, frame_at(AX) if False else Matrix((AY, AZ, AX)).transposed() @ Matrix.Rotation(ang, 3, 'Z'), w * PX, hgt * PX, 0.04)
            add_box(gl(), loc - AX * 0.022, (0.03, w * PX, hgt * PX), R)
    # ---- antenna glow tip
    add_cyl(gl(False), (X(556.0), Y(975.5), Z(46)), (X(559.5), Y(975.5), Z(13)), 2.8 * PX, 24)
    # ---- neck hoses (inside the neck silhouette)
    for sx in (1, -1):
        for k, (xo, r) in enumerate(((10, 2.8), (20, 2.2))):
            x = sx * xo * PX
            add_hose(dk(False), [(x, Y(906), Z(97)), (x, Y(918), Z(84)), (x * 1.15, Y(938), Z(88)), (x * 1.25, Y(948), Z(104))], r * PX, 24, 14)
    for sx in (1, -1):
        x = sx * 19 * PX
        add_hose(dk(False), [(x, Y(895), Z(191)), (x * 1.05, Y(890), Z(205)), (x * 1.1, Y(897), Z(220))], 2.4 * PX, 24, 14)
    return B.finish()

def cut_mount_holes(ob):
    """Holes in the shoulder mounting interface plates (mirror part, +X mesh)."""
    import blib as _b
    vs = [v.co for v in ob.data.vertices]
    ztop = max(v.z for v in vs)
    bm = bmesh.new()
    for uf in (590, 632):
        for us in (964, 990):
            add_cyl(bm, (X(uf), Y(us), ztop - 0.06), (X(uf), Y(us), ztop + 0.1), 3.4 * PX, 24)
    cut = _b.mesh_from_bm('mount_holes', bm, ob.users_collection[0])
    _b.boolean(ob, cut, 'DIFFERENCE')
