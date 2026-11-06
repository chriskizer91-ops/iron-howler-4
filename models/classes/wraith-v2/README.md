# Wraith V2 (traced from sheet 90 only)

Christopher's direction (6 Nov): start over from the concept sheet. Get the shape as close to sheet 90 as possible and
print the sheet (or a sharper upgrade of it) onto the model, rather than spending triangles on bolts and rivets.

- `wraithv2_full.glb`: the large model, **949,948 triangles**, 27 traced parts (the right side mirrors the left), the shared
  joints and the five module mounts (fa_L/R forearm saddles, sh_L/R shoulder sockets, bk backbone dock). One UV atlas.
- `wraithv2_albedo.webp`: sheet 90 printed onto that atlas (2048 × 2048).
- No combat model yet, and nothing is baked: Christopher decides the next step after seeing V2 blank and printed.

Outline overlap with the sheet: front 91%, side 86%, back 83% (the sheet's back view has the legs a little closer
together than its front view).

## How it is made (`tools/classes-kit/v2/`)
1. `parts_wraith.py` → `parts.json`: each part's outline traced on the sheet's front (or rear) and side views, in sheet pixels.
   Outlines are cut by the sheet's own figure outline, so edges against the background can be traced loosely.
2. `build_v2.py parts.json sheet.png out.blend [--fine] [--board dir]`: each part is the solid that is inside its front outline
   and inside its side outline at once, with rounded edges (marching cubes). The front view sets the heights; the side view
   sets the depths. `--fine` = the large model (0.9 cm, thinned evenly to 950,000 triangles).
3. `v2_print.py wv2_full.blend print90.json outdir wv2 2048`: one UV atlas, then `project_sheet.py` prints each view onto the
   parts that face it (depth tested); the side view also prints the other side mirrored, with the 09 flipped back to read right.
4. `v2_board.py`: the sheet / model / difference boards. `v2_export.py`: the GLB.

## Pictures
`WraithV2_blockout.jpg` (step 1), `WraithV2_large_blank.jpg` (step 2), `WraithV2_large_printed.jpg` (step 3).
