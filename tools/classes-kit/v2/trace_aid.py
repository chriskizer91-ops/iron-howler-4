"""Zoomed, gridded crops of a concept sheet for tracing parts, with the traced outlines drawn on top.
usage: python3 trace_aid.py sheet.png parts.json out.png x0 y0 x1 y1 [zoom] [view]
Grid lines every 10 sheet pixels (bright every 50, labelled), traced outlines of the given view in colour with names."""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

def font(n):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(p): return ImageFont.truetype(p, n)
    return ImageFont.load_default()

PAL = [(0, 255, 255), (255, 0, 255), (0, 255, 0), (255, 255, 0), (255, 80, 80), (80, 160, 255), (255, 160, 0), (160, 255, 160), (255, 255, 255)]

def aid(sheet, parts, out, box, z=3, view=None):
    x0, y0, x1, y1 = box
    im = Image.open(sheet).convert('RGB').crop(box).resize(((x1 - x0) * z, (y1 - y0) * z), Image.LANCZOS)
    d = ImageDraw.Draw(im); f = font(11)
    for gx in range((x0 // 10 + 1) * 10, x1, 10):
        X = (gx - x0) * z; strong = gx % 50 == 0
        d.line([(X, 0), (X, im.height)], fill=(0, 200, 200) if strong else (0, 90, 90), width=1)
        if strong: d.text((X + 2, 2), str(gx), fill=(0, 255, 255), font=f)
    for gy in range((y0 // 10 + 1) * 10, y1, 10):
        Y = (gy - y0) * z; strong = gy % 50 == 0
        d.line([(0, Y), (im.width, Y)], fill=(0, 200, 200) if strong else (0, 90, 90), width=1)
        if strong: d.text((2, Y + 2), str(gy), fill=(0, 255, 255), font=f)
    if parts and view:
        for i, (name, P) in enumerate(parts.items()):
            poly = P.get(view)
            if not poly: continue
            c = PAL[i % len(PAL)]
            pts = [((u - x0) * z, (v - y0) * z) for u, v in poly]
            d.line(pts + [pts[0]], fill=c, width=2)
            cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
            d.text((cx - 10, cy - 6), name, fill=c, font=f)
    im.save(out)

if __name__ == '__main__':
    a = sys.argv[1:]
    sheet, pj, out = a[:3]; box = tuple(int(v) for v in a[3:7]); z = int(a[7]) if len(a) > 7 else 3; view = a[8] if len(a) > 8 else None
    parts = json.load(open(pj)) if os.path.exists(pj) else {}
    aid(sheet, parts.get('parts', parts), out, box, z, view)
