# Ironhowl 4 — code review, 7 Nov 2026

Three reviewers (Opus 5.5, high effort) read the whole game in three parts: the player, weapons, kit and HUD; the machines,
missions and modes; the rendering, screens, main loop and packer. They reported 43 findings (one reported twice). Claude then
checked every one against the code. Two were also measured in the running game with a temporary probe, since removed:
- the per-machine memory leak: 8 Gunners spawned, drawn and destroyed twice, and the graphics memory never went back down;
- the shader rebuild: the Gunners' shader program was dropped when the last one died, and rebuilt when the next ones spawned.

No finding crashes the game; none were wrong. Repo state reviewed: main at b9ee641.

**All 42 are fixed (7 Nov, commits 0b58dec, fddd013 and 3bae1e8; test build version 1794073673-99cc).** Measured in the test browser at Medium,
standing still, before (b9ee641) and after:

| Map | Data sent to the graphics chip per frame | Triangles drawn per frame (picture + shadows) | Draw calls per frame |
|---|---|---|---|
| Woods | 3,349 KB → 30 KB | 594,000 → 455,000 | 233 → 230 |
| Field | 2,245 KB → 30 KB | 402,000 → 302,000 | 252 → 241 |
| Foundry | 65 KB → 30 KB | 157,000 → 157,000 | 329 → 225 |

One trade-off: the bay's full-detail Wraith is now freed when a run starts, so the first bay visit after a run loads it again.

Tests after fixing: all six chapter 1 missions ran start to finish (MISSION COMPLETE each, CHAPTER 1 COMPLETE after 6);
five rounds of 8 Gunners spawned and destroyed kept graphics memory flat (160 meshes, 49 textures, 47 shaders after each
round); the brief frees its full models on DEPLOY (198 → 174 meshes); phone size (412 × 915): Endless MENU goes back to the
sandbox, the bay, the brief and DEPLOY all work; the hosted build loads with the fast decoder and with the slow fallback.

Status: **Confirmed** = traced in the code (and measured where noted). **Likely** = the reasoning holds, but it wasn't
measured.

## Fix first: things a player will hit

| # | What goes wrong | Where | Status |
|---|---|---|---|
| 1 | **Laptop: the mouse is captured during the intel brief**, so you can't click DEPLOY. A brief that opens mid-run releases the mouse, which pauses the game, and it stays paused after DEPLOY. | `10_main.js` startPlay (`briefMaybe` before `lockMouse`), `02_input.js` pointerlockchange, `06l_brief.js` briefDone | Confirmed · **Fixed: the brief never captures the mouse, and losing it during a brief doesn't pause** |
| 2 | **MENU can't leave Endless**: both MENU buttons only drop `mission` from the address, so the page reloads straight back into Endless. | `10_main.js` bmenu / rmenu (`q.delete('mission')`) | Confirmed · **Fixed: MENU drops `endless` too** |
| 3 | **Phone, during a brief**: the chip strip and card can't scroll, and dragging the model piles up camera turn that is all applied the moment you tap DEPLOY. | `02_input.js` touch handlers (`G.mode==='play'` still true in a brief) | Confirmed · **Fixed: touches during a brief belong to the brief; piled-up input is cleared on DEPLOY** |
| 4 | **Armory book / brief show an empty stage** when reopened on the same card. | `06l_brief.js` viewClose doesn't reset `STG.id` | Confirmed · **Fixed** |
| 5 | **Every destroyed machine leaks its merged mesh and bone texture** (Gunner about 1.4 MB). A long Endless run can run the phone out of memory. | `06c_enemies.js` skinify / killEnemy / clearFight | Confirmed, measured · **Fixed: one merged mesh per machine type, shared; bone textures freed (measured: geometry count flat across rounds)** |
| 6 | **A shader rebuild hitch at each new wave**: disposing the last machine's material drops the shared shader. | `06c_enemies.js` killEnemy `e.mat.dispose()` | Confirmed, measured · **Fixed: a pool of up to 24 materials per type, reused (measured: shader count flat)** |
| 7 | **Mission 1's mast step reads "2/1"**, and its marker stays on the first mast after it falls. Spawner-pod markers take the first pod in the list, not the nearest. | `06d_missions.js` beginStep masts label, stepPos | Confirmed · **Fixed: reads 0/3 → 3/3; the marker moves to the nearest mast or pod still standing (tested)** |
| 8 | **After a kit change, shots can leave from the side or back of the forearm weapon**: the muzzle is placed while the torso is turned. | `05_wraith.js` rigKit (`W.root.getWorldQuaternion`) | Confirmed · **Fixed: muzzles are placed in the standing pose (tested: same spot facing north or east)** |
| 9 | **The drone can't dock while you're walking** (it trails 1.7 m behind; it docks under 0.35 m). With its shield broken it never recharges while you move. | `06k_kit.js` updDrone | Confirmed · **Fixed: flies home at 30 m/s or more and docks within 1.5 m; shield recharges on the way (tested: docks while walking)** |
| 10 | **Grass and plants re-send their whole instance buffers to the graphics chip every frame** (megabytes a frame on woods and field). | `04_world.js` updVeg | Confirmed · **Fixed: only changed plants are sent, and only the part in use (measured below)** |
| 11 | **Bay: closing and reopening before the Wraith loads starts a second 950,000-triangle load**; a load that finishes during a brief or book shows the Wraith over the stage. | `06i_bay.js` openBay | Confirmed · **Fixed** |
| 12 | **The Brood Skitter never zaps**: its size keeps it 4.4 m out, and the zap needs 2.8 m. | `06c_enemies.js` skitter brain | Confirmed · **Fixed: zap range follows the machine's size (tested: 3 zaps in 4 s, was none)** |

## Speed and memory (mostly the phone)

| # | Finding | Where | Status |
|---|---|---|---|
| 13 | Machines are merged without indices, so 3× the vertices (Gunner 24,300 instead of 7,700), skinned twice a frame (colour and shadow). Fix together with 5 and 6 by caching one merged mesh per machine type. | `06c_enemies.js` skinify | Confirmed (model data) · **Fixed with 5: indexed merge (Gunner 7,700 vertices)** |
| 14 | Full-detail models and their print textures stay in memory after the bay, brief or book close; the stage's materials load a second copy of textures already loaded for the field; the ORM map is loaded twice in every kit material. | `06i_bay.js`, `05_wraith.js` loadGLB / kitMat, `06l_brief.js` | Confirmed · **Fixed: textures shared by file (ORM once); full models and prints leave memory when play starts or a brief ends** |
| 15 | The bay redraws the shadow of a ~1 million-triangle model every frame though nothing moves. | `06i_bay.js` bayFrame | Confirmed · **Fixed: the bay's shadow is redrawn twice a second, or at once after a change** |
| 16 | Every kill reads the save 3 times and writes it twice (both reviewers found this). | `06m_pilot.js` pilotKill / addXP | Confirmed · **Fixed: one read and one write per kill** |
| 17 | Spawner pod model is 8 meshes (8 draw calls + 8 shadow) per pod and per Brood. | `06j_forge.js` spodModel | Confirmed · **Fixed: the pod is one merged mesh** |
| 18 | Foundry buildings with several materials aren't merged: about 144 draw calls. | `04c_foundry.js`, `04b_maps.js` mergeStatic | Likely · **Fixed: many-material buildings merge by material (measured: Foundry 329 → 225 draws a frame)** |
| 19 | Map-wide pebbles, stumps and logs cast shadows (about 130,000 extra shadow triangles on woods). | `04d_props.js` | Likely · **Fixed: pebbles, logs and stumps cast no shadow (measured below)** |
| 20 | Path map rebuilt every time you cross a 2 m cell, even with no machines alive. | `06c_enemies.js` updEnemies | Confirmed · **Fixed: rebuilt only while a machine is alive, at most 4 times a second** |
| 21 | New vectors, quaternions and arrays created every frame (rounds and missiles drawn, the drone, `kitHas` per machine, arm filters). | `06b_weapons.js`, `06k_kit.js`, `09_hud.js` | Confirmed · **Fixed: scratch vectors reused; drone parts looked up once; `kitHas` without arrays; autocannon arms listed at refit** |
| 22 | HUD style writes every frame (heat bar, radar, marks, edge arrows, waypoint), and the radar timer assumes 60 fps. | `06k_kit.js` kitHud, `09_hud.js` | Confirmed · **Fixed: HUD styles written only on change; radar timer uses the real frame time** |
| 23 | The hosted build decodes base64 one character at a time (an 18 MB model blocks the phone about 0.1 s or more). | `tools/pack_artifact.py` shim | Confirmed · **Fixed: the browser's own base64 decoder (or a data URL), not one character at a time** |
| 24 | `loadout()` (a save read) runs every bay frame and isn't used. | `06i_bay.js` bayFrame | Confirmed · **Fixed** |
| 25 | Auto quality dropping to Low switches shadows off and rebuilds every shader mid-fight; the glow pass's buffers stay allocated. | `03_render.js`, `03b_post.js` | Likely · **Fixed: Medium → Low waits for a moment with no machines alive; glow buffers freed when glow goes off** |
| 26 | Particles: `shift()` and `splice()` with a new object per particle. | `07_fx.js` | Confirmed · **Fixed: one pass, no `shift`/`splice` (particles are still small objects made by the callers)** |
| 27 | Small per-frame filters and sums in Endless and missions. | `06h_endless.js`, `06d_missions.js` | Confirmed · **Fixed** |

## Smaller things

| # | Finding | Where | Status |
|---|---|---|---|
| 28 | Two kit refits can overlap and leave a doubled weapon; a failed kit load leaves the mech frozen (`M.ready` false). | `05_wraith.js` refitModel, `06m_pilot.js` pilotRunStart | Confirmed (rare) · **Fixed: a newer refit wins; a failed piece leaves its mount empty, never a frozen mech (tested: two at once → 2 weapons)** |
| 29 | Hovering up a slope can sink the Wraith into the hill for about a second. | `06_player.js` landing check | Likely · **Fixed: rising up a slope rides over it; hovering into it lands** |
| 30 | Phone: aiming with a look finger while dragging FIRE shares one "last position", so the aim jumps. | `02_input.js` touchmove | Confirmed · **Fixed: the FIRE finger keeps its own last position** |
| 31 | More than 40 missiles in the air (top missile upgrades) makes them all vanish that frame. | `06b_weapons.js` missile draw | Confirmed · **Fixed: draws 40 (tested with 50 in the air)** |
| 32 | Missiles and salvo rounds only use 2 of the pod's 9 tubes. | `06b_weapons.js` | Confirmed · **Fixed: all 9 tubes (18 with two pods), right and left taking turns** |
| 33 | Jumping two levels at once only announces the last level's unlock. | `06m_pilot.js` addXP | Confirmed · **Fixed: names every level's unlocks (tested LV1 → LV3: LANCE + WATCHER)** |
| 34 | The drone flies out and back repeatedly when a machine sits near 70 m. | `06k_kit.js` updDrone | Likely · **Fixed: launches under 70 m, returns past 80 m (tested at 75 m: stays out)** |
| 35 | Each refit creates a new beam geometry and Lance glow that are never freed. | `05_wraith.js`, `06k_kit.js` | Confirmed · **Fixed: flame shapes and the Lance glow are shared across refits** |
| 36 | Clear steps give no pointer to the last straggler. | `06d_missions.js` | Confirmed · **Fixed: points at the nearest straggler once all are more than 45 m away** |
| 37 | The pod model loads only when the first pod appears (pops in); a failed load errors once per pod. | `06j_forge.js` | Confirmed · **Fixed: preloaded with the Skitters; a failed load is retried** |
| 38 | A spawn group can land in a blocked spot or near you after 30 failed tries. | `06d_missions.js` spawnGroup | Confirmed · **Fixed: the clear spot furthest from you, else the group's centre** |
| 39 | Jet hum keeps playing through a brief. | `10_main.js`, `06l_brief.js` | Confirmed · **Fixed** |
| 40 | Bay / brief / book brightness follows the map's exposure (Foundry about 40 % brighter). | `03_render.js` | Confirmed · **Fixed: the room uses its own exposure** |
| 41 | A model load that fails once is cached as failed until a reload. | `05_wraith.js` loadGLB | Confirmed · **Fixed** |
| 42 | "FULL DETAIL n%" jumps from 0 to 100 (the loading manager only counts finished files). | `06l_brief.js` | Confirmed · **Fixed: the percentage follows the download's bytes** |

## Suggested fix order
1. Items 1–4 (screens and controls around the brief, leaving Endless).
2. Items 5, 6 and 13 together (one merged mesh and one material pool per machine type).
3. Items 7–12.
4. Items 10, 14, 15 and 16 (the biggest phone speed and memory wins).
5. The rest when convenient.
