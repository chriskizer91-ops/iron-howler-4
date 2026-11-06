"""Put a labelled pixel grid over a crop of an image so landmarks can be read off.
usage: python3 -I grid.py in.png x0 y0 x1 y1 step out.png [scale]"""
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, step, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv) > 8 else 1.0
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * sc; d.line([(0, Y), (im.width, Y)], fill=(0, 140, 255), width=1); d.text((2, Y + 1), str(y), fill=(0, 60, 200))
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * sc; d.line([(X, 0), (X, im.height)], fill=(255, 0, 160), width=1); d.text((X + 2, 2), str(x), fill=(180, 0, 120))
im.save(out)
