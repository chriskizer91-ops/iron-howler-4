"""The Ironhowl 4 class chassis (sheets 87-90) from one builder: full model for the modification bay (HI) and combat model (LO),
same joints. Joint positions come from the approved blockout table (chassis.C); ST below holds each chassis' own look.
Howler 07 keeps its own script (build_h07.py), which this one grew out of.
Run:  python3 -I build_class.py strider|wraith|bastion out.blend
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix, Euler
import hd
from hd import V, rivet_row, frame_rivets, pipe, plate, splate, tube, rod, ball, bolt, bolt_row, bolt_ring, armour, piston, spring, cable, claw, jointcap, vent, greeble, lamp, decal, D
from blk import JW, joint
import chassis

ST = {
    # cov: how much of each limb the orange plates cover (the Strider shows more charcoal frame)
    # num: the number decal; stripe: decal under the number and on shins/forearms; vents: chest grilles
    'strider': dict(ph=.72, hw=.8, lf=.74, th=.5, kneeside=False, num='12', cov=.8, stripe='wstripes', limb_stripes=True, vents=False, chestnum=True, spine=True, mast=False, red=False),
    'wraith': dict(lf=.9, th=.8, kneeside=True, num='09', cov=.92, stripe='wstripes', limb_stripes=True, vents=False, chestnum=True, spine=False, mast=True, red=False),
    'bastion': dict(lf=1.0, th=1.15, kneeside=True, num='31', cov=1.08, stripe='wstripes', limb_stripes=False, vents=True, chestnum=False, spine=False, mast=False, red=True),
}
CID = sys.argv[-2] if len(sys.argv) > 2 and sys.argv[-2] in ST else 'strider'
P = chassis.C[CID]; H = P['H']; Y = ST[CID]; CV = Y['cov']; TH = Y['th']     # TH: thickness of add-on side plates
LF = Y['lf']                   # limb size, so the finished (detailed) limbs come out as wide as the approved blockout's
S3L = lambda t: tuple(v * H * LF for v in t)
s = lambda v: v * H
S3 = lambda t: tuple(s(v) for v in t)
hd.DECAL_MAT = 'cdecal'

def bframe(a, b, front):
    """axes for a part running a->b: z along it, y toward 'front', x = y cross z"""
    a, b = Vector(a), Vector(b); z = (b - a).normalized(); f = Vector(front)
    y = (f - z * f.dot(z)); y = y.normalized() if y.length > 1e-5 else Vector((0, 1, 0)); x = y.cross(z)
    return Matrix((x, y, z)).transposed()

def rz(a): return Matrix.Rotation(a, 3, 'Z')
def rx(a): return Matrix.Rotation(a, 3, 'X')
def ry(a): return Matrix.Rotation(a, 3, 'Y')
def facing(F, d):
    """F turned so its +y points along d (one of +-x, -y, +-z of F)"""
    return F @ {'+x': rz(-math.pi / 2), '-x': rz(math.pi / 2), '-y': rz(math.pi), '+z': rx(math.pi / 2), '-z': rx(-math.pi / 2), '+y': Matrix.Identity(3)}[d]
def at(c, F, x, y, z): return Vector(c) + F @ Vector((x, y, z))

def leg(sd, hips):
    S = 'L' if sd < 0 else 'R'
    lx = S3(P['legX']); hipZ = s(P['hip'][1])
    hip = V(sd * lx[0], s(P['hip'][0]), hipZ); kn = V(sd * lx[1], s(P['knee'][0]), s(P['knee'][1]))
    hk = V(sd * lx[2], s(P['hock'][0]), s(P['hock'][1])); an = V(sd * lx[3], s(P['ankle'][0]), s(P['ankle'][1]))
    th = joint('thigh_' + S, hip, hips); k = joint('knee_' + S, kn, th); h = joint('hock_' + S, hk, k); a = joint('ankle_' + S, an, h)
    tw, td = S3L(P['thigh']); sw, sdp = S3L(P['shin']); mw, md = S3L(P['meta']); fw, fl, fh = S3(P['foot']); cl = s(P['claw'])
    seed = 10 if sd < 0 else 20
    # ---------------- thigh ----------------
    jointcap(hip, td * .4, tw * 1.08, th, bolts_=12)
    F = bframe(hip, kn, (0, 1, 0)); Lt = (kn - hip).length; c = (hip + kn) / 2
    plate('gun', (tw * .72, td * .7, Lt + .15), c, th, .07, F, oct=(2, .12))
    frame_rivets(c, F, tw * .72, td * .7, Lt, th)
    pipe([at(hip, F, sd * tw * .3, -td * .36, .02), at(c, F, sd * tw * .4, -td * .3, 0), at(kn, F, sd * tw * .3, -td * .25, .2)], .02, th, 3)
    armour('org', (tw * CV, td * .5, Lt * .7), at(c, F, 0, td * .3, Lt * .12), th, F, (0, 1, 0), .09, top=(.9, .95), nb=3, seams=1, oct=.16)
    armour('org', (tw * 1.04 * CV, td * .42, Lt * .42), at(c, F, 0, td * .4, -Lt * .3), th, F @ rx(.12), (0, 1, 0), .08, bot=(.92, 1), nb=2, seams=1, oct=.14)
    plate('gun', (.07, .06, Lt * .62), at(c, F, 0, td * .3 + td * .25 + .03, Lt * .1), th, .02, F, lo=False)
    armour('org', (.11 * TH, td * .72, Lt * .78), at(c, F, sd * (tw * .36 + .055 * TH), .02, .04), th, F, (sd, 0, 0), .03, nb=2, seams=1, oct=.12)
    if TH > .7: armour('grey', (.06, td * .4, Lt * .35), at(c, F, sd * (tw * .46 + .07), .02, -Lt * .1), th, F, (sd, 0, 0), .02, nb=2, seams=0, layer=False, lo=False)
    plate('gun', (.08 * TH, td * .6, Lt * .6), at(c, F, -sd * (tw * .36 + .04 * TH), -.02, 0), th, .025, F)
    vent(at(c, F, -sd * (tw * .36 + .08 * TH), -.02, 0), facing(F, '-x' if sd > 0 else '+x'), td * .45, Lt * .4, th, n=7)
    piston(at(hip, F, sd * .1 * LF, -td * .42, -.1), at(kn, F, sd * .08 * LF, -td * .36, .3), .075 * LF, th)
    cable([at(hip, F, -sd * tw * .3, -td * .3, .05), at(c, F, -sd * tw * .38, -td * .4, 0), at(kn, F, -sd * tw * .3, -td * .32, .25)], .032 * LF, th, n=3, clamps=2)
    greeble(at(c, F, 0, -td * .15, -Lt * .3), (tw * .5, td * .35, Lt * .3), th, seed + 1, 10, F)
    lamp(at(c, F, sd * tw * .5, td * .3, -Lt * .25), (.03, .12, .04), th, F)
    decal(D['warn'], .2, .23, at(c, F, 0, td * .3 + td * .25 + .045, Lt * .12), F @ V(0, 1, 0), th, F @ V(0, 0, -1))
    decal(D['hyd'], .3, .065, at(c, F, sd * (tw * .36 + .11 * TH + .03), .02, -Lt * .2), F @ V(sd, 0, 0), th, F @ V(0, 0, -1))
    # ---------------- knee and shin ----------------
    jointcap(kn, sdp * .54, sw * 1.22, k, bolts_=10)
    armour('org', (sw * 1.05, sdp * .45, sdp * .78), kn + V(0, sdp * .55, sdp * .12), k, rx(-.3), (0, 1, 0), .07, top=(.8, .72), nb=2, seams=1, oct=.12)
    if Y['kneeside']:
        for sx in (-1, 1): armour('org', (.08 * TH, sdp * .7, sdp * .7), kn + V(sx * (sw * .61 + .04 * TH), sdp * .1, sdp * .05), k, None, (sx, 0, 0), .03, nb=2, seams=0, oct=.14, hatch=False)
    F = bframe(kn, hk, (0, .3, 1)); Ls = (hk - kn).length; c = (kn + hk) / 2
    plate('gun', (sw * .9, sdp * .8, Ls + .18), c, k, .06, F, oct=(2, .1))
    frame_rivets(c, F, sw * .9, sdp * .8, Ls, k)
    pipe([at(kn, F, sd * sw * .35, -sdp * .2, .25), at(c, F, sd * sw * .52, -sdp * .1, 0), at(hk, F, sd * sw * .35, -sdp * .15, -.15)], .018, k, 3)
    armour('org', (sw * 1.06 * CV, sdp * .42, Ls * .55), at(c, F, 0, sdp * .38, -Ls * .2), k, F, (0, 1, 0), .07, top=(.92, 1), nb=3, seams=1, oct=.13)
    armour('org', (sw * 1.0 * CV, sdp * .4, Ls * .45), at(c, F, 0, sdp * .44, Ls * .27), k, F @ rx(-.08), (0, 1, 0), .06, bot=(.9, 1), top=(.85, .9), nb=2, seams=1, oct=.12)
    piston(at(kn, F, 0, -sdp * .38, .25), at(hk, F, 0, -sdp * .36, -.22), .07 * LF, k)
    for sx in (-1, 1): vent(at(c, F, sx * sw * .48, -.02, 0), facing(F, '+x' if sx > 0 else '-x'), sdp * .5, Ls * .4, k, n=6, depth=.06)
    cable([at(kn, F, -sd * sw * .2, -sdp * .5, .2), at(c, F, -sd * sw * .3, -sdp * .55, 0), at(hk, F, -sd * sw * .22, -sdp * .45, -.1)], .03 * LF, k, n=2, clamps=1)
    decal(D['warn'], .17, .2, at(c, F, 0, sdp * .38 + sdp * .21 + .04, -Ls * .1), F @ V(0, 1, 0), k, F @ V(0, 0, -1))
    if Y['limb_stripes']: decal(D['wstripes'], sw * .85 * CV, sw * .17, at(c, F, 0, sdp * .38 + sdp * .21 + .04, -Ls * .34), F @ V(0, 1, 0), k, F @ V(0, 0, -1))
    # ---------------- hock and foot bone ----------------
    jointcap(hk, md * .62, mw * 1.3, h, bolts_=8)
    F = bframe(hk, an, (0, 1, 0)); Lm = (an - hk).length; c = (hk + an) / 2
    plate('gun', (mw * .9, md * .8, Lm + .1), c, h, .05, F, oct=(2, .08))
    frame_rivets(c, F, mw * .9, md * .8, Lm, h)
    pipe([at(hk, F, -sd * mw * .35, -md * .2, .15), at(c, F, -sd * mw * .52, -md * .15, 0), at(an, F, -sd * mw * .35, -md * .1, -.3)], .017, h, 3)
    armour('org', (mw * 1.08 * CV, md * .45, Lm * .5), at(c, F, 0, md * .42, -Lm * .2), h, F, (0, 1, 0), .06, top=(.95, 1), nb=3, seams=1, oct=.1)
    if Y['limb_stripes']: decal(D['wstripes'], mw * .8 * CV, mw * .16, at(c, F, 0, md * .42 + md * .225 + .045, -Lm * .28), F @ V(0, 1, 0), h, F @ V(0, 0, -1))
    armour('org', (mw * 1.02, md * .42, Lm * .38), at(c, F, 0, md * .48, Lm * .24), h, F @ rx(-.06), (0, 1, 0), .05, top=(.88, .9), nb=2, seams=1, oct=.1)
    for sx in (-1, 1): plate('gun', (.06, md * .6, Lm * .5), at(c, F, sx * mw * .5, 0, 0), h, .02, F, lo=False)
    sa, sb = at(hk, F, 0, -md * .5, .25), at(an, F, 0, -md * .5, -.42)
    piston(sa, sb, .06 * LF, h, frac=.45, boot=False); spring(sa + (sb - sa) * .12, sa + (sb - sa) * .7, .11 * LF, h, turns=8, wire=.018 * LF)
    cable([at(hk, F, sd * mw * .4, -md * .2, .1), at(c, F, sd * mw * .5, -md * .25, 0), at(an, F, sd * mw * .4, -md * .1, -.25)], .028 * LF, h, n=2)
    greeble(at(c, F, 0, -md * .1, Lm * .2), (mw * .5, md * .3, Lm * .3), h, seed + 3, 6, F)
    # ---------------- ankle and foot ----------------
    ball('gun', md * .6, an, a); tube('dark', md * .66, .12, an + V(0, 0, .12), a, (0, 0, 1), 32)
    g = -an.z
    plate('gun', (fw * .8, fl * .5, fh * 1.45), an + V(0, fl * .05, g + fh * .72), a, .09, top=(.75, .7))
    armour('grey', (fw * .62, fl * .38, .07), an + V(0, fl * .06, g + fh * 1.45 + .02), a, None, (0, 0, 1), .025, nb=2, seams=0, layer=False, lo=False)
    armour('org', (fw * .7, .1, fh * .9), an + V(0, fl * .3, g + fh * .85), a, rx(-.35), (0, 1, 0), .03, nb=2, seams=0, oct=.1, hatch=False)
    for sx in (-1, 1):
        plate('dark', (.06, fl * .36, fh * .8), an + V(sx * fw * .4, fl * .05, g + fh * .7), a, .02, lo=False)
        bolt_row(an + V(sx * (fw * .43 + .01), -fl * .1, g + fh * .4), an + V(sx * (fw * .43 + .01), fl * .2, g + fh * .4), (sx, 0, 0), 3, .025, a)
    for i, x in enumerate((-.36, 0, .36)):
        t0 = an + V(x * fw, fl * .2, g + fh * .55); t = joint('toe_%s%d' % (S, i), t0, a)
        tube('dark', fh * .42, fw * .26, t0, t, (1, 0, 0), 24, loseg=10)
        plate('gun', (fw * .27, fl * .5, fh * 1.0), t0 + V(x * fw * .15, fl * .22, 0), t, .05, top=(.82, .82))
        armour('org', (fw * .23, fl * .3, .08), t0 + V(x * fw * .15, fl * .2, fh * .52), t, None, (0, 0, 1), .03, nb=2, seams=0, layer=False)
        plate('dark', (fw * .2, .08, fh * .6), t0 + V(x * fw * .15, fl * .48, -fh * .05), t, .025, lo=False)
        claw(t0 + V(x * fw * .25, fl * .42, fh * .15), t0 + V(x * fw * .4, fl * .42 + cl, -fh * .55), fw * .12, t, bend=(0, -.2, 1), bendk=.4)
    hp = an + V(0, -fl * .22, g + fh * .9); he = joint('heel_' + S, hp, a)
    plate('gun', (fw * .3, fl * .28, fh * .9), hp + V(0, -.02, -fh * .1), he, .05)
    claw(hp + V(0, -fl * .1, 0), hp + V(0, -cl * 1.05, cl * 1.0), fw * .13, he, bend=(0, -1, -1), bendk=.3)
    return th

def torso_body(to, hips):
    hipZ = s(P['hip'][1]); pw, pd, ph, pz = S3(P['pelvis']); ww, wd, wh, wz = S3(P['waist']); cw, cd, ch, cz, cy = S3(P['chest'])
    # ---------------- pelvis ----------------
    plate('gun', (pw * .78, pd * .85, ph * 1.1), (0, 0, pz), hips, .1)
    tube('dark', ph * .45, pw * .98, (0, 0, pz - .05), hips, (1, 0, 0), 40)
    armour('org', (pw * .32, .3, ph * 1.5), (0, pd * .5 + .06, pz - ph * .3), hips, None, (0, 1, 0), .07, bot=(.5, 1), nb=2, seams=1)
    decal(D['warn'], .22, .25, (0, pd * .5 + .06 + .17, pz - ph * .1), (0, 1, 0), hips)
    for sd in (-1, 1):
        armour('org', (.14 * TH, pd * .8, ph * 1.15), (sd * (pw * .43 + .07 * TH), 0, pz), hips, None, (sd, 0, 0), .05, nb=3, seams=1)
        plate('gun', (pw * .2, pd * .6, ph * .5), (sd * pw * .3, pd * .2, pz - ph * .35), hips, .05)
    armour('org', (pw * .45, .22, ph * 1.1), (0, -pd * .5 - .05, pz - .05), hips, None, (0, -1, 0), .06, bot=(.7, 1), nb=2, seams=1)
    plate('dark', (pw * .92, pd * .92, .1), (0, 0, pz + ph * .55), hips, .03)
    greeble((0, pd * .1, pz - ph * .55), (pw * .4, pd * .5, ph * .4), hips, 31, 10)
    # ---------------- waist: spine column, rams and hoses ----------------
    z0, z1 = pz + ph * .55, cz - ch * .42
    for i in range(5):
        z = z0 + (z1 - z0) * (i + .5) / 5
        tube('gun' if i % 2 else 'dark', ww * (.42 if i % 2 else .38), (z1 - z0) / 5 * .8, (0, 0, z), to, (0, 0, 1), 36, lo=(i % 2 == 1), loseg=12)
    plate('dark', (ww, wd, wh * .8), (0, 0, wz - wh * .1), to, .05, hi=False, loseg=0)
    for sd in (-1, 1):
        for fy in (-1, 1): piston(V(sd * ww * .32, fy * wd * .3, z0), V(sd * ww * .36, fy * wd * .32, z1 + .1), .05, to, frac=.5, boot=False)
        cable([V(sd * ww * .5, -wd * .2, z0 - .1), V(sd * ww * .62, 0, (z0 + z1) / 2), V(sd * ww * .45, wd * .3, z1 + .15)], .04, to, n=3, clamps=1)
    for i, z in enumerate((z0 + .05, z0 + .2)):
        armour('org', (ww * (.85 - i * .1), .16, .13), (0, wd * .5, z), to, None, (0, 1, 0), .03, nb=2, seams=0, layer=False)
    # ---------------- chest: angled octagon-cut plates over a dark core, a keel, vents, lights ----------------
    plate('gun', (cw * .92, cd * .95, ch * .98), (0, cy, cz), to, .12, bot=(.5, .8), top=(.96, .95), oct=(1, .25))
    plate('org', (cw * .86, cd * .88, ch * .5), (0, cy - .02, cz + ch * .22), to, .1, bot=(.8, .95), oct=(1, .22), lo=False)
    for sd in (-1, 1):
        R = rx(-.14) @ rz(sd * .1)
        cu = V(sd * cw * .25, cy + cd * .47, cz + ch * .18)
        armour('org', (cw * .45, .22, ch * .5), cu, to, R, (0, 1, 0), .07, nb=3, seams=0, top=(.96, 1), oct=.2)
        if Y['vents']: vent(cu + R @ V(sd * cw * .03, .13, .03), R, cw * .2, ch * .14, to, n=5, depth=.05)
        elif Y['chestnum'] and sd > 0: decal(D[Y['num']], cw * .2, cw * .2 / 1.375, cu + R @ V(-cw * .06, .156, .04), R @ V(0, 1, 0), to, R @ V(0, 0, 1))
        lamp(cu + R @ V(-sd * cw * .1, .12, -ch * .17), (cw * .1, .03, .035), to, R)
        armour('org', (cw * .2, .14, ch * .16), cu + R @ V(sd * cw * .15, .1, ch * .27), to, R @ rx(-.3), (0, 1, 0), .03, nb=2, seams=0, layer=False, oct=.06)
        R2 = rz(-sd * .38) @ rx(-.05)
        armour('org', (cw * .27, .2, ch * .32), V(sd * cw * .15, cy + cd * .4, cz - ch * .27), to, R2, (0, 1, 0), .06, nb=2, seams=1, bot=(.8, 1), oct=.1)
        armour('org', (.16, cd * .78, ch * .62), V(sd * cw * .47, cy, cz + ch * .02), to, None, (sd, 0, 0), .05, nb=3, seams=2, oct=.18)
        vent(V(sd * (cw * .47 + .085), cy - cd * .2, cz - ch * .05), rz(-sd * math.pi / 2), cd * .2, ch * .25, to, n=5, depth=.04)
        decal(D['maint'], .44, .12, V(sd * (cw * .47 + .09), cy + cd * .12, cz - ch * .22), (sd, 0, 0), to)
        armour('org', (cw * .26, cd * .45, .16), V(sd * cw * .25, cy - cd * .08, cz + ch * .5), to, ry(sd * .25), (0, 0, 1), .04, nb=2, seams=0, layer=False, oct=.08)
        plate('gun', (.08, .14, ch * .58), V(sd * cw * .085, cy + cd * .53, cz + ch * .05), to, .02, rz(sd * .2), lo=False)
    plate('dark', (cw * .16, .2, ch * .62), (0, cy + cd * .47, cz + ch * .05), to, .03)
    plate('gun', (cw * .07, .1, ch * .56), (0, cy + cd * .55, cz + ch * .05), to, .02, lo=False)
    bolt_row(V(0, cy + cd * .6, cz - ch * .18), V(0, cy + cd * .6, cz + ch * .3), (0, 1, 0), 5, .028, to)
    for i in range(3):
        armour('org', (cw * (.3 - i * .05), .16, .12), (0, cy + cd * .36 - i * .02, cz - ch * (.38 + i * .1)), to, rx(.1), (0, 1, 0), .03, nb=2, seams=0, layer=False, oct=.04, hatch=False)
    plate('gun', (cw * .36, cd * .5, ch * .12), (0, cy - cd * .1, cz + ch * .5), to, .04)
    greeble((0, cy - cd * .2, cz + ch * .4), (cw * .3, cd * .3, ch * .18), to, 41, 8)
    greeble((0, cy - cd * .45, cz - ch * .2), (cw * .5, cd * .2, ch * .4), to, 42, 8)
    # ---------------- neck ----------------
    hy, hz = s(P['head'][0]), s(P['head'][1]); kw_, kd, kh = S3(P['skull'])
    n0, n1 = V(0, cy, cz + ch * .35), V(0, hy - kd * .3, hz - kh * .2)
    rod('gun', n0, n1, cw * .07, to, 32, loseg=10)
    for i in range(5):
        p_ = n0 + (n1 - n0) * (.15 + i * .17); tube('dark', cw * .09, .07, p_, to, n1 - n0, 32, lo=False)
    for sd in (-1, 1):
        piston(n0 + V(sd * .2, -.15, -.05), n1 + V(sd * .14, -.2, -.05), .04, to, boot=False)
        cable([n0 + V(sd * .3, .1, 0), (n0 + n1) / 2 + V(sd * .32, .15, .08), n1 + V(sd * .2, .05, -.05)], .03, to, n=2)

def head(to):
    hy, hz = s(P['head'][0]), s(P['head'][1]); kw_, kd, kh = S3(P['skull']); sl, sw2, sh2 = S3(P['snout']); dr = s(P['drop'])
    ew, ed, esw = S3(P['ear']); kw_ *= Y.get('hw', 1); sw2 *= (1 + Y.get('hw', 1)) / 2     # a narrower, longer head for the Strider
    hd_ = joint('head', (0, hy, hz), to)
    sk = V(0, hy - kd * .15, hz + kh * .05)
    plate('gun', (kw_ * .9, kd * .95, kh * .9), sk + V(0, -.02, -.03), hd_, .06, oct=(1, .12))
    armour('org', (kw_, kd, kh * .55), sk + V(0, 0, kh * .24), hd_, None, (0, 0, 1), .07, top=(.8, .8), nb=2, seams=1, oct=.14, hatch=False)
    plate('org', (kw_ * .92, .22, .11), V(0, hy + kd * .22, hz + kh * .32), hd_, .04, rx(.28))
    for sd in (-1, 1):
        plate('gun', (kw_ * .2, kd * .9, kh * .62), V(sd * kw_ * .44, hy, hz - kh * .1), hd_, .035, rz(sd * .12))
        bolt_row(V(sd * (kw_ * .55 + .01), hy - kd * .25, hz - kh * .05), V(sd * (kw_ * .55 + .01), hy + kd * .25, hz - kh * .05), (sd, 0, 0), 3, .02, hd_)
        tube('dark', .05, .04, V(sd * kw_ * .5, hy + kd * .2, hz - kh * .32), hd_, (sd, .4, 0), 20, lo=False)
    # muzzle: one solid two-tone wedge (orange top, dark underside) - no separate jaw, no gap
    m0 = V(0, hy + kd * .2, hz - kh * .05); m1 = m0 + V(0, sl, -dr)
    F = bframe(m0, m1, (0, 0, 1)); c = (m0 + m1) / 2
    plate('org', (sw2, sh2 * .55, sl), at(c, F, 0, sh2 * .2, 0), hd_, .06, F, top=(.55, .6), bot=(1, 1), oct=(2, .09))
    plate('gun', (sw2 * .9, sh2 * .5, sl * .96), at(c, F, 0, -sh2 * .3, -.02), hd_, .05, F, top=(.5, .55))
    plate('dark', (sw2 * .4, sh2 * .45, .16), at(m1, F, 0, -.02, -.06), hd_, .03, F)
    for i in range(4):
        plate('dark', (sw2 * .5, .012, .014), at(c, F, 0, sh2 * .2 + sh2 * .275 + .004, -sl * .3 + i * sl * .15), hd_, .004, F, lo=False)
    for sd in (-1, 1):
        S = 'L' if sd < 0 else 'R'
        plate('dark', (sw2 * .16, sh2 * .55, sl * .45), at(c, F, sd * sw2 * .5, 0, -sl * .2), hd_, .02, F, lo=False)
        e0 = V(sd * sw2 * .34, hy + kd * .32, hz + sh2 * .12); e1 = V(sd * sw2 * .24, hy + kd * .32 + sl * .5, hz - sh2 * .1)
        Fe = bframe(e0, e1, (sd, 0, .6)); ce = (e0 + e1) / 2
        plate('dark', (sw2 * .3, .06, (e1 - e0).length * 1.15), ce, hd_, .015, Fe, lo=False)
        plate('eye', (sw2 * .2, .05, (e1 - e0).length), at(ce, Fe, 0, .025, 0), hd_, .008, Fe, loseg=0)
        # ears: tall swept plates, orange outside, dark inner panel, bolted base
        b0 = V(sd * kw_ * .3, hy - kd * .3, hz + kh * .45); b1 = V(sd * kw_ * .38, hy - kd * .3 - esw, H)
        Fr = bframe(b0, b1, (0, 1, 0)); cr = (b0 + b1) / 2
        plate('org', (ew * 1.3, ed * .45, (b1 - b0).length), cr, hd_, .03, Fr, top=(.12, .3))
        plate('dark', (ew * .75, ed * .12, (b1 - b0).length * .75), at(cr, Fr, 0, ed * .26, -.05), hd_, .012, Fr, top=(.15, 1), lo=False)
        plate('gun', (ew * 1.25, ed * .55, .12), at(b0, Fr, 0, 0, .06), hd_, .02, Fr)
        bolt_row(at(b0, Fr, -ew * .4, ed * .28, .07), at(b0, Fr, ew * .4, ed * .28, .07), Fr @ V(0, 1, 0), 3, .018, hd_)
    rod('steel', V(.18, hy - kd * .55, hz + kh * .3), V(.2, hy - kd * .62, hz + kh * 1.1), .014, hd_, 8, lo=False)
    ball('eye', .025, V(.2, hy - kd * .62, hz + kh * 1.12), hd_, lo=False)
    return hd_

def shoulder(sd, to):
    S = 'L' if sd < 0 else 'R'
    pw2, pd2, ph2, px, py, pz2 = S3(P['pauld']); qw, qd, qh = S3(P['pad'])
    ph2 *= Y.get('ph', 1); pz2 += s(P['pauld'][2]) * (1 - Y.get('ph', 1)) * .5     # flatter shoulder plates keep their top
    hc = V(sd * px, py, pz2)
    plate('gun', (pw2 * .8, pd2 * .85, ph2 * .85), hc + V(-sd * pw2 * .05, 0, -.02), to, .08, oct=(0, .25))
    Rt = ry(-sd * .14)
    armour('org', (pw2, pd2, ph2 * .28), hc + V(0, 0, ph2 * .36), to, Rt, (0, 0, 1), .08, top=(.86, .86), nb=3, seams=0, oct=.24)
    ox = pw2 * .42 + .075 * TH                    # the outer (number) plate's centre
    armour('org', (.15 * TH, pd2 * .92, ph2 * .78), hc + V(sd * ox, 0, -ph2 * .05), to, None, (sd, 0, 0), .12 * TH, nb=3, seams=0, oct=.3, hatch=False)
    plate('gun', (.05, pd2 * .7, ph2 * .56), hc + V(sd * (ox + .075 * TH + .02), 0, -ph2 * .05), to, .02, oct=(0, .18), lo=False)
    nw = min(pd2 * .62, ph2 * .62 * 1.375)
    decal(D[Y['num']], nw, nw / 1.375, hc + V(sd * (ox + .075 * TH + .045), 0, ph2 * .06), (sd, 0, 0), to)
    decal(D[Y['stripe']], nw * .85, nw * .14, hc + V(sd * (ox + .075 * TH + .045), 0, -ph2 * .24), (sd, 0, 0), to)
    for fy in (-1, 1):
        armour('org', (pw2 * .86, .13, ph2 * .58), hc + V(0, fy * pd2 * .47, -ph2 * .06), to, rx(fy * .1), (0, fy, 0), .06, nb=2, seams=1, oct=.14)
    for i, (dz, k) in enumerate(((-.47, 1.0), (-.6, .8))):
        plate('org', (pw2 * .32 * k, pd2 * .9 * k, ph2 * .3), hc + V(sd * pw2 * (.43 + i * .06), 0, ph2 * dz), to, .05, ry(-sd * (.38 + i * .15)), oct=(0, .1))
    for i in range(3): plate('dark', (pw2 * .28, .02, .03), hc + V(sd * pw2 * .43, pd2 * .45 + .01, -ph2 * .4 - i * .07), to, .005, ry(-sd * .38), lo=False)
    greeble(hc + V(-sd * pw2 * .2, 0, -ph2 * .45), (pw2 * .4, pd2 * .6, ph2 * .2), to, 50 + sd, 8)
    # shoulder socket (sh_ mount): raised frame, dark pad, recessed centre, bolts, connector lights
    sock = hc + V(-sd * pw2 * .06, 0, ph2 * .5)
    plate('gun', (qw * 1.14, qd * 1.14, qh * .6), sock + V(0, 0, qh * .3), to, .04)
    plate('dark', (qw, qd, qh), sock + V(0, 0, qh * .5), to, .04)
    plate('gun', (qw * .62, qd * .55, .04), sock + V(0, 0, qh + .01), to, .015, lo=False)
    for sx in (-1, 1):
        for sy in (-1, 1): bolt(sock + V(sx * qw * .4, sy * qd * .38, qh), (0, 0, 1), .03, to)
        lamp(sock + V(sx * qw * .2, qd * .32, qh + .01), (.06, .025, .02), to, lo=False)
    joint('sh_' + S, sock + V(0, 0, qh), to)

def arm(sd, to):
    S = 'L' if sd < 0 else 'R'
    shp = V(sd * s(P['shoulder'][0]), s(P['shoulder'][1]), s(P['shoulder'][2]))
    el = V(sd * s(P['elbow'][0]), s(P['elbow'][1]), s(P['elbow'][2])); wr = V(sd * s(P['wrist'][0]), s(P['wrist'][1]), s(P['wrist'][2]))
    uw, ud = S3L(P['upper']); fwd, fdp = S3L(P['fore']); fx, fy, fz = S3(P['fist'])
    ar = joint('arm_' + S, shp, to)
    jointcap(shp, ud * .62, uw * 1.35, ar, bolts_=10)
    F = bframe(shp, el, (0, 1, 0)); Lu = (el - shp).length; c = (shp + el) / 2
    plate('gun', (uw, ud, Lu + ud * .5), c, ar, .05, F)
    frame_rivets(c, F, uw, ud, Lu, ar)
    armour('org', (.14 * TH, ud * .95, Lu * 1.1), at(c, F, sd * (uw * .5 + .07 * (TH - 1)), 0, .05), ar, F, (sd, 0, 0), .04, nb=2, seams=1, oct=.12)
    armour('org', (uw * .8, .1, Lu * .7), at(c, F, 0, ud * .52, 0), ar, F, (0, 1, 0), .03, nb=2, seams=0, layer=False, oct=.08, hatch=False)
    piston(at(shp, F, 0, ud * .45, .15), at(el, F, 0, ud * .42, -.12), .05, ar, boot=False)
    cable([at(shp, F, -sd * uw * .3, -ud * .4, 0), at(c, F, -sd * uw * .45, -ud * .45, 0), at(el, F, -sd * uw * .3, -ud * .4, 0)], .03, ar, n=3)
    e = joint('elbow_' + S, el, ar)
    jointcap(el, ud * .58, uw * 1.25, e, bolts_=10)
    # forearm housing with the saddle on its front face
    fdir = (wr - el).normalized(); F = bframe(el, wr, (0, 1, 0)); nrm = F @ V(0, 1, 0); Lf = (wr - el).length; c = (el + wr) / 2
    plate('gun', (fwd * .74, fdp * 1.04, Lf + fdp * .2), c, e, .07, F)
    pipe([at(el, F, sd * fwd * .3, -fdp * .5, .05), at(c, F, sd * fwd * .4, -fdp * .58, 0), at(wr, F, sd * fwd * .3, -fdp * .5, -.1)], .018, e, 3)
    plate('org', (fwd, fdp, Lf + fdp * .3), at(c, F, 0, 0, .02), e, .12, F, top=(.86, .86), bot=(.95, 1), oct=(2, .2))
    for z in (-.42, .4):
        plate('gun', (fwd * 1.04, fdp * 1.04, .09), at(c, F, 0, 0, Lf * z), e, .03, F, oct=(2, .21), lo=False)
        rivet_row(at(c, F, -fwd * .3, fdp * .53, Lf * z), at(c, F, fwd * .3, fdp * .53, Lf * z), nrm, .014, e, .07)
    for sx in (-1, 1):
        armour('org', (.1 * TH, fdp * .78, Lf * .82), at(c, F, sx * (fwd * .5 + .03 * TH), 0, .03), e, F, (sx, 0, 0), .03, nb=3, seams=1)
        vent(at(c, F, sx * (fwd * .5 + .08 * TH), -fdp * .1, -Lf * .25), facing(F, '+x' if sx > 0 else '-x'), fdp * .35, Lf * .25, e, n=4, depth=.05)
    fo = fwd * .5 + .03 * TH + .05 * TH + .045   # just off the forearm side plate
    decal(D['warn'], .17, .2, at(c, F, sd * fo, fdp * .15, Lf * .12), F @ V(sd, 0, 0), e, F @ V(0, 0, -1))
    if Y['limb_stripes']: decal(D['wstripes'], fdp * .7, fdp * .12, at(c, F, sd * fo, fdp * .05, -Lf * .2), F @ V(sd, 0, 0), e, F @ V(0, 0, -1))
    greeble(at(c, F, 0, -fdp * .48, 0), (fwd * .6, .2, Lf * .7), e, 60 + sd, 9, F)
    cable([at(el, F, -sd * fwd * .3, -fdp * .45, .1), at(c, F, -sd * fwd * .35, -fdp * .56, 0), at(wr, F, -sd * fwd * .25, -fdp * .45, -.05)], .03, e, n=2, clamps=1)
    sl2 = Lf * .72; sc = c + nrm * fdp * .5
    plate('gun', (fwd * .66, .07, sl2), sc + nrm * .03, e, .025, F)
    plate('dark', (fwd * .54, .05, sl2 * .9), sc + nrm * .07, e, .02, F)
    plate('gun', (fwd * .3, .03, sl2 * .55), sc + nrm * .1, e, .01, F, lo=False)
    for sx in (-1, 1):
        for sz in (-1, 1): bolt(sc + nrm * .095 + F @ V(sx * fwd * .22, 0, sz * sl2 * .4), nrm, .028, e)
        plate('steel', (.03, .03, sl2 * .8), sc + nrm * .085 + F @ V(sx * fwd * .29, 0, 0), e, .008, F, lo=False)
    lamp(sc + nrm * .1 + F @ V(0, 0, -sl2 * .38), (.12, .02, .025), e, F, lo=False)
    rx_ = fdir.cross(nrm); Rm = Matrix((rx_, fdir, nrm)).transposed()
    mnt = joint('fa_' + S, sc + nrm * s(.012), e); mnt.rotation_euler = Rm.to_euler()
    # wrist and a five-fingered fist (fingers curled in the rest pose; the game opens them)
    w = joint('wrist_' + S, wr, e)
    tube('dark', fdp * .36, .14, wr - fdir * .02, w, fdir, 36)
    Fh = bframe(wr, wr + fdir, (0, 1, 0))
    def hp(x, y, z): return at(wr, Fh, x, y, z)
    pal = -sd                                    # palm faces the body
    plate('gun', (fx * .62, fy * .92, fz * .62), hp(sd * fx * .06, 0, fz * .34), w, .05, Fh)
    armour('grey', (.08, fy * .8, fz * .5), hp(sd * fx * .38, 0, fz * .34), w, Fh, (sd, 0, 0), .025, nb=2, seams=1, layer=False)
    for i in range(4):
        y = (-.375 + i * .25) * fy; k0 = hp(sd * fx * .06, y, fz * .66)
        fa = joint('finger_%s%da' % (S, i), k0, w)
        tube('dark', fx * .1, fy * .2, k0, fa, Fh @ V(0, 1, 0), 24, loseg=8)
        for sy2 in (-1, 1): tube('gun', fx * .065, .02, k0 + Fh @ V(0, sy2 * fy * .105, 0), fa, Fh @ V(0, 1, 0), 20, lo=False)
        plate('grey', (fx * .22, fy * .19, .05), k0 + Fh @ V(sd * fx * .12, 0, 0), fa, .015, Fh @ ry(sd * .5), lo=False)
        k1 = hp(sd * fx * .06, y, fz * .66 + fz * .34)
        plate('gun', (fx * .3, fy * .2, fz * .36), (k0 + k1) / 2, fa, .03, Fh)
        plate('grey', (.05, fy * .17, fz * .26), (k0 + k1) / 2 + Fh @ V(sd * fx * .17, 0, 0), fa, .015, Fh, lo=False)
        bolt((k0 + k1) / 2 + Fh @ V(sd * (fx * .17 + .025), 0, 0), Fh @ V(sd, 0, 0), .016, fa)
        fb = joint('finger_%s%db' % (S, i), k1, fa)
        tube('dark', fx * .09, fy * .19, k1, fb, Fh @ V(0, 1, 0), 24, loseg=8)
        for sy2 in (-1, 1): tube('gun', fx * .06, .02, k1 + Fh @ V(0, sy2 * fy * .1, 0), fb, Fh @ V(0, 1, 0), 20, lo=False)
        bolt(k1 + Fh @ V(sd * fx * .17, 0, .02), Fh @ V(sd, 0, 0), .014, fb)
        k2 = hp(pal * fx * .3, y, fz * 1.0)
        plate('gun', (fx * .3, fy * .19, fz * .3), (k1 + k2) / 2, fb, .03, bframe(k1, k2, Fh @ V(0, 0, 1)))
        k3 = hp(pal * fx * .34, y, fz * .72)
        plate('gun', (fx * .26, fy * .18, fz * .26), (k2 + k3) / 2 + Fh @ V(0, 0, .01), fb, .025, bframe(k2, k3, Fh @ V(pal, 0, 0)))
    t0 = hp(pal * fx * .25, fy * .42, fz * .2); ta = joint('thumb_%sa' % S, t0, w)
    tube('dark', fx * .1, fx * .2, t0, ta, Fh @ V(1, 0, 0), 20, loseg=8)
    t1 = hp(pal * fx * .4, fy * .45, fz * .55)
    plate('gun', (fx * .26, fy * .22, (t1 - t0).length + .04), (t0 + t1) / 2, ta, .03, bframe(t0, t1, Fh @ V(0, 1, 0)))
    tb = joint('thumb_%sb' % S, t1, ta)
    t2 = hp(pal * fx * .28, fy * .2, fz * .82)
    plate('gun', (fx * .24, fy * .2, (t2 - t1).length + .03), (t1 + t2) / 2, tb, .025, bframe(t1, t2, Fh @ V(0, 1, 0)))
    return ar

def back(to):
    dw, dh, dd, dz, dyb = S3(P['dock'])
    c = V(0, dyb + dd / 2, dz)
    plate('gun', (dw, dd, dh), c, to, .12, oct=(1, .3))
    for sd in (-1, 1):   # the dock's sides: vent, armour strip, bolts
        vent(V(sd * (dw / 2 + .005), dyb + dd * .45, dz + dh * .1), rz(-sd * math.pi / 2), dd * .55, dh * .4, to, n=8, depth=.05)
        armour('org', (.06, dd * .7, dh * .18), V(sd * (dw / 2 + .03), dyb + dd * .5, dz - dh * .3), to, None, (sd, 0, 0), .02, nb=2, seams=0, layer=False, hatch=False, oct=.04)
        bolt_row(V(sd * (dw / 2 + .01), dyb + dd * .15, dz + dh * .38), V(sd * (dw / 2 + .01), dyb + dd * .85, dz + dh * .38), (sd, 0, 0), 5, .022, to)
    yb = dyb - .03
    # octagonal outer frame on the back face
    fb = min(.15, dw * .12)
    for x, z, sx, sz in ((0, dh / 2 - fb / 2, dw * .62, fb), (0, -dh / 2 + fb / 2, dw * .62, fb), (-dw / 2 + fb / 2, 0, fb, dh * .62), (dw / 2 - fb / 2, 0, fb, dh * .62)):
        plate('grey', (sx, .08, sz), V(x, yb, dz + z), to, .03, lo=False)
    for sx in (-1, 1):
        for sz in (-1, 1):
            plate('grey', (dw * .3, .08, fb), V(sx * dw * .36, yb, dz + sz * dh * .4), to, .03, ry(sx * sz * .8), lo=False)
    plate('dark', (dw * .7, .06, dh * .74), V(0, yb + .02, dz), to, .02)
    for x, z, sx, sz in ((0, dh * .3, dw * .42, .07), (0, -dh * .3, dw * .42, .07), (-dw * .2, 0, .07, dh * .6), (dw * .2, 0, .07, dh * .6)):
        plate('gun', (sx, .06, sz), V(x, yb - .02, dz + z), to, .015, lo=False)
    plate('gun', (.24, .08, dh * .42), V(0, yb - .04, dz), to, .02)
    lamp(V(0, yb - .09, dz), (.07, .03, dh * .2), to)
    for sx in (-1, 1):
        lamp(V(sx * dw * .43, yb - .05, dz), (.05, .04, dh * .14), to)
        bolt_row(V(sx * dw * .3, yb - .04, dz - dh * .3), V(sx * dw * .3, yb - .04, dz + dh * .3), (0, -1, 0), 6, .028, to)
        plate('steel', (.12, .1, .06), V(sx * dw * .3, dyb + dd * .3, dz + dh / 2 + .03), to, .02, lo=False)
        tube('steel', .05, .1, V(sx * dw * .3, dyb + dd * .3, dz + dh / 2 + .09), to, (1, 0, 0), 16, lo=False)
    bolt_row(V(-dw * .25, yb - .04, dz + dh * .44), V(dw * .25, yb - .04, dz + dh * .44), (0, -1, 0), 5, .028, to)
    decal(D['lift'], .3, .13, V(0, yb - .06, dz + dh * .36), (0, -1, 0), to)
    if Y['spine']:
        # exposed spine down the back, from the dock to the pelvis
        pz = s(P['pelvis'][3]); top_ = dz - dh * .5; yb2 = dyb + dd * .6
        for i in range(6):
            z = top_ - (top_ - pz) * (i + .5) / 6
            plate('gun', (dw * .55, .16, (top_ - pz) / 6 * .62), V(0, yb2, z), to, .03, oct=(1, .04))
            tube('dark', dw * .12, (top_ - pz) / 6 * .5, V(0, yb2 + .08, z), to, (0, 0, 1), 24, lo=False)
            for sx in (-1, 1): bolt(V(sx * dw * .2, yb2 - .085, z), (0, -1, 0), .02, to)
        for sx in (-1, 1): cable([V(sx * dw * .3, yb2, top_), V(sx * dw * .38, yb2 - .05, (top_ + pz) / 2), V(sx * dw * .3, yb2, pz + .1)], .028, to, n=2)
    if 'vents' not in P:
        greeble(V(0, dyb + dd * .9, dz - dh * .45), (dw * .7, dd * .5, .3), to, 71, 8)
        joint('bk', (0, dyb - s(.018), dz), to); return
    vw, vh, vz = S3(P['vents'])
    pw3 = (vw - dw) / 2
    pc = S3(P['pauld'])
    for sd in (-1, 1):
        c3 = V(sd * (dw / 2 + pw3 / 2), dyb + dd * .3, vz)
        plate('gun', (pw3, dd * .7, vh), c3, to, .05, oct=(1, .1))
        armour('org', (pw3 * .9, dd * .6, .1), c3 + V(0, 0, vh * .55), to, None, (0, 0, 1), .03, nb=2, seams=0, layer=False, oct=.06, hatch=False)
        vent(c3 + V(0, -dd * .36, 0), rz(math.pi), pw3 * .86, vh * .86, to, n=8, depth=.07)
        cable([c3 + V(sd * pw3 * .3, dd * .1, vh * .5), c3 + V(sd * pw3 * .45, dd * .3, vh * .6), V(sd * pc[3] * .82, pc[4] - pc[1] * .3, pc[5] + pc[2] * .1)], .035, to, n=2)
    greeble(V(0, dyb + dd * .9, dz - dh * .45), (dw * .7, dd * .5, .3), to, 71, 8)
    joint('bk', (0, dyb - s(.018), dz), to)

def build():
    hd.reset(); hd.materials()
    root = joint(CID, (0, 0, 0))
    hips = joint('hips', (0, 0, s(P['hip'][1])), root)
    for sd in (-1, 1): leg(sd, hips)
    to = joint('torso', (0, 0, s(P['hip'][1])), root)
    torso_body(to, hips); head(to)
    for sd in (-1, 1): shoulder(sd, to); arm(sd, to)
    back(to)
    objs = hd.flush()
    return root

if __name__ == '__main__':
    import time
    t = time.time(); build()
    for old, new in (('gun', 'hgun'), ('dark', 'hdark')): bpy.data.materials[old].name = new   # the model bay's Howler 07 frame colours
    hi, lo = hd.count('HI'), hd.count('LO')
    print('HI triangles', hi, ' LO triangles', lo, ' objects', len([o for o in bpy.data.objects if o.type == 'MESH']), ' build s', round(time.time() - t, 1))
    out = sys.argv[-1]
    if out.endswith('.blend'): bpy.ops.wm.save_as_mainfile(filepath=out)
