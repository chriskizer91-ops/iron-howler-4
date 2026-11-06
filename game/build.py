"""Builds Ironhowl 4: joins src/*.js (in name order) into js/ironhowl4.js.   python3 build.py
Ironhowl 4 starts from Ironhowl 3's engine (Hyperdot Arcade, v2/src/ironhowl3/game, 6 Nov 2026): terrain, cameras, controls,
weapons, enemies, missions, HUD, effects. New for Ironhowl 4: 05_wraith.js (the player's Wraith and its kit) and
06f_bay.js (the modification bay)."""
import glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'js', 'ironhowl4.js')
parts = sorted(glob.glob(os.path.join(HERE, 'src', '*.js')))
code = '\n'.join('/* ---- %s ---- */\n' % os.path.basename(p) + open(p, encoding='utf-8').read() for p in parts)
open(OUT, 'w', encoding='utf-8').write('/* Ironhowl 4 - built from game/src by build.py */\n(function(){\'use strict\';\n' + code + '\n})();\n')
print('built', OUT, round(os.path.getsize(OUT) / 1024), 'KB from', len(parts), 'files')
