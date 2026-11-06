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
python3 -I bay_page.py index_tpl2.html bay/index.html strider:1 # the model bay page with the class chassis that are ready
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

## Rules learned
- Rest pose = standing pose, every joint rotation zero, except the `fa_L/R` mounts (fixed rotation so forearm modules sit on the saddle).
- Material names must match the model bay viewer: org grey hgun hdark steel trim rubber bred eye jetcore decal cdecal (combat: atlas).
- Detail must not fatten a light chassis: Strider uses `lf=.74` (limbs) and `th=.5` (side plates) so its finished limbs are as wide as the approved blockout's.
- Unused materials are not saved in a .blend: bake.py creates `atlas` if it is missing.
- Hide the combat copy from rays when baking; start the bake rays 12 cm out (hatches stand up to 9 cm proud).
- HI smoothing at 46 degrees (the bevels carry the edges); LO at 32.
- Workspace used: 2 cores, 7 GB. Build 5 s, bake about 3 minutes, a Cycles preview about 1 minute per view.
