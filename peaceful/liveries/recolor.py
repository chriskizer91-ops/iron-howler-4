"""Peaceful-mode liveries: recolour a picture or texture without changing its shapes.
Wraith and kit: orange armour -> the scheme's main colour, white stripes / codes / emblems -> stripe colour (Survey only),
amber lights -> light colour, red (missile tips) -> accent. FORGE foes: red primer and red lights -> accent / light colour.
usage: python3 recolor.py in.png <survey|ranger|cobalt> out.png [--foe]"""
import sys, numpy as np
from PIL import Image
import matplotlib.colors as mc
from scipy import ndimage as nd

# (hue in degrees, saturation, brightness factor)
LIV = {
 'survey': dict(arm=(205, .07, 1.18), stripe=(182, .75, .80), glow=(186, .85, 1.0), accent=(184, .70, .95)),
 'ranger': dict(arm=(78, .30, .70),   stripe=None,            glow=None,            accent=(38, .85, 1.05)),
 'cobalt': dict(arm=(214, .68, .82),  stripe=None,            glow=(190, .55, 1.0), accent=(216, .80, 1.10)),
}
def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def load(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    hsv = mc.rgb_to_hsv(im); return im, hsv, hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]

def tone(hsv, spec, keepS=True):
    h, sat, k = spec; S, V = hsv[..., 1], hsv[..., 2]
    n = np.empty_like(hsv); n[..., 0] = h / 360
    n[..., 1] = np.clip(sat * (S / .7 if keepS else 1), 0, 1); n[..., 2] = np.clip(V * k, 0, 1)
    return mc.hsv_to_rgb(n)

def blend(res, mask, col, sigma=.6):
    w = nd.gaussian_filter(mask.astype(float), sigma)[..., None]; return res * (1 - w) + col * w

def red_masks(H, S, V):
    red = ((H <= 11) | (H >= 340)) & (S > .35) & (V > .14)
    rglow = red & (V > .80) & (S > .45)
    return red & ~rglow, rglow

def recolor(path, liv, out, foe=False):
    im, hsv, H, S, V = load(path); L = LIV[liv]; res = im.copy()
    red, rglow = red_masks(H, S, V)
    if not foe:
        glow = (H >= 40) & (H <= 66) & (S > .45) & (V > .88)
        glow = nd.binary_dilation(glow, iterations=1) & (S > .3) & (H >= 30) & (H <= 66) & (V > .7)
        orange = (H >= 12) & (H <= 48) & (S > .33) & (V > .18) & ~glow
        closed = nd.binary_fill_holes(nd.binary_closing(orange, structure=np.ones((3, 3)), iterations=6))
        stripe = closed & ~orange & (S < .33) & (V > .55) & ~glow
        lab, n = nd.label(stripe)
        if n:
            sz = nd.sum(stripe, lab, range(1, n + 1)); stripe = np.isin(lab, 1 + np.nonzero(sz >= 90)[0])
        near = nd.binary_dilation(orange, iterations=2)
        w = smooth(S, .10, .33) * ((H >= 8) & (H <= 50)) * near
        w = np.maximum(w, orange.astype(float)); w[glow] = 0; w[stripe] = 0
        arm = tone(hsv, L['arm'])
        if L['arm'][1] < .15:   # pale paint: lift the darks so worn plates still read as white paint
            arm = np.clip(arm * .85 + .12 * smooth(V, .15, .6)[..., None], 0, 1)
        wg = nd.gaussian_filter(w, .6)[..., None]; res = res * (1 - wg) + arm * wg
        if L['stripe']: res = blend(res, stripe, tone(hsv, L['stripe'], keepS=False))
        if L['glow']:   res = blend(res, glow, tone(hsv, L['glow'], keepS=False))
        res = blend(res, red, tone(hsv, L['accent']))
        res = blend(res, rglow, tone(hsv, (L['accent'][0], .6, 1.0), keepS=False))
    else:
        res = blend(res, red, tone(hsv, L['accent']))
        lg = L['glow'] or (L['accent'][0], .75, 1.0)
        res = blend(res, nd.binary_dilation(rglow, iterations=1) & ((H <= 20) | (H >= 330)) & (S > .2),
                    tone(hsv, (lg[0], .65, 1.0), keepS=False))
    Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8)).save(out)

if __name__ == '__main__':
    recolor(sys.argv[1], sys.argv[2], sys.argv[3], foe='--foe' in sys.argv)
