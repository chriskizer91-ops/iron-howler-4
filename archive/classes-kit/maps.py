"""Turn the baked PNGs into the model bay's three atlas files: <name>_albedo.webp, <name>_normal.webp, <name>_orm.webp
(ORM: red = shading (AO), green = roughness, blue = metal).
usage: python3 -I maps.py bake_dir name out_dir"""
import sys, os
import numpy as np
from PIL import Image
bd, name, od = sys.argv[1:4]
def load(n):
    im = Image.open(os.path.join(bd, '%s_%s.png' % (name, n)))
    a = np.asarray(im).astype(np.float64)
    if a.max() > 255: a = a / 257.0
    if a.ndim == 3: a = a[:, :, :3]
    return a
alb = load('albedo'); nor = load('normal'); ao = load('ao'); ro = load('rough'); me = load('metal')
ch = lambda a: a if a.ndim == 2 else a[:, :, 0]
orm = np.stack([ch(ao), ch(ro), ch(me)], -1)
for arr, n, q in ((alb, 'albedo', 90), (nor, 'normal', 92), (orm, 'orm', 90)):
    p = os.path.join(od, '%s_%s.webp' % (name, n)); Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(p, 'WEBP', quality=q, method=6)
    print(os.path.basename(p), '%.2f MB' % (os.path.getsize(p) / 1e6))
