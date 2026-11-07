"""Make the test build of Ironhowl 4 for a claude.ai artifact (the host serves web file types only, so every .glb goes in as a
gzip-compressed, base64 .glb.json, and a small shim in the page unpacks it). The game itself is unchanged.
usage: python3 game/tools/pack_artifact.py <repo> <outdir>
Writes outdir/: index.html, js/, art/, models/ (Ironhowl 3's places and machines) and m4/ (the Wraith, its kit and the FORGE machines from models/)."""
import os, sys, gzip, base64, json, shutil
repo, out = sys.argv[1], sys.argv[2]
G = os.path.join(repo, 'game')
IH4 = {'wraith-v2-hd': ['wraith_v2'], 'autocannon': ['ac_L', 'ac_R'], 'lance': ['ln_L', 'ln_R'], 'arc': ['ar_L', 'ar_R'],
       'mpod': ['mpod'], 'watcher': ['watcher'], 'jetpack': ['jetpack'], 'drone': ['drone']}
FOES = {'fgunner': 'fgunner', 'fhound': 'fhound', 'fskitter': 'fskitter', 'spod': 'spod'}   # the FORGE machines
ORM = {'autocannon': 'ac_combat_orm', 'lance': 'ln_combat_orm', 'arc': 'ar_combat_orm'}
n = 0; size = 0; SIZES = {}   # each .glb.json's size, so the page can show real download progress
def put(src, rel):
    global n, size
    dst = os.path.join(out, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if src.endswith('.glb'):
        b = gzip.compress(open(src, 'rb').read(), 9, mtime=0)
        open(dst + '.json', 'w').write(json.dumps({'b64': base64.b64encode(b).decode()})); size += os.path.getsize(dst + '.json')
        SIZES[rel] = os.path.getsize(dst + '.json')
    else: shutil.copyfile(src, dst); size += os.path.getsize(dst)
    n += 1
if os.path.isdir(out): shutil.rmtree(out)
for top in ('art', 'models'):
    for root, _, names in os.walk(os.path.join(G, top)):
        for f in sorted(names): p = os.path.join(root, f); put(p, os.path.relpath(p, G))
for d, stems in IH4.items():
    for st in stems:
        for f in (st + '_combat.glb', st + '_combat_albedo.webp', st + '_combat_normal.webp', st + '_full.glb', st + '_full_print.webp'):
            put(os.path.join(repo, 'models', d, f), 'm4/%s/%s' % (d, f))
        o = ORM.get(d, st + '_combat_orm') + '.webp'
        if not os.path.exists(os.path.join(out, 'm4', d, o)): put(os.path.join(repo, 'models', d, o), 'm4/%s/%s' % (d, o))
for d, st in FOES.items():
    for f in (st + '_combat.glb', st + '_combat_albedo.webp', st + '_combat_normal.webp', st + '_combat_orm.webp',
              st + '_full.glb', st + '_full_print.webp'):   # full models: the intel brief and the armory book
        put(os.path.join(repo, 'models', d, f), 'm4/%s/%s' % (d, f))
put(os.path.join(G, 'js', 'three-ih3.min.js'), 'js/three-ih3.min.js'); put(os.path.join(G, 'js', 'ironhowl4.js'), 'js/ironhowl4.js')
shim = """<script>/* test build: models come as .glb.json (gzip + base64); unpack them for the GLTF loader */
window.IH4_MODELS='m4/';window.IH4_SIZES=__SIZES__;
(function(){const L=THREE.GLTFLoader.prototype.load;
/* base64 to bytes: the browser's own decoder where it has one, else a data URL, else one character at a time */
function bytes(b64){if(Uint8Array.fromBase64)return Promise.resolve(Uint8Array.fromBase64(b64));
  return fetch('data:application/octet-stream;base64,'+b64).then(r=>r.arrayBuffer()).then(b=>new Uint8Array(b))
    .catch(()=>{const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;});}
/* read the file, telling the game how far it has got (the packer wrote down each file's size) */
function text(r,url,onProgress){const tot=window.IH4_SIZES[url.replace(/^\\.\\//,'')]||0;if(!onProgress||!tot||!r.body)return r.text();
  const rd=r.body.getReader(),parts=[];let got=0;
  const pump=()=>rd.read().then(({done,value})=>{if(done)return new Blob(parts).text();parts.push(value);got+=value.length;onProgress({loaded:Math.min(got,tot),total:tot});return pump();});return pump();}
THREE.GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){if(!/\\.glb$/.test(url))return L.apply(this,arguments);
  const mg=this.manager;mg.itemStart(url);
  fetch(url+'.json').then(r=>{if(!r.ok)throw new Error(url+' '+r.status);return text(r,url,onProgress);}).then(t=>bytes(JSON.parse(t).b64))
  .then(u=>new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
  .then(buf=>this.parse(buf,url.replace(/[^/]*$/,''),g=>{onLoad&&onLoad(g);mg.itemEnd(url);},e=>{onError&&onError(e);mg.itemError(url);mg.itemEnd(url);}))
  .catch(e=>{console.error(e);onError&&onError(e);mg.itemError(url);mg.itemEnd(url);});};})();
</script>"""
html = open(os.path.join(G, 'index.html')).read()
a = '<script src="js/ironhowl4.js"></script>'; assert a in html
open(os.path.join(out, 'index.html'), 'w').write(html.replace(a, shim.replace('__SIZES__', json.dumps(SIZES, separators=(',', ':'))) + '\n' + a))
print('%d files, %.1f MB in %s' % (n + 1, size / 1e6, out))
