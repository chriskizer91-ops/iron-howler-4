# Session 7 · Living places (built by Fable 5.2, led by Claude Opus)

Christopher asked for the four existing places to come alive before chapter 2, with Fable 5.2 building and Claude Opus leading.
Three Fable 5.2 builders worked at the same time, each on its own git branch, from one brief (`BRIEF.md`, copied here).
The lead laid the groundwork first: hooks that let each place add its own life and hear the fight, and a test tool.
The lead then reviewed, merged, fixed and tested the result.

| builder | branch | what it built | its notes |
|---|---|---|---|
| shared | life-shared | wind in grass, bushes and leaves (shader), gust bands across the meadow and wheat, trample around feet and machines, bird flocks (crows, small birds, gulls) that scatter from shots and come back | `shared.md` |
| outdoor | life-outdoor | field: windpump, pulsing mast lamps, seed fluff, chimney smoke, swinging barn door, hay bales that burn, storm debris and puddles · woods: falling leaves, sun shafts, mist, fireflies in fog, deer that bolt, leaf bursts | `outdoor.md` |
| industrial | life-industrial | docks: swell and moving highlights on the water, ship riding the swell, cranes that lift containers, buoys, pennants, neon stutter, lamps that stutter on explosions · foundry: flowing crusted metal, ladles that pour, embers, steam bursts, welding, alarm beacons when the fight starts | `industrial.md` |

Each builder worked on its own for about 1 hour 50 minutes to 2 hours 20 minutes, in 72 to 82 steps, and tested with its own screenshots.

## Groundwork by the lead (before the builders)
- `game/src/04e_life.js`: `lifeOn(map,{build,tick,noise})`, `lifeBuild(L)`, `lifeTick(dt)`, `lifeNoise(x,z,k,kind)`. A part that throws is switched off on its own.
- Noise reaches the places from the Wraith's gun ('shot'), machines' shots ('eshot'), every explosion ('boom') and footfalls ('step').
- `game/tools/look.py`: open any map or mission at phone or laptop size, run steps, take pictures, measure, and record smooth clips (`clip:`).
- `?nostory` (dev only) skips story scenes in tests.

## Lead's review fixes after merging
- **One wind for everything.** The builders picked opposite wind directions: the grass and rain blew toward +x, the fluff and smoke toward −x. Now the grass, rain slant, cloud shadows, fluff, smoke and windpump all go toward +x.
- **Windpump is solid.** It now has a collider; before, the Wraith could walk through it. Machines path round it.
- **Docks pennants** are at 62% size and half as bright at night; they crowded the chase camera beside a lamp.
- **Test hook.** `window.__hold` lets the clip recorder step and draw the game one picture at a time.

## Measured (Medium, phone size, at the spawn, everything merged)

| place / look | draws before → after | triangles before → after | KB per frame |
|---|---|---|---|
| field, day | 241 → 254 | 302k → 308k | 30 → 31 |
| woods, day | 230 → 241 | 455k → 479k | 30 → 31 |
| docks, sunset | 277 → 288 | 208k → 221k | 30 → 33 |
| foundry | 225 → 236 | 157k → 160k | 30 → 33 |
| mission 5 storm | — → 266 | — → 334k | 30 |
| mission 4 fog | — → 246 | — → 472k | 31 |
| mission 2 night docks | — → 292 | — → 221k | 35 |
| mission 6 foundry | — → 238 | — → 160k | 37 (88 combat particles) |

All within the brief's budget of +20 draws, +40k triangles and +8 KB per place.
All six missions still play through to the end (Low quality, no errors). Mission 6 ends CHAPTER 1 COMPLETE.

## Known weak spots (from the builders and the lead)
- **Deer** facing you head-on read as thin posts until they move.
- **Woods birds** are small specks except against open sky.
- **Ladle buckets** are dark against the night sky; the pours read well.
- **Rain rings** on storm puddles are hard to see.
- **Plant shadows** don't sway.
- **Field horizon (older than this session).** It is a pale white wall where the rising rim meets bright fog. It is worth fixing with the places work.
