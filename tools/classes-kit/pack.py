"""Pack a GLB the way the model bay loads it: gzip it, cut the gzip into parts small enough for the host (under 20 MB each),
and store each part as base64 text in <prefix>_<n>.json ({part, of, b64}). The viewer joins the parts and unzips.
usage: python3 -I pack.py in.glb out_prefix [max_MB]      e.g. out_prefix = bay/h07_full  ->  bay/h07_full_1.json ..."""
import sys, gzip, base64, json, os, math
raw = open(sys.argv[1], 'rb').read(); pre = sys.argv[2]; mx = float(sys.argv[3]) if len(sys.argv) > 3 else 18.0
z = gzip.compress(raw, 9)
per = int(mx * 1e6 * 3 / 4) // 3 * 3                    # gzip bytes per part so the base64 stays under mx MB
n = max(1, math.ceil(len(z) / per)); size = math.ceil(len(z) / n)
for i in range(n):
    json.dump({'part': i + 1, 'of': n, 'b64': base64.b64encode(z[i * size:(i + 1) * size]).decode()}, open('%s_%d.json' % (pre, i + 1), 'w'))
print('%s: glb %.1f MB -> gzip %.1f MB -> %d part(s), %s MB' % (os.path.basename(pre), len(raw) / 1e6, len(z) / 1e6, n,
      ' + '.join('%.1f' % (os.path.getsize('%s_%d.json' % (pre, i + 1)) / 1e6) for i in range(n))))
print('PARTS', n)
