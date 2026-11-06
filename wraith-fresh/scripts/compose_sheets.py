"""Compose the comparison sheets from final_renders.py output (PIL only).
usage: python compose_sheets.py render_dir sheet.png unlit_prefix out_dir"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

def font(sz):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def label(im, text, sz=28):
    d = ImageDraw.Draw(im); f = font(sz)
    d.rectangle([0, 0, im.width, sz + 16], fill=(25, 25, 28))
    d.text((12, 6), text, fill=(240, 240, 240), font=f)
    return im

def grid(rows, pad=8, bg=(25, 25, 28)):
    W = max(sum(i.width for i in r) + pad * (len(r) + 1) for r in rows)
    H = sum(max(i.height for i in r) for r in rows) + pad * (len(rows) + 1)
    c = Image.new('RGB', (W, H), bg); y = pad
    for r in rows:
        x = pad
        for i in r: c.paste(i, (x, y)); x += i.width + pad
        y += max(i.height for i in r) + pad
    return c

def main(rd, sheet, unlit, out):
    os.makedirs(out, exist_ok=True)
    shots = ['three_quarter_front', 'three_quarter_back', 'side_left', 'head_torso', 'legs']
    rows = []
    for tag, title in (('before', 'BEFORE - blank model'), ('after', 'AFTER - sheet projected + baked')):
        r = []
        for s in shots:
            im = Image.open(os.path.join(rd, f'{tag}_{s}.png')).convert('RGB').resize((450, 550), Image.LANCZOS)
            r.append(label(im, title if s == shots[0] else s.replace('_', ' '), 20))
        rows.append(r)
    grid(rows).save(os.path.join(out, 'before_vs_after.png'))
    ref = Image.open(sheet).convert('RGB')
    boxes = {'front': (340, 700), 'side': (790, 1080), 'rear': (1190, 1590)}
    for v, (u0, u1) in boxes.items():
        r = ref.crop((u0, 0, u1, 520)).resize(((u1 - u0) * 2, 1040), Image.LANCZOS)
        b = Image.open(os.path.join(rd, f'before_ortho_{v}.png')).convert('RGB')
        a = Image.open(os.path.join(rd, f'after_ortho_{v}.png')).convert('RGB')
        cmp = Image.open(f'{unlit}_{v}_cmp.png').convert('RGB')
        uw = cmp.width // 2
        un = cmp.crop((uw, 0, cmp.width, cmp.height)).resize(((u1 - u0) * 2, 1040), Image.LANCZOS)
        grid([[label(r, 'reference sheet'), label(b, 'blank model (lit)'), label(un, 'projected (unlit)'), label(a, 'projected (lit)')]]).save(
            os.path.join(out, f'reference_vs_model_{v}.png'))
    print('composed into', out)

if __name__ == '__main__':
    main(*sys.argv[1:5])
