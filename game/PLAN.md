# Ironhowl 4 — the game: build plan

Ironhowl 4 is "literally an upgrade of Ironhowl 3", so it starts from Ironhowl 3's finished engine (Hyperdot Arcade,
`v2/src/ironhowl3/game`, copied 6 Nov 2026): big terrain, the two follow cameras, phone and laptop controls, the gun with
heat and tiers, missiles, shields, jet hops, enemies with path-finding, missions with checkpoints, upgrades, the HUD,
effects, saves and the arcade-cabinet messages. Each session swaps or adds the Ironhowl 4 parts and ends with something
playable at the test link.

- Test build: https://claude.ai/artifact/RebwJkoUiVQYwZoDqsX6tk (made by `tools/pack_artifact.py`)
- Run from the repo: serve the repo folder and open `game/index.html` (the models come from the repo's `models/`).
- Saves: keys starting `hd-ironhowl4-` only. Arcade id `ironhowl4` (same cabinet messages as Ironhowl 3, `?embed=1`).
- Build: `python3 game/build.py` joins `game/src/*.js` into `game/js/ironhowl4.js`.

| Session | What gets built | What you can try at the end |
|---|---|---|
| 1 ✅ (6 Nov) | Ironhowl 3's engine copied in. The Wraith (combat model, 7,464 triangles) with its kit fitted by the mounts, walking on the terrain with its own leg solver. The **modification bay**: the full-detail Wraith (949,948 triangles) turnable, tap a mount, swap its kit, armory-book card per piece, loadout saved; Ironhowl 3's upgrade tracks under UPGRADES. Missiles need an MP-9 fitted. | Walk, hop and shoot the Wraith in the woods, field, docks or foundry sandbox; fit it out in the bay |
| 2 ✅ (6 Nov) | The new FORGE machines in place of Ironhowl 3's (`src/06j_forge.js`): Gunner (8,098 triangles, bird legs solved so the feet stay planted, arms aim at you), Hound (7,570, gallop, jaw, tail), Skitter (1,986), the spawner pod on mission 5's four pods (glowing seams; sinks dark when destroyed). Bosses as waves 7, 8 and 9 after Ironhowl 3's six: **Alpha Hound** (x1.7, rust red, horns and spines twice as big, 700 hp, bites for 30), **Gunner Prime** (x1.8, bone white, a heavy cannon on both arms, 1,500 hp, 6-shot bursts), **Brood Skitter** (x3, black with glowing red seams, the pod on its back prints 2 Skitters every 7 s, 900 hp), each with its name banner. Fight fixes: Hounds back off and charge again instead of clinging; Skitters spring back after a zap | Fight the new machines and the three bosses in the sandbox and Endless; mission 5's new pods |
| 3 | The kit's own behaviours: Lance (charge, piercing rail shot), Arc (chain lightning), Watcher (radar, marks, faster lock, warnings), the assist drone (flies beside you, gun, repairs), the jet pack's 30 s hover | Every kit piece works differently in a fight |
| 4 | The intel brief before a fight (the foes coming, full detail, turnable, with their cards); the armory book; pilot levels | Brief, fight, salvage, upgrade loop |
| 5+ | New missions and story (someone is steering FORGE; the salvage rush), then the new places (environments, probably another chat) | The campaign |

Still Ironhowl 3's for now: the places, the brains (how the machines move, aim and attack, with the two fixes above); the mission campaign is hidden
until Ironhowl 4's own missions are written.

## Testing (for Claude)
With `?dev` the page has `window.__ih3` (Ironhowl 3's test hooks: `ff(t)` runs the game t seconds without drawing, `ctl()`,
`showcase()`, `info()`) and `window.__ih4` (`wave(n)` starts wave n+1, `face(e)` turns the Wraith so the crosshair is on a
machine, `look(e,ang,d,h)` points the camera at one, `st()` the fight state). `window.__freeze=true` stops the game clock so
only `ff()` moves it. `?map=field&nodress` is the quickest place to test.
