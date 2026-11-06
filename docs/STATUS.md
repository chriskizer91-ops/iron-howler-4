# Ironhowl 4 — status (6 Nov 2026, evening)

**Every model for the game is made.** The player's Wraith V2 HD, its seven kit pieces and the four FORGE machines with
their three bosses, each as a full model (upgrade bay, intel brief) and a light combat model (in the game), printed from
ChatGPT's pictures and baked.

**The game is being built** in `game/` (plan: `game/PLAN.md`, test build https://claude.ai/artifact/RebwJkoUiVQYwZoDqsX6tk).
Session 1 done: the Wraith with its kit in the field and the modification bay. Session 2 done: the FORGE machines in every
fight, the three bosses as waves 7–9, the new spawner pods in mission 5. Next: session 3, the kit's own behaviours.

## What the game has (all in `models/`)
| Piece | Full model (triangles) | Combat model | Made by |
|---|---|---|---|
| Wraith V2 HD (player mech) | 949,948 | 7,464 | session 1 (re-printed 6 Nov: hidden surfaces filled from nearby paint) |
| AC-4 autocannon, tiers I–IV in one model | 79,988 | 1,510 | session 1 (left and right arm) |
| LN-1 Lance | 79,990 | 1,512 | session 1 (left and right arm) |
| AR-1 Arc | 79,984 | 1,902 | session 1 (left and right arm) |
| MP-9 missile pod | 89,994 | 1,854 | session 2 |
| WT-1 Watcher | 79,990 | 1,901 | session 2 |
| JP-2 jet pack | 99,986 | 1,936 | session 2 |
| DR-1 assist drone | 69,994 | 1,808 | session 2 |
| FORGE Gunner (+ boss Gunner Prime ×1.8, bone white, two cannons) | 949,952 | 8,098 | session 3 |
| Spawner pod | 149,992 | 1,792 | session 3 |
| FORGE Hound (+ boss Alpha Hound ×1.7, rust red, horns and blades ×2) | 899,956 | 7,570 | session 4 |
| FORGE Skitter (+ boss Brood Skitter ×3, black, glowing red, pod on its back) | 299,974 | 1,986 | session 4 |

The bosses are the foes' own files, changed in code (size, colour, one change), as the design document says.

## Files
- `ironhowl4_game_models_full.html` (82.5 MB): every model above, full and combat, in one file that opens straight from
  the disk (no internet). For the laptop.
- `ironhowl4_game_models_light.html` (11.7 MB): the combat models only. Opens fast on the phone.
- Both are made by `pipeline/game_pack.py` from the repo, so they can be remade after any model changes.
- Model bay online (all models, older ones too): https://claude.ai/artifact/LTv46FVbWAPFW3pyy3L2Mr
- Design document: https://claude.ai/artifact/C1P4JdkPFbZLWw1S7kvfJG (copy: `docs/GAME-DESIGN.md`)
- How every model is made: `MODEL-PLAN.md`; who made what: `SESSIONS.md` and each model's `README.md`.
- Peaceful mode (another chat; same models, recoloured, picked at the arcade cabinet): `peaceful/`.
- GitHub: `chriskizer91-ops/iron-howler-4`.

## Still open
- Story details, levelling, hover tuning (design document's open questions).
- Not yet tested on the real Pixel 7a or the MSI laptop.
- Combat models are many separate parts (16–120 draw calls each); merge parts per joint when the game is built.
- Environments (places) come later, probably from Ironhowl 3's maps.
