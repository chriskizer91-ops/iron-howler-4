"""Ironhowl 4 chassis blockouts: Strider (87), Howler 07 (88), Bastion (89), Wraith (90).
Proportions are fractions of the height H (ground to ear tip), read off the front and side views of each sheet.
Forward is +y, so a 'y' value below is how far forward of the hips a joint sits.

Shared skeleton (empties, zero rotation in the standing pose):
  <id> root
    hips > thigh_L/R > knee_L/R > hock_L/R > ankle_L/R > toe_L0..2 / toe_R0..2, heel_L/R
    torso (at hip height) > head, arm_L/R > elbow_L/R > wrist_L/R (hand)
  Module mounts (the game never animates these):
    fa_L/R  forearm saddle (child of elbow; its fixed rotation turns a module's +y along the forearm, +z out of the saddle)
    sh_L/R  shoulder socket on top of the shoulder housing (child of torso)
    bk      backbone dock on the back (child of torso; module extends toward -y)
"""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blk import *

C = {
 # legX: half spacing of hip, knee, hock, ankle (legs splay outward).  hip/knee/hock/ankle: (forward, height).
 # pelvis/waist (w, d, h, z), chest (w, d, h, z, forward), pauld (w, d, h, x, forward, z), dock (w, h, d, z, back face)
 'strider': dict(H=6.0, num='12', mscale=.85, extra='spring',
    legX=(.095, .105, .12, .14), hip=(0, .53), knee=(.04, .355), hock=(-.09, .27), ankle=(0, .075),
    thigh=(.10, .12), shin=(.065, .075), meta=(.05, .055), foot=(.14, .18, .045), claw=.075,
    pelvis=(.19, .12, .08, .57), waist=(.09, .08, .07, .635), chest=(.30, .16, .17, .755, .015), taper=(.42, .8),
    head=(.12, .88), skull=(.10, .10, .10), snout=(.12, .07, .055), drop=.06, ear=(.035, .03, .04),
    pauld=(.12, .13, .09, .15, -.01, .81), pad=(.08, .08, .018),
    shoulder=(.17, -.01, .79), elbow=(.20, -.01, .665), wrist=(.235, .06, .54),
    upper=(.06, .065), fore=(.085, .09), fist=(.065, .07, .07), dock=(.11, .25, .10, .765, -.16)),
 'howler': dict(H=6.3, num='07', mscale=1.0, extra='vents',
    legX=(.10, .13, .165, .20), hip=(0, .55), knee=(.04, .375), hock=(-.13, .29), ankle=(-.02, .08),
    thigh=(.13, .17), shin=(.10, .11), meta=(.08, .09), foot=(.18, .22, .06), claw=.085,
    pelvis=(.33, .17, .10, .55), waist=(.16, .12, .07, .625), chest=(.36, .25, .26, .74, .01), taper=(.5, .8),
    head=(.15, .865), skull=(.15, .12, .12), snout=(.13, .10, .07), drop=.05, ear=(.045, .04, .03),
    pauld=(.18, .18, .19, .256, -.04, .745), pad=(.13, .12, .05),
    shoulder=(.235, -.04, .75), elbow=(.255, -.03, .625), wrist=(.275, .10, .50),
    upper=(.09, .10), fore=(.13, .15), fist=(.09, .10, .09), dock=(.22, .30, .10, .76, -.175), vents=(.40, .15, .785)),
 'bastion': dict(H=7.0, num='31', mscale=1.35, extra='plates',
    legX=(.17, .20, .24, .27), hip=(0, .50), knee=(.07, .385), hock=(-.11, .23), ankle=(.06, .085),
    thigh=(.24, .22), shin=(.19, .18), meta=(.15, .15), foot=(.34, .32, .085), claw=.10,
    pelvis=(.50, .24, .14, .50), waist=(.24, .18, .08, .56), chest=(.52, .36, .30, .735, .05), taper=(.55, .85),
    head=(.25, .865), skull=(.16, .13, .12), snout=(.12, .11, .08), drop=.04, ear=(.05, .045, .03),
    pauld=(.32, .40, .27, .39, .03, .775), pad=(.20, .16, .03),
    shoulder=(.36, .02, .73), elbow=(.43, .0, .60), wrist=(.46, .24, .42),
    upper=(.13, .14), fore=(.18, .22), fist=(.15, .14, .12), dock=(.30, .46, .18, .72, -.30), vents=(.50, .16, .74)),
 'wraith': dict(H=6.3, num='09', mscale=.9, extra='mast',
    legX=(.09, .10, .115, .13), hip=(0, .53), knee=(.01, .385), hock=(-.185, .29), ankle=(-.06, .09),
    thigh=(.10, .12), shin=(.075, .085), meta=(.06, .07), foot=(.15, .18, .05), claw=.08,
    pelvis=(.25, .14, .08, .55), waist=(.15, .10, .06, .615), chest=(.30, .22, .21, .73, .0), taper=(.5, .85),
    head=(.09, .835), skull=(.12, .10, .10), snout=(.13, .08, .06), drop=.05, ear=(.03, .035, .12),
    pauld=(.18, .14, .09, .195, -.06, .80), pad=(.12, .10, .03),
    shoulder=(.20, -.04, .77), elbow=(.235, -.02, .64), wrist=(.25, .09, .50),
    upper=(.075, .085), fore=(.11, .13), fist=(.07, .08, .08), dock=(.28, .33, .14, .715, -.27), vents=(.36, .2, .72)),
}

def V(*a): return Vector(a)

def build(cid, M_=None):
    P = C[cid]; H = P['H']; M_ = M_ or palette()
    org, dark, gun, steel, eye, red = (M_[k] for k in ('org', 'dark', 'gun', 'steel', 'eye', 'red'))
    s = lambda v: v * H
    S3 = lambda t: tuple(s(v) for v in t)
    root = joint(cid, (0, 0, 0))
    hipZ = s(P['hip'][1])
    hips = joint('hips', (0, 0, hipZ), root)
    # ---------------- legs ----------------
    tw, td = S3(P['thigh']); sw, sdp = S3(P['shin']); mw, md = S3(P['meta']); fw, fl, fh = S3(P['foot']); cl = s(P['claw'])
    lx = S3(P['legX'])
    for sd in (-1, 1):
        S = 'L' if sd < 0 else 'R'
        hip = V(sd * lx[0], s(P['hip'][0]), hipZ)
        kn = V(sd * lx[1], s(P['knee'][0]), s(P['knee'][1]))
        hk = V(sd * lx[2], s(P['hock'][0]), s(P['hock'][1]))
        an = V(sd * lx[3], s(P['ankle'][0]), s(P['ankle'][1]))
        th = joint('thigh_' + S, hip, hips); k = joint('knee_' + S, kn, th); h = joint('hock_' + S, hk, k); a = joint('ankle_' + S, an, h)
        jcyl('hipJ_' + S, hip, td * .38, tw * 1.05, th, dark)
        seg('thigh_' + S, hip, kn, tw * .75, td * .75, th, gun, bev=tw * .1)
        seg('thighA_' + S, hip + V(0, td * .2, td * .15), kn + V(0, td * .32, td * .2), tw, td * .6, th, org, bev=tw * .12, top=(.85, .9), bot=(1.0, 1.1))
        seg('thighS_' + S, hip + V(sd * tw * .45, 0, 0), kn + V(sd * tw * .4, 0, td * .3), tw * .12, td * .8, th, org, bev=tw * .04)
        jcyl('kneeJ_' + S, kn, sdp * .52, sw * 1.2, k, dark)
        bx('kneeCap_' + S, (sw * 1.0, sdp * .5, sdp * .75), kn + V(0, sdp * .5, sdp * .1), k, org, sw * .12, top=(.8, .7))
        seg('shin_' + S, kn, hk, sw, sdp, k, gun, bev=sw * .1)
        seg('shinA_' + S, kn + V(0, sdp * .35, -sdp * .3), hk + V(0, sdp * .3, sdp * .1), sw * 1.05, sdp * .5, k, org, bev=sw * .12, bot=(.85, .9))
        jcyl('hockJ_' + S, hk, md * .6, mw * 1.25, h, dark)
        seg('meta_' + S, hk, an, mw, md, h, gun, bev=mw * .1)
        seg('metaA_' + S, hk + V(0, md * .35, -md * .4), an + V(0, md * .35, md * 1.0), mw * 1.05, md * .5, h, org, bev=mw * .12)
        if P['extra'] == 'spring':
            rod('spring_' + S, hk + V(0, -md * .65, -md * .5), an + V(0, -md * .6, md * 1.6), md * .24, h, M_['eye'] if False else steel, 10)
        ball('ankleJ_' + S, md * .6, L(a, an), a, dark, 14)
        # foot: a block under the ankle, three clawed toes forward, a heel claw back
        g = -an.z
        bx('foot_' + S, (fw * .8, fl * .5, fh * 1.5), an + V(0, fl * .05, g + fh * .75), a, gun, fh * .25, top=(.75, .7))
        for i, x in enumerate((-.36, 0, .36)):
            t0 = an + V(x * fw, fl * .2, g + fh * .55)
            t = joint('toe_%s%d' % (S, i), t0, a)
            bx('toeB_%s%d' % (S, i), (fw * .27, fl * .5, fh * 1.0), t0 + V(x * fw * .15, fl * .22, 0), t, gun, fh * .2, top=(.8, .8))
            bx('toeA_%s%d' % (S, i), (fw * .24, fl * .3, fh * .3), t0 + V(x * fw * .15, fl * .2, fh * .55), t, org, fh * .1)
            cone('claw_%s%d' % (S, i), t0 + V(x * fw * .3, fl * .42, fh * .25), t0 + V(x * fw * .42, fl * .42 + cl, -fh * .5), fw * .12, t, steel)
        he = joint('heel_' + S, an + V(0, -fl * .22, g + fh * .9), a)
        cone('heelC_' + S, JW['heel_' + S], JW['heel_' + S] + V(0, -cl * 1.0, cl * 1.0), fw * .13, he, steel)
    # ---------------- pelvis and torso ----------------
    pw, pd, ph, pz = S3(P['pelvis'])
    bx('pelvis', (pw, pd, ph), (0, 0, pz), hips, gun, ph * .2)
    bx('cod', (pw * .32, pd * .35, ph * 1.4), (0, pd * .5, pz - ph * .25), hips, org, ph * .15, bot=(.5, 1))
    bx('rearPl', (pw * .5, pd * .2, ph * 1.1), (0, -pd * .5, pz - ph * .1), hips, org, ph * .1, bot=(.7, 1))
    to = joint('torso', (0, 0, hipZ), root)
    ww, wd, wh, wz = S3(P['waist'])
    bx('waist', (ww, wd, wh), (0, 0, wz), to, dark, wh * .15)
    cw, cd, ch, cz, cy = S3(P['chest'])
    rod('spine', (0, 0, pz), (0, cy * .5, cz - ch * .4), ww * .35, to, gun, 12)
    bx('chest', (cw, cd, ch), (0, cy, cz), to, org, ch * .1, bot=P['taper'], top=(1.0, .95))
    bx('chestCore', (cw * .75, cd * .92, ch * .9), (0, cy - cd * .05, cz - ch * .08), to, gun, ch * .08, bot=(P['taper'][0] * 1.1, .9))
    bx('chestPlate', (cw * .5, cd * .14, ch * .6), (0, cy + cd * .5, cz - ch * .05), to, org, ch * .06, bot=(.65, 1))
    for sd in (-1, 1):
        bx('chestVent%d' % sd, (cw * .18, cd * .06, ch * .1), (sd * cw * .22, cy + cd * .53, cz + ch * .15), to, dark, .01)
        bx('chestEye%d' % sd, (cw * .1, cd * .05, ch * .035), (sd * cw * .22, cy + cd * .55, cz - ch * .02), to, eye, .01)
    bx('collar', (cw * .36, cd * .5, ch * .12), (0, cy - cd * .1, cz + ch * .5), to, gun, ch * .04)
    # ---------------- head ----------------
    hy, hz = s(P['head'][0]), s(P['head'][1])
    kw_, kd, kh = S3(P['skull']); sl, sw2, sh2 = S3(P['snout'])
    rod('neck', (0, cy, cz + ch * .35), (0, hy - kd * .3, hz - kh * .2), cw * .07, to, dark, 12)
    hd = joint('head', (0, hy, hz), to)
    bx('skull', (kw_, kd, kh), (0, hy - kd * .15, hz + kh * .05), hd, org, kh * .15, top=(.85, .8), bot=(.8, .9))
    for sd in (-1, 1): bx('cheek%d' % sd, (kw_ * .18, kd * .8, kh * .55), (sd * kw_ * .45, hy, hz - kh * .15), hd, gun, kh * .06)
    dr = s(P['drop'])
    seg('snout', (0, hy + kd * .2, hz - kh * .05), (0, hy + kd * .2 + sl, hz - kh * .05 - dr), sw2, sh2, hd, org, bev=sh2 * .2, top=(.55, .6))
    seg('jaw', (0, hy + kd * .1, hz - kh * .45), (0, hy + kd * .1 + sl * .85, hz - kh * .45 - dr * .9), sw2 * .9, sh2 * .55, hd, gun, bev=sh2 * .1, top=(.6, .7))
    ew, ed, esw = S3(P['ear'])
    for sd in (-1, 1):
        S = 'L' if sd < 0 else 'R'
        seg('eye_' + S, (sd * sw2 * .32, hy + kd * .32, hz + sh2 * .15), (sd * sw2 * .24, hy + kd * .32 + sl * .55, hz - sh2 * .1), sw2 * .2, sh2 * .14, hd, eye, bev=.005)
        fx_ = .12 if P['extra'] == 'mast' else 1.0
        base = V(sd * kw_ * .3 * fx_, hy - kd * .3, hz + kh * .45)
        tip = V(sd * kw_ * .38 * fx_, hy - kd * .3 - esw, H)
        seg('ear_' + S, base, tip, ew, ed, hd, org, bev=ew * .1, top=(.12, .3))
    # ---------------- shoulders, arms, hands ----------------
    pw2, pd2, ph2, px, py, pz2 = S3(P['pauld']); qw, qd, qh = S3(P['pad'])
    uw, ud = S3(P['upper']); fwd, fdp = S3(P['fore']); fx, fy, fz = S3(P['fist'])
    for sd in (-1, 1):
        S = 'L' if sd < 0 else 'R'
        shp = V(sd * s(P['shoulder'][0]), s(P['shoulder'][1]), s(P['shoulder'][2]))
        el = V(sd * s(P['elbow'][0]), s(P['elbow'][1]), s(P['elbow'][2]))
        wr = V(sd * s(P['wrist'][0]), s(P['wrist'][1]), s(P['wrist'][2]))
        # shoulder housing, fixed to the torso; the socket pad on top is the sh_ mount
        hc = V(sd * px, py, pz2)
        bx('pauld_' + S, (pw2, pd2, ph2), hc, to, org, ph2 * .12, top=(.8, .85), bot=(1.0, 1.0), shift=(-sd * pw2 * .08, 0))
        bx('pauldIn_' + S, (pw2 * .45, pd2 * .8, ph2 * .8), hc + V(-sd * pw2 * .5, 0, -ph2 * .05), to, gun, ph2 * .1)
        bx('pauldLip_' + S, (pw2 * .12, pd2 * .9, ph2 * .5), hc + V(sd * pw2 * .5, 0, -ph2 * .4), to, org, ph2 * .05, rot=(0, -sd * .25, 0))
        sock = hc + V(-sd * pw2 * .06, 0, ph2 * .5)
        bx('socketRim_' + S, (qw * 1.12, qd * 1.12, qh * .6), sock + V(0, 0, qh * .3), to, gun, qh * .15)
        bx('socket_' + S, (qw, qd, qh), sock + V(0, 0, qh * .5), to, dark, qh * .15)
        joint('sh_' + S, sock + V(0, 0, qh), to)
        if P['extra'] == 'plates':
            bx('pauldPlate_' + S, (s(.012), pd2 * .7, ph2 * .55), hc + V(sd * pw2 * .5, 0, ph2 * .05), to, red, s(.004))
        else:
            bx('pauldPlate_' + S, (s(.006), pd2 * .55, ph2 * .45), hc + V(sd * pw2 * .5, 0, ph2 * .05), to, org, s(.003))
        ar = joint('arm_' + S, shp, to)
        jcyl('shJ_' + S, shp, ud * .62, uw * 1.35, ar, dark)
        seg('upper_' + S, shp, el, uw, ud, ar, gun, bev=uw * .1, ext=ud * .25)
        seg('upperA_' + S, shp + V(sd * uw * .42, 0, -ud * .2), el + V(sd * uw * .45, 0, ud * .45), uw * .3, ud * .95, ar, org, bev=uw * .08)
        e = joint('elbow_' + S, el, ar)
        jcyl('elbowJ_' + S, el, ud * .55, uw * 1.2, e, dark)
        seg('fore_' + S, el, wr, fwd, fdp, e, org, bev=fwd * .12, ext=fdp * .15, bot=(.95, 1.0), top=(.85, .85))
        seg('foreIn_' + S, el, wr, fwd * .72, fdp * 1.06, e, gun, bev=fwd * .08, ext=fdp * .08)
        # forearm saddle on the front face of the hanging forearm (it faces up when the arm is raised to aim)
        Mf = frame(el, wr); fdir = (wr - el).normalized(); nrm = Mf @ V(0, -1, 0)     # the forearm's front face
        sc = (el + wr) / 2 + nrm * fdp * .5
        sl2 = (wr - el).length * .7
        seg('saddleRim_' + S, sc - fdir * sl2 * .5, sc + fdir * sl2 * .5, fwd * .62, s(.008), e, gun, bev=s(.002))
        seg('saddle_' + S, sc - fdir * sl2 * .45 + nrm * s(.006), sc + fdir * sl2 * .45 + nrm * s(.006), fwd * .52, s(.012), e, dark, bev=s(.003))
        rx = fdir.cross(nrm); Rm = Matrix((rx, fdir, nrm)).transposed()    # module x, y (along the forearm), z (out of the saddle)
        mnt = joint('fa_' + S, sc + nrm * s(.012), e); mnt.rotation_euler = Rm.to_euler()
        w = joint('wrist_' + S, wr, e)
        fc = wr + fdir * fz * .45
        seg('fist_' + S, wr, wr + fdir * fz, fx, fy, w, gun, bev=fz * .15)
        for i in range(4):
            seg('knuck_%s%d' % (S, i), wr + fdir * fz * .55 + V(-fx * .36 + i * fx * .24, fy * .45, 0), wr + fdir * fz * 1.05 + V(-fx * .36 + i * fx * .24, fy * .45, 0), fx * .2, fy * .2, w, dark, bev=fz * .03)
        seg('thumb_' + S, wr + fdir * fz * .2 + V(-sd * fx * .5, fy * .15, 0), wr + fdir * fz * .75 + V(-sd * fx * .5, fy * .3, 0), fx * .2, fy * .3, w, dark, bev=fz * .04)
    # ---------------- back: backbone dock ----------------
    dw, dh, dd, dz, dyb = S3(P['dock'])
    bx('dockBody', (dw, dd, dh), (0, dyb + dd * .5, dz), to, gun, dd * .12)
    bx('dockFrame', (dw * .4, s(.012), dh * .8), (0, dyb, dz), to, dark, s(.003))
    bx('dockRail', (dw * .12, s(.02), dh * .6), (0, dyb - s(.008), dz), to, gun, s(.003))
    for sd in (-1, 1): bx('dockLight%d' % sd, (s(.008), s(.006), dh * .18), (sd * dw * .16, dyb - s(.004), dz), to, eye, .004)
    joint('bk', (0, dyb - s(.018), dz), to)
    if 'vents' in P:
        vw, vh, vz = S3(P['vents']); pw3 = (vw - dw) / 2
        for sd in (-1, 1):
            c3 = (sd * (dw / 2 + pw3 / 2), dyb + dd * .3, vz)
            bx('ventBox%d' % sd, (pw3, dd * .7, vh), c3, to, gun, s(.006))
            slats('dockVent%d' % sd, 6, (pw3 * .8, s(.01), s(.008)), vh * .14, L(to, (c3[0], dyb - dd * .06, vz)), to, dark, axis='z')
    if P['extra'] == 'mast':
        bx('mastBox', (s(.06), s(.07), s(.14)), (s(.11), dyb + s(.03), dz + dh * .5 + s(.07)), to, gun, s(.008))
        rod('mast', (s(.11), dyb + s(.03), dz + dh * .5 + s(.14)), (s(.11), dyb + s(.03), H * 1.03), s(.005), to, steel, 6)
        bx('mastTip', (s(.012), s(.012), s(.02)), (s(.11), dyb + s(.03), H * 1.035), to, eye, .003)
    # number plates on the chest / shoulder sides
    for sd in (-1, 1):
        bx('numPlate%d' % sd, (s(.006), cd * .45, ch * .4), (sd * cw * .5, cy, cz), to, red if P['extra'] == 'plates' else org, s(.002))
    return root

AIM = {'bastion': (42, 48)}   # shoulder, elbow degrees: the Bastion swings its arms out of the big shoulder housings

def pose_aim(cid):
    """raise both forearms to point forward (how the game aims forearm weapons)"""
    sh, el = AIM.get(cid, (10, 80))
    for S in 'LR':
        bpy.data.objects['elbow_' + S].rotation_euler.x = math.radians(el)
        bpy.data.objects['arm_' + S].rotation_euler.x = math.radians(sh)

if __name__ == '__main__':
    reset(); JW.clear()
    import json
    build(sys.argv[-1]); print('tris', tris())
