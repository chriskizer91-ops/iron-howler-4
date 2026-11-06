"""Cut a concept sheet into its front, side and rear views as 1024 x 1536 portrait pictures (ChatGPT's portrait size),
plus each view's outline and the mapping that ties every picture to the model. Hand the pictures to ChatGPT to sharpen
(prompt: SHARPER_SHEET_PROMPT.md), then print the sharpened pictures with v2_print.py using the guide json this writes.

usage: python3 sheet_views.py sheet.png parts.json outdir name
The crop of each view is 2:3, as tall as the view (rows 0..534 here) and centred on the view: front and rear on their
centre lines, side on the middle of its figure."""
import sys, os, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'build_v2.py')).read().split("if __name__ == '__main__':")[0].replace('import bpy\n', '').replace('from mathutils import Vector, Matrix\n', '')
ns = {'__file__': os.path.join(HERE, 'build_v2.py')}; exec(compile(src, 'build_v2', 'exec'), ns)
sheet, pj, outdir, name = sys.argv[1:5]; os.makedirs(outdir, exist_ok=True)
V = json.load(open(pj))['view']; ppm = V['ppm']; BOX = ns['BOX']
m, im = ns['sheet_mask'](sheet); im = im.copy()
bg = np.median(im[5:40, -200:-20].reshape(-1, 3), axis=0).astype(np.uint8); im[:52, :492] = bg      # the sheet's title out of the front view
H = BOX['front'][3] - BOX['front'][1]; W = int(round(H * 2 / 3)); G = {}
for v in ('front', 'side', 'rear'):
    if v == 'side':
        cols = np.where(m[:H, BOX[v][0]:BOX[v][2]].any(0))[0]; cx = BOX[v][0] + (cols.min() + cols.max()) / 2
    else: cx = V[v]['cu']
    c = (int(round(cx - W / 2)), BOX[v][1], int(round(cx - W / 2)) + W, BOX[v][1] + H); sc = 1536 / H
    Image.fromarray(im[c[1]:c[3], c[0]:c[2]]).resize((1024, 1536), Image.LANCZOS).save(os.path.join(outdir, '%s_%s.png' % (name, v)))
    mk = Image.fromarray((m[c[1]:c[3], c[0]:c[2]] * 255).astype(np.uint8)).resize((1024, 1536), Image.BILINEAR).point(lambda q: 255 if q > 127 else 0)
    mk.save(os.path.join(outdir, '%s_%s_mask.png' % (name, v)))
    G[v] = dict(image='%s_%s.png' % (name, v), mask='%s_%s_mask.png' % (name, v), crop=c, ppm=ppm * sc, cu=(V[v]['cu'] - c[0]) * sc, vg=(V[v]['vg'] - c[1]) * sc, size=[1024, 1536])
json.dump(G, open(os.path.join(outdir, name + '_guide.json'), 'w'), indent=1)
print('views and guide written to', outdir)
