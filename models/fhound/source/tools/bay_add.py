"""Session 4: add this session's entries to the shared model bay page, touching nothing else.
usage: python3 bay_add.py live_index.html out_index.html entries.js [entries2.js ...]
- Reads the live page (always start from the live version: other sessions publish to it too).
- Inserts each entries file at the end of MODELS (skipping any id already there, so it can run again).
- Adds the FOES button to the chassis row if no session has added it yet (it opens this group's first entry)."""
import sys, re

def main(a):
    src, out, files = a[0], a[1], a[2:]
    s = open(src, encoding='utf-8').read()
    end = s.index('\n};\n\n/* ---------- loading')
    add = []
    for f in files:
        block = open(f, encoding='utf-8').read().rstrip() + '\n'
        ids = re.findall(r'^  (\w+):\{label:', block, re.M)
        have = [i for i in ids if re.search(r'^\s*' + i + r':\{label:', s, re.M)]
        if have:
            print('already in the page, skipped:', f, have); continue
        add.append(block); print('adding', f, ids)
    if add:
        s = s[:end] + ',\n' * (not s[:end].rstrip().endswith(',')) + '\n' + ''.join(add).rstrip().rstrip(',') + s[end:]
    if not re.search(r'<button data-m="[^"]+">FOES</button>', s):
        first = re.findall(r"^  (\w+):\{label:[^\n]*grp:'foe'", s, re.M)
        if first:
            btn = '<button data-m="%s">FOES</button>' % first[0]
            kit = re.search(r'<button data-m="[^"]+">KIT</button>', s)
            if kit: s = s[:kit.end()] + btn + s[kit.end():]          # next to the KIT button
            else: s = s.replace('</button></div>\n<div id="ver"', '</button>' + btn + '</div>\n<div id="ver"', 1)
            print('added the FOES button ->', first[0])
    open(out, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    main(sys.argv[1:])
