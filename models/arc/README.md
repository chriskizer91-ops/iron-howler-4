# AR-1 Arc (Wraith forearm module, session 1)

Made the way `../../MODEL-PLAN.md` describes (v2.2), from `art/kit-and-foes/A_wraith_forearm/` A07 (front), A08 (side,
repaired, below), A09 (back). Size 0.8 × 1.8 × 0.9 m: three short emitter prongs with white coils, a domed top, clamp included.

| File | What it is |
|---|---|
| `ar_L_full.glb`, `ar_R_full.glb` | full models (left arm, and the mirror twin for the right arm): **79,984 triangles**, one UV atlas |
| `ar_L_full_print.*`, `ar_R_full_print.*` | the three pictures printed onto each full model (2048) |
| `ar_L_combat.glb`, `ar_R_combat.glb` | combat models for the game: **1,902 triangles** (17 parts, so a little over the 1,500 aim, under the 2,000 limit) |
| `ar_L_combat_albedo`, `_normal`, `ar_R_combat_*`, `ar_combat_orm.webp` | the print baked onto each combat model (1024) |
| `source/parts.json` | 17 traced parts: housing, dome, lamp, rear block (from the back view), bracket, feed box, clamp, ring base, and per prong a tip, a collar and a coil (`tip_t/m/b`, `collar_*`, `coil_*`, top/middle/bottom) |
| `source/A08_arc_side_fixed.png`, `tools/fix_top_coil.py` | the repaired side picture and the script that made it |
| `source/ar_sheet.png`, `_mask.png`, `ar_views.json`, `print.json`, `R/` | sheet (front and back flipped), outline, mapping, print settings; the right twin's |
| `source/overlap.json` | outline overlap: front 95.8 %, side 96.5 %, back 91.5 % |
| `previews/` | blockout, blank, printed (left and right), combat, fit check, phone screenshots |

- **Side picture repaired:** ChatGPT drew the top prong's coil in the side view as a few thin spikes, but the front view shows
  three full rings like the other prongs. `tools/fix_top_coil.py` copies the bottom prong's coil (same picture, same size) onto
  the top prong. Without it the top prong would have come out as thin fins.
- **Coils are round:** each coil's front outline is an ellipse, so the coils come out as rings rather than boxes.
- **Mount:** `mount` on the clamp's outer face, turned like the Wraith's `fa_L` / `fa_R`.
- **Left/right slip and lettering:** same as the Lance (front and back flipped for the left model, "AR-1" flipped back while
  printing, inner face lettering flipped back).
- Download: full 1.6 MB GLB (bay pack 1.3 MB), combat 54 KB.

## How it was made (commands, from the repo root)
```
A=art/kit-and-foes/A_wraith_forearm; P=pipeline; S=models/arc/source
python3 $S/tools/fix_top_coil.py $A/A08_arc_side.png $S/A08_arc_side_fixed.png
python3 $P/make_views.py work/ar ar 0.9 $A/A07_arc_front.png $S/A08_arc_side_fixed.png $A/A09_arc_back.png --px 540 --flip front,rear
# then build / print / lo / bake / export / quant / right twin / fit check exactly as for the Lance (models/lance/README.md), name ar
```
