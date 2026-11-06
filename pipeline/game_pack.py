"""Pack every model the game uses into ONE self-contained HTML viewer (works offline: open the file, nothing else needed).
usage: python3 game_pack.py <repo> <three.min.js> out.html [--light]
  full version: each model in full detail (upgrade bay / intel brief) and its combat model, FULL / COMBAT switch;
  --light:      the combat models only (fast on a phone).
The page is pipeline/web/game_models_template.html (the model bay's viewer, cut down to the game set). Every file goes in as
<script type="application/octet-stream" id="f:NAME"> holding base64: models gzip-compressed GLB, pictures webp."""
import sys, os, gzip, base64

GAME = [   # bay id, repo folder, file stem of the full model and print, of the combat model and maps
    ('wraith', 'wraith-v2-hd', 'wraith_v2', 'wraith_v2'),
    ('ac', 'autocannon', 'ac_L', 'ac_L'), ('ln', 'lance', 'ln_L', 'ln_L'), ('ar', 'arc', 'ar_L', 'ar_L'),
    ('mpod', 'mpod', 'mpod', 'mpod'), ('watcher', 'watcher', 'watcher', 'watcher'),
    ('jetpack', 'jetpack', 'jetpack', 'jetpack'), ('drone', 'drone', 'drone', 'drone'),
    ('fgunner', 'fgunner', 'fgunner', 'fgunner'), ('fhound', 'fhound', 'fhound', 'fhound'),
    ('fskitter', 'fskitter', 'fskitter', 'fskitter'), ('spod', 'spod', 'spod', 'spod')]
ORM = {'ac': 'ac_combat_orm', 'ln': 'ln_combat_orm', 'ar': 'ar_combat_orm'}   # one shared constant map for both arms

def main(a):
    repo, three, out = a[:3]; light = '--light' in a
    tpl = open(os.path.join(repo, 'pipeline/web/game_models_template.html')).read()
    tags, sizes = [], {}
    def add(name, path, gz=False):
        b = open(path, 'rb').read()
        if gz: b = gzip.compress(b, 9, mtime=0)
        tags.append('<script type="application/octet-stream" id="f:%s">%s</script>' % (name, base64.b64encode(b).decode()))
        sizes[name] = len(b)
    for bid, folder, full, combat in GAME:
        d = os.path.join(repo, 'models', folder)
        add(bid + '_combat', os.path.join(d, combat + '_combat.glb'), gz=True)
        add(bid + '_albedo.webp', os.path.join(d, combat + '_combat_albedo.webp'))
        add(bid + '_normal.webp', os.path.join(d, combat + '_combat_normal.webp'))
        add(bid + '_orm.webp', os.path.join(d, ORM.get(bid, combat + '_combat_orm') + '.webp'))
        if not light:
            add(bid + '_full', os.path.join(d, full + '_full.glb'), gz=True)
            add(bid + 'f_albedo.webp', os.path.join(d, full + '_full_print.webp'))
    html = tpl.replace('/*THREE*/', open(three).read()).replace('/*LIGHT*/false', 'true' if light else 'false')
    html = html.replace('</body></html>', '\n'.join(tags) + '\n</body></html>')
    open(out, 'w').write(html)
    print('%s: %d models, %d files, %.1f MB' % (out, len(GAME), len(tags), os.path.getsize(out) / 1e6))

if __name__ == '__main__': main(sys.argv[1:])
