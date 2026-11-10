# Living places: the field and the woods ("outdoor" builder, session 7)

## What a player notices

### Field (day, mission 1)
- A windpump stands by the farmhouse. Its wheel turns and its red tail swings with the wind. You can see it from the spawn.
- The three radio masts' red lamps pulse slowly, one after another, with a soft halo high up. A felled mast goes dark.
- White seed fluff drifts across the screen on the breeze.
- A thin wisp of smoke trails from the farmhouse chimney (the chimney is new).
- One leaf of the barn door swings on its hinges over a dark doorway.
- A big explosion next to a hay bale sets it alight: flames and smoke for about 18 seconds, then it chars black and smoulders for a minute. Five can burn at once.

### Field (mission 5 storm)
- Leaves and chaff tear past on the wind instead of fluff.
- The windpump spins about three times faster and the barn door bangs.
- Puddles lie along the track, with rain rings, and they flash with the lightning.
- Lightning strikes count as explosions, so a strike next to a bale sets it on fire. The fire glows well in the dark.

### Woods (day, mission 3)
- Yellow and orange leaves drift down around the camera all the time.
- Shafts of sunlight slant into every clearing. They dim when a cloud shadow passes over.
- Low mist sits in the hollows and drifts.
- Six deer (one small) graze in a clearing. At about 50 m their heads come up and they face you. At about 27 m, or when a gun fires or something explodes nearby, or a machine comes within 30 m, they run to another clearing, away from the danger, white rumps showing.
- An explosion among the trees shakes a burst of leaves out of the nearest six trees.

### Woods (mission 4 fog)
- Thicker mist (66 banks instead of 26), duller brown leaves, no sun shafts.
- Yellow-green fireflies blink near the ground.
- The deer are there too, as shapes in the fog.

## Budget (Medium, phone size)
Measured in one run each by hiding my objects, then showing them, at the same spot. The limit is +20 draws, +40k triangles, +8 KB.

| place and look | draws before -> after | triangles before -> after | KB per frame before -> after |
|---|---|---|---|
| field, day, spawn | 245 -> 253 | 307.3k -> 308.1k | 29.9 -> 30.2 |
| field, storm (mission 5), spawn | 257 -> 267 | 332.7k -> 333.7k | 30.6 -> 32.3 (lightning particles were alive in the second reading) |
| woods, day, spawn (game frozen) | 238 -> 244 | 476.6k -> 478.6k | 0 -> 0 |
| woods, day, deer clearing, deer in view | 235 -> 241 | 571.4k -> 571.4k | 51.3 -> 31.9 (plant uploads from moving the camera; mine is about 0.5 KB) |
| woods, fog (mission 4), spawn | 249 -> 258 | 479.1k -> 479.4k | 30.7 -> 30.7 |

Notes:
- The deer clearing itself is a 571k-triangle view before anything of mine is drawn. The 551k / 42 KB reading the lead saw was that spot with 87 combat particles alive, not my additions.
- Per frame I upload the deer (6 matrices and 18 numbers, about 0.5 KB, only while they are in range or running) and the field's 8 glow points (about 0.1 KB). Everything else moves in shaders.
- Particles from the shared pool: chimney about 20 alive, each burning bale about 30. Worst case, five bales burning, is about 170, which is over the 120 guide for a short while; it needs five bales lit at once.
- Low quality halves the counts. Both missions ran clean on Low.
- No new textures and no new colliders.

## Files
- `game/src/04g_life_field.js` (new): the field, plus helpers the woods file uses (`lifeMotes`, `lifeGlows`, `lifePaint`, `lifeTint`, `lifeJoin`, `OUTWIND`).
- `game/src/04h_life_woods.js` (new): the woods.
- `game/src/04b_maps.js`: one commented line in the field section, `MAPS.field.baleIM` and `MAPS.field.mats`, so bales can char and the door reuses the barn's red siding.
- `game/js/ironhowl4.js`: rebuilt.

## For the lead when merging
- `OUTWIND` (toward -x, a little -z) is my wind direction, taken from the way the cloud shadows travel. If the shared builder has a wind direction, point one at the other so fluff, smoke and grass agree.
- I did not shake the tree canopies on an explosion; that needs the plant shader, which is the shared builder's. The leaf burst stands in for it.
- `FLD.objs` and `WDS.objs` list everything each file added, for measuring.

## Not happy with
- The windpump has no collider (the brief said to avoid new ones). It stands against the farmhouse end wall, but the Wraith can clip through it.
- The leaf burst after an explosion is clear but small on a phone; it reads best within about 25 m.
- Rain rings on the puddles are hard to make out in still pictures; the puddles themselves read.
- The deer facing you head-on at 40 m look like thin posts until they move.
- Chimney smoke is a thin wisp and is nearly invisible against white cloud.
- Fireflies in grey daytime fog are soft glows, not sharp sparks.
- The test machine was very slow, so I judged motion from pairs of stills, not at speed. Nobody has seen any of this on a real phone yet.
- I did not test the title screen, the bay or the story scenes by eye. The life code only reads game state, and missions 4 and 5 and both sandboxes ran with no console errors.
