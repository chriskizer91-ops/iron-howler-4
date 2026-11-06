# JP-2 jet pack (Wraith back module, session 2)

Two main thrust nozzles for the jet hover, steering jets on each side, fuel tanks, and an empty cradle on top for the assist
drone. Made the way `../../MODEL-PLAN.md` describes (v2.1), from `art/kit-and-foes/B_wraith_shoulder_back/` B07 (front = the
docking face), B08 (side), B09 (back = the nozzle face), at their own 500 px per metre. Size 1.6 m wide × 1.0 m deep × 1.8 m tall.

| File | What it is |
|---|---|
| `jetpack_full.glb` | full model for the modification bay: **99,986 triangles**, 7 traced parts (caps, posts, jets and nozzles mirrored) |
| `jetpack_full_print.png` / `.webp` | the three pictures printed onto the full model (2048) |
| `jetpack_combat.glb` | combat model for the game: **1,936 triangles**, 11 meshes, same joints and mounts |
| `jetpack_combat_albedo`, `_normal`, `_orm` | print and surface baked onto the combat model (1024; ORM constant) |
| `source/parts_jetpack.py`, `parts.json`, `item.json`, `print.json` | traces, joints, mounts, budgets, print settings |
| `source/jetpack_sheet.png`, `_mask.png`, `jetpack_views.json` | the pictures on one sheet (side picture flipped), the outline, the mapping |
| `previews/` | blockout, blank, printed, combat boards, both sides, phone screenshots |

- Outline overlap: front 98 %, side 96 %, back 96 %.
- **The side picture (B08) shows the pack's right side** (the request's left/right slip): it was flipped to face left for
  tracing and is printed as the right side, so "JP-2" reads correctly on both sides (`previews/left_and_right_sides.jpg`).
  Note for session 1: `make_views.py --sideR` only labels the side picture as the right side; it doesn't flip it, although
  MODEL-PLAN.md says it does. A right-side picture needs `--flip side --sideR` together.
- The pictures disagree a little: the side view shows the docking plate from 165 to 672 px (the front view draws its frame
  from 272), and the steering jets 10–30 px lower than the front view. The plate follows the side view (the front view is dark
  gunmetal there too); the jets follow the front view.
- Joints (zero rotation): `root` > `nozzle_R`, `nozzle_L` (the nozzle gimbals, at the top of each nozzle).
- Mounts: `mount` at the centre of the docking plate, turned like the Wraith's `bk` (+y forward into the Wraith's back, +z up);
  `drone_dock` on the cradle's tray, where the assist drone's `mount` goes; `exhaust_R`, `exhaust_L` at each nozzle mouth,
  +y along the thrust (down and back: y −0.77, z −0.63), for the hover flames.
- Built with session 2's tools: `python3 models/mpod/source/tools/make_item.py jetpack` (see `../mpod/README.md`).
- Download: full 2.0 MB (bay pack 1.7 MB), combat 78 KB. In the model bay as KIT › JET PACK.
