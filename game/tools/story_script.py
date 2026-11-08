"""The scene file as a script a person can read (mission card, scenes, radio), in play order.
usage: python3 game/tools/story_script.py <scenes.json> > script.md"""
import json, sys
d = json.load(open(sys.argv[1]))
NAMES = {'m1': 'Dig Site', 'm2': 'Harbor Nine', 'm3': 'Pine Wake', 'm4': 'Creek Road', 'm5': 'Storm Relays', 'm6': 'Foundry Four'}
STEPS = {'m1': ['Meet Rook at the barn', 'Guard the dig', 'Knock out the relay masts'], 'm2': ['Get into the yard', 'Destroy the spawner pods', 'Get to the middle crane'],
         'm3': ['Find Crew 7', 'Guard Rook', 'Bring down the Alpha Hound', 'Reach the north ridge'], 'm4': ['Escort Rook'],
         'm5': ['Take the relays', 'Bring down Gunner Prime'], 'm6': ['Enter the foundry yard', 'Hold the yard', 'Break out', 'Get back to the gate']}
def scene(title, sc):
    out = ['### ' + title]
    for i, p in enumerate(sc['panels']):
        if len(sc['panels']) > 1: out.append('*Picture %d of %d: `%s`*' % (i + 1, len(sc['panels']), p['img']))
        else: out.append('*Picture: `%s`*' % p['img'])
        out.append('')
        for who, t in p['lines']:
            out.append(('> **%s:** %s' % (who, t)) if who else ('> *%s*' % t)); out.append('>')
        out[-1] = ''
    return out
o = ['# Ironhowl 4 · Chapter 1 · The Salvage Rush — the script', '']
for m in sorted(d):
    x = d[m]; n = int(m[1:]); o += ['## Mission %d · %s' % (n, NAMES[m]), '', '**Mission card:** ' + ' '.join(x['brief']), '']
    o += scene('Opening scene', x['open'])
    at = x['mid']['at']
    for k, label in enumerate(STEPS[m]):
        if at == k: o += scene('Middle scene (before “%s”)' % label, x['mid'])
        lines = x['radio'].get(str(k), [])
        if lines: o += ['**Radio during “%s”:** ' % label + ' · '.join('%s: %s' % (w.title() if w != 'UNKNOWN' else 'UNKNOWN', t) for w, t in lines), '']
        if at == 'half' and k == 0: o += scene('Middle scene (halfway down the road)', x['mid'])
    o += scene('Closing scene' + (' (the end of chapter 1)' if m == 'm6' else ''), x['close'])
print('\n'.join(o))
