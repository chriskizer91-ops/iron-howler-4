# Ironhowl 4: peaceful mode

A peaceful version of Ironhowl 4, set in the same universe with the same people. Their mechs research and explore instead of fighting.
This folder holds the notes and the work for it, and it's kept here only (not in the project notes). It was started on 6 Nov 2026 in its own chat.

## Christopher's decisions
- In the arcade, one cabinet: the player picks **Peaceful** or **Front Lines**.
- Peaceful mode reuses every Front Lines model: the Wraith, its kit and the FORGE machines.
- **No new pictures for now.** The models stay the same. Code changes what each piece fires and what that does, and the paint picture
  changes the colours. New pictures come later only for a piece that still looks too much like a weapon.
- He likes all three colour schemes (Survey, Ranger, Cobalt) and wants to see every asset in them, then build a couple of the models in this chat.

## Colour schemes (`liveries/`)
`liveries/recolor.py` recolours a picture or a model's texture without touching its shapes:

| Scheme | Armour | Stripes, codes, emblems | Lights | FORGE machines' red |
|---|---|---|---|---|
| Survey | white | teal | cyan | teal |
| Ranger | sage green | white (unchanged) | amber (unchanged) | amber |
| Cobalt | blue | white (unchanged) | cyan | blue |

- Wraith and kit: orange armour, white stripes, amber lights and red (the missile tips) are picked out separately and each gets the scheme's colour.
- FORGE machines keep their charcoal armour. Their red primer and red lights take the scheme's colour, so a reprogrammed machine shows
  whose side it's on.
- `liveries/make_boards.py <out_dir> survey ranger cobalt` makes one board per scheme of all 12 assets (`previews/board_*.jpg`).
- Commands: `python3 peaceful/liveries/recolor.py in.png survey out.png` (add `--foe` for FORGE machines).

## Peaceful bay (`bay/`)
The real 3D Wraith V2 HD in all four colours, full (949,948 triangles) and combat (7,464), on the model bay's lighting.
Only the paint picture is swapped. The model is the same file in every colour.
- Live page: https://claude.ai/artifact/FYrr9Zwxv36UzMspeRDSem (FRONT LINES / SURVEY / RANGER / COBALT, FULL / COMBAT)
- Phone screenshots: `previews/wraith_3d_liveries.jpg`.
- The paint files `bay/wraith_<scheme>_print.webp` (full model) and `bay/wraith_<scheme>_albedo.webp` (combat model) were made with
  `recolor.py` from `models/wraith-v2-hd/wraith_v2_full_print.png` and `wraith_v2_combat_albedo.png`.
- The model files aren't kept here (they're the Wraith's own). To run the page, pack them first:
  `python3 -I pipeline/pack.py models/wraith-v2-hd/wraith_v2_full.glb peaceful/bay/wraith_full` (and the same for `_combat`).

## Proposed, not yet confirmed by Christopher
- **Story:** the same crew and the same Wraith with a different job. While Front Lines fights, the crew's research team goes unarmed into
  the quiet zones FORGE left in 2126. They scan wrecks, take samples and study sleeping FORGE machines. Research unlocks upgrades
  and turns up clues about who is waking the machines, the same mystery seen from the other side. The villain is still open.
- **Same kit, new jobs (code only):** the autocannon fires scan pulses (more barrels scan faster), the Lance a hold-to-charge survey beam
  that reads inside wrecks or opens FORGE hatches, the Arc a jump-start that wakes or reads a sleeping machine, the missile pod marker
  beacons that map the area. The Watcher, jet pack and drone keep their jobs (the drone marks and repairs, its gun quiet).
  Small code-made touches are possible (a lens ring on the autocannon's muzzle, survey lights).
- In the story, the research team gets the front lines' retired guns and refits them as tools.

## Next
- Put the colours on each kit and foe model as its session finishes it (`models/<item>/`). That means recolouring its print and its combat
  albedo with `recolor.py`, then adding it to the peaceful bay.
- Christopher to pick which couple of models this chat builds (the zip's pieces are split between sessions 1–4 in `SESSIONS.md`).
