# Wraith V2 HD — Ironhowl 4's model set

The Wraith (recon support, sheet 90), made the way every Ironhowl 4 model is made now: see `../../MODEL-PLAN.md`.

| File | What it is |
|---|---|
| `wraith_v2_full.glb` | full model for the modification bay: **949,948 triangles**, 27 traced parts (right side mirrored), one UV atlas, shared joints and the five module mounts |
| `wraith_v2_full_print.png` / `.webp` | the sharper sheet printed onto the full model's atlas (2048) |
| `wraith_v2_combat.glb` | combat model for the game: **7,464 triangles**, same joints and mounts |
| `wraith_v2_combat_albedo`, `_normal`, `_orm` | the print and the full model's surface baked onto the combat model (2048; ORM constant) |
| `source/parts_wraith.py`, `parts.json` | every part traced on sheet 90, the views' scale and joints |
| `source/sheet90_*.png`, `*_mask.png`, `sheet90_guide.json` | sheet 90 cut into its three views (1024 × 1536), their outlines, the mapping |
| `source/sharper-pictures/` | ChatGPT's sharper copies of the three views (Christopher, 6 Nov) |
| `source/print.json`, `hd_reg.json` | print settings (with the flipped-number boxes) and how each sharper picture lined up |
| `previews/` | blockout, blank, printed, sheet vs sharper, phone screenshots, walk test video |

- Size: 6.6 m tall with the antenna. Scale on the sheet: 78.8 px per metre; on the sharper pictures, about 225.
- Outline overlap with sheet 90: front 91%, side 86%, back 83%. Sharper pictures lined up at 96% / 92% / 96%.
- Joints: wraith (root) > hips > thigh_L/R > knee > hock > ankle > toe_L/R0..2, heel; wraith > torso > head, arm_L/R > elbow > wrist.
  Mounts: fa_L/R (child of elbow, turned so a module's +y runs along the forearm and +z points out of the saddle), sh_L/R, bk (children of torso).
- Download: full 15.8 MB, combat 0.2 MB. In the model bay as WRAITH › V2 HD (FULL and COMBAT). Walk test: https://claude.ai/artifact/YNRKCwkntMSmoMF5EcH5DL

## Re-print, 6 Nov (nearest-colour fill)
Surfaces no picture sees (inner faces of the legs and arms, tops, undersides) were a flat grey-white tint. They now take
the colour of the nearest printed surface of the same part (`"fill": "nearest"` in `source/print.json`, pipeline v2.3), and the
combat model was re-baked. Same shapes and same GLB files; only the pictures changed. Before and after:
`previews/fill_tint_vs_nearest.jpg` (fit check) and `previews/fill_phone_old_new.jpg` (phone: full old, full new, combat old, combat new).
