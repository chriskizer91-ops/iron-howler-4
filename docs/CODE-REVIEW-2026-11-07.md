# Ironhowl 4 — code review, 7 Nov 2026

Three reviewers (Opus 5.5, high effort) read the whole game in three parts: the player, weapons, kit and HUD; the machines,
missions and modes; the rendering, screens, main loop and packer. They reported 43 findings (one reported twice). Claude then
checked every one against the code. Two were also measured in the running game with a temporary probe, since removed:
- the per-machine memory leak: 8 Gunners spawned, drawn and destroyed twice, and the graphics memory never went back down;
- the shader rebuild: the Gunners' shader program was dropped when the last one died, and rebuilt when the next ones spawned.

No finding crashes the game; none were wrong. Repo state reviewed: main at b9ee641. Nothing has been fixed yet.

Status: **Confirmed** = traced in the code (and measured where noted). **Likely** = the reasoning holds, but it wasn't
measured.

## Fix first: things a player will hit

| # | What goes wrong | Where | Status |
|---|---|---|---|
| 1 | **Laptop: the mouse is captured during the intel brief**, so you can't click DEPLOY. A brief that opens mid-run releases the mouse, which pauses the game, and it stays paused after DEPLOY. | `10_main.js` startPlay (`briefMaybe` before `lockMouse`), `02_input.js` pointerlockchange, `06l_brief.js` briefDone | Confirmed |
| 2 | **MENU can't leave Endless**: both MENU buttons only drop `mission` from the address, so the page reloads straight back into Endless. | `10_main.js` bmenu / rmenu (`q.delete('mission')`) | Confirmed |
| 3 | **Phone, during a brief**: the chip strip and card can't scroll, and dragging the model piles up camera turn that is all applied the moment you tap DEPLOY. | `02_input.js` touch handlers (`G.mode==='play'` still true in a brief) | Confirmed |
| 4 | **Armory book / brief show an empty stage** when reopened on the same card. | `06l_brief.js` viewClose doesn't reset `STG.id` | Confirmed |
| 5 | **Every destroyed machine leaks its merged mesh and bone texture** (Gunner about 1.4 MB). A long Endless run can run the phone out of memory. | `06c_enemies.js` skinify / killEnemy / clearFight | Confirmed, measured |
| 6 | **A shader rebuild hitch at each new wave**: disposing the last machine's material drops the shared shader. | `06c_enemies.js` killEnemy `e.mat.dispose()` | Confirmed, measured |
| 7 | **Mission 1's mast step reads "2/1"**, and its marker stays on the first mast after it falls. Spawner-pod markers take the first pod in the list, not the nearest. | `06d_missions.js` beginStep masts label, stepPos | Confirmed |
| 8 | **After a kit change, shots can leave from the side or back of the forearm weapon**: the muzzle is placed while the torso is turned. | `05_wraith.js` rigKit (`W.root.getWorldQuaternion`) | Confirmed |
| 9 | **The drone can't dock while you're walking** (it trails 1.7 m behind; it docks under 0.35 m). With its shield broken it never recharges while you move. | `06k_kit.js` updDrone | Confirmed |
| 10 | **Grass and plants re-send their whole instance buffers to the graphics chip every frame** (megabytes a frame on woods and field). | `04_world.js` updVeg | Confirmed |
| 11 | **Bay: closing and reopening before the Wraith loads starts a second 950,000-triangle load**; a load that finishes during a brief or book shows the Wraith over the stage. | `06i_bay.js` openBay | Confirmed |
| 12 | **The Brood Skitter never zaps**: its size keeps it 4.4 m out, and the zap needs 2.8 m. | `06c_enemies.js` skitter brain | Confirmed |

## Speed and memory (mostly the phone)

| # | Finding | Where | Status |
|---|---|---|---|
| 13 | Machines are merged without indices, so 3× the vertices (Gunner 24,300 instead of 7,700), skinned twice a frame (colour and shadow). Fix together with 5 and 6 by caching one merged mesh per machine type. | `06c_enemies.js` skinify | Confirmed (model data) |
| 14 | Full-detail models and their print textures stay in memory after the bay, brief or book close; the stage's materials load a second copy of textures already loaded for the field; the ORM map is loaded twice in every kit material. | `06i_bay.js`, `05_wraith.js` loadGLB / kitMat, `06l_brief.js` | Confirmed |
| 15 | The bay redraws the shadow of a ~1 million-triangle model every frame though nothing moves. | `06i_bay.js` bayFrame | Confirmed |
| 16 | Every kill reads the save 3 times and writes it twice (both reviewers found this). | `06m_pilot.js` pilotKill / addXP | Confirmed |
| 17 | Spawner pod model is 8 meshes (8 draw calls + 8 shadow) per pod and per Brood. | `06j_forge.js` spodModel | Confirmed |
| 18 | Foundry buildings with several materials aren't merged: about 144 draw calls. | `04c_foundry.js`, `04b_maps.js` mergeStatic | Likely |
| 19 | Map-wide pebbles, stumps and logs cast shadows (about 130,000 extra shadow triangles on woods). | `04d_props.js` | Likely |
| 20 | Path map rebuilt every time you cross a 2 m cell, even with no machines alive. | `06c_enemies.js` updEnemies | Confirmed |
| 21 | New vectors, quaternions and arrays created every frame (rounds and missiles drawn, the drone, `kitHas` per machine, arm filters). | `06b_weapons.js`, `06k_kit.js`, `09_hud.js` | Confirmed |
| 22 | HUD style writes every frame (heat bar, radar, marks, edge arrows, waypoint), and the radar timer assumes 60 fps. | `06k_kit.js` kitHud, `09_hud.js` | Confirmed |
| 23 | The hosted build decodes base64 one character at a time (an 18 MB model blocks the phone about 0.1 s or more). | `tools/pack_artifact.py` shim | Confirmed |
| 24 | `loadout()` (a save read) runs every bay frame and isn't used. | `06i_bay.js` bayFrame | Confirmed |
| 25 | Auto quality dropping to Low switches shadows off and rebuilds every shader mid-fight; the glow pass's buffers stay allocated. | `03_render.js`, `03b_post.js` | Likely |
| 26 | Particles: `shift()` and `splice()` with a new object per particle. | `07_fx.js` | Confirmed |
| 27 | Small per-frame filters and sums in Endless and missions. | `06h_endless.js`, `06d_missions.js` | Confirmed |

## Smaller things

| # | Finding | Where | Status |
|---|---|---|---|
| 28 | Two kit refits can overlap and leave a doubled weapon; a failed kit load leaves the mech frozen (`M.ready` false). | `05_wraith.js` refitModel, `06m_pilot.js` pilotRunStart | Confirmed (rare) |
| 29 | Hovering up a slope can sink the Wraith into the hill for about a second. | `06_player.js` landing check | Likely |
| 30 | Phone: aiming with a look finger while dragging FIRE shares one "last position", so the aim jumps. | `02_input.js` touchmove | Confirmed |
| 31 | More than 40 missiles in the air (top missile upgrades) makes them all vanish that frame. | `06b_weapons.js` missile draw | Confirmed |
| 32 | Missiles and salvo rounds only use 2 of the pod's 9 tubes. | `06b_weapons.js` | Confirmed |
| 33 | Jumping two levels at once only announces the last level's unlock. | `06m_pilot.js` addXP | Confirmed |
| 34 | The drone flies out and back repeatedly when a machine sits near 70 m. | `06k_kit.js` updDrone | Likely |
| 35 | Each refit creates a new beam geometry and Lance glow that are never freed. | `05_wraith.js`, `06k_kit.js` | Confirmed |
| 36 | Clear steps give no pointer to the last straggler. | `06d_missions.js` | Confirmed |
| 37 | The pod model loads only when the first pod appears (pops in); a failed load errors once per pod. | `06j_forge.js` | Confirmed |
| 38 | A spawn group can land in a blocked spot or near you after 30 failed tries. | `06d_missions.js` spawnGroup | Confirmed |
| 39 | Jet hum keeps playing through a brief. | `10_main.js`, `06l_brief.js` | Confirmed |
| 40 | Bay / brief / book brightness follows the map's exposure (Foundry about 40 % brighter). | `03_render.js` | Confirmed |
| 41 | A model load that fails once is cached as failed until a reload. | `05_wraith.js` loadGLB | Confirmed |
| 42 | "FULL DETAIL n%" jumps from 0 to 100 (the loading manager only counts finished files). | `06l_brief.js` | Confirmed |

## Suggested fix order
1. Items 1–4 (screens and controls around the brief, leaving Endless).
2. Items 5, 6 and 13 together (one merged mesh and one material pool per machine type).
3. Items 7–12.
4. Items 10, 14, 15 and 16 (the biggest phone speed and memory wins).
5. The rest when convenient.
