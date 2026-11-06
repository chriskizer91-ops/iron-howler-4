# Ironhowl 4 classes kit (sheets 87–95)

Builds the four player chassis (Strider, Howler 07, Bastion, Wraith) and their 24 modules in Blender, one model at a time:
a full model of 700,000–1,000,000 triangles for the modification bay, and a combat model of 5,000–10,000 triangles with the full model baked onto it.
Setup: `pip install bpy==5.2.3` (Python 3.13). Run every script with `python3 -I`.

## One chassis, start to finish
```
python3 -I build_class.py strider work/strider.blend          # HI (full) and LO (combat) under the same joints (Howler 07: build_h07.py)
python3 -I shots.py work/strider.blend work s1 HI [--cycles]   # preview renders (front, side, rear, 3/4)
python3 -I compare.py ../../reference/sheets-87-95/87_Strider_Light-Skirmisher.png measure/87.json work/s1 cmp.png "title" "NEW MODEL"
python3 -I bake.py work/strider.blend work/out strider 2048     # atlas UVs, bake colour/normal/roughness/metal/shading, export both GLBs
python3 -I glb_quant.py work/out/strider_full.glb work/out/strider_full_q.glb      # 8-bit normals and shading (KHR_mesh_quantization)
python3 -I glb_quant.py work/out/strider_combat.glb work/out/strider_combat_q.glb
python3 -I maps.py work/out/_bake strider bay/                  # strider_albedo / _normal / _orm .webp
python3 -I pack.py work/out/strider_full_q.glb bay/strider_full # gzip + base64 parts under 18 MB, for the model bay
python3 -I pack.py work/out/strider_combat_q.glb bay/strider_combat
python3 -I bay_page.py index_tpl2.html bay/index.html strider:1 # the model bay page (first version; bay_index.html is the page as now published)
python3 phone_shot.py "http://127.0.0.1:8765/index.html?m=strider&v=full&still" shot.png   # 390 x 844 screenshot (serve bay/ first)
```

| File | What it is |
|---|---|
| `hd.py` | detail kit: every part makes HI and LO; plates with octagon cuts, chamfers and rounded edges; armour with layers, seams, rivets, hatches; joint caps, rams with boots, springs, cables, pipes, vents, machinery, claws, decals |
| `build_class.py` | Strider, Wraith, Bastion from one builder; `ST` holds each one's look (limb size `lf`, add-on plate thickness `th`, armour coverage `cov`, number, stripes, chest vents, spine, mast, red plates) |
| `build_h07.py` | Howler 07 (sheet 88), the first one; `build_class.py` grew out of it |
| `bake.py` | joins LO per joint, removes faces buried inside the same part, one UV atlas, bakes from a joined HI copy, shading into the full model's vertex colours, exports |
| `chassis.py`, `modules.py`, `blk.py`, `render.py` | the approved blockouts: proportions table `C`, the 24 modules, lineup / rack / test-fit renders |
| `make_cdecals.py` | `tex/classes-decals.webp`: numbers 12 / 09 / 31, white and yellow stripes, plus the Howler sheet's warnings in the same places |
| `measure.py`, `grid.py`, `measure/` | how the proportions were read off the sheets |
| `tex/` | the model bay's tiled textures and decal sheets |

## Matching a concept sheet more tightly (the Wraith experiment)
```
python3 -I fit_sheet.py wraith sheet.png measure/90.json work/fit 6    # nudges ~90 measurements until the outline overlaps the sheet best -> fit/wraith.json
python3 -I build_class.py wraith --fit work/wraith2.blend               # build with the fitted measurements, then bake as usual
python3 -I sheetfit.py score work/wraith2.blend sheet.png measure/90.json work/fit w2 HI    # overlap per view + overlay picture
python3 -I sheetfit.py board baked.blend sheet.png measure/90.json work/fit "W2 ..." albedo.webp   # sheet | full | combat board
python3 -I project_sheet.py baked.blend _bake/wraith2_albedo.png sheet90.json work/proj wraith3   # paint the sheet onto the combat atlas
python3 -I export_combat.py baked.blend wraith3_combat.glb --nodecals   # combat model without its decals (the paint carries them)
python3 -I projview.py baked.blend wraith3_albedo.png wraith3_map.json sheet.png view.png "title" --nodecals
python3 -I guide_shots.py baked.blend albedo.webp work/guide wraith2     # front / side / rear guide pictures at a known scale, for repainting
```
`sheet90.json`: `{"image": "90_Wraith_Recon-Support.png", "boxes": "measure/90.json", "H": 6.3, "unmirror": [[928,123,969,156]]}`.
For repainted guide pictures: `{"guide": "wraith2_guide.json", "images": {"front": "...", "side": "...", "rear": "..."}}`.

| File | What it is |
|---|---|
| `sheetfit.py` | lines a model up with its sheet view by view (one scale, pixel exact), overlap score, boards |
| `fit_sheet.py` | the automatic fit: builds only the combat shapes (0.8 s each), keeps every nudge that raises the overlap, smaller nudges each pass |
| `project_sheet.py` | paints pictures onto the combat atlas: each texel takes its colour from the view that sees it most squarely (depth tested); the side view also paints the other side mirrored, with numbers flipped back; unseen texels are re-tinted to the picture's orange and charcoal |
| `projview.py`, `guide_shots.py`, `export_combat.py` | preview of a painted model, guide pictures, combat export without decals |
| `fit/wraith.json` | the Wraith's fitted measurements (W2) |
| `bay_page.py`, `bay_index.html` | the model bay page; versions of a chassis (W1, W2 ...) show as a small row above the chassis row |

## Rules learned
- Rest pose = standing pose, every joint rotation zero, except the `fa_L/R` mounts (fixed rotation so forearm modules sit on the saddle).
- Material names must match the model bay viewer: org grey hgun hdark steel trim rubber bred eye jetcore decal cdecal (combat: atlas).
- Detail must not fatten a light chassis: Strider uses `lf=.74` (limbs) and `th=.5` (side plates) so its finished limbs are as wide as the approved blockout's.
- Unused materials are not saved in a .blend: bake.py creates `atlas` if it is missing.
- Hide the combat copy from rays when baking; start the bake rays 12 cm out (hatches stand up to 9 cm proud).
- HI smoothing at 46 degrees (the bevels carry the edges); LO at 32.
- Workspace used: 2 cores, 7 GB. Build 5 s, bake about 3 minutes, a Cycles preview about 1 minute per view.
