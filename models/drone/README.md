# DR-1 assist drone (session 2)

Follows the Wraith, fires small rounds, marks targets and repairs between waves; docks on the jet pack's cradle. Made the way
`../../MODEL-PLAN.md` describes (v2.1, with a top view), from `art/kit-and-foes/C_drone/` C01 (front), C02 (side), C03 (back)
and C04 (top), at their own 1000 px per metre. Size 1.1 m wide × 0.9 m long × 0.45 m tall, fans level, gun out, arm folded.

| File | What it is |
|---|---|
| `drone_full.glb` | full model for the modification bay: **69,994 triangles**, 5 traced parts (fan rings and fins mirrored) |
| `drone_full_print.png` / `.webp` | the four pictures printed onto the full model (2048) |
| `drone_combat.glb` | combat model for the game: **1,808 triangles**, 7 meshes, same joints and mounts |
| `drone_combat_albedo`, `_normal`, `_orm` | print and surface baked onto the combat model (1024; ORM constant) |
| `source/parts_drone.py`, `parts.json`, `item.json`, `print.json` | traces, joints, mounts, budgets, print settings ("DR-1" flipped back on the right side) |
| `source/drone_sheet.png`, `_mask.png`, `drone_views.json` | the four pictures on one sheet, the outline, the mapping |
| `source/C04_drone_top_fans_back.png`, `source/tools/shift_fans.py` | the top picture with the fans moved back (below) |
| `previews/` | blockout, blank, printed, combat boards, three angles, phone screenshots, `fit_all_on_wraith.jpg` |

- Outline overlap: front 96 %, side 94 %, top 97 %, back 73 %. The back picture draws the fans about 3–4 cm higher than the
  front picture (the front wins for heights), which is most of the back view's red and blue.
- **The top and side pictures put the fans in different places along the drone** (the side view 0.17 m further back; the
  character sheet C00 shows the same). The plan's rule is that the side view sets depths, so a copy of the top picture has the
  two fan discs moved back 168 px (`tools/shift_fans.py`; they sit beside the body on plain background, so nothing else moves).
  The original C04 in `art/` is unchanged. `previews/top_view_fans_moved.jpg`: before and after.
- **The fan rings are oval as drawn**: 0.37 m across, 0.49 m front to back, in both the top and the side pictures (ChatGPT
  stretched the drone to the requested 0.9 m length). The character sheet's 3/4 view looks round. If round fans are wanted,
  the side and top pictures can be squeezed to about 0.7 m long and the drone rebuilt (about 5 minutes).
- Joints (zero rotation): `root` > `fan_R`, `fan_L` (fan centres, spin axis z; the ring meshes stay on `root`, since an oval
  ring can't spin, so the game can spin a blade disc there), `gun` (the gun pod: yaw z, pitch x), `arm` (the repair arm: x).
- Mounts: `mount` under the drone (goes on the jet pack's `drone_dock`); `muzzle` at the gun's barrels (+y); `eye` at the sensor (+y).
- Docked: `previews/fit_all_on_wraith.jpg` shows it on the jet pack's cradle, with the jet pack on the Wraith's `bk`, the MP-9
  on `sh_R` and the Watcher on `sh_L` (made with `../mpod/source/tools/fit_s2.py`; every piece placed by its mounts).
  Flying: in the model bay it hovers 45 cm above the floor (KIT › DRONE).
- Built with session 2's tools: `python3 models/mpod/source/tools/make_item.py drone` (see `../mpod/README.md`).
- Download: full 1.4 MB (bay pack 1.3 MB), combat 71 KB.
