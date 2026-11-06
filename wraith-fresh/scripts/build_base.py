"""Build the blank Wraith base parts from profiles.json (two-view prism
intersection per part).  usage: python build_base.py profiles.json out.blend"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector
import blib

MATS = {}
def materials():
    MATS['orange'] = blib.mat('Paint_Orange', (0.62, 0.19, 0.022), metal=0.15, rough=0.45, coat=0.25)
    MATS['dark']   = blib.mat('Frame_Gunmetal', (0.07, 0.064, 0.058), metal=0.8, rough=0.42)
    MATS['steel']  = blib.mat('Steel_Light', (0.42, 0.42, 0.43), metal=1.0, rough=0.28)
    MATS['plate']  = blib.mat('Plate_Grey', (0.16, 0.16, 0.17), metal=0.8, rough=0.45)
    MATS['glow']   = blib.mat('Glow_Amber', (1.0, 0.45, 0.05), metal=0.0, rough=0.3, emit=(1.0, 0.42, 0.04), emit_strength=8.0)
    MATS['white']  = blib.mat('Paint_White', (0.75, 0.72, 0.66), metal=0.1, rough=0.5)
    MATS['rubber'] = blib.mat('Rubber_Black', (0.02, 0.02, 0.02), metal=0.0, rough=0.7)
    return MATS

def tshape(kind, arg, mn, mx):
    """Top-view (XY) shaping polygon spanning the part's bbox exactly, so the
    front/side silhouette extents are preserved."""
    x0, x1, y0, y1 = mn.x - 1e-3, mx.x + 1e-3, mn.y - 1e-3, mx.y + 1e-3
    dx, dy = x1 - x0, y1 - y0
    if kind == 'oct':
        c = arg * min(dx, dy)
        return [(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c), (x0, y0 + c)]
    if kind == 'rrect':
        r = arg * min(dx, dy); pts = []
        for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
            for i in range(7):
                a = math.radians(a0 + i * 15)
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        return pts
    if kind == 'vfront':   # pointed (V) front, chamfered back; arg = depth of the V as fraction of dy
        d = arg * dy; c = 0.12 * min(dx, dy); xm = (x0 + x1) / 2
        w = 0.18 * dx
        return [(xm - w * 0.25, y0), (xm + w * 0.25, y0), (x1, y0 + d), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c), (x0, y0 + d)]
    if kind == 'vfront_half':  # mirror parts: V towards the inner (x0) side is not wanted; taper the front-outer corner
        d = arg * dy; c = 0.12 * min(dx, dy)
        return [(x0, y0), (x1 - 0.45 * dx, y0), (x1, y0 + d), (x1, y1 - c), (x1 - c, y1), (x0, y1)]
    raise ValueError(kind)

PXM = 0.02
def X(u): return (u - 518.0) * PXM
def Y(u): return (u - 930.0) * PXM
def Z(v): return (519.5 - v) * PXM

def mark_sharp(ob, w_new=1.0):
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    bw = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(28):
            e[bw] = w_new
        elif len(e.link_faces) != 2:
            e[bw] = 0.0
    bm.to_mesh(me); bm.free()

def mark_pockets(ob, w=0.3):
    """weight new sharp edges (from pocket cuts) lower than primary edges"""
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    bw = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
    for e in bm.edges:
        if e[bw] == 0.0 and len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(28):
            e[bw] = w
    bm.to_mesh(me); bm.free()

def seam_cutter(name, seams, mn, mx, coll, gap=0.022):
    """seams: list of (view, (u1,v1), (u2,v2)).  Each becomes a thin slab
    containing the view direction (full depth) between the two points."""
    bm = bmesh.new()
    for view, a, c in seams:
        if view == 'F':
            p1 = Vector((X(a[0]), 0, Z(a[1]))); p2 = Vector((X(c[0]), 0, Z(c[1]))); free = Vector((0, 1, 0))
            fc = (mn.y + mx.y) / 2; fl = (mx.y - mn.y) / 2 + 0.3
            p1.y = p2.y = fc
        else:
            p1 = Vector((0, Y(a[0]), Z(a[1]))); p2 = Vector((0, Y(c[0]), Z(c[1]))); free = Vector((1, 0, 0))
            fc = (mn.x + mx.x) / 2; fl = (mx.x - mn.x) / 2 + 0.3
            p1.x = p2.x = fc
        t = (p2 - p1); L = t.length; t.normalize()
        n = t.cross(free).normalized()
        ctr = (p1 + p2) / 2
        vs = []
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    vs.append(bm.verts.new(ctr + t * (L / 2) * sx + free * fl * sy + n * (gap / 2) * sz))
        idx = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        for q in idx: bm.faces.new([vs[k] for k in q])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return blib.mesh_from_bm(name, bm, coll)

def shrink_profiles(polys, d):
    from shapely.geometry import Polygon
    out = []
    for o, h in polys:
        g = Polygon(o).buffer(-d, join_style=2)
        if g.is_empty: continue
        gs = [g] if g.geom_type == 'Polygon' else list(g.geoms)
        for q in gs:
            if q.area > 1e-4: out.append([list(q.exterior.coords[:-1]), []])
    return out

def build_part(p, coll):
    name = p['name']
    F = [[o, []] for o, h in p['F']]
    S = [[o, []] for o, h in p['S']]
    fx = [c[0] for o, h in F for c in o]; fz = [c[1] for o, h in F for c in o]
    sy = [c[0] for o, h in S for c in o]; sz = [c[1] for o, h in S for c in o]
    m = 0.5
    obF = blib.prism(name, F, 'Y', min(sy) - m, max(sy) + m, coll)
    obS = blib.prism(name + '_S', S, 'X', min(fx) - m, max(fx) + m, coll)
    blib.boolean(obF, obS, 'INTERSECT')
    if len(obF.data.vertices) == 0:
        print('EMPTY after F∩S', name); return obF
    zlo, zhi = min(fz + sz) - m, max(fz + sz) + m
    if p.get('T'):
        T = [[[(x * 0.02, y * 0.02) for x, y in p['T']], []]]
        obT = blib.prism(name + '_T', T, 'Z', zlo, zhi, coll)
        blib.boolean(obF, obT, 'INTERSECT')
    shp = p.get('shape') or (('oct', p.get('chamfer', 0.0)) if p.get('chamfer', 0.0) > 0 else None)
    if shp:
        mn, mx = blib.bbox(obF)
        pts = tshape(shp[0], shp[1], mn, mx)
        obT = blib.prism(name + '_C', [[pts, []]], 'Z', zlo, zhi, coll)
        blib.boolean(obF, obT, 'INTERSECT')
    me = obF.data
    me.materials.clear()
    me.materials.append(MATS[p['mat']])
    mark_sharp(obF)
    if p.get('seams'):
        mn, mx = blib.bbox(obF)
        for k, sm in enumerate(p['seams']):
            cut = seam_cutter(name + f'_seam{k}', [sm], mn, mx, coll)
            blib.boolean(obF, cut, 'DIFFERENCE')
        mark_sharp(obF)
        if p.get('core', True):
            q = dict(p); q['name'] = name + '_core'; q['seams'] = None; q['mat'] = 'dark'
            q['F'] = [[o, []] for o, h in shrink_profiles(p['F'], 0.03)]
            q['S'] = [[o, []] for o, h in shrink_profiles(p['S'], 0.03)]
            q['T'] = None if not p.get('T') else p['T']
            if q['F'] and q['S']:
                core = build_part(q, coll)
    for poly in obF.data.polygons: poly.use_smooth = True
    obF['kind'] = p['kind']; obF['bevel'] = p.get('bevel', 0.03)
    return obF

def finish_part(ob, kind, bevel, segments=3):
    if kind == 'mirror':
        mm = ob.modifiers.new('mirror', 'MIRROR'); mm.use_axis[0] = True; mm.use_mirror_merge = False
    b = ob.modifiers.new('bevel', 'BEVEL')
    b.width = bevel; b.segments = segments; b.limit_method = 'WEIGHT'
    b.use_clamp_overlap = True; b.harden_normals = False
    b.miter_outer = 'MITER_ARC'
    wn = ob.modifiers.new('wnormal', 'WEIGHTED_NORMAL')
    wn.mode = 'FACE_AREA'; wn.weight = 50; wn.keep_sharp = True; wn.thresh = 0.01

def main(prof_json, out_blend):
    blib.reset()
    materials()
    coll = blib.get_coll('Wraith_Base')
    parts = json.load(open(prof_json))
    for p in parts:
        ob = build_part(p, coll)
        finish_part(ob, p['kind'], p.get('bevel', 0.03))
        print('built', p['name'], len(ob.data.vertices), 'verts')
    print('triangles', blib.tri_count(coll.objects))
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
