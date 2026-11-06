"""Shaded preview renders (perspective 3/4 views + ortho front/side/rear).
usage: python preview.py model.blend out_prefix [samples] [res] [views]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Euler
import views as V

def setup(scene, samples=48):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    try: scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    scene.cycles.max_bounces = 4
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    w = bpy.data.worlds.get('W') or bpy.data.worlds.new('W')
    scene.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    bg = nt.nodes.new('ShaderNodeBackground'); out = nt.nodes.new('ShaderNodeOutputWorld')
    sky = nt.nodes.new('ShaderNodeTexGradient'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Rotation'].default_value = (0, -math.pi/2, 0)
    nt.links.new(tc.outputs['Generated'], mp.inputs[0]); nt.links.new(mp.outputs[0], sky.inputs[0])
    nt.links.new(sky.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg.inputs[0])
    ramp.color_ramp.elements[0].color = (0.30, 0.31, 0.33, 1); ramp.color_ramp.elements[1].color = (0.75, 0.76, 0.78, 1)
    bg.inputs['Strength'].default_value = 0.9
    nt.links.new(bg.outputs[0], out.inputs[0])
    def light(name, rot, energy, size, col=(1, 1, 1)):
        l = bpy.data.objects.get(name)
        if l is None:
            ld = bpy.data.lights.new(name, 'SUN'); l = bpy.data.objects.new(name, ld); scene.collection.objects.link(l)
        l.data.energy = energy; l.data.angle = math.radians(size); l.data.color = col
        l.rotation_euler = Euler([math.radians(a) for a in rot], 'XYZ')
    light('Key', (50, 0, -35), 3.2, 8)
    light('Rim', (60, 0, 160), 2.0, 5, (0.85, 0.9, 1.0))
    light('Fill', (75, 0, 70), 0.8, 30)
    # ground
    if 'Ground' not in bpy.data.objects:
        bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
        g = bpy.context.active_object; g.name = 'Ground'
        m = bpy.data.materials.new('GroundMat'); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.42, 0.42, 0.44, 1)
        b.inputs['Roughness'].default_value = 0.8
        g.data.materials.append(m)

def persp_cam(scene, name, azim, elev, dist, target, lens=70):
    cam = bpy.data.objects.get(name)
    if cam is None:
        cd = bpy.data.cameras.new(name); cam = bpy.data.objects.new(name, cd); scene.collection.objects.link(cam)
    cam.data.type = 'PERSP'; cam.data.lens = lens; cam.data.clip_start = 0.1; cam.data.clip_end = 500
    t = Vector(target)
    d = Vector((math.sin(math.radians(azim)) * math.cos(math.radians(elev)),
                -math.cos(math.radians(azim)) * math.cos(math.radians(elev)),
                math.sin(math.radians(elev))))
    cam.location = t + d * dist
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    return cam

def main(blend, prefix, samples=48, res=900, which='q1,q2,q3,front,side,rear'):
    bpy.ops.wm.open_mainfile(filepath=blend)
    scene = bpy.context.scene
    setup(scene, samples)
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'
    tgt = (0, 0.3, 5.0)
    ctgt = {'c1': (0.3, 0, 6.8), 'c2': (0.6, 0.0, 3.0)}
    shots = {'q1': (-35, 12, 27), 'q2': (40, 8, 27), 'q3': (150, 15, 27), 'q4': (-120, 25, 27), 'c1': (-25, 8, 15), 'c2': (55, 5, 15)}
    for w in which.split(','):
        if w in shots:
            az, el, d = shots[w]
            persp_cam(scene, 'P_' + w, az, el, d, ctgt.get(w, tgt))
            scene.render.resolution_x = int(res * 0.8); scene.render.resolution_y = res
        else:
            V.make_camera(w, k=res / 520.0)
        scene.render.filepath = f'{prefix}_{w}.png'
        bpy.ops.render.render(write_still=True)
        print('wrote', scene.render.filepath)

if __name__ == '__main__':
    a = sys.argv
    main(a[1], a[2], int(a[3]) if len(a) > 3 else 48, int(a[4]) if len(a) > 4 else 900, a[5] if len(a) > 5 else 'q1,q2,q3,front,side,rear')
