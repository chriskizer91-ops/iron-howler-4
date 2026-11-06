# Iron Howler 4

Ironhowl 4 (set in 2176): game models and the tools that make them.

**The model set is Wraith V2 HD** (`models/wraith-v2-hd/`). Every model from now on is made the same way, following
**`MODEL-PLAN.md`**: trace the concept sheet part by part, build the shape from the traces, have ChatGPT sharpen the sheet's
views, print them onto the model, then bake onto a combat model.

- Model bay (turnable, full and combat, opens on Wraith V2 HD, works on a phone): https://claude.ai/artifact/LTv46FVbWAPFW3pyy3L2Mr
- Walk test (the combat model walking): https://claude.ai/artifact/YNRKCwkntMSmoMF5EcH5DL
- Game design document (what is in the game): https://claude.ai/artifact/C1P4JdkPFbZLWw1S7kvfJG

The Wraith is the only mech the player can pick. Next: its kit (forearm, shoulder and back modules, assist drone) and
the three FORGE foes (Gunner, Hound, Skitter), all made from scratch with the model plan.

| Folder | What it holds |
|---|---|
| `MODEL-PLAN.md` | the model plan: rules, every step with its command, techniques, checks |
| `models/wraith-v2-hd/` | Wraith V2 HD: full model (949,948 triangles), combat model (7,464), prints, sources, previews |
| `art-requests/` | image requests for ChatGPT: `IH4_KIT_AND_FOES_IMAGE_REQUEST.md` (the Wraith's kit and the three foes, 40 images) |
| `pipeline/` | the tools the plan uses (Blender 5.2 Python module; run with `python3 -I`), the model bay page and the walk test page |
| `reference/sheets-87-95/` | Christopher's concept sheets: the four chassis (87 Strider, 88 Howler 07, 89 Bastion, 90 Wraith) and the 24 modules (91–95) |
| `archive/` | earlier models and tools, kept but not used |

## Notes on the files
- `.glb` files store normals as 8-bit (`KHR_mesh_quantization`), which three.js reads natively. Textures are not embedded:
  the model bay and the game load the `.webp` files next to each model.
