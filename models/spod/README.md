# FORGE spawner pod — Ironhowl 4 (session 3)

The FORGE machine that keeps printing Skitters until it is destroyed. Made from ChatGPT's views F05 (front) and F06 (side)
(`art/kit-and-foes/F_skitter/`) the Wraith V2 HD way: see `../../MODEL-PLAN.md` (v2.1 section). Session 4's **Brood Skitter**
wears it on its back (model bay id `spod`).

| File | What it is |
|---|---|
| `spod_full.glb` | full model: **149,992 triangles**, 6 parts (8 objects), one UV atlas, the joints below |
| `spod_full_print.png` / `.webp` | the views printed onto the full model's atlas (2048) |
| `spod_combat.glb` | combat model: **1,792 triangles**, same joints |
| `spod_combat_albedo`, `_normal`, `_orm` | the print and the full model's surface baked onto the combat model (2048; ORM constant) |
| `source/spod_sheet.png`, `_sheet_mask.png`, `_views.json` | F05, F06 and F06 again (as the back) on one sheet at 346 px per metre (`make_views.py --px 900`) |
| `source/parts_spod.py` → `parts.json` | every part traced on the sheet, the joints, the budgets |
| `source/print.json` | print settings |
| `source/tools/` | `build_round.py` (round parts, below), session 3's print copies (same-part fill), the close-up renderer |
| `previews/` | blockout, blank, printed, combat, three-quarter views, phone screenshots (full, combat, the Brood Skitter wearing it) |

- Size: 2.6 m tall, 2.0 m across the anchors. The egg is 1.57 m wide and 1.50 m deep; the ring sits 0.3 m off the ground.
- Outline overlap: front 96%, side 97%, back 91%.
- **The back:** the request said the back matches the front, but ChatGPT's character sheet F00 draws the back like the side (a
  vent grille). F06 is used as the back view.
- **The anchors**, read from all three views: five posts in a ring - a front pair (30° either side of the hatch), one on each
  side under the side grilles, and one at the back. That is the only layout that fits every view: from the front, the front
  pair, the side posts at the edges and the back post under the ring; from the side, the front pair one behind the other, the
  side post in the middle and the back post. They are kept square to the views (not turned to the ring). The front picture
  draws the side posts 6 cm short (they stand further back), so they take their heights from the side view (`zfrom: side`).
- Joints: `spod` (root, the base centre on the ground) > `hatch` (the hatch plate moves with it, so the game can slide it open)
  and `spawn` (on the ground in front of the hatch, where a new Skitter steps out).
- Download: full 2.9 MB, combat 47 KB. Model bay: FOES › POD (FULL and COMBAT), and on the Brood Skitter.

## Round parts (`source/tools/build_round.py`)
The pipeline makes each part the solid inside its front and side outlines, so every horizontal slice is a rounded rectangle:
right for armour, wrong for an egg. `build_round.py` runs the pipeline's own `build_v2.py` (read fresh each time) with one
addition: a part with `"round": n` is built, at every height, as a superellipse exactly as wide as the front outline and as deep
as the side outline there (n = 2: an ellipse). The shell, the ring and the hatch (curved with the shell, about 1 cm proud of it)
are round. Everything else, options and outputs included, is `build_v2.py`'s.

## Rebuild (from the repo root; Blender 5.2 module, `PYTHONDONTWRITEBYTECODE=1`)
```
A=art/kit-and-foes/F_skitter; S=models/spod/source; W=work
python3 pipeline/make_views.py $S spod 2.6 $A/F05_spawnerpod_front.png $A/F06_spawnerpod_side.png $A/F06_spawnerpod_side.png --px 900
python3 $S/parts_spod.py
python3 -I $S/tools/build_round.py $S/parts.json $S/spod_sheet.png $W/block.blend --board $W/b     # front 96, side 97, back 91
python3 -I $S/tools/build_round.py $S/parts.json $S/spod_sheet.png $W/full.blend --fine            # 149,992 triangles, 10 s
(cd $S && python3 -I tools/v2_print.py ../../../$W/full.blend print.json ../../../$W/print spod 2048)  # 41 s
python3 -I $S/tools/build_round.py $S/parts.json $S/spod_sheet.png $W/lo.blend --lo                # 1,792 triangles
python3 -I pipeline/v2_bake.py $W/print/spod_uv.blend $W/print/spod_albedo.png $W/lo.blend $W/combat spod 2048
python3 -I pipeline/v2_export.py $W/print/spod_uv.blend $W/full.glb
python3 -I pipeline/glb_quant.py $W/full.glb models/spod/spod_full.glb
python3 -I pipeline/glb_quant.py $W/combat/spod_combat.glb models/spod/spod_combat.glb
```
Model bay files: `pack.py` each GLB to `spod_full` / `spod_combat`; the print is `spodf_albedo.webp`, the combat maps
`spod_albedo / _normal / _orm.webp`.

## Still open
- The hatch is printed shut. An open hatch (a dark opening behind it) is not modelled yet.
- Not yet tested on the real Pixel 7a.
