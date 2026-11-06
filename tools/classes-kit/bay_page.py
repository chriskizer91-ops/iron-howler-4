"""Write the model bay page with the class chassis that are ready.
usage: python3 -I bay_page.py template.html out.html id:parts_full ...
A version of a chassis (wraith2, wraith3 ...) gets no button of its own in the chassis row: it appears in the small
version row (W1, W2 ...) above it while that chassis is shown."""
import sys
tpl, out = sys.argv[1], sys.argv[2]
FULL, COMBAT = 'FULL DETAIL · MODIFICATION BAY', 'COMBAT MODEL · BAKED'
INFO = {'strider': dict(label='STRIDER', ty=3.0, dist=12.5), 'bastion': dict(label='BASTION', ty=3.4, dist=15.5),
        'wraith':  dict(label='WRAITH', ty=3.2, dist=13, grp='wraith', vl='W1', sub=('W1 · FIRST BUILD · FULL DETAIL', 'W1 · FIRST BUILD · COMBAT (BAKED)')),
        'wraith2': dict(label='WRAITH', ty=3.2, dist=13, grp='wraith', vl='W2', sub=('W2 · REMADE TO SHEET 90 · FULL DETAIL', 'W2 · REMADE TO SHEET 90 · COMBAT (BAKED)')),
        'wraith3': dict(label='WRAITH', ty=3.2, dist=13, grp='wraith', vl='W3', src={'full': 'wraith2'}, maps={'normal': 'wraith2', 'orm': 'wraith2'},
                        sub=('W3 · FULL DETAIL (SAME AS W2)', 'W3 · COMBAT · SHEET 90 PAINTED ON')),
        'wraith4': dict(label='WRAITH', ty=3.2, dist=13, grp='wraith', vl='W4', src={'full': 'wraith2'}, maps={'normal': 'wraith2', 'orm': 'wraith2'},
                        sub=('W4 · FULL DETAIL (SAME AS W2)', 'W4 · COMBAT · NEW ART PAINTED ON'))}
js = lambda d: '{' + ','.join("%s:'%s'" % kv for kv in d.items()) + '}'
btn, mod, seen = '', '', set()
for a in sys.argv[3:]:
    cid, n = a.split(':')[:2]; I = INFO[cid]; g = I.get('grp')
    if not g or g not in seen: btn += '<button data-m="%s">%s</button>' % (cid, I['label']); seen.add(g)
    sub = I.get('sub', (FULL, COMBAT)); extra = ''
    if g: extra += "grp:'%s',vl:'%s'," % (g, I['vl'])
    if 'src' in I: extra += 'src:%s,' % js(I['src'])
    if 'maps' in I: extra += 'maps:%s,' % js(I['maps'])
    mod += "  %s:{label:'%s',sub:{full:'%s',combat:'%s'},acc:'#ffb347',ty:%s,dist:%s,%s\n    parts:{full:%s,combat:1},stance(r){}},\n" % (cid, I['label'], sub[0], sub[1], I['ty'], I['dist'], extra, n)
s = open(tpl).read().replace('<!--CLASSBTNS-->', btn).replace('  /*CLASSMODELS*/\n', mod)
open(out, 'w').write(s); print('page with', [a.split(':')[0] for a in sys.argv[3:]])
