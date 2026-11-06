"""Write the model bay page with the class chassis that are ready.
usage: python3 -I bay_page.py template.html out.html id:parts_full[:label] ..."""
import sys
tpl, out = sys.argv[1], sys.argv[2]
INFO = {'strider': ('STRIDER', 3.0, 12.5), 'wraith': ('WRAITH', 3.2, 13), 'bastion': ('BASTION', 3.4, 15.5)}
btn, mod = '', ''
for a in sys.argv[3:]:
    cid, n = a.split(':')[:2]; lab, ty, dist = INFO[cid]
    btn += '<button data-m="%s">%s</button>' % (cid, lab)
    mod += "  %s:{label:'%s',sub:{full:'FULL DETAIL · MODIFICATION BAY',combat:'COMBAT MODEL · BAKED'},acc:'#ffb347',ty:%s,dist:%s,\n    parts:{full:%s,combat:1},stance(r){}},\n" % (cid, lab, ty, dist, n)
s = open(tpl).read().replace('<!--CLASSBTNS-->', btn).replace('  /*CLASSMODELS*/\n', mod)
open(out, 'w').write(s); print('page with', [a.split(':')[0] for a in sys.argv[3:]])
