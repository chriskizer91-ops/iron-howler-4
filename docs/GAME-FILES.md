# Ironhowl 4 — everything for the game (6 Nov 2026)

Every model the game uses, the pictures and traces each one was made from, the tools that made them, and the notes.
The same files are in the GitHub repo `chriskizer91-ops/iron-howler-4` (the repo also keeps the older, unused models in `archive/`).

## Open first
- `ironhowl4_game_models_light.html`: every game model (combat versions) in one file. Double-click it; no internet needed.
  WRAITH / KIT / FOES at the bottom, drag to turn, pinch or scroll to zoom. Tap the autocannon's chip again to step
  through tiers I–IV.
- The full-detail file, `ironhowl4_game_models_full.html` (82.5 MB, full and combat models), is sent next to this zip
  because of its size. Best on the laptop.

## What's inside
| Folder | What it is |
|---|---|
| `docs/` | `GAME-DESIGN.md` (the design document) and `STATUS.md` (what's done) |
| `MODEL-PLAN.md`, `SESSIONS.md` | how every model is made, and who built what |
| `models/` | one folder per piece: the full model and combat model (`.glb`), their pictures (`.webp`), `source/` (the sheet, the traced parts, print settings, any fix-up scripts), `previews/` (boards and screenshots), and a `README.md` with the numbers and the exact commands |
| `pipeline/` | the tools that build, print, bake, check and pack the models (Python + Blender 5.2), and the viewer pages |
| `art/kit-and-foes/` | the 40 ChatGPT pictures the kit and the foes were traced from |
| `reference/sheets-87-95/` | the original concept sheets (sheet 90 is the Wraith's) |
| `art-requests/` | the requests given to ChatGPT for those pictures |
| `peaceful/` | peaceful mode (another chat): the same models in three colour schemes |

| Model folder | Piece | Full / combat triangles |
|---|---|---|
| `wraith-v2-hd` | Wraith (the player's mech) | 949,948 / 7,464 |
| `autocannon`, `lance`, `arc` | forearm weapons, left- and right-arm versions | about 80,000 / 1,500–1,900 each |
| `mpod`, `watcher` | shoulder modules | 89,994 / 1,854; 79,990 / 1,901 |
| `jetpack`, `drone` | back module and assist drone | 99,986 / 1,936; 69,994 / 1,808 |
| `fgunner`, `fhound`, `fskitter`, `spod` | FORGE Gunner, Hound, Skitter and spawner pod (the bosses are these, changed in code) | 949,952 / 8,098; 899,956 / 7,570; 299,974 / 1,986; 149,992 / 1,792 |
| `kit-fit` | the kit fitted onto the Wraith (pictures) | — |

Left out to keep the zip smaller: lossless `.png` copies of the paint pictures (the `.webp` next to each is what the game
uses, and the PNGs are in the repo), and the unused older models.

## Remake the two HTML files after a model changes
```
python3 pipeline/game_pack.py . pipeline/web/three-ih3.min.js ironhowl4_game_models_full.html
python3 pipeline/game_pack.py . pipeline/web/three-ih3.min.js ironhowl4_game_models_light.html --light
```
