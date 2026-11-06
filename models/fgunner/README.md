# FORGE Gunner — Ironhowl 4 foe (session 3)

FORGE's unmanned heavy gun platform, made from ChatGPT's views D01–D03 (`art/kit-and-foes/D_gunner/`) the Wraith V2 HD way:
see `../../MODEL-PLAN.md` (v2.1 section). Its boss, **Gunner Prime**, has no files of its own: it is a model bay entry that
reuses these (×1.8, bone white with red lights, the heavy cannon on both arms).

| File | What it is |
|---|---|
| `fgunner_full.glb` | full model for the intel brief: **949,952 triangles**, 42 traced parts, one UV atlas, the joints below |
| `fgunner_full_print.png` / `.webp` | the three views printed onto the full model's atlas (2048) |
| `fgunner_combat.glb` | combat model for the game: **8,098 triangles**, same joints |
| `fgunner_combat_albedo`, `_normal`, `_orm` | the print and the full model's surface baked onto the combat model (2048; ORM constant 255, 158, 46) |
| `source/fgunner_sheet.png`, `_sheet_mask.png`, `_views.json` | D01–D03 on one sheet at 260 px per metre (pipeline `make_views.py`, `--px 1300`: the pictures' own scale) |
| `source/parts_fgunner.py` → `parts.json` | every part traced on the sheet, the joints, the budgets |
| `source/print.json` | print settings, with the per-part stretch (`part_remap`) for parts the pictures draw at different heights |
| `source/tools/` | session 3's own copies of pipeline tools (see below), a close-up renderer and the walk test page |
| `previews/` | blockout, blank, printed, combat, phone screenshots (Gunner, combat, Gunner Prime), walk test video |

- Size: 5.0 m tall, 3.4 m wide, 3.4 m deep. The three views are the same size in their pictures (884 × 1300 px), so nothing was resized.
- Views checked before tracing: the cannon is on the Gunner's own right in the front and back views, the side view shows its
  left side (the rotary guns) facing left. Nothing was flipped.
- Outline overlap: front 97%, side 95%, back 89%. The back view is lower because ChatGPT drew the legs and shoulder pads about
  10 cm further in from behind than from the front; the front wins.
- Joints (every joint at zero rotation in the standing pose): `fgunner` (root) > `hips` > `thigh_L/R` > `knee` > `hock` > `ankle`
  (a bird leg: knee forward, hock back; the toes ride on the ankle); `fgunner` > `torso` > `arm_L/R` > `muzzle_R` (the cannon's
  bore), `muzzle_L` (between the two rotary guns; each gun is 0.28 m to either side). SESSIONS.md asked for `thigh/knee/ankle`;
  the extra `hock` is the leg's third bend and matches the Wraith, so the same walk solver drives both.
- Arms: the right arm is the cannon, the left arm two rotary guns with twelve barrel stubs (`barrel_a0..5`, `barrel_b0..5`).
  The side view only shows the left arm, so the cannon uses the left arm's side outline (with a flat front face).
- Download: full 15.7 MB, combat 0.2 MB. Model bay: FOES › GUNNER and FOES › PRIME (FULL and COMBAT).

## What was different from the Wraith, and why
1. **Emblems read as holes.** The white FORGE emblems (chest, pads) are enclosed white-on-grey areas that the v2.1 outline
   finder treated as holes, which would have punched holes through the armour and lost the emblems in the print. Pipeline
   v2.2 fills such holes, so the sheet is made with the pipeline's `make_views.py`.
2. **The pictures disagree on heights.** The arms are 1.23 m tall in the front view and 0.87 m in the side view; the shoulder
   pads sit 15 cm lower in the side view; the back view draws the cannon about 50 px higher. The front sets the shape
   (`remap: True` for the cannon, rotary guns and pads). `tools/project_sheet.py` stretches the side and back pictures the same
   way for those parts only (`part_remap` in `print.json`; `tools/remap_rows.py` measures the side stretch from the parts file),
   so the side picture lands on the arms instead of printing the eye glow onto the cannon.
3. **Unseen surfaces** (tops, insides) are filled from the nearest printed surface of the same part. Pipeline v2.2 fills from
   any part, which put a red chest light on the hidden side of the rotary guns.

## Session 3's tool copies (`source/tools/`, pipeline v2.2 + changes)
- `project_sheet.py`, `v2_print.py`: per-part stretch (`part_remap`) and same-part fill, as above.
- `remap_rows.py`: the rows each stretched part covers in the front and side views, written into `print.json`.
- `closeup.py`: close-up renders (printed, plain, or one colour per part).
- `walk_gunner.html`: the walk test page for the Gunner (root `fgunner`, shorter stride, the guns barely swing).

## Rebuild (from the repo root; Blender 5.2 module, `PYTHONDONTWRITEBYTECODE=1`)
```
A=art/kit-and-foes/D_gunner; S=models/fgunner/source; W=work
python3 pipeline/make_views.py $S fgunner 5.0 $A/D01_gunner_front.png $A/D02_gunner_side.png $A/D03_gunner_back.png --px 1300
python3 $S/parts_fgunner.py
python3 -I pipeline/build_v2.py $S/parts.json $S/fgunner_sheet.png $W/block.blend --board $W/b      # front 97.5, side 95.2, back 89.1
python3 -I pipeline/build_v2.py $S/parts.json $S/fgunner_sheet.png $W/full.blend --fine            # 949,952 triangles, 37 s
(cd $S && python3 -I tools/remap_rows.py parts.json fgunner_sheet.png print.json && python3 -I tools/v2_print.py ../../../$W/full.blend print.json ../../../$W/print fgunner 2048)   # 3 min
python3 -I pipeline/build_v2.py $S/parts.json $S/fgunner_sheet.png $W/lo.blend --lo                # 8,098 triangles
python3 -I pipeline/v2_bake.py $W/print/fgunner_uv.blend $W/print/fgunner_albedo.png $W/lo.blend $W/combat fgunner 2048
python3 -I pipeline/v2_export.py $W/print/fgunner_uv.blend $W/full.glb
python3 -I pipeline/glb_quant.py $W/full.glb models/fgunner/fgunner_full.glb
python3 -I pipeline/glb_quant.py $W/combat/fgunner_combat.glb models/fgunner/fgunner_combat.glb
```
Model bay files: `pack.py` each GLB to `fgunner_full` / `fgunner_combat`; the print is `fgunnerf_albedo.webp`, the combat maps
`fgunner_albedo / _normal / _orm.webp`.

## Still open
- Draw calls: 59 parts. For the game, merge the parts that share a joint.
- Not yet tested on the real Pixel 7a.
