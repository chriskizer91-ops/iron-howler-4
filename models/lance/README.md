# LN-1 Lance (Wraith forearm module, session 1)

Made the way `../../MODEL-PLAN.md` describes (v2.2), from `art/kit-and-foes/A_wraith_forearm/` A04 (front), A05 (side),
A06 (back). Size 0.8 × 2.2 × 0.9 m: two parallel rail arms with a glowing emitter between them, clamp included.

| File | What it is |
|---|---|
| `ln_L_full.glb`, `ln_R_full.glb` | full models for the modification bay (left arm, and its mirror twin for the right arm): **79,990 triangles**, one UV atlas |
| `ln_L_full_print.*`, `ln_R_full_print.*` | the three pictures printed onto each full model (2048) |
| `ln_L_combat.glb`, `ln_R_combat.glb` | combat models for the game: **1,512 triangles** |
| `ln_L_combat_albedo`, `_normal`, `ln_R_combat_*`, `ln_combat_orm.webp` | the print baked onto each combat model (1024; ORM constant 255, 158, 46) |
| `source/parts.json` | 11 traced parts (housing, vent, rear block front and back, rail block, upper and lower rail, emitter, feed box, bracket, clamp), the joint `ln`, the mount, the budgets |
| `source/ln_sheet.png`, `_mask.png`, `ln_views.json`, `print.json` | the sheet (front and back flipped, see below), outline, mapping, print settings |
| `source/R/` | the right twin's sheet (pictures as drawn) and print settings |
| `source/overlap.json` | outline overlap with the pictures: front 96.8 %, side 97.2 %, back 91.1 % |
| `previews/` | blockout, blank, printed (left and right), combat, the fit check on the Wraith, phone screenshots |

- **Mount:** `mount` on the clamp's outer face, turned like the Wraith's `fa_L` / `fa_R` (same as the autocannon). The rails
  reach about 1.2 m past the mount.
- **Left/right slip:** as with the autocannon, the front and back pictures put the clamp on the side the side view says is
  the outer face, so both were flipped for the left model (`--flip front,rear`). Their "LN-1" lettering is flipped back while
  printing (`unmirror` boxes marked `"front"` / `"rear"`), and the side's lettering is flipped back on the inner face, so the
  lettering reads correctly everywhere on both twins.
- **Back view:** the back picture's top is narrower than the front picture's, so the rear block is two parts: the front part
  from the front view, the last 0.15 m (`rearback`) from the back view.
- Download: full 1.6 MB GLB (bay pack 1.3 MB), combat 52 KB.

## How it was made (commands, from the repo root)
```
A=art/kit-and-foes/A_wraith_forearm; P=pipeline; S=models/lance/source
python3 $P/make_views.py work/ln ln 0.9 $A/A04_lance_front.png $A/A05_lance_side.png $A/A06_lance_back.png --px 540 --flip front,rear
python3 -I $P/build_v2.py $S/parts.json $S/ln_sheet.png work/ln/block.blend --board work/ln/b
python3 -I $P/build_v2.py $S/parts.json $S/ln_sheet.png work/ln/full.blend --fine
python3 -I $P/v2_print.py work/ln/full.blend $S/print.json work/ln/print ln 2048
python3 -I $P/build_v2.py $S/parts.json $S/ln_sheet.png work/ln/lo.blend --lo
python3 -I $P/v2_bake.py work/ln/print/ln_uv.blend work/ln/print/ln_albedo.png work/ln/lo.blend work/ln/combat ln 1024
python3 -I $P/v2_export.py work/ln/print/ln_uv.blend work/ln/full.glb; python3 -I $P/glb_quant.py work/ln/full.glb models/lance/ln_L_full.glb
# right twin: make_views without --flip into work/ln/R, mirror_item.py on full.blend and lo.blend, print with source/R/print.json, bake
python3 -I $P/fit_check.py <wraith uv.blend> <wraith albedo.png> fit.jpg work/ln/print/ln_uv.blend:work/ln/print/ln_albedo.png:fa_L ...R...:fa_R
```
