"""Line a chassis up with its concept sheet, view by view (front / side / rear), at the sheet's own pixel scale.
Used to score how well the model's outline matches the drawing (overlap, 0-100 %), to make side-by-side boards,
and (projection) to know exactly which sheet pixel each point of the model lands on.

usage (Blender python):
  python3 -I sheetfit.py score  model.blend sheet.png boxes.json outdir tag [HI|LO]
  python3 -I sheetfit.py board  baked.blend sheet.png boxes.json outdir tag atlas_albedo.webp
Mapping, per view (u = sheet column, v = sheet row, ppm = pixels per metre, x/y/z in metres):
  front: u = cu - (x - 0) * ppm      side (seen from the mech's left): u = cu - y * ppm      rear: u = cu + x * ppm
  all:   v = vg - z * ppm            (vg = the sheet row of the ground)
"""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import bpy
from mathutils import Vector

VIEWS = ('front', 'side', 'rear')
R = math.radians
CAM = {'front': ((0, 60, 0), (R(90), 0, R(180))), 'side': ((-60, 0, 0), (R(90), 0, R(-90))), 'rear': ((0, -60, 0), (R(90), 0, 0)), 'top': ((0, 0, 60), (0, 0, 0))}

def sheet_masks(path, boxes):
    """the figure's mask on the sheet (title text and labels removed)"""
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.int32); Hs, Ws, _ = im.shape
    bg = np.median(im[5:40, -200:-20].reshape(-1, 3), axis=0)
    m = (np.abs(im - bg).sum(2) > 45) | ((im.max(2) - im.min(2)) > 40)
    out = {}
    for v, b in zip(VIEWS, boxes):
        mm = np.zeros_like(m); x0, x1 = b['x0'] - 4, b['x1'] + 4; y1 = b['y1'] + 2
        mm[0:y1, x0:x1] = m[0:y1, x0:x1]
        mm[:52, :492] = False                        # the sheet's title
        # keep only the figure: the biggest connected blob (+ anything touching it)
        import cv2
        n, lab, st, _ = cv2.connectedComponentsWithStats(mm.astype(np.uint8), 8)
        if n > 1:
            keep = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); big = st[keep]
            ok = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 25 and st[i, cv2.CC_STAT_LEFT] < big[0] + big[2] + 6 and st[i, cv2.CC_STAT_LEFT] + st[i, cv2.CC_STAT_WIDTH] > big[0] - 6]
            mm = np.isin(lab, ok)
        ys, xs = np.where(mm)
        out[v] = dict(mask=mm, x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()))
    return out, im.astype(np.uint8)

def model_bounds(lod='HI'):
    pts = [o.matrix_world @ Vector(c) for o in bpy.data.collections[lod].objects if o.type == 'MESH' for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

def setup(lod, textured=False):
    sc = bpy.context.scene
    for c in bpy.data.collections:
        if c.name in ('HI', 'LO'):
            c.hide_render = c.name != lod
            for o in c.objects: o.hide_render = False
    sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
    sh.light = 'STUDIO' if textured else 'FLAT'; sh.color_type = 'TEXTURE' if textured else 'SINGLE'
    sh.show_shadows = False; sh.show_cavity = textured; sh.cavity_type = 'BOTH'
    sc.display.light_direction = (.45, -.35, .82)
    sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = .3 if textured else 0
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.resolution_percentage = 100
    cam = bpy.data.objects.get('fitcam') or bpy.data.objects.new('fitcam', bpy.data.cameras.new('fitcam'))
    if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.clip_end = 400; sc.camera = cam
    return sc, cam

def render_view(v, crop, ppm, cu, vg, out, k=1):
    """render the model into the sheet rectangle crop=(u0, v0, u1, v1) using the mapping; k = supersampling"""
    sc = bpy.context.scene; cam = sc.camera
    u0, v0, u1, v1 = crop; W, Hh = u1 - u0, v1 - v0
    sc.render.resolution_x, sc.render.resolution_y = W * k, Hh * k
    uc, vc = (u0 + u1) / 2, (v0 + v1) / 2
    z = (vg - vc) / ppm; h = (cu - uc) / ppm         # front/side: world offset that lands on the crop centre
    loc, rot = CAM[v]
    if v == 'front': p = (h, 60, z)
    elif v == 'side': p = (-60, h, z)
    elif v == 'top': p = ((uc - cu) / ppm, (vg - vc) / ppm, 60)      # top: u = cu + x*ppm, v = vg - y*ppm (vg = the row of y = 0)
    else: p = (-h, -60, z)
    cam.location = p; cam.rotation_euler = rot; cam.data.ortho_scale = max(W, Hh) / ppm
    sc.render.filepath = out; bpy.ops.render.render(write_still=True)
    return np.asarray(Image.open(out).convert('RGBA'))

def fit(sm, lod, tmp, search=34):
    """per view: scale from heights, then the shift that makes the outlines overlap best. returns mapping + scores"""
    mn, mx = model_bounds(lod); Hm = mx.z
    res = {}
    for v in VIEWS:
        S = sm[v]; ppm = (S['y1'] - S['y0']) / Hm; vg = S['y1']
        cu0 = (S['x0'] + S['x1']) / 2 + {'front': mx.x + mn.x, 'side': mx.y + mn.y, 'rear': -(mx.x + mn.x)}[v] / 2 * ppm * (1 if v == 'rear' else 1)
        pad = search + 10
        crop = (S['x0'] - pad, max(0, S['y0'] - 12), S['x1'] + pad, S['y1'] + 12)
        best = (-1, 0, 0)
        a = render_view(v, crop, ppm, cu0, vg, os.path.join(tmp, '_fit_%s.png' % v))[:, :, 3] > 100
        sh = S['mask'][crop[1]:crop[3], crop[0]:crop[2]]
        for dy in range(-4, 5, 2):
            for dx in range(-search, search + 1, 2):
                b = np.roll(np.roll(a, dx, 1), dy, 0)
                inter = (b & sh).sum(); uni = (b | sh).sum(); iou = inter / max(1, uni)
                if iou > best[0]: best = (iou, dx, dy)
        iou, dx, dy = best
        res[v] = dict(ppm=ppm, cu=cu0 + dx, vg=vg + dy, crop=crop, iou=float(iou))
    return res

def outline(img, mask, col):
    import cv2
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = img.copy(); cv2.drawContours(out, cs, -1, col, 2); return out

def font(n):
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)

if __name__ == '__main__':
    a = sys.argv[sys.argv.index(os.path.abspath(__file__)) + 1:] if os.path.abspath(__file__) in sys.argv else sys.argv[1:]
    mode, blend, sheet, boxes, outdir, tag = a[:6]
    bpy.ops.wm.open_mainfile(filepath=blend)
    sm, sheet_rgb = sheet_masks(sheet, json.load(open(boxes)))
    os.makedirs(outdir, exist_ok=True)
    if mode == 'score':
        lod = a[6] if len(a) > 6 else 'HI'
        setup(lod); res = fit(sm, lod, outdir)
        tiles = []
        for v in VIEWS:
            r = res[v]; c = r['crop']
            m = render_view(v, c, r['ppm'], r['cu'], r['vg'], os.path.join(outdir, '_m_%s.png' % v))[:, :, 3] > 100
            base = sheet_rgb[c[1]:c[3], c[0]:c[2]]
            t = outline(base, m, (255, 120, 0)); tiles.append(t)
        json.dump({v: {k: res[v][k] for k in ('ppm', 'cu', 'vg', 'crop', 'iou')} for v in VIEWS}, open(os.path.join(outdir, tag + '_fit.json'), 'w'), indent=1)
        Hh = max(t.shape[0] for t in tiles); W = sum(t.shape[1] for t in tiles) + 20 * 4
        can = Image.new('RGB', (W, Hh + 70), (196, 196, 198)); d = ImageDraw.Draw(can); x = 20
        for v, t in zip(VIEWS, tiles):
            can.paste(Image.fromarray(t), (x, 60)); d.text((x, 30), '%s  %.0f%%' % (v.upper(), res[v]['iou'] * 100), fill=(30, 30, 30), font=font(22)); x += t.shape[1] + 20
        d.text((20, 4), '%s: model outline (orange) on the sheet - overlap %%' % tag, fill=(30, 30, 30), font=font(18))
        can.save(os.path.join(outdir, tag + '_overlay.png'))
        print('IOU', tag, ' '.join('%s %.3f' % (v, res[v]['iou']) for v in VIEWS), 'mean %.3f' % np.mean([res[v]['iou'] for v in VIEWS]))

def textured_materials(albedo_path):
    """make Workbench show each material's own image; the combat atlas gets the baked colour"""
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        t = m.node_tree.nodes.get('albedo')
        if t: m.node_tree.nodes.active = t
    at = bpy.data.materials.new('atlas_view'); at.use_nodes = True
    t = at.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(albedo_path); at.node_tree.nodes.active = t
    nt = at.node_tree; nt.links.new(t.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    for o in bpy.data.collections['LO'].objects:
        if o.type == 'MESH' and o.data.materials and o.data.materials[0].name == 'atlas': o.data.materials[0] = at

def board(sm, sheet_rgb, res, outdir, tag, albedo, k=2, views=('front', 'side', 'rear')):
    textured_materials(albedo)
    rows = []
    for v in views:
        r = res[v]; c = r['crop']; base = sheet_rgb[c[1]:c[3], c[0]:c[2]]
        tiles = [Image.fromarray(base)]
        for lod in ('HI', 'LO'):
            setup(lod, textured=True)
            im = Image.fromarray(render_view(v, c, r['ppm'], r['cu'], r['vg'], os.path.join(outdir, '_b_%s_%s.png' % (v, lod)), k)).resize((c[2] - c[0], c[3] - c[1]), Image.LANCZOS)
            bg = Image.new('RGBA', im.size, tuple(int(x) for x in np.median(base.reshape(-1, 3), 0)) + (255,)); bg.alpha_composite(im); tiles.append(bg.convert('RGB'))
        rows.append((v, tiles))
    tw = sum(t.width for t in rows[0][1]) + 20 * 4; th = rows[0][1][0].height
    can = Image.new('RGB', (tw, 50 + len(rows) * (th + 40)), (196, 196, 198)); d = ImageDraw.Draw(can)
    d.text((20, 10), tag, fill=(30, 30, 30), font=font(22))
    for i, (v, tiles) in enumerate(rows):
        x = 20; y = 50 + i * (th + 40)
        for j, t in enumerate(tiles):
            can.paste(t, (x, y + 30)); d.text((x, y + 4), [v.upper() + ' - YOUR SHEET', 'FULL MODEL  %.0f%% overlap' % (res[v]['iou'] * 100), 'COMBAT MODEL (BAKED)'][j], fill=(30, 30, 30), font=font(15)); x += t.width + 20
    can.save(os.path.join(outdir, tag.split()[0].lower() + '_board.png')); return can

if __name__ == '__main__' and mode == 'board':
    fitj = json.load(open(os.path.join(outdir, tag.split()[0].lower() + '_fit.json'))) if os.path.exists(os.path.join(outdir, tag.split()[0].lower() + '_fit.json')) else None
    if fitj is None:
        setup('HI'); fitj = fit(sm, 'HI', outdir)
    board(sm, sheet_rgb, fitj, outdir, tag, a[6])
    print('board written')
