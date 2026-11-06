# Ironhowl 4 model plan

**Wraith V2 HD is Ironhowl 4's model set and the way every model is made from now on** (Christopher, 6 Nov 2026).
This file describes how it was made, so the next models can be made the same way. It covers the rules, every step
with its exact command, the techniques and the checks.

- The models: `models/wraith-v2-hd/` (full model for the modification bay, combat model for the game).
- The tools: `pipeline/` (Blender 5.2 as a Python module, Python 3.13; run Blender scripts with `python3 -I`).
- Everything made earlier (W1, W2, W3, V2 PRINT, Strider, Howler 07, the first kit) is kept in `archive/` but not used.

## The idea in plain words
1. Copy the concept sheet as exactly as possible: every part is traced from the sheet's front, side and back views.
2. Spend the triangles on shape only. Bolts, panel lines, numbers, stripes and wear are **printed** on, not modelled.
3. Have ChatGPT redraw each sheet view sharper without moving anything, then print those sharper pictures onto the model.
4. Bake the printed large model onto a light combat model for the game.

## Christopher's rules
- Use only the model's own concept sheet (plus ChatGPT's sharper copies of its views, which must keep the same layout).
- The front view sets heights and widths. The side view sets depths. The right side mirrors the left.
- Keep the shared joint names and the module mounts (fa_L/R forearm saddles, sh_L/R shoulder sockets, bk backbone dock).
- Large model 700,000–1,000,000 triangles (modification bay). Combat model 5,000–10,000 (in game), baked from the printed large model.
- Show each step with pictures and simple numbers: blockout, large model blank, printed, combat, walk test.
- Save each finished model and how it was made to this repo, and update the project notes.

## The steps (Wraith V2 HD's actual commands)
Folders below: `sheet.png` = the concept sheet (`reference/sheets-87-95/90_Wraith_Recon-Support.png`), `src/` = the model's `source/` folder.

**1. Measure the sheet.** For each view (front, side, rear), find where it sits on the sheet, its ground row, its top row
and its centre line. All views share one scale: pixels per metre = (ground row − top row in the front view) / real height
(Wraith: 520 px / 6.6 m = 78.8 px/m). In the side view, y = 0 is at the hip joint. These go in the `VIEW` table of `parts_<mech>.py`.

**2. Trace the parts** (`src/parts_wraith.py` → `src/parts.json`). Each part gets its outline in the front view (or the rear view,
for parts only seen from behind) and in the side view, in sheet pixels. Use `trace_aid.py` for gridded zoom crops with the
traces drawn on top.
- Trace loosely where a part meets the background: the sheet's own outline cuts every trace. Trace carefully where it meets another part.
- Where a part is hidden behind another, carry its outline on behind (for example the thigh behind the forearm).
- `kind`: `c` centre part (made symmetric), `m` mirrored pair (traced on the mech's right = the image's left in the front view),
  `one` single off-centre part (the antenna). `j`: the joint it moves with. `n`: roundness (2 round … 6 boxy).
  `remap: True` where a part's height disagrees between views. Also `h` and `k` for very thin parts.
- Joints: their side-view position and front-view column. The Wraith has 27 parts.

**3. Blockout**
```
python3 -I pipeline/build_v2.py src/parts.json sheet.png work/block.blend --board work/b1
python3 -I pipeline/v2_board.py work/block.blend src/parts.json sheet.png work/blockout.jpg "title"
```
Each part is the solid that is inside its front outline and inside its side outline at the same time.
Red on the board = on the sheet but missing on the model; blue = on the model but not on the sheet. Fix the traces until the
overlap is about 90% front and 85% side or better (Wraith: 91% / 86% / back 83%). Show Christopher.

**4. Large model, blank**
```
python3 -I pipeline/build_v2.py src/parts.json sheet.png work/full.blend --fine
```
0.9 cm detail, thinned evenly to 950,000 triangles (Wraith: 949,948). Board it plain grey.

**5. Sharper sheet (ChatGPT)**
```
python3 pipeline/sheet_views.py sheet.png src/parts.json src sheet90
```
This writes each view as a 1024 × 1536 picture plus its outline and `sheet90_guide.json` (the mapping). Christopher gives
the three pictures to ChatGPT in one chat with `pipeline/SHARPER_SHEET_PROMPT.md`: front first, then side, then back.
ChatGPT may shrink or shift the figure a little, and that's fine. The returned pictures go in `src/sharper-pictures/`.

**6. Print**
```
python3 -I pipeline/v2_print.py work/full.blend src/print.json work/print wv2h 2048
```
Gives the large model one UV atlas, then `project_sheet.py`:
- lines each sharper picture up with its guide outline by measuring its size change and shift (Wraith: 96% / 92% / 96% overlap; size ×0.96 / ×1.01 / ×0.95);
- prints each view onto the surfaces facing it (depth tested, so hidden surfaces aren't painted, and the view seen most squarely wins);
- prints the side view onto the other side as a mirror, flipping numbers and text back so they read right (`unmirror` boxes in `print.json`);
- re-tints surfaces no view sees (tops, insides) to the pictures' charcoal frame colour.
Board it.

**7. Combat model and bake**
```
python3 -I pipeline/build_v2.py src/parts.json sheet.png work/lo.blend --lo
python3 -I pipeline/v2_bake.py work/print/wv2h_uv.blend work/print/wv2h_albedo.png work/lo.blend work/combat wraithv2h 2048
```
The combat model uses the same traces at 2 cm, thinned to about 7,200 triangles, with every part keeping at least 60
(Wraith: 7,464). `v2_bake.py` gives it one UV atlas, then bakes the printed colour and the large model's surface (normal map)
across in Cycles. The shading/roughness/metal map is constant (255, 158, 46).

**8. Export, model bay, walk test**
```
python3 -I pipeline/v2_export.py work/print/wv2h_uv.blend work/full.glb
python3 -I pipeline/glb_quant.py work/full.glb models/<mech>/<mech>_full.glb      # 8-bit normals (KHR_mesh_quantization)
python3 -I pipeline/glb_quant.py work/combat/wraithv2h_combat.glb models/<mech>/<mech>_combat.glb
python3 -I pipeline/pack.py <glb> bay/<id>_full                                    # gzip + base64 parts under 18 MB for the bay
python3 pipeline/phone_shot.py "http://127.0.0.1:8765/index.html?m=<id>&v=full&still" shot.png 30
python3 pipeline/walk_video.py "http://127.0.0.1:8766/index.html?rec" walk 6 24 2  # walk test recording
```
In the model bay page (`pipeline/web/model_bay.html`), the full model shows its print with `paint:'<id>f'`, and the combat
model uses `<id>_albedo/_normal/_orm.webp`. The walk test page is `pipeline/walk/index.html`. Its leg solver keeps the feet
planted: the thigh and lower leg turn together, so hip to ankle works as two links.

## Techniques and why
- **Two-view solids ("visual hull").** A part is exactly as wide as the front view says and as deep as the side view says, at
  every height, so it matches both drawings. Edges are rounded with a soft-min of the two outline distance fields, and the
  surface is cut out with marching cubes.
- **Cut by the sheet's own outline.** Traces only need to be careful between parts. The figure outline gives the exact edge
  everywhere else, and small holes in it (white numbers, stripes, pale highlights) are filled first.
- **Straightened outlines.** Part outlines are simplified to straight runs (within 2.2 sheet pixels) and their distance fields
  are smoothed. Otherwise every pixel step in the outline runs across the part as a groove.
- **Front sets height.** A side outline is read at the same height as the front outline, held inside its own range, or stretched to the front's range (`remap`).
- **Printing, not modelling, the detail.** One UV atlas over the large model, then depth-tested projection from each view.
  The large model carries the print as a texture. The combat model gets it baked.
- **Sharper pictures.** Redrawing each view at ChatGPT's portrait size triples the pixels per metre (78.8 → about 225), and
  the print gets visibly crisper (`models/wraith-v2-hd/previews/sheet_vs_sharper.jpg`).

## Checks at every step
- Outline overlap per view, plus a red/blue difference board (`v2_board.py`).
- The sharper pictures' overlap with the sheet's outline after lining up (printed by `v2_print.py`).
- Phone-size screenshots of the model bay (390 × 844) and a walk test recording.
- Triangle counts inside the budgets, and download sizes (Wraith: full 15.8 MB, combat 0.2 MB).

## Rules learned
- The sheet's views never agree perfectly (AI art). Where they disagree, the front view wins for heights and widths.
- Update Blender's view layer after creating each joint, or children read stale positions.
- Printing at 4096 runs out of memory here (7 GB). 2048 carries the sharper pictures' detail.
- Both chats publish to the model bay. Before republishing, read the live page and patch that one.
- Timing here (2 cores): blockout 6 s, large model 30 s, print 3.5 minutes, combat 8 s, bake 25 s.

## Still open
- Draw calls: the combat model is 50 separate parts (92 draw calls). For the game, merge the parts that share a joint.
- The rest of the models (the other chassis, the 24 modules, the foes) are to be made this way, one at a time.
