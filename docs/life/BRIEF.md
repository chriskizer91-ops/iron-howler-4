# Ironhowl 4 · Session 7 · Bring the four places to life

You are one of three builders working on **Ironhowl 4**, a third-person mech game (you pilot the Wraith; waves of machines attack).
Christopher owns the game. He can't code, plays on a **Pixel 7a phone held sideways** and an **MSI laptop with Edge**.
The lead (Claude Opus) reviews, tests and merges your work. You build.

**The job:** the four places (field, woods, docks, foundry) feel static between and during fights. Make each one feel alive:
weather and wind you can see, small motion everywhere, and things that react to the fight. Simple, readable, beautiful from the
chase camera at phone size. Every effect should be visible and obvious within a few seconds of looking. Avoid tiny details you'd
only notice if you zoomed in.

## Where you work
- Your own git worktree and branch (given below). Commit there with clear messages. Do not push. Do not touch other worktrees or `/home/claude/iron-howler-4`.
- Source: `game/src/*.js`. Build: `python3 game/build.py`. It joins the files in name order into ONE classic script wrapped in an IIFE (`game/js/ironhowl4.js`; never edit that by hand).
  Top-level `const`/`function` names are shared across files but are not on `window`.
- Three.js r187 is global as `THREE` (BufferGeometryUtils' `THREE.mergeGeometries` is there too).
- The life hooks are already wired: read `game/src/04e_life.js`. Register your parts with
  `lifeOn('field',{build(L){..}, tick(dt,t){..}, noise(x,z,k,kind){..}})`.
  `build` runs after the map, its plants and the weather exist (`L` is the look: `L.night`, `L.rain`, `L.storm`, `L.fogFar`, `L.sunCol`...). `tick` runs every frame.
  `noise` hears the fight: `'shot'` (Wraith gun, at the Wraith), `'eshot'` (a machine fires), `'boom'` (explosion, k≈.4–2), `'step'` (footfall).
  A part that throws is switched off by itself, but don't rely on that.
- Names you can use (all shared top-level): `S` scene, `cam` camera, `P` the Wraith (`P.x,P.y,P.z,P.yaw,P.spd`), `EN` machines (`e.x,e.z,e.y,e.dead,e.spawnT`),
  `hgt(x,z)` ground height, `MAPID`, `MAPDEF`, `MAPS` (e.g. `MAPS.field.mastObjs`, `MAPS.field.farm`, `MAPS.docks.wt`, `MAPS.foundry.stacks`, `MAPS.foundry.melt`, `FORGE_AT`),
  `LOOKNOW`, `NIGHT_ON`, `QL` ('low'|'med'|'high'), `G.t` time, `G.mode` ('title'|'play'|'demo'|'bay'...), `U.uTime` shared time uniform,
  `KEY` (sun DirectionalLight), `HEMI` (HemisphereLight), `SUN` (sun direction), `S.fog`,
  `tex(name,{rep,clamp})` loads `game/art/<name>.webp`, `tmat(name,o)` lit material, `hookWorld(mat,o)` (cloud shadows; see `03_render.js`), `poolTex()` soft round glow,
  `mulberry(seed)` seeded random, `smooth(a,b,x)`, `lerp`, `clamp`, `damp(k,dt)`, `TAU`, `V3(x,y,z)`,
  `part({x,y,z,vx,vy,vz,life,s0,s1,a,col:[r,g,b],glow,drag,grav})` one particle from the **shared pool of 900** (combat needs it; see budget),
  `addCol(x,z,r,h)` / `addBox(...)` colliders (only if you add something solid in the play area; prefer not to),
  sounds `sBird() sVent() sBoom(k) thump(...) tone(...) nz(...)` in `07_fx.js`.
- Map code: `04_world.js` (ground, plants), `04b_maps.js` (woods, field, docks), `04c_foundry.js`, `04d_props.js` (clutter), `03_render.js` (look, sky, fog, `hookWorld`),
  `06g_set7.js` (`buildWeather`: storm lightning, burning trees), `06f_more.js` (rain), `07_fx.js` (particles, sounds).
  Static meshes built in a map's `build()` are merged afterwards (`mergeStatic` in `04b_maps.js`): anything you want to move must be built in your life `build`, or marked `userData.keep=1` before the merge.

## Which looks each place has (all must look right)
- field: sandbox day; mission 1 day (`MISSION=1`); mission 5 storm with rain and lightning (`MISSION=5`, `L.storm`, `L.rain`)
- docks: sandbox sunset; mission 2 night (`MISSION=2`, `L.night`)
- woods: sandbox day; mission 3 day; mission 4 fog by the creek (`MISSION=4`, `L.fogFar=105`, mix 'creek')
- foundry: night (sandbox and mission 6, where the boss FORGE stands on the platform at `FORGE_AT`)
- Ambient life that only makes sense in some looks should check `L` (no birds at night, fireflies only in fog/dusk/night, etc.).

## Budgets (Medium quality, measured with `perf:` in look.py). Phones must keep their frame rate.
Current measurements, standing at the spawn:

| place | draws | triangles | KB uploaded per frame |
|---|---|---|---|
| field | 241 | 302k | 30 |
| woods | 230 | 455k | 30 |
| docks | 277 | 208k | 30 |
| foundry | 225 | 157k | 30 |

Your additions per place, at most: **+20 draw calls, +40k triangles, +8 KB uploaded per frame**. Some rules for staying inside that:
- Do motion in shaders (vertex shader + a time uniform) or by moving a few whole objects. Avoid rewriting big buffers every frame.
- Instanced meshes for many copies. One material, one draw per kind of thing.
- Ambient particles from `part()`: keep at most about 120 alive from your place at once (combat bursts need the rest). For lots of tiny motes (dust, leaves, embers), prefer your own small `THREE.Points` or instanced mesh that follows the camera, animated in its shader, like the rain in `06f_more.js`.
- On `QL==='low'`, cut counts at least in half or skip the extras. Nothing may add to the per-frame cost when the effect is far away or off screen if it's easy to avoid.
- No new big textures. Prefer procedural/canvas textures. If you must add an image, put it in `game/art/` as `.webp`, ≤256 px, ≤40 KB each.
- Don't change gameplay: no new colliders in the play area, nothing that blocks shots or paths, no changes to damage, missions, the story, the kit, the HUD, or the bay. Machines and the Wraith must stay easy to see; motion must never look like a threat (no red blinking near the ground, no shapes that look like enemies).
- All existing behaviour keeps working: the six missions, the endless sandbox, the story scenes, the bay.

## How to test (do this; look at your own pictures)
A local server already serves your worktree (port given below). The tool is `game/tools/look.py` (read its header):
```
cd <your worktree>
URL=http://localhost:<port>/game/index.html MAP=field SIZE=phone HUD=0 CALM=1 STEPS=/tmp/<you>_steps.txt python3 game/tools/look.py
URL=... MISSION=5 SIZE=laptop STEPS=... python3 game/tools/look.py
```
It runs a headless Chrome with a software GPU (slow: a frame takes 1–5 s, so `wait:` seconds are real seconds of game time at a few frames;
use `ev:(G.t)` to see how much game time passed). Use `ev:` to place the Wraith (`P.x=..,P.z=..,P.yaw=..`) and set off fights
(`boom(x,hgt(x,z)+1,z,1)`, `lifeNoise(x,z,1,'boom')`, `spawnEnemy(...)`). Take screenshots (`shot:`) and **look at them with the Read tool**:
judge them as an artist would at phone size. For motion, take two or three shots a few seconds apart.
Check the budget with `perf:` before and after, standing at the spawn and in the busiest spot of your effect.
Check the browser console lines look.py prints at the end: no new errors.

## When you finish
- Commit on your branch.
- Write `docs/life/<your-name>.md` in your worktree: what you added per place (plain words, one line each, as a player would notice it),
  the budget numbers before → after per place and look, which files you touched, and anything you weren't happy with.
- Reply with a short summary and the paths of your best 4–8 screenshots (phone size preferred).
