# MP-9 missile pod (Wraith shoulder module, session 2)

Made the way `../../MODEL-PLAN.md` describes (v2.1: an item from separate view pictures), from
`art/kit-and-foes/B_wraith_shoulder_back/` B01 (front), B02 (side), B03 (back). Size 1.0 m wide × 1.3 m long × 1.1 m tall
(README of the pictures), doors open.

| File | What it is |
|---|---|
| `mpod_full.glb` | full model for the modification bay: **89,994 triangles**, 7 traced parts (doors and hinges mirrored), one UV atlas, joints and mounts |
| `mpod_full_print.png` / `.webp` | the three pictures printed onto the full model's atlas (2048) |
| `mpod_combat.glb` | combat model for the game: **1,854 triangles**, 9 meshes, same joints and mounts |
| `mpod_combat_albedo`, `_normal`, `_orm` | the print and the full model's surface baked onto the combat model (1024; ORM constant 255, 158, 46) |
| `source/parts_mpod.py`, `parts.json` | every part traced on the sheet, the joints, the mounts, the triangle budgets |
| `source/mpod_sheet.png`, `_mask.png`, `mpod_views.json` | the three pictures on one sheet at their own scale (680 px per metre, nothing resized), the outline, the mapping |
| `source/print.json` | print settings (the "MP-9" box flipped back on the right side) |
| `source/tools/` | session 2's copies of pipeline tools with small changes (below); also used by the Watcher, jet pack and drone |
| `previews/` | blockout, blank, printed, combat boards, phone screenshots, the outline fix |

- Outline overlap with the pictures: front 97 %, side 96 %, back 92 % (the back view's top caps are wider than the front
  view's; the front wins for widths, as the plan says).
- Joints (each at zero rotation): `root` > `swivel` (the pod turns on its base, z axis) > `door_R`, `door_L` (hinges, z axis;
  the doors stand about 120° open as drawn). The door meshes are `leaf_R` / `leaf_L` (with `hinge_R` / `hinge_L`).
- Mounts: `mount` at the bottom centre of the swivel base, turned like the Wraith's `sh_L` / `sh_R` (+y forward, +z up).
  `tube0`..`tube8`: the nine launch tubes on the front face (rows top to bottom, the pod's right first), +y = launch direction.
- Download: full 1.8 MB (bay pack 1.6 MB), combat 59 KB.

## How it was made
Everything below in one go: `python3 models/mpod/source/tools/make_item.py mpod` (from the repo root; about 2 minutes),
reading `source/item.json`. The steps it runs:
```
T=models/mpod/source/tools; B=art/kit-and-foes/B_wraith_shoulder_back
python3 $T/make_views_s2.py work mpod 1.1 $B/B01_missilepod_front.png $B/B02_missilepod_side.png $B/B03_missilepod_back.png --px 748
cd models/mpod/source && python3 parts_mpod.py parts.json
python3 -I tools/build_v2s.py parts.json mpod_sheet.png work/block.blend --board work/b      # blockout + overlap
python3 -I tools/build_v2s.py parts.json mpod_sheet.png work/full.blend --fine               # large model, 5 mm detail
python3 -I tools/v2_print_s2.py work/full.blend print.json work/print mpod 2048             # print (30 s)
python3 -I tools/build_v2s.py parts.json mpod_sheet.png work/lo.blend --lo                   # combat model
python3 -I tools/v2_bake_s2.py work/print/mpod_uv.blend work/print/mpod_albedo.png work/lo.blend work/combat mpod 1024 .025 .1
python3 -I ../../../pipeline/v2_export.py work/print/mpod_uv.blend work/full.glb
python3 -I ../../../pipeline/glb_quant.py work/full.glb ../mpod_full.glb      # and the combat GLB the same way
python3 -I tools/v2_board_s2.py <blend> parts.json mpod_sheet.png board.jpg "title" [--tex albedo.png]
```

## Session 2's tool changes (copies in `source/tools/`, `pipeline/` untouched)
- `make_views_s2.py`: the ChatGPT views sit on one exact background colour (200, 200, 202), so the outline is "every pixel
  that isn't exactly that colour". The pipeline's looser test cut the pale white paint (stripes, wolf emblems, codes) out of the
  outline, and the sheet and the print then lost it (`previews/outline_fix.jpg`: green = put back).
- `build_v2s.py`: `round` (slices are ellipses or rounded boxes, for the swivel base and the hinges), `plan` (a top-down
  outline in metres, for the angled open doors, since there is no top view), and per-item voxel size and edge rounding
  (`h_full`, `h_lo`, `k_scale`) so 1 m pieces aren't rounded like a 6.6 m mech.
- `v2_print_s2.py` / `project_sheet_s2.py`: an `alpha` print setting (0.1 here, pipeline 0.35), so a face a picture sees at a
  steep angle (an open door's inside) keeps the picture's colour instead of fading to grey; and a `power` setting (pipeline 3),
  so on rounded corners the best-facing picture wins instead of two pictures cross-fading (the Watcher uses 6).
- `v2_bake_s2.py`: bake cage and ray length for small items (2.5 cm / 10 cm; pipeline 6 cm / 25 cm).
- `v2_board_s2.py`: room for the three-quarter views on wide boards, grey tiles.
- `bay_patch.py`: adds session 2's entries to the shared model bay page without touching anyone else's.
- `make_item.py`: runs every step for one item (`source/item.json`); `build_v2s.py` also repairs meshes after thinning and
  refuses a part named like a joint (Blender would rename it `name.001`).
