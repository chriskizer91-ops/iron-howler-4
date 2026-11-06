"""Ironhowl 4 module blockouts, sheets 91-95. Sizes in metres for a 1.0-scale mount (the Howler); each chassis scales its mounts.
Mount frames (the module's own axes, origin = the interface):
  fa (forearm saddle):  +z out of the saddle, +y along the forearm toward the hand (barrels forward), base plate on z = 0
  sh (shoulder socket): +z up, +y forward, pedestal on z = 0
  bk (backbone dock):   dock face at y = 0, module hangs behind it (toward -y), centred on z = 0
Joints inside modules: mz0.. muzzles, spin (barrel cluster), yaw / pitch (turrets), jet_L/R (thrusters),
gunarm_L/R (Thunderspine), drone_L/R (Swarm), panel0..5 (Veil), claw0..2 (Talon), arm0..2 (Mender), leg (Root).
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blk import *
from ih3lib import hose

R = math.radians
MODS = {}   # id -> (name, slot, builder)

def mod(mid, name, slot):
    def deco(fn):
        MODS[mid] = (name, slot, fn); return fn
    return deco

# ---------------------------------------------------------------- forearm autocannons (91)
def cannon_body(r, M):
    org, dark, gun, eye = M['org'], M['dark'], M['gun'], M['eye']
    bx('ped', (.4, .9, .1), (0, .05, .05), r, dark, .02)
    bx('pedRail', (.5, .75, .04), (0, .05, .02), r, gun, .01)
    bx('rear', (.66, .5, .64), (0, -.3, .43), r, dark, .07, top=(.85, .9))
    bx('armour', (.72, .85, .66), (0, .3, .43), r, org, .09, top=(.86, .9))
    bx('armTop', (.42, .6, .1), (0, .32, .8), r, org, .03)
    for sd in (-1, 1): bx('armSide%d' % sd, (.04, .55, .4), (sd * .38, .3, .43), r, gun, .01)
    cyl('collar', .36, .2, (0, .78, .43), r, gun, seg=8, axis='y', bev=.03)
    bx('lamp', (.03, .14, .03), (.36, .55, .7), r, eye, .005)

def barrels(r, M, pts, rad, length=.55):
    gun, steel, dark = M['gun'], M['steel'], M['dark']
    sp = joint('spin', (0, .86, .43), r)
    for i, (x, z) in enumerate(pts):
        c = (x, .86 + length / 2, .43 + z)
        cyl('brl%d' % i, rad, length, L(sp, c), sp, gun, seg=16, axis='y', bev=.01)
        cyl('ring%d' % i, rad * 1.1, .07, L(sp, (x, .86 + length - .04, .43 + z)), sp, steel, seg=16, axis='y', bev=.01)
        cyl('bore%d' % i, rad * .74, .02, L(sp, (x, .86 + length + .005, .43 + z)), sp, dark, seg=14, axis='y', bev=0)
        joint('mz%d' % i, (x, .86 + length + .05, .43 + z), sp)

@mod('FA-01', 'Needle', 'fa')
def needle(r, M): cannon_body(r, M); barrels(r, M, [(0, 0)], .2, .5)

@mod('FA-02', 'Fang', 'fa')
def fang(r, M): cannon_body(r, M); barrels(r, M, [(0, .15), (0, -.15)], .14)

@mod('FA-03', 'Ripper', 'fa')
def ripper(r, M): cannon_body(r, M); barrels(r, M, [(0, .14), (-.14, -.1), (.14, -.1)], .125)

@mod('FA-04', 'Mauler', 'fa')
def mauler(r, M): cannon_body(r, M); barrels(r, M, [(-.13, .13), (.13, .13), (-.13, -.13), (.13, -.13)], .115)

# ---------------------------------------------------------------- forearm specialists (92)
def spec_body(r, M, length=.95):
    org, dark, gun, eye = M['org'], M['dark'], M['gun'], M['eye']
    bx('ped', (.4, .85, .1), (0, .05, .05), r, dark, .02)
    bx('rear', (.62, .5, .62), (0, -.3, .42), r, dark, .07, top=(.85, .9))
    bx('armour', (.68, length, .64), (0, .1 + length / 2 - .35, .42), r, org, .09, top=(.88, .9))
    bx('lamp', (.18, .1, .04), (0, -.05, .76), r, eye, .008)

@mod('FA-05', 'Lance', 'fa')
def lance(r, M):
    spec_body(r, M, .8)
    seg('prongU', (0, .45, .5), (0, 1.6, .42), .24, .16, r, M['org'], bev=.03, top=(.15, .3))
    seg('prongL', (0, .45, .22), (0, 1.42, .27), .24, .13, r, M['org'], bev=.03, top=(.2, .3))
    seg('core', (0, .45, .35), (0, 1.0, .35), .12, .1, r, M['dark'], bev=.02)
    joint('mz0', (0, 1.3, .35), r)

@mod('FA-06', 'Arc', 'fa')
def arc(r, M):
    spec_body(r, M, .7)
    for i, y in enumerate((.05, .3)): bx('ring%d' % i, (.64, .14, .6), (0, y, .37), r, M['gun'], .05)
    bx('yoke', (.32, .18, .58), (0, .7, .37), r, M['dark'], .05)
    for nm, z in (('U', .6), ('L', .14)):
        bx('prong' + nm, (.32, .5, .16), (0, .98, z), r, M['dark'], .05)
        bx('plate' + nm, (.2, .3, .03), (0, 1.0, z + (-.09 if nm == 'U' else .09)), r, M['eye'], .005)
    joint('mz0', (0, 1.15, .37), r)

@mod('FA-07', 'Talon', 'fa')
def talon(r, M):
    spec_body(r, M, .85)
    for i, x in enumerate((-.17, 0, .17)):
        c = joint('claw%d' % i, (x, .75, .45), r)
        bx('knuck%d' % i, (.15, .2, .2), (x, .78, .45), c, M['dark'], .03)
        seg('cl%da' % i, (x, .82, .48), (x, 1.2, .42), .1, .14, c, M['steel'], bev=.02, top=(.8, .7))
        cone('cl%db' % i, (x, 1.18, .43), (x, 1.5, .18), .065, c, M['steel'])

@mod('FA-08', 'Furnace', 'fa')
def furnace(r, M):
    spec_body(r, M, .9)
    dark, gun = M['dark'], M['gun']
    for nm, sz, c in (('T', (.68, .32, .08), (0, .95, .66)), ('B', (.68, .32, .08), (0, .95, .08)),
                      ('Ls', (.08, .32, .58), (-.34, .95, .37)), ('Rs', (.08, .32, .58), (.34, .95, .37))):
        bx('noz' + nm, sz, c, r, gun, .03)
    slats('louvre', 3, (.56, .2, .05), .14, (0, .95, .37), r, dark, axis='z')
    joint('mz0', (0, 1.15, .37), r)

# ---------------------------------------------------------------- shoulder modules (93)
def sh_base(r, M):
    bx('ped', (.42, .44, .14), (0, 0, .07), r, M['dark'], .03)
    bx('neck', (.3, .32, .16), (0, 0, .22), r, M['gun'], .03)
    bx('tri', (.1, .02, .08), (0, .225, .1), r, M['eye'], .005)
    return joint('yaw', (0, 0, .3), r)

def tubes(par, M, nx, nz, cx, cz, gap, rad, y):
    k = 0
    for i in range(nx):
        for j in range(nz):
            x, z = cx + (i - (nx - 1) / 2) * gap, cz + (j - (nz - 1) / 2) * gap
            cyl('tube%d' % k, rad, .1, L(par, (x, y, z)), par, M['gun'], seg=14, axis='y', bev=.01)
            cyl('tubeIn%d' % k, rad * .7, .02, L(par, (x, y + .05, z)), par, M['dark'], seg=12, axis='y', bev=0)
            joint('mz%d' % k, (x, y + .1, z), par); k += 1

@mod('SH-01', 'Hive-6', 'sh')
def hive(r, M):
    y = sh_base(r, M)
    bx('body', (1.0, .85, .72), (0, 0, .68), y, M['org'], .1, top=(.92, .92))
    bx('face', (.82, .06, .56), (0, .43, .68), y, M['dark'], .03)
    bx('grip', (.06, .3, .3), (.52, -.05, .68), y, M['dark'], .02)
    tubes(y, M, 3, 2, 0, .68, .25, .095, .44)

@mod('SH-02', 'Hammer', 'sh')
def hammer(r, M):
    y = sh_base(r, M)
    cyl('drum', .42, .95, L(y, (0, 0, .72)), y, M['org'], seg=8, axis='y', bev=.05)
    cyl('muzRing', .36, .14, L(y, (0, .5, .72)), y, M['gun'], seg=20, axis='y', bev=.02)
    cyl('bore', .27, .02, L(y, (0, .575, .72)), y, M['dark'], seg=20, axis='y', bev=0)
    cyl('cap', .3, .1, L(y, (0, -.5, .72)), y, M['gun'], seg=8, axis='y', bev=.02)
    joint('mz0', (0, .62, .72), y)

@mod('SH-03', 'Storm-12', 'sh')
def storm(r, M):
    y = sh_base(r, M)
    bx('body', (1.1, .9, .85), (0, 0, .74), y, M['org'], .1, top=(.92, .92))
    bx('face', (.92, .06, .7), (0, .455, .74), y, M['dark'], .03)
    bx('grip', (.06, .3, .34), (.57, -.05, .74), y, M['dark'], .02)
    tubes(y, M, 4, 3, 0, .74, .2, .075, .47)

@mod('SH-04', 'Longtooth', 'sh')
def longtooth(r, M):
    y = sh_base(r, M)
    cyl('tube', .3, 1.9, L(y, (0, .3, .62)), y, M['org'], seg=8, axis='y', bev=.04)
    cyl('muz', .25, .1, L(y, (0, 1.26, .62)), y, M['gun'], seg=8, axis='y', bev=.02)
    cyl('bore', .19, .02, L(y, (0, 1.31, .62)), y, M['dark'], seg=8, axis='y', bev=0)
    bx('rib', (.1, 1.1, .08), (0, .2, .92), y, M['gun'], .02)
    joint('mz0', (0, 1.35, .62), y)

@mod('SH-05', 'Sentry', 'sh')
def sentry(r, M):
    y = sh_base(r, M)
    p = joint('pitch', (0, 0, .72), y)
    ball('dome', .44, (0, 0, 0), p, M['org'], 20)
    for i, (x, z) in enumerate(((0, .13), (-.14, -.1), (.14, -.1))):
        cyl('brl%d' % i, .085, .42, L(p, (x, .48, .72 + z)), p, M['gun'], seg=14, axis='y', bev=.01)
        joint('mz%d' % i, (x, .7, .72 + z), p)
    ball('eye', .07, L(p, (0, .05, 1.17)), p, M['eye'], 12)

@mod('SH-06', 'Watcher', 'sh')
def watcher(r, M):
    y = sh_base(r, M)
    bx('yokeB', (.95, .3, .1), (0, 0, .35), y, M['gun'], .03)
    for sd in (-1, 1): bx('yoke%d' % sd, (.08, .3, .55), (sd * .47, 0, .62), y, M['gun'], .03)
    p = joint('pitch', (0, 0, .75), y)
    box('head', (.78, .55, .72), (0, 0, 0), p, M['org'], .2, 1)
    bx('face', (.62, .04, .58), (0, .28, .75), p, M['dark'], .03)
    for i, (x, z, rr) in enumerate(((-.07, .86, .17), (-.18, .6, .11), (.14, .6, .075))):
        ball('lens%d' % i, rr, L(p, (x, .27, z)), p, M['glass'], 16)
    rod('ant', (.32, -.15, 1.0), (.32, -.15, 1.45), .02, p, M['steel'], 6)
    ball('antTip', .04, L(p, (.32, -.15, 1.47)), p, M['eye'], 8)

# ---------------------------------------------------------------- back modules (94)
def bk_plate(r, M):
    bx('plate', (.5, .06, .7), (0, -.03, 0), r, M['dark'], .02)
    bx('plug', (.08, .03, .3), (0, .005, 0), r, M['eye'], .005)

def thruster(par, M, name, p, rad, length, tilt=-.35):
    j = joint(name, p, par); j.rotation_euler.x = tilt
    cyl(name + 'C', rad * 1.05, .12, (0, 0, -.02), j, M['gun'], seg=20)
    cyl(name + 'B', rad, length, (0, 0, -length / 2 - .05), j, M['steel'], seg=24, r2=rad * 1.12, cap=False, thick=.03, bev=0)
    cyl(name + 'G', rad * .8, .02, (0, 0, -.1), j, M['eye'], seg=20, bev=0)

@mod('BK-01', 'Dash', 'bk')
def dash(r, M):
    bk_plate(r, M)
    bx('body', (.95, .7, 1.0), (0, -.41, .05), r, M['gun'], .1)
    for sd in (-1, 1):
        bx('side%d' % sd, (.1, .6, .75), (sd * .5, -.4, .1), r, M['org'], .04)
        slats('vent%d' % sd, 5, (.3, .04, .05), .1, (sd * .22, -.77, .2), r, M['dark'], axis='z')
        thruster(r, M, 'jet_' + ('L' if sd < 0 else 'R'), (sd * .28, -.55, -.5), .2, .38)

@mod('BK-02', 'Howler', 'bk')
def howlerpack(r, M):
    bk_plate(r, M)
    bx('body', (.75, .6, 1.15), (0, -.36, .05), r, M['gun'], .1)
    bx('wolf', (.6, .04, .75), (0, -.67, .15), r, M['dark'], .03)
    for sd in (-1, 1):
        bx('rad%d' % sd, (.3, .5, .85), (sd * .55, -.36, .1), r, M['org'], .05)
        slats('radS%d' % sd, 6, (.22, .04, .05), .12, (sd * .55, -.62, .1), r, M['dark'], axis='z')
        bx('radL%d' % sd, (.03, .03, .14), (sd * .36, -.67, .2), r, M['eye'], .004)
        thruster(r, M, 'jet_' + ('L' if sd < 0 else 'R'), (sd * .3, -.45, -.58), .29, .5, -.2)

@mod('BK-03', 'Thunderspine', 'bk')
def thunderspine(r, M):
    bk_plate(r, M)
    bx('body', (1.0, .75, .95), (0, -.44, -.05), r, M['gun'], .1)
    for sd in (-1, 1):
        bx('side%d' % sd, (.1, .6, .7), (sd * .52, -.44, -.05), r, M['org'], .04)
        slats('vent%d' % sd, 5, (.3, .04, .05), .1, (sd * .22, -.82, -.05), r, M['dark'], axis='z')
        S = 'L' if sd < 0 else 'R'
        a = joint('gunarm_' + S, (sd * .3, -.45, .55), r)
        cyl('piv' + S, .13, .22, (0, 0, 0), a, M['dark'], seg=16, axis='x')
        seg('strut' + S, (sd * .3, -.45, .55), (sd * .3, -.4, 1.3), .15, .15, a, M['gun'], bev=.02)
        seg('gunA' + S, (sd * .3, -.75, 1.35), (sd * .3, 1.55, 1.35), .22, .2, a, M['org'], bev=.03)
        seg('gunB' + S, (sd * .3, 1.4, 1.35), (sd * .3, 1.9, 1.35), .12, .12, a, M['gun'], bev=.02)
        slats('rail' + S, 8, (.03, .12, .04), .14, L(a, (sd * .3 - sd * .12, .4, 1.35)), a, M['dark'], axis='y')
        joint('mz' + ('0' if sd < 0 else '1'), (sd * .3, 1.95, 1.35), a)

@mod('BK-04', 'Swarm', 'bk')
def swarm(r, M):
    bk_plate(r, M)
    bx('body', (.55, .62, 1.05), (0, -.37, 0), r, M['gun'], .08)
    for sd in (-1, 1):
        bx('band%d' % sd, (.08, .64, 1.0), (sd * .25, -.37, 0), r, M['org'], .03)
        bx('rack%d' % sd, (.3, .3, .5), (sd * .42, -.37, 0), r, M['dark'], .04)
        d = joint('drone_' + ('L' if sd < 0 else 'R'), (sd * .75, -.4, 0), r)
        bx('dBody%d' % sd, (.3, .3, .32), (sd * .75, -.4, 0), d, M['org'], .06)
        for i, (dy, dz) in enumerate(((-.2, .22), (.2, .22), (-.2, -.22), (.2, -.22))):
            c = (sd * .84, -.4 + dy, dz)
            cyl('rotor%d%d' % (sd, i), .14, .05, L(d, c), d, M['steel'], seg=20, axis='x', cap=False, thick=.025, bev=0)
            rod('rArm%d%d' % (sd, i), (sd * .8, -.4, 0), (sd * .82, -.4 + dy * .9, dz * .9), .025, d, M['dark'], 6)

@mod('BK-05', 'Veil', 'bk')
def veil(r, M):
    bk_plate(r, M)
    bx('body', (.6, .5, .85), (0, -.31, -.08), r, M['gun'], .08)
    bx('lens', (.22, .03, .06), (0, -.57, .22), r, M['eye'], .005)
    hub = (0, -.58, .12)
    angs = (25, 62, 118, 155, 215, 325)
    for i, a in enumerate(angs):
        p = joint('panel%d' % i, hub, r)
        ln = .95 if i < 4 else .55
        tip = (math.cos(R(a)) * ln, -.6, .12 + math.sin(R(a)) * ln)
        seg('pan%d' % i, (math.cos(R(a)) * .2, -.6, .12 + math.sin(R(a)) * .2), tip, .32, .04, p, M['org'], bev=.01, top=((1.6, 1) if i < 4 else (.1, 1)))
        seg('mesh%d' % i, (math.cos(R(a)) * .24, -.62, .12 + math.sin(R(a)) * .24), tip, .22, .02, p, M['dark'], bev=.005, top=((1.5, 1) if i < 4 else (.1, 1)), ext=-.06)

@mod('BK-06', 'Glacier', 'bk')
def glacier(r, M):
    bk_plate(r, M)
    bx('core', (.32, .5, .95), (0, -.31, .05), r, M['gun'], .06)
    bx('coreO', (.26, .05, .5), (0, -.57, .25), r, M['org'], .02)
    for sd in (-1, 1):
        bx('tank%d' % sd, (.45, .55, 1.1), (sd * .42, -.34, .1), r, M['org'], .08)
        slats('fin%d' % sd, 8, (.34, .04, .04), .11, (sd * .42, -.62, .1), r, M['dark'], axis='z')
        hose('hose%d' % sd, [(sd * .42, -.45, -.45), (sd * .62, -.62, -.6), (sd * .3, -.7, -.82)], .06, r, M['dark'])
    cyl('drum', .2, .75, L(r, (0, -.5, -.66)), r, M['gun'], seg=16, axis='x', bev=.02)

# ---------------------------------------------------------------- defense and field support (95)
@mod('DF-01', 'Bulwark', 'fa')
def bulwark(r, M, side=-1):
    bx('ped', (.34, .7, .1), (0, .1, .05), r, M['dark'], .02)
    bx('clamp', (.4, .5, .3), (0, .1, .25), r, M['gun'], .05)
    bx('boom', (.6, .3, .2), (side * .4, .1, .3), r, M['dark'], .04)
    s = joint('shield', (side * .78, .2, .35), r)
    box('face', (.2, 2.6, 1.3), L(s, (side * .78, .2, .35)), s, M['org'], .32, 1)
    box('inner', (.04, 1.7, .7), L(s, (side * .9, .2, .35)), s, M['red'], .15, 1)
    bx('spine', (.06, 2.0, .22), (side * .91, .2, .35), s, M['gun'], .03)
    for i, yy in enumerate((-.55, .2, .95)): bx('lamp%d' % i, (.02, .14, .04), (side * .95, yy, .35), s, M['eye'], .004)

@mod('UT-01', 'Ghost', 'sh')
def ghost(r, M):
    y = sh_base(r, M)
    box('body', (1.0, .8, .7), L(y, (0, 0, .7)), y, M['org'], .16, 1)
    for i in range(3):
        for j in range(2):
            bx('pod%d%d' % (i, j), (.24, .08, .2), (-.28 + i * .28, .42, .58 + j * .24), y, M['dark'], .03)
    bx('rail', (.6, .14, .08), (0, 0, 1.14), y, M['gun'], .02)
    for sd in (-1, 1):
        bx('post%d' % sd, (.08, .12, .1), (sd * .25, 0, 1.08), y, M['gun'], .02)
        bx('lamp%d' % sd, (.02, .03, .1), (sd * .5, .3, .6), y, M['eye'], .004)
    slats('vent', 4, (.3, .04, .04), .08, L(y, (0, .02, 1.04)), y, M['dark'], axis='y')

@mod('UT-02', 'Mender', 'sh')
def mender(r, M):
    y = sh_base(r, M)
    bx('body', (.95, .65, .72), (0, 0, .7), y, M['gun'], .08)
    bx('kit', (.45, .06, .55), (-.2, .33, .7), y, M['org'], .04)
    bx('crossH', (.22, .02, .06), (-.2, .37, .7), y, M['white'], .005); bx('crossV', (.06, .02, .22), (-.2, .37, .7), y, M['white'], .005)
    for j in range(2): bx('drawer%d' % j, (.3, .06, .25), (.25, .33, .58 + j * .28), y, M['white'], .03)
    cyl('reel', .32, .24, L(y, (.6, 0, .7)), y, M['dark'], seg=24, axis='x', bev=.03)
    a0 = joint('arm0', (-.2, 0, 1.1), y); cyl('aJ0', .09, .16, (0, 0, 0), a0, M['gun'], seg=12, axis='x')
    a1 = joint('arm1', (-.2, .12, 1.55), a0); seg('aS0', (-.2, 0, 1.1), (-.2, .12, 1.55), .1, .1, a0, M['org'], bev=.02)
    a2 = joint('arm2', (-.2, .55, 1.5), a1); seg('aS1', (-.2, .12, 1.55), (-.2, .55, 1.5), .09, .09, a1, M['org'], bev=.02)
    bx('tool', (.16, .14, .16), (-.2, .62, 1.45), a2, M['dark'], .03)
    bx('rail', (.6, .14, .08), (0, -.15, 1.1), y, M['gun'], .02)

@mod('UT-03', 'Root', 'bk')
def root_(r, M):
    # brace leg: the fork at the top clamps to the mech; the clawed foot digs into the ground behind it
    bk_plate(r, M)
    for sd in (-1, 1): bx('fork%d' % sd, (.1, .25, .45), (sd * .17, -.15, .1), r, M['gun'], .03)
    lg = joint('leg', (0, -.2, 0), r)
    cyl('hinge', .12, .45, L(lg, (0, -.2, 0)), lg, M['dark'], seg=16, axis='x')
    seg('upper', (0, -.2, 0), (0, -.75, -.9), .3, .26, lg, M['org'], bev=.04)
    seg('lower', (0, -.75, -.9), (0, -1.05, -1.65), .22, .2, lg, M['gun'], bev=.03)
    bx('foot', (.55, .45, .2), (0, -1.1, -1.72), lg, M['dark'], .05)
    for i, x in enumerate((-.2, 0, .2)): cone('spike%d' % i, (x, -1.0, -1.75), (x, -.75, -2.05), .07, lg, M['steel'])
    cone('spikeB', (0, -1.3, -1.75), (0, -1.55, -2.05), .07, lg, M['steel'])

# ---------------------------------------------------------------- build helpers
def make(mid, M_, tag=None, **kw):
    """build one module at the origin; every object gets the prefix tag_ so several can share a scene"""
    name, slot, fn = MODS[mid]
    before = set(bpy.data.objects)
    r = joint(mid, (0, 0, 0))
    fn(r, M_, **kw)
    tag = tag or mid
    for o in set(bpy.data.objects) - before:
        o.name = tag + '_' + o.name
    return r

def attach(r, mount_name, scale=1.0):
    m = bpy.data.objects[mount_name]
    r.parent = m; r.location = (0, 0, 0); r.rotation_euler = (0, 0, 0); r.scale = (scale, scale, scale)
