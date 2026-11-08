"""Turn the writers' scene file into the game's story file.
usage: python3 game/tools/story_build.py <scenes.json> [chapter] > game/src/06p_story_text.js
scenes.json: {"m1":{"brief":[..],"radio":{"0":[[who,line],..],..},"open":{"panels":[{"img","picture","lines"}]},"mid":{"at":2|"half",..},"close":{..}},..}
The game file keeps the words only (the picture descriptions go to the image-prompt document)."""
import json, sys
src = json.load(open(sys.argv[1]))
# a placeholder picture of each mission's place, shown until Christopher's picture for that scene exists
PH = {'m1': 'field', 'm2': 'docks_night', 'm3': 'woods', 'm4': 'woods_fog', 'm5': 'field_storm', 'm6': 'foundry'}
out = {}
for m, d in src.items():
    o = {}
    if d.get('brief'): o['brief'] = d['brief']
    if d.get('radio'): o['radio'] = {k: v for k, v in d['radio'].items()}
    for part in ('open', 'mid', 'close'):
        sc = d.get(part)
        if not sc: continue
        q = {'panels': [{'img': p['img'], 'ph': PH.get(m, 'field'), 'lines': p['lines']} for p in sc['panels']]}
        if part == 'mid': q['at'] = sc['at']
        if sc.get('cap'): q['cap'] = sc['cap']
        o[part] = q
    out[m] = o
js = json.dumps(out, ensure_ascii=False, indent=1)
print("""/* ===== IH4: the story's words, chapter 1 — from the writers' room (story bible "Always Do", 8 Nov 2026) =====
   Made by game/tools/story_build.py from the scene file; edit the scene file and rebuild rather than this one.
   Each mission: brief (its card on the title screen), radio (the lines during play, by step), and three scenes,
   open / mid / close, played by 06o_story.js. Pictures: art/story/<img>.webp; until one exists, ph_<ph>.webp. */
const STORY_TEXT=%s;
/* the mission cards and radio lines come from here too, so all of the chapter's words live in one place */
for(const m of MISSIONS){const t=STORY_TEXT['m'+m.id];if(!t)continue;if(t.brief)m.brief=t.brief;
  if(t.radio)for(const k in t.radio)if(m.steps[k])m.steps[k].radio=t.radio[k];}""" % js)
