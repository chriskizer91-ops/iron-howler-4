"""Turn a model bay .json (gzipped GLB as base64 text, possibly in parts) back into a .glb.
usage: python3 -I unpack_glb.py model_1.json [model_2.json ...] out.glb"""
import sys, json, base64, gzip
parts = sorted((json.load(open(p)) for p in sys.argv[1:-1]), key=lambda d: d['part'])
raw = gzip.decompress(base64.b64decode(''.join(p['b64'] for p in parts)))
open(sys.argv[-1], 'wb').write(raw)
print(sys.argv[-1], len(raw) // 1024, 'KB')
