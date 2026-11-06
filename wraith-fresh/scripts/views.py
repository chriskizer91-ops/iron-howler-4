"""Camera rigs that reproduce the reference sheet's front / side / rear pixel
grids exactly (orthographic)."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Euler
import parts_spec as SP

VIEW_BOX = {'front': (340, 700), 'side': (790, 1080), 'rear': (1190, 1590), 'sideneg': (790, 1080)}
V0, V1 = 0, 520

def cam_params(view):
    u0, u1 = VIEW_BOX[view]
    uc = (u0 + u1) / 2.0; vc = (V0 + V1) / 2.0
    zc = (SP.GROUND_V - vc) * SP.PX
    if view == 'front':
        loc = ((uc - SP.AXIS_F) * SP.PX, -80.0, zc); rot = (math.pi / 2, 0, 0)
    elif view == 'side':
        loc = (80.0, (uc - SP.AXIS_S) * SP.PX, zc); rot = (math.pi / 2, 0, math.pi / 2)
    elif view == 'sideneg':   # from -X; render is flipped horizontally afterwards to share the side grid
        loc = (-80.0, (uc - SP.AXIS_S) * SP.PX, zc); rot = (math.pi / 2, 0, -math.pi / 2)
    else:
        loc = ((SP.AXIS_R - uc) * SP.PX, 80.0, zc); rot = (math.pi / 2, 0, math.pi)
    w, h = u1 - u0, V1 - V0
    return loc, rot, max(w, h) * SP.PX, w, h

def make_camera(view, k=2, scene=None):
    scene = scene or bpy.context.scene
    loc, rot, oscale, w, h = cam_params(view)
    name = 'Cam_' + view
    cam = bpy.data.objects.get(name)
    if cam is None:
        cd = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, cd)
        scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = oscale
    cam.data.sensor_fit = 'AUTO'
    cam.data.clip_start = 1.0; cam.data.clip_end = 200.0
    cam.location = loc; cam.rotation_euler = Euler(rot, 'XYZ')
    scene.render.resolution_x = int(w * k); scene.render.resolution_y = int(h * k)
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
    scene.camera = cam
    return cam
