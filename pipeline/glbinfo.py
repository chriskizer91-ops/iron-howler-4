"""Summarise a GLB: vertices, triangles and bytes per attribute type."""
import sys, json, struct, collections
d = open(sys.argv[1], 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl])
CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
by = collections.Counter(); verts = tris = 0; types = {}
for m in J['meshes']:
    for p in m['primitives']:
        for k, a in p['attributes'].items():
            A = J['accessors'][a]; by[k] += A['count'] * CT[A['componentType']] * NC[A['type']]; types[k] = (A['componentType'], A['type'])
            if k == 'POSITION': verts += A['count']
        A = J['accessors'][p['indices']]; by['indices'] += A['count'] * CT[A['componentType']]; tris += A['count'] // 3; types['indices'] = A['componentType']
print('verts', verts, 'tris', tris, 'verts/tri %.2f' % (verts / max(1, tris)), 'meshes', len(J['meshes']), 'nodes', len(J['nodes']))
for k, v in by.most_common(): print('  %-12s %6.1f MB  %s' % (k, v / 1e6, types[k]))
print('  total bin %.1f MB' % (sum(by.values()) / 1e6), 'extensions', J.get('extensionsUsed'))
