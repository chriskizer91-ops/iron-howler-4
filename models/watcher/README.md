# WT-1 Watcher (Wraith shoulder module, session 2)

The AI-assist sensor: radar, target marking and missile lock. Made the way `../../MODEL-PLAN.md` describes (v2.1), from
`art/kit-and-foes/B_wraith_shoulder_back/` B04 (front), B05 (side), B06 (back), at their own 850 px per metre.
Size 0.8 m wide × 0.9 m long × 1.0 m tall with its base, dish and antenna.

| File | What it is |
|---|---|
| `watcher_full.glb` | full model for the modification bay: **79,990 triangles**, 11 traced parts, one UV atlas, joints and mounts |
| `watcher_full_print.png` / `.webp` | the three pictures printed onto the full model (2048) |
| `watcher_combat.glb` | combat model for the game: **1,901 triangles**, 11 meshes, same joints and mounts |
| `watcher_combat_albedo`, `_normal`, `_orm` | print and surface baked onto the combat model (1024; ORM constant) |
| `source/parts_watcher.py`, `parts.json`, `item.json`, `print.json` | traces, joints, mounts, budgets, print settings ("WT-1" flipped back on the right side) |
| `source/watcher_sheet.png`, `_mask.png`, `watcher_views.json` | the three pictures on one sheet, the outline, the mapping |
| `previews/` | blockout, blank, printed, combat boards, phone screenshots |

- Outline overlap: front 97 %, side 93 %, back 89 %.
- The sensor is asymmetric, as the sheet designs it: the big lens on its right, the two small lenses and the antenna on its
  left. Those parts are built where the front view draws them; the shell, base and back block are symmetric.
- Joints (zero rotation): `root` > `swivel` (the head turns on its base, z axis) > `dish` (the radar dish tilts, x axis, or spins).
- Mounts: `mount` at the bottom centre of the base, turned like the Wraith's `sh_L` / `sh_R`; `eye` at the big lens (+y), where
  target-marking beams start.
- The pictures disagree a little: the front view draws the dish about 3 cm higher than the side view, and the dish and its
  mast sit 1–2.5 cm right of the centre line. The front view wins (heights and where parts sit).
- Built with session 2's tools: `python3 models/mpod/source/tools/make_item.py watcher` (see `../mpod/README.md`).
  Print settings `alpha` 0.1 and `power` 6, so the rounded back corners take one picture each instead of a cross-fade.
- Download: full 1.6 MB (bay pack 1.5 MB), combat 73 KB. In the model bay as KIT › WATCHER.
