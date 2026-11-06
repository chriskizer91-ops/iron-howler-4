"""Session 2: run every model-plan step for one item, from its parts file to the files the repo and the model bay need.
usage (from the repo root): python3 models/mpod/source/tools/make_item.py <id> [--steps block,full,print,lo,bake,export,boards]
Reads models/<id>/source/item.json: {"title": "MP-9 missile pod", "sheet": "mpod_sheet.png", "print_size": 2048,
"bake_size": 1024, "cage": 0.025, "ray": 0.1}. Work files go to /home/claude/work/<id>/w (or $WORK/<id>/w)."""
import sys, os, json, subprocess, shutil
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
T = os.path.join(ROOT, 'models', 'mpod', 'source', 'tools'); P = os.path.join(ROOT, 'pipeline')
iid = sys.argv[1]; steps = (sys.argv[sys.argv.index('--steps') + 1] if '--steps' in sys.argv else 'block,full,print,lo,bake,export,boards').split(',')
M = os.path.join(ROOT, 'models', iid); SRC = os.path.join(M, 'source'); C = json.load(open(os.path.join(SRC, 'item.json')))
W = os.path.join(os.environ.get('WORK', '/home/claude/work'), iid, 'w'); os.makedirs(W, exist_ok=True)
env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
def run(*a, show=('IOU', 'triangles', 'painted', 'exported', 'board', 'MB', 'Error', 'rror')):
    r = subprocess.run(['python3', '-I'] + list(a), cwd=SRC, env=env, capture_output=True, text=True)
    for l in (r.stdout + r.stderr).splitlines():
        if any(k in l for k in show) and 'EGL' not in l and 'Deprecation' not in l and not l.startswith('  '): print('   ', l)
    if r.returncode: print(r.stdout[-3000:], r.stderr[-3000:]); raise SystemExit('step failed: %s' % ' '.join(a[:2]))
sheet = C['sheet']; title = C['title']; b = lambda f: os.path.join(W, f)
subprocess.run(['python3', 'parts_%s.py' % iid, 'parts.json'], cwd=SRC, env=env, check=True)
if 'block' in steps: print('blockout'); run(os.path.join(T, 'build_v2s.py'), 'parts.json', sheet, b('block.blend'), '--board', b('b'))
if 'full' in steps: print('large model'); run(os.path.join(T, 'build_v2s.py'), 'parts.json', sheet, b('full.blend'), '--fine')
if 'print' in steps: print('print'); run(os.path.join(T, 'v2_print_s2.py'), b('full.blend'), 'print.json', b('print'), iid, str(C.get('print_size', 2048)))
if 'lo' in steps: print('combat model'); run(os.path.join(T, 'build_v2s.py'), 'parts.json', sheet, b('lo.blend'), '--lo')
if 'bake' in steps: print('bake'); run(os.path.join(T, 'v2_bake_s2.py'), b('print/%s_uv.blend' % iid), b('print/%s_albedo.png' % iid), b('lo.blend'), b('combat'), iid,
                                       str(C.get('bake_size', 1024)), str(C.get('cage', .025)), str(C.get('ray', .1)))
if 'export' in steps:
    print('export'); from PIL import Image
    BAY = os.path.join(os.path.dirname(W), 'bay'); os.makedirs(BAY, exist_ok=True)
    run(os.path.join(P, 'v2_export.py'), b('print/%s_uv.blend' % iid), b('full.glb'))
    run(os.path.join(P, 'glb_quant.py'), b('full.glb'), os.path.join(M, iid + '_full.glb'))
    run(os.path.join(P, 'glb_quant.py'), b('combat/%s_combat.glb' % iid), os.path.join(M, iid + '_combat.glb'))
    a = Image.open(b('print/%s_albedo.png' % iid)).convert('RGB'); a.save(os.path.join(M, iid + '_full_print.png')); a.save(os.path.join(M, iid + '_full_print.webp'), quality=88); a.save(os.path.join(BAY, iid + 'f_albedo.webp'), quality=88)
    c = Image.open(b('combat/%s_albedo.png' % iid)).convert('RGB'); c.save(os.path.join(M, iid + '_combat_albedo.png')); c.save(os.path.join(M, iid + '_combat_albedo.webp'), quality=90); c.save(os.path.join(BAY, iid + '_albedo.webp'), quality=90)
    n = Image.open(b('combat/%s_normal.png' % iid)).convert('RGB'); n.save(os.path.join(M, iid + '_combat_normal.png')); n.save(os.path.join(M, iid + '_combat_normal.webp'), quality=92); n.save(os.path.join(BAY, iid + '_normal.webp'), quality=92)
    o = Image.new('RGB', (16, 16), (255, 158, 46)); o.save(os.path.join(M, iid + '_combat_orm.webp'), lossless=True); o.save(os.path.join(BAY, iid + '_orm.webp'), lossless=True)
    run(os.path.join(P, 'pack.py'), os.path.join(M, iid + '_full.glb'), os.path.join(BAY, iid + '_full'))
    run(os.path.join(P, 'pack.py'), os.path.join(M, iid + '_combat.glb'), os.path.join(BAY, iid + '_combat'))
if 'boards' in steps:
    print('boards'); os.makedirs(os.path.join(M, 'previews'), exist_ok=True)
    bd = os.path.join(T, 'v2_board_s2.py'); pv = lambda f: os.path.join(M, 'previews', f)
    run(bd, b('block.blend'), 'parts.json', sheet, pv('blockout.jpg'), title + ' - blockout')
    run(bd, b('full.blend'), 'parts.json', sheet, pv('blank.jpg'), title + ' - large model, blank')
    run(bd, b('print/%s_uv.blend' % iid), 'parts.json', sheet, pv('printed.jpg'), title + ' - large model, printed', '--tex', b('print/%s_albedo.png' % iid))
    run(bd, b('combat/%s_combat_baked.blend' % iid), 'parts.json', sheet, pv('combat.jpg'), title + ' - combat model, baked', '--tex', b('combat/%s_albedo.png' % iid))
print('done', iid)
