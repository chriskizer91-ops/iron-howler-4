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
The real 3D models in all four colours, full and combat, on the model bay's lighting. Only the paint picture is swapped:
the model is the same file in every colour, with the same triangles and download.
- **Wraith V2 HD**: full 949,948 triangles, combat 7,464.
- **Missile pod MP-9** (session 2's model, `models/mpod/`): full 89,994, combat 1,854. In peaceful mode it's called the
  **Beacon Launcher**: same model, new job.
- Live page: https://claude.ai/artifact/FYrr9Zwxv36UzMspeRDSem (FRONT LINES / SURVEY / RANGER / COBALT, FULL / COMBAT)
- Phone screenshots: `previews/wraith_3d_liveries.jpg`, `previews/mpod_3d_liveries.jpg`.
- Files per model id (`wraith`, `mpod`): `<id>_<scheme>_print.webp` (full model's paint) and `<id>_<scheme>_albedo.webp`
  (combat model's paint), made with `recolor.py` from the model's own `*_full_print.png` and `*_combat_albedo.png`; `front lines`
  is the original. Plus `<id>_normal.webp` and `<id>_orm.webp`, copied from the model's folder.
- The model files aren't kept here (they're the models' own). To run the page, pack them first, for example
  `python3 -I pipeline/pack.py models/mpod/mpod_full.glb peaceful/bay/mpod_full` (and the same for `_combat`).
- To add a model: recolour its two paint pictures, copy its normal and ORM maps, pack its two GLBs, and add a line to `MODELS`
  in `bay/index.html` with its Front Lines name, its peaceful name, the camera height and distance, and its size.

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
- Put the colours on each kit and foe model as its session finishes it (`models/<item>/`), and add it to the peaceful bay
  (done: Wraith, missile pod).
- Christopher to pick which couple of models this chat builds (the zip's pieces are split between sessions 1–4 in `SESSIONS.md`).
