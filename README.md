# Iron Howler 4

Ironhowl 4 (set in 2176) — game assets and the tools that build them.

Model bay (every finished model, turnable, full and combat versions, opens on a phone):
https://claude.ai/artifact/LTv46FVbWAPFW3pyy3L2Mr

## What is here

| Folder | What it holds |
|---|---|
| `reference/sheets-87-95/` | Christopher's concept sheets: the four player chassis (87 Strider, 88 Howler 07, 89 Bastion, 90 Wraith) and the 24 modules (91–95) |
| `tools/classes-kit/` | The Blender tools that build the chassis and modules (see its README for the steps) |
| `experiments/wraith-sheet90/` | The Wraith experiment: remaking it to match sheet 90, painting the sheet onto it (W1–W4), and the guide pictures for ChatGPT |
| `models/classes/<mech>/` | Finished models: `<mech>_full.glb` (modification bay, 700,000–1,000,000 triangles), `<mech>_combat.glb` (in-game, 5,000–10,000 triangles), the combat model's baked textures (`_albedo`, `_normal`, `_orm`), and preview pictures |
| `docs/` | Status: what is done, decisions, what is next |

## The four player chassis

| Mech | Sheet | Height | Full model | Combat model | Status |
|---|---|---|---|---|---|
| Howler 07 | 88 | 6.4 m | 862,964 triangles | 9,206 triangles | done |
| Strider | 87 | 6.1 m | 792,986 triangles | 6,451 triangles | done |
| Wraith W1 | 90 | 6.6 m | 844,934 triangles | 7,870 triangles | done (first build) |
| Wraith W2 | 90 | | 839,374 triangles | 7,274 triangles | done: remade to sheet 90's outlines (82% overlap, was 61%) |
| Wraith W3 | 90 | | (W2's) | 7,274 triangles | done: sheet 90 painted onto W2's combat model |
| Wraith W4 | 90 | | (W2's) | | waiting for the ChatGPT repaint pictures |
| Wraith V2 | 90 | 6.6 m | 949,948 triangles | not yet | traced part by part from sheet 90 only; blank and with the sheet printed on (`models/classes/wraith-v2/`) |
| Bastion | 89 | 7.1 m | | | paused (after the Wraith experiment) |

All four share one skeleton (so the same game code moves any of them) and five mount points for the modules: two forearm saddles, two shoulder sockets and a backbone dock.

## Notes on the files
- The `.glb` files store normals and shading colours as 8-bit (`KHR_mesh_quantization`), which three.js reads natively.
- The full models have no textures inside them: the model bay (and the game) dress them with the tiled paint textures in `tools/classes-kit/tex/`. The combat models use the three baked textures next to them, on a material called `atlas`.
