# FORGE Skitter (`fskitter`) — Ironhowl 4 foe, session 4

FORGE's swarm drone, made the Wraith V2 HD way (`../../MODEL-PLAN.md`, v2.1/v2.2): traced from ChatGPT's four HD views
(`art/kit-and-foes/F_skitter/F01–F04`, front, side, back and top), the views printed on, baked onto a combat model.

| File | What it is |
|---|---|
| `fskitter_full.glb` | full model for the intel brief: **299,974 triangles**, 14 traced parts (right side mirrored), one UV atlas, the joints below |
| `fskitter_full_print.png` / `.webp` | the four views printed onto the full model's atlas (2048) |
| `fskitter_combat.glb` | combat model for the game: **1,986 triangles**, same joints |
| `fskitter_combat_albedo`, `_normal`, `_orm` | the print and the full model's surface baked onto the combat model (2048; ORM constant) |
| `source/fskitter_sheet.png`, `_mask.png`, `fskitter_views.json` | the four views on one sheet at 468.9 px per metre (`make_views.py`, no flips needed) |
| `source/fskitter_sheet_fix.png`, `_mask.png` | the same sheet with the top view moved front to back to agree with the side view (below); everything is built and printed from it |
| `source/parts_fskitter.py`, `parts.json`, `print.json` | every part traced, the joints and their Ironhowl 3 names, the budgets, the print settings |
| `source/tools/` | `make_fskitter.sh` (every step), `top_fix.py` and `topmaps.py` (the top-view fix), session 4's copies of two pipeline tools, the model bay entries |
| `previews/` | blockout, large model blank, printed, phone screenshots of the model bay (Skitter full, combat, Brood Skitter with the pod), walk test video |

- Size: 0.9 m tall, 1.9 m across the legs, 1.9 m from the prong tips to the back feet.
- Outline overlap with the views: **front 88%, side 93%, back 89%, top 88%**. The front and back views draw the far pair of feet tucked in
  (as if in perspective), which no orthographic model can match; that costs the front and back a few percent.
- Joints (Ironhowl 3 names, every joint at zero rotation in the standing pose): `fskitter` (root) > `body` > `leg0..3` (hips) > `knee0..3`
  > `foot0..3`. Legs 0 and 3 move together, and 1 and 2 (the diagonal pairs, as Ironhowl 3 animates them):
  0 = front right, 1 = front left, 2 = back right, 3 = back left. R = the Skitter's right = +x.
- Download: full 4.4 MB, combat 59 KB. In the model bay as FOES › SKITTER. Walk test (switch to SKITTER): https://claude.ai/artifact/KAKVXVrZYRbWDDaBvZvqba
- Every step is in `source/tools/make_fskitter.sh` (2.5 minutes on 2 cores).

## What differs from the plain pipeline
- **The top view disagrees with the side view along the body** (AI art): it packs the body and legs into less length (the back hips sit
  0.16 m further forward, the head front 0.12 m further back, the front feet reach as far forward as the prongs). Following the plan's rule
  (the side view sets depths), `tools/top_fix.py` moves the top view's rows front to back with three maps from `tools/topmaps.py`, one for
  the body and one per pair of legs, so its landmarks (prong tips, head front, hips, shell back, front and back feet) land where the side
  view has them. The top outlines traced on the top view are moved the same way. The original sheet is kept unchanged.
- The shell and the legs use the top view for their plan shape (the shell's cut corners, the legs' diagonal). The head, prongs, vents,
  chassis and hip discs ignore it (`notop`): the top view draws the head narrower than the front view does, and the front view sets widths.
- `source/tools/build_v2.py` is the Hound's copy of `pipeline/build_v2.py` (v2.2: `nomask`, Ironhowl 3 joint names) plus `notop` (a part
  skips the top outline) and a `rename` table in the parts file (`legF_R` becomes `leg0`, and so on).
- The combat budget is set to 1,350 so the result lands under 2,000: every part keeps at least 60 triangles, and there are 24 parts.
- The Brood Skitter (boss) has no files of its own: in the model bay it is this model ×3, black with its red primer and lights glowing, and
  session 3's spawner pod (`spod`) on its back, loaded from the pod's own bay entry.
