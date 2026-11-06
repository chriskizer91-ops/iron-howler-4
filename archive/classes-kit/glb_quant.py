"""Shrink a GLB without visible loss (KHR_mesh_quantization, which three.js reads natively):
normals -> 8-bit, vertex colours -> 8-bit. Positions, UVs and indices are left as they are.
usage: python3 -I glb_quant.py in.glb out.glb"""
import sys, json, struct
import numpy as np
src, dst = sys.argv[1], sys.argv[2]
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl])
bo = 20 + jl; bl = struct.unpack('<I', d[bo:bo + 4])[0]; BIN = d[bo + 8:bo + 8 + bl]
DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def read(ai):
    A = J['accessors'][ai]; V = J['bufferViews'][A['bufferView']]
    dt = np.dtype(DT[A['componentType']]); n = NC[A['type']]; esz = dt.itemsize * n
    st = V.get('byteStride', esz); off = V.get('byteOffset', 0) + A.get('byteOffset', 0)
    raw = np.frombuffer(BIN, np.uint8, count=st * (A['count'] - 1) + esz, offset=off)
    if st == esz: return np.frombuffer(raw.tobytes(), dt).reshape(-1, n)
    return np.stack([np.frombuffer(raw[i * st:i * st + esz].tobytes(), dt) for i in range(A['count'])])

role = {}
for m in J['meshes']:
    for p in m['primitives']:
        for k, a in p['attributes'].items(): role[a] = k
        if 'indices' in p: role[p['indices']] = 'INDEX'
out = bytearray(); views = []
def put(arr, stride=None, target=None):
    while len(out) % 4: out.append(0)
    o = len(out); b = arr.tobytes(); out.extend(b)
    v = {'buffer': 0, 'byteOffset': o, 'byteLength': len(b)}
    if stride: v['byteStride'] = stride
    if target: v['target'] = target
    views.append(v); return len(views) - 1

for ai, A in enumerate(J['accessors']):
    if 'bufferView' not in A: continue
    a = read(ai); r = role.get(ai)
    if r == 'NORMAL':
        q = np.zeros((len(a), 4), np.int8); q[:, :3] = np.clip(np.round(a * 127), -127, 127)
        A['bufferView'] = put(q, 4, 34962); A['componentType'] = 5120; A['normalized'] = True; A.pop('byteOffset', None)
        A.pop('min', None); A.pop('max', None)
    elif r == 'COLOR_0':
        f = a.astype(np.float64) / (65535 if A['componentType'] == 5123 else 255 if A['componentType'] == 5121 else 1)
        q = np.zeros((len(a), 4), np.uint8); q[:, :f.shape[1]] = np.clip(np.round(f * 255), 0, 255)
        if f.shape[1] == 3: q[:, 3] = 255
        A['bufferView'] = put(q, 4, 34962); A['componentType'] = 5121; A['normalized'] = True; A['type'] = 'VEC4'; A.pop('byteOffset', None)
    else:
        A['bufferView'] = put(np.ascontiguousarray(a), None, 34963 if r == 'INDEX' else 34962 if r else None); A.pop('byteOffset', None)
J['bufferViews'] = views; J['buffers'] = [{'byteLength': len(out)}]
for k in ('extensionsUsed', 'extensionsRequired'): J[k] = sorted(set(J.get(k, [])) | {'KHR_mesh_quantization'})
js = json.dumps(J, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
while len(out) % 4: out.append(0)
total = 12 + 8 + len(js) + 8 + len(out)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, total)); f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(bytes(out))
print('%s: %.1f MB -> %.1f MB' % (dst.split('/')[-1], len(d) / 1e6, total / 1e6))
