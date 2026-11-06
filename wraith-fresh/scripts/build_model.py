"""Full blank-model build: base parts (two-view prism intersections) + seams
+ mechanical detail layer + bolts.  usage:
  python build_model.py profiles.json out.blend [bevel_segments]"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector
import blib, build_base as BB, details as DT

def bolts_for(obj, bucket, spacing=0.14):
    me = obj.data
    placed = []
    for f in me.polygons:
        if f.area < 0.22 or len(f.vertices) < 3: continue
        c = f.center; n = f.normal
        vs = [me.vertices[i].co for i in f.vertices]
        k = len(vs); cands = []
        for i in range(k):
            a = vs[i - 1] - vs[i]; b = vs[(i + 1) % k] - vs[i]
            if a.length < 1e-4 or b.length < 1e-4: continue
            ang = a.angle(b)
            if ang < math.radians(150) and min(a.length, b.length) > 0.16:
                d = (c - vs[i]); 
                if d.length < 0.2: continue
                cands.append(vs[i] + d.normalized() * 0.1)
        for p in cands[:4]:
            if any((p - q).length < spacing for q in placed): continue
            placed.append(p)
            DT.add_cyl(bucket, p - n * 0.01, p + n * 0.022, 0.028, 20, r1=0.022)
    return len(placed)

def main(prof_json, out_blend, segs=3):
    blib.reset()
    mats = BB.materials()
    coll = blib.get_coll('Wraith')
    parts = json.load(open(prof_json))
    built = {}
    for p in parts:
        ob = BB.build_part(p, coll)
        built[p['name']] = (ob, p)
    if 'shoulder_mount' in built:
        DT.cut_mount_holes(built['shoulder_mount'][0])
    # bolts on painted armour (before modifiers; mirrored parts -> mirrored bucket)
    B = DT.Buckets(mats, coll)
    nb = 0
    for name, (ob, p) in built.items():
        if p['mat'] != 'orange' or name.endswith('_core'): continue
        nb += bolts_for(ob, B.bm('steel', p['kind'] == 'mirror'))
    print('bolts', nb)
    bolt_objs = B.finish(bevel=0.004, segs=2)
    # details: ray-cast onto the raw base meshes (+X side), pocket cuts, fill
    base_objs = [o for o in coll.objects if o.type == 'MESH' and not o.name.startswith('Detail_')]
    bpy.context.view_layer.update()
    det = DT.build_details(mats, coll, base_objs)
    for o in base_objs:
        BB.mark_pockets(o)
        if o.name.endswith('_core'):
            BB.finish_part(o, o.get('kind', 'single'), 0.015, 3)
        else:
            p = built[o.name][1]
            BB.finish_part(o, p['kind'], p.get('bevel', 0.03), segs)
    tris = blib.tri_count(coll.objects)
    print('objects', len(coll.objects), 'triangles', tris)
    bpy.ops.wm.save_as_mainfile(filepath=out_blend)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 6)
