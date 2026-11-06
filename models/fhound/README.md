# FORGE Hound (`fhound`) — Ironhowl 4 foe, session 4

FORGE's four-legged pack hunter, made the Wraith V2 HD way (`../../MODEL-PLAN.md`, v2.1): traced from ChatGPT's three HD views
(`art/kit-and-foes/E_hound/E01–E03`), the views printed on, baked onto a combat model.

| File | What it is |
|---|---|
| `fhound_full.glb` | full model for the intel brief: **899,956 triangles**, 33 traced parts (right side mirrored), one UV atlas, the joints below |
| `fhound_full_print.png` / `.webp` | the three views printed onto the full model's atlas (2048) |
| `fhound_combat.glb` | combat model for the game: **7,570 triangles**, same joints |
| `fhound_combat_albedo`, `_normal`, `_orm` | the print and the full model's surface baked onto the combat model (2048; ORM constant, as the Wraith) |
| `source/fhound_sheet.png`, `_mask.png`, `fhound_views.json` | the three views on one sheet at 300 px per metre (`make_views.py`, no flips needed) |
| `source/parts_fhound.py`, `parts.json` | every part traced on the sheet, the joints, the budgets |
| `source/fhound_sheet_print.png`, `print.json` | the sheet used for printing (see below) and the print settings |
| `source/tools/` | `make_fhound.sh` (every step), `spear_fix.py`, session 4's copies of two pipeline tools (see below), the model bay entries |
| `source/walk/index.html` | the four-legged walk test page for the Hound and the Skitter (the Wraith's walk test with a leg solver for four legs) |
| `previews/` | blockout, large model blank, printed, phone screenshots of the model bay, walk test video |

- Size: 2.4 m tall at the horn tips, 4.5 m from nose to spearhead, 1.4 m wide. The views agreed with each other: no flips.
- Outline overlap with the views: **front 95%, side 95%, back 95%** (blockout and full model alike). Built with pipeline v2.2.
- Joints (Ironhowl 3 names, every joint at zero rotation in the standing pose): `fhound` (root) > `body` > `head` > `jaw`;
  `body` > `legFL/FR/BL/BR` (shoulder or hip) > `kneeFL..` (elbow or knee) > `hockFL..` (wrist or hock) > `pawFL..`;
  `body` > `tail0` > `tail1` > `tail2` > `tail3` > `tail4` (the spearhead). R = the Hound's right = +x.
- Download: full 12.8 MB, combat 0.2 MB. In the model bay as FOES › HOUND (FULL and COMBAT).
  Walk test (walk and trot, paws planted): https://claude.ai/artifact/KAKVXVrZYRbWDDaBvZvqba
- Every step is in `source/tools/make_fhound.sh` (4.5 minutes on 2 cores; the print takes 2.6 of them).

## What differs from the plain pipeline
- `source/tools/build_v2.py` is a copy of `pipeline/build_v2.py` (v2.2) with two small changes: parts marked `nomask` are not cut by the
  front view's outline (the spine blades are hidden behind the head in the front and back views, so they would lose their tips),
  and mirrored joints get Ironhowl 3's names (`legF_R` becomes `legFR`).
- `source/tools/v2_board.py` is a copy of `pipeline/v2_board.py` (v2.2) that gives long, low items landscape three-quarter views.
- The back view (E03) draws the tail's spearhead 97 px (0.32 m) lower than the side view does. Printed as it is, it would paint a
  second spearhead onto the rump under the real tail. `fhound_sheet_print.png` is the sheet with that spearhead moved up to the tail's
  height and the plate rings above it continued into the gap. It is used for printing only; tracing uses `fhound_sheet.png`.
- The Alpha Hound (boss) has no files of its own: in the model bay it is this model ×1.7, its horns and spine blades ×2, tinted rust red.
