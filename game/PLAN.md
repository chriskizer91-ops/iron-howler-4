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
| 2 | The new FORGE machines: Gunner, Hound, Skitter and the spawner pod in place of Ironhowl 3's, with their walk cycles and attacks; the bosses Gunner Prime, Alpha Hound, Brood Skitter | Fight the new machines in the sandbox and Endless |
| 3 | The kit's own behaviours: Lance (charge, piercing rail shot), Arc (chain lightning), Watcher (radar, marks, faster lock, warnings), the assist drone (flies beside you, gun, repairs), the jet pack's 30 s hover | Every kit piece works differently in a fight |
| 4 | The intel brief before a fight (the foes coming, full detail, turnable, with their cards); the armory book; pilot levels | Brief, fight, salvage, upgrade loop |
| 5+ | New missions and story (someone is steering FORGE; the salvage rush), then the new places (environments, probably another chat) | The campaign |

Still Ironhowl 3's for now: the machines you fight (session 2), the places, the Endless waves; the mission campaign is hidden
until Ironhowl 4's own missions are written.
