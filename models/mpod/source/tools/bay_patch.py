"""Session 2: add (or replace) session 2's entries in the shared model bay page, leaving everyone else's alone.
usage: python3 bay_patch.py live_index.html out_index.html entries.js
entries.js holds one MODELS entry per line ("  id:{...},"). Each id's old line (if any) is replaced; new ids go at the end
of MODELS. The first kit entry also adds the KIT button to the chassis row, as SESSIONS.md asks."""
import sys, re
live, out, ent = sys.argv[1:4]
s = open(live, encoding='utf-8').read()
lines = [l.rstrip('\n') for l in open(ent, encoding='utf-8') if l.strip() and not l.strip().startswith('//')]
a = s.index('const MODELS={'); b = s.index('\n};', a)
body = s[a:b]
for l in lines:
    mid = re.match(r'\s*([A-Za-z0-9_]+):\{', l).group(1)
    # an existing entry for this id: its line(s) from "  id:{" up to the next entry or the end of MODELS
    m = re.search(r'\n  ' + mid + r':\{.*?(?=\n  (?:/\*|[A-Za-z0-9_]+:\{)|$)', body, flags=re.S)
    if m: body = body[:m.start()] + '\n' + l + body[m.end():]
    else:
        body = body.rstrip()
        if not body.endswith((',', '{')): body += ','        # the entry before may have no trailing comma
        body = body + '\n' + l
s = s[:a] + body + s[b:]
if 'grp:\'kit\'' in s and '>KIT</button>' not in s:
    first = re.search(r"\n  ([A-Za-z0-9_]+):\{[^\n]*grp:'kit'", s).group(1)
    s = s.replace('<button data-m="wraith">WRAITH</button>', '<button data-m="wraith">WRAITH</button><button data-m="%s">KIT</button>' % first, 1)
open(out, 'w', encoding='utf-8').write(s)
print('patched', len(lines), 'entries;', 'KIT button' if '>KIT</button>' in s else 'no KIT button')
