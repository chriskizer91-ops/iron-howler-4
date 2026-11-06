"""The Hound's back view (E03) draws the tail's spearhead 97 px (0.32 m) lower than the side view does. Printed as it is, it
would paint a second spearhead onto the rump under the real tail. This writes a copy of the sheet for printing only, with the
spearhead moved up to the side view's tail height and the plate rings above it continued into the gap it leaves.
usage: python3 spear_fix.py fhound_sheet.png fhound_sheet_print.png"""
import sys, shutil
import numpy as np, cv2
from PIL import Image, ImageDraw

src_path, out_path = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src_path).convert('RGB')).copy()
SPEAR = [(2199, 326), (2242, 366), (2202, 449), (2157, 370)]     # the spearhead as the back view draws it (sheet pixels)
DV = -97                                                          # its tip at row 390 goes to row 293, the side view's tail centre
RINGS = 122                                                       # the plate rings above it (rows 204-327) fill the gap

def polymask(P, grow=0):
    m = Image.new('L', (im.shape[1], im.shape[0]), 0); ImageDraw.Draw(m).polygon(P, fill=255)
    m = np.asarray(m) > 0
    if grow: m = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=grow) > 0
    return m

old = polymask(SPEAR, 3); new = np.roll(polymask(SPEAR, 1), DV, 0)
s1 = cv2.GaussianBlur(old.astype(np.float32), (9, 9), 2.5)[..., None]
out = np.roll(im, RINGS, 0) * s1 + im * (1 - s1)
s2 = cv2.GaussianBlur(new.astype(np.float32), (5, 5), 1.2)[..., None]
out = (np.roll(im, DV, 0) * s2 + out * (1 - s2)).astype(np.uint8)
Image.fromarray(out).save(out_path)
shutil.copy(src_path[:-4] + '_mask.png', out_path[:-4] + '_mask.png')       # same outline
print('wrote', out_path)
