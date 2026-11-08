"""Make the whole of Ironhowl 4 as ONE html file that opens from the disk with no internet: the game's source code,
three.js, every model, texture and picture, all inside.
usage: python3 game/tools/pack_single.py <repo> <out.html> [--light]
  --light: the light version, the same game without the full-detail models and their prints (the bay, brief and book
           show the combat models, as on Low quality).

Inside the file, top to bottom:
  - the page (from game/index.html);
  - the files (models, textures, pictures), each a <script type="ih4/file"> block of base64 (models gzip-compressed first);
  - a small loader that hands those files to the game when it asks for them by name;
  - three.js r187 (the 3D library, minified);
  - the game's source code, readable, in one <script id="ih4-source"> block: every part starts with a line like
    /* ---- 06k_kit.js ---- */ (the same text as game/src/*.js, joined by game/build.py).
The game itself is unchanged; run build.py first so the source block is current."""
import os, sys, gzip, base64, json, re, subprocess, datetime
repo, outp = sys.argv[1], sys.argv[2]; LIGHT = '--light' in sys.argv[3:]
G = os.path.join(repo, 'game')
sys.path.insert(0, os.path.join(G, 'tools'))
IH4 = {'wraith-v2-hd': ['wraith_v2'], 'autocannon': ['ac_L', 'ac_R'], 'lance': ['ln_L', 'ln_R'], 'arc': ['ar_L', 'ar_R'],
       'mpod': ['mpod'], 'watcher': ['watcher'], 'jetpack': ['jetpack'], 'drone': ['drone']}
FOES = {'fgunner': 'fgunner', 'fhound': 'fhound', 'fskitter': 'fskitter', 'spod': 'spod'}
ORM = {'autocannon': 'ac_combat_orm', 'lance': 'ln_combat_orm', 'arc': 'ar_combat_orm'}
files = {}   # served path -> source file
for top in ('art', 'models'):
    for root, _, names in os.walk(os.path.join(G, top)):
        for f in sorted(names): p = os.path.join(root, f); files[os.path.relpath(p, G).replace(os.sep, '/')] = p
for d, stems in IH4.items():
    for st in stems:
        for f in (st + '_combat.glb', st + '_combat_albedo.webp', st + '_combat_normal.webp', st + '_full.glb', st + '_full_print.webp'):
            files['m4/%s/%s' % (d, f)] = os.path.join(repo, 'models', d, f)
        o = ORM.get(d, st + '_combat_orm') + '.webp'; files['m4/%s/%s' % (d, o)] = os.path.join(repo, 'models', d, o)
for d, st in FOES.items():
    for f in (st + '_combat.glb', st + '_combat_albedo.webp', st + '_combat_normal.webp', st + '_combat_orm.webp', st + '_full.glb', st + '_full_print.webp'):
        files['m4/%s/%s' % (d, f)] = os.path.join(repo, 'models', d, f)
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.glb': 'model/gltf-binary'}
if LIGHT: files = {k: v for k, v in files.items() if not re.search(r'_full(\.glb|_print\.webp)$', k)}
blocks, raw = [], 0
for rel in sorted(files):
    b = open(files[rel], 'rb').read(); raw += len(b); gz = rel.endswith('.glb')
    if gz: b = gzip.compress(b, 9, mtime=0)
    ext = os.path.splitext(rel)[1]
    blocks.append('<script type="ih4/file" data-f="%s" data-z="%d" data-m="%s">%s</script>' % (rel, gz, MIME.get(ext, 'application/octet-stream'), base64.b64encode(b).decode()))
loader = r"""<script>/* Ironhowl 4, single file: the game asks for files by name (models/…, m4/…, art/…); this hands it the copies above */
window.IH4_MODELS='m4/';window.IH4_LIGHT=__LIGHT__;
(function(){const IDX={},BLOB={};
  document.querySelectorAll('script[type="ih4/file"]').forEach(el=>{IDX[el.dataset.f]=el;});
  const key=u=>{u=String(u);try{u=decodeURI(u);}catch(e){}u=u.replace(/^[a-z]+:\/\/[^?#]*?\/(?=(models|m4|art)\/)/i,'').replace(/^\.\//,'').replace(/[?#].*$/,'');return IDX[u]?u:null;};
  window.IH4_FILE=key;window.IH4_URL=u=>{const k=key(u);return k?blobUrl(k):null;};   /* for pictures the page shows itself (story scenes) */
  /* base64 to bytes: the browser's own decoder where it has one, else one character at a time */
  const bytes=t=>{if(Uint8Array.fromBase64)return Uint8Array.fromBase64(t);const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
  const gunzip=u=>new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const body=k=>{const el=IDX[k],u=bytes(el.textContent.trim());return el.dataset.z==='1'?gunzip(u):Promise.resolve(u.buffer);};
  const blobUrl=k=>BLOB[k]||(BLOB[k]=URL.createObjectURL(new Blob([bytes(IDX[k].textContent.trim())],{type:IDX[k].dataset.m})));
  /* models */
  const GL=THREE.GLTFLoader.prototype.load;
  THREE.GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){const k=key(url);if(!k)return GL.apply(this,arguments);
    const mg=this.manager;mg.itemStart(url);
    Promise.resolve().then(()=>body(k)).then(buf=>{onProgress&&onProgress({loaded:1,total:1});
      this.parse(buf,url.replace(/[^/]*$/,''),g=>{onLoad&&onLoad(g);mg.itemEnd(url);},e=>{onError&&onError(e);mg.itemError(url);mg.itemEnd(url);});})
    .catch(e=>{console.error(url,e);onError&&onError(e);mg.itemError(url);mg.itemEnd(url);});};
  /* pictures and textures */
  const IL=THREE.ImageLoader.prototype.load;
  THREE.ImageLoader.prototype.load=function(url,...r){const k=key(url);return IL.call(this,k?blobUrl(k):url,...r);};
  /* everything fetched by name (the plant list, pictures inside models) */
  const F=window.fetch.bind(window);
  window.fetch=function(u,...r){const k=key(u&&u.url||u);if(!k)return F(u,...r);
    return body(k).then(b=>new Response(b,{status:200,headers:{'Content-Type':IDX[k].dataset.m}}));};
})();
</script>"""
html = open(os.path.join(G, 'index.html')).read()
three = open(os.path.join(G, 'js', 'three-ih3.min.js')).read()
game = open(os.path.join(G, 'js', 'ironhowl4.js')).read()
assert '</script' not in three and '</script' not in game
try: commit = subprocess.check_output(['git', '-C', repo, 'rev-parse', '--short', 'HEAD']).decode().strip()
except Exception: commit = '?'
note = ('<!-- IRONHOWL 4%s — the whole game in one file (made %s from repo chriskizer91-ops/iron-howler-4 at %s by game/tools/pack_single.py).\n'
        '     Open it in Chrome or Edge; no internet needed. The game\'s SOURCE CODE is the <script id="ih4-source"> block at the very end:\n'
        '     each part starts with a line like /* ---- 06k_kit.js ---- */. Before it: three.js r187 (library) and the loader;\n'
        '     before those: %d files (models, textures, pictures) as base64. -->\n') % (' (LIGHT VERSION: no full-detail models)' if LIGHT else '', datetime.date.today().isoformat(), commit, len(blocks))
a = '<script src="js/three-ih3.min.js"></script>\n<script src="js/ironhowl4.js"></script>'
assert a in html
page = html.replace('<!doctype html>', '<!doctype html>\n' + note, 1).replace(a,
    '\n'.join(blocks) + '\n<script id="three-r187">' + three + '</script>\n' + loader.replace('__LIGHT__', 'true' if LIGHT else 'false') +
    '\n<script id="ih4-source">\n/* ======== IRONHOWL 4 — GAME SOURCE CODE (game/src/*.js joined in name order) ======== */\n' + game + '\n</script>')
open(outp, 'w').write(page)
print('%d files (%.1f MB as they are) -> %s: %.1f MB' % (len(blocks), raw / 1e6, outp, os.path.getsize(outp) / 1e6))
