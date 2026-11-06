# The V2 PRINT pipeline: the standard for every Ironhowl 4 model

Christopher's decision (6 Nov 2026), after Wraith V2: "whatever instructions it takes to get to that level, that's what I
want to be the instructions for the rest of the models." Every remaining model (Strider, Howler 07 and Bastion redone the
same way, the 24 modules, the foes) is built like this. Reference result: Wraith V2 (`models/classes/wraith-v2/`).

## The idea
Copy the concept sheet as exactly as possible, then print the sheet onto the model. The shape comes only from the sheet's
front, side and back views. Surface detail (bolts, panel lines, numbers, stripes, wear) is printed, not modelled, so every
triangle goes into the shape.

## Christopher's rules
- Use only the model's own concept sheet (or a sharper ChatGPT copy of it that keeps the same layout).
- The front view sets heights and widths; the side view sets depths. The right side mirrors the left.
- Keep the shared joint names and the module mounts (fa_L/R, sh_L/R, bk on chassis).
- Sizes: large model 700,000–1,000,000 triangles (modification bay); combat model 5,000–10,000 (in game), baked from the printed large model.
- Show the steps: blockout, then the large model blank, then printed, then the combat model, with pictures and simple numbers each time.
- Save to the repo and the project notes as each model is finished.

## Steps (tools in this folder; Blender 5.2 as a Python module, run with `python3 -I`)
1. **Measure the sheet.** For each view (front, side, rear): its box on the sheet, the ground row, the top row and the centre
   line. One scale for all views: pixels per metre = (ground row − top row in the front view) / real height. Side view y = 0 at the hip joint.
2. **Trace the parts** (`parts_<mech>.py` → `parts.json`). For each part: its outline in the front view (or the rear view, for parts
   only seen from behind) and in the side view, in sheet pixels. Trace loosely where the part meets the background (the sheet's
   own outline cuts it) and carefully where it meets another part. Where a part is hidden behind another, carry its outline on
   behind. `kind`: `c` centre part (made symmetric), `m` mirrored pair (traced on the mech's right = image left in the front view),
   `one` single off-centre part. `j`: the joint it moves with. `n`: roundness (2 round … 6 boxy). `remap: True` where a part's
   height disagrees between the views. Joints: side (u, v) and front u. Check the traces drawn on the sheet (`trace_aid.py`).
3. **Blockout** (`build_v2.py parts.json sheet.png out.blend --board dir`, then `v2_board.py`). Each part is the solid inside its
   front outline and its side outline at once, with rounded edges. Read the difference maps (red = sheet only, blue = model only)
   and fix traces until the overlap is about 90% front and 85% side or better. Show Christopher.
4. **Large model, blank** (`build_v2.py ... --fine`): 0.9 cm detail, thinned evenly to 950,000 triangles. Board.
5. **Print** (`v2_print.py large.blend print.json outdir name 2048`): one UV atlas, then each sheet view is printed onto the parts
   that face it (depth tested); the side view prints the other side mirrored, with any numbers or text flipped back (`unmirror`
   boxes). Unseen surfaces take the sheet's frame colour. Board.
   - Optional sharper print: cut the sheet into its three views at 1024 × 1536 (as in `models/classes/wraith-v2/` and the
     prompt `SHARPER_SHEET_PROMPT.md`), have ChatGPT sharpen each without moving anything, then print those instead.
6. **Combat model** (`build_v2.py ... --lo`): 2 cm detail thinned to about 7,200 triangles, every part keeps at least 60.
   **Bake** (`v2_bake.py`): a UV atlas for the combat model, then the printed colour and the large model's surface (normal map)
   baked across. Shading/roughness/metal map: constant (255, 158, 46).
7. **Model bay**: `glb_quant.py`, `pack.py`; the full model shows its print with `paint:'<id>'`, the combat model uses the
   baked atlas. Phone-size screenshots (`phone_shot.py`). Walk test if it is a walker (`walk/`, `walk_video.py`).
8. **Save**: repo (`models/<group>/<mech>-v2/`, tools), project notes.

## Rules learned
- The sheet's white numbers, stripes and pale highlights read as background: fill small holes in the sheet's outline first
  (both when tracing and when printing), or they get painted over.
- Straighten part outlines (`clean_region`) and smooth their distance fields, or every pixel step runs across the part as a groove.
- The sheet's views never agree perfectly (AI art). Where they disagree, the front wins for heights and widths; trace the side to match.
- Update Blender's view layer after creating each joint, or children read stale positions (a part ends up far away).
- Printing at 4096 needs more memory than the workspace has (7 GB); 2048 carries all of a sheet's detail.
- Before republishing the model bay from any chat, read the live page and patch that one (both chats publish to it).
- Timing here (2 cores): blockout 6 s, large model 30 s, print 3 minutes, combat build 8 s, bake 25 s.
