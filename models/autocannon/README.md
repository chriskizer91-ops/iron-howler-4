# AC-4 autocannon (Wraith forearm module, session 1)

Made the way `../../MODEL-PLAN.md` describes (v2.1), from `art/kit-and-foes/A_wraith_forearm/` A01 (front), A02 (side),
A03 (back). Size 0.9 m tall, about 2.1 m long. One model carries all four tiers (I = one big barrel, II = two stacked,
III = one above two, IV = the 2 × 2 the pictures show).

| File | What it is |
|---|---|
| `ac_L_full.glb` | full model for the modification bay, left arm: **79,988 triangles** at tier IV (98,176 with every tier's barrels in the file), one UV atlas |
| `ac_R_full.glb` | the same for the right arm (the mirror twin; its "AC-4" and wolf read the right way round) |
| `ac_L_full_print.png` / `.webp`, `ac_R_full_print.*` | the three pictures printed onto each full model's atlas (2048) |
| `ac_L_combat.glb`, `ac_R_combat.glb` | combat models for the game: **1,510 triangles** at tier IV (1,870 with every tier in the file) |
| `ac_L_combat_albedo`, `_normal`, `ac_R_combat_*`, `ac_combat_orm.webp` | the print and the full model's surface baked onto each combat model (1024; ORM constant 255, 158, 46) |
| `source/parts.json` | the 10 traced parts (housing, vent, rear block, bracket, feed box, clamp, four barrels), the joint, the mount, the budgets |
| `source/ac_sheet.png`, `_mask.png`, `ac_views.json` | the three pictures on one sheet (600 px per metre), the outline, the mapping |
| `source/print.json`, `source/R/` | print settings; the right twin's own sheet (pictures not flipped) and print settings |
| `source/overlap.json` | outline overlap with the pictures: front 98.6 %, side 96.6 %, back 91.6 % |
| `source/tools/ac_tiers.py` | makes the tier I–III barrels from the traced tier IV barrels (same print) |
| `previews/` | blockout, blank and printed boards, the fit check on the Wraith, phone screenshots of the bay (all four tiers) |

- **Tiers in the game:** objects named `t1_`..`t4_` are the barrels of each tier. Show the chosen tier's, hide the rest
  (the model bay does this: tap the AUTOCANNON chip again to step I → II → III → IV).
- **Joint:** `ac` (the whole module, no moving parts yet). **Mount:** `mount` on the clamp saddle, turned like the Wraith's
  `fa_L` / `fa_R`: y = forward along the barrels, z = out of the saddle. Put `mount` on `fa_L` (or `fa_R` for the R files).
- **Left and right:** the pictures show the module on the LEFT arm but ChatGPT drew the clamp on opposite sides in the front
  and back views, so the left model's front and back pictures were flipped to agree with the side view. The right twin is the
  left model mirrored (`pipeline/mirror_item.py`), printed from the unflipped pictures, with the side's lettering box
  un-mirrored.
- Download: full 1.8 MB GLB (bay pack 1.5 MB), combat 64 KB.

## How it was made (commands, from the repo root)
```
A=art/kit-and-foes/A_wraith_forearm; P=pipeline; S=models/autocannon/source
python3 $P/make_views.py work/ac ac 0.9 $A/A01_autocannon_front.png $A/A02_autocannon_side.png $A/A03_autocannon_back.png --px 540 --flip front,rear
python3 -I $P/build_v2.py $S/parts.json $S/ac_sheet.png work/ac/block.blend --board work/ac/b     # blockout + overlap
python3 -I $P/build_v2.py $S/parts.json $S/ac_sheet.png work/ac/full.blend --fine                 # large model
python3 -I $P/v2_print.py work/ac/full.blend $S/print.json work/ac/print ac 2048                  # print (27 s)
python3 -I $P/build_v2.py $S/parts.json $S/ac_sheet.png work/ac/lo.blend --lo                     # combat model
python3 -I $P/v2_bake.py work/ac/print/ac_uv.blend work/ac/print/ac_albedo.png work/ac/lo.blend work/ac/combat ac 1024
python3 -I $S/tools/ac_tiers.py work/ac/print/ac_uv.blend HI work/ac/full_tiers.glb               # tiers I-IV
python3 -I $S/tools/ac_tiers.py work/ac/combat/ac_combat_baked.blend LO work/ac/combat_tiers.glb
python3 -I $P/glb_quant.py work/ac/full_tiers.glb models/autocannon/ac_L_full.glb                  # and the combat GLB
# right-arm twin
python3 $P/make_views.py work/ac/R acR 0.9 $A/A01_autocannon_front.png $A/A02_autocannon_side.png $A/A03_autocannon_back.png --px 540
python3 -I $P/mirror_item.py work/ac/full.blend work/ac/R/acR_full.blend                          # and lo.blend the same way
python3 -I $P/v2_print.py work/ac/R/acR_full.blend $S/R/print.json work/ac/R/print acR 2048        # then bake, tiers, quant as above
# fit check on the Wraith
python3 -I $P/fit_check.py <wraith print_uv.blend> <wraith albedo.png> work/ac/fit.jpg work/ac/print/ac_uv.blend:work/ac/print/ac_albedo.png:fa_L:t1_,t2_,t3_
```
(The `views` paths inside `print.json` are relative to `source/`; run from there or give full paths.)
