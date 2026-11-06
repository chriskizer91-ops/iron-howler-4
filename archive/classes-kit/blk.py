"""Blockout helpers for the Ironhowl 4 chassis and modules (sheets 87-95).
Built on Ironhowl 3's lib.py (box, cyl, ball, slats, ...). Blender axes: x right, y forward, z up.
Every joint is an empty with zero rotation, so a point in a joint's space = world point - joint's world position.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ih3lib import *
from ih3lib import MATS
import bpy
from mathutils import Vector, Matrix

JW = {}          # world position of every joint built so far

def bmat(name, col, emit=0.0, metal=0.0, rough=.5):
    m = mat(name, col, emit=emit, metal=metal, rough=rough)
    m.diffuse_color = (*col, 1)            # what the fast preview (Workbench) shows
    return m

def palette():
    return dict(
        org=bmat("org", (1.0, .36, .03), metal=.3),
        dark=bmat('dark', (.13, .14, .15), metal=.5, rough=.6),
        gun=bmat('gun', (.30, .31, .33), metal=.7, rough=.45),
        steel=bmat('steel', (.72, .72, .74), metal=.9, rough=.3),
        eye=bmat('eye', (1.0, .62, .12), emit=6),
        red=bmat('red', (.55, .09, .08), metal=.3),
        white=bmat('white', (.88, .86, .80)),
        glass=bmat('glass', (.55, .30, .05), metal=.6, rough=.1),
    )

def joint(name, world, parent=None, rot=(0, 0, 0)):
    p = Vector(world)
    loc = p - (JW[parent.name] if parent is not None else Vector())
    o = node(name, tuple(loc), parent, rot); JW[o.name] = p   # keyed by the real name (Blender adds .001 on clashes)
    return o

def L(parent, p):
    """world point -> parent's space"""
    return tuple(Vector(p) - JW[parent.name])

def frame(a, b, side=Vector((1, 0, 0))):
    """rotation whose z axis runs a->b and whose x axis stays close to 'side'"""
    z = (Vector(b) - Vector(a)).normalized()
    x = (Vector(side) - z * Vector(side).dot(z))
    if x.length < 1e-4: x = Vector((0, 1, 0)) - z * z.y
    x.normalize(); y = z.cross(x)
    return Matrix((x, y, z)).transposed()

def seg(name, a, b, w, d, parent, m, bev=.04, top=(1, 1), bot=(1, 1), off=(0, 0, 0), ext=0.0, shift=(0, 0)):
    """a box running from world point a to b (w across x, d across y), extended by ext at both ends"""
    a, b = Vector(a), Vector(b); M = frame(a, b)
    c = (a + b) / 2 + M @ Vector(off); Ln = (b - a).length + 2 * ext
    return box(name, (w, d, Ln), L(parent, c), parent, m, bev, 2, rot=M.to_euler(), top=top, bot=bot, shift=shift)

def rod(name, a, b, r, parent, m, seg_=12, r2=None, bev=.01):
    a, b = Vector(a), Vector(b); M = frame(a, b)
    return cyl(name, r, (b - a).length, L(parent, (a + b) / 2), parent, m, seg=seg_, r2=r2, rot=M.to_euler(), bev=bev)

def cone(name, a, b, r, parent, m, seg_=10):
    """a claw / spike from base a to tip b"""
    return rod(name, a, b, r, parent, m, seg_, r2=r * .08, bev=0)

def jcyl(name, p, r, length, parent, m, seg_=18, axis='x'):
    return cyl(name, r, length, L(parent, p), parent, m, seg=seg_, axis=axis, bev=r * .15)

def bx(name, size, p, parent, m, bev=.04, **kw):
    """box at a world point"""
    return box(name, size, L(parent, p), parent, m, bev, 2, **kw)

def tris():
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
