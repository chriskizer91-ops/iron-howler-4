# Shared life: wind, trample, birds (builder "shared", branch life-shared)

## What a player notices

**Field**
- Pale gust bands roll across the meadow and the wheat in one direction, a few seconds apart. Grass tufts and bushes lean and flash pale as each gust passes.
- Crows: about 13 wheel overhead near where you are, about 9 sit on the barn and farmhouse roofs, the silo, the relay masts and the fence posts.
- Fire a shot or set off an explosion near them and they burst up and wheel away high. About 15 to 20 seconds after it goes quiet they drift back and the perchers land again.
- Walk up to a perched crow (about 13 m) and it takes off. A mast that is shot down loses its crow.
- Storm (mission 5): the wind is much stronger and faster, it surges every few seconds, the bands on the wheat are bold, and only 9 crows fly.

**Woods**
- Grass and bushes sway; tree canopies move gently and trunks stay still.
- 16 small dark birds hop from tree to tree ahead of you, arcing up over the treetops between hops. Noise sends them up and away.
- Fog (mission 4): the air is almost still and there are only 8 birds.

**Docks**
- 20 pale gulls: one group wheels over the yard near you, one over the water and the cranes, a few sit on lamp posts and crane cabins. Noise scatters the ones nearby.
- No gulls at night (mission 2). No plants here, so wind costs nothing.

**Foundry**
- Nothing added: no birds, no plants.

**Everywhere there are plants**
- Trample: grass and bushes bend away from and flatten under the Wraith's body and feet and the nearest machines. Hovering blows a wider ring flat. An explosion lays the grass flat in a ring that springs back in a second or two.
- Sound: the old random chirp now plays only when calm birds are within about 85 m (crows caw, gulls cry, woods birds keep the old song). A scatter gives three quick alarm calls. Night maps and the foundry are now silent of birds.

## Budget (Medium, phone size)

"Before" was measured in the same run by switching my part off (birds hidden, life tick stopped), so both numbers share the same camera and moment.

| place / look | draws | triangles | KB per frame |
|---|---|---|---|
| field, day, spawn | 244 → 245 | 307.3k → 307.7k | 29.7 → 30.4 |
| field, day, by the fences | 236 → 237 | 357.6k → 358.0k | 29.8 → 30.5 |
| field, mission 5 storm | 260 → 258 * | 332.9k → 332.8k * | 32.6 → 30.3 * |
| woods, day | 235 → 235 | 509.0k → 509.3k | 30.8 → 31.3 |
| woods, mission 4 fog | 261 → 262 | 479.0k → 479.1k | 30.2 → 30.5 |
| docks, sunset | 280 → 280 | 207.8k → 208.1k | 29.7 → 30.3 |
| foundry | 226 → 226 | 157.4k → 157.4k | 32.1 → 32.4 * |

\* Machines and particles were on screen and changed between the two readings, so the difference is noise. My real cost there is the same as elsewhere.

In short: **+1 draw call, at most +330 triangles, about +0.6 KB per frame** (the birds). Wind and trample add no draws, no triangles and no uploads; they are a few lines in the plant vertex shader and 8 small vectors set each frame. On Low the bird count is halved.

## Files touched
- `game/src/04f_life_shared.js` (new): wind settings per look, trample pressers, birds, bird voices, `lifeOn('*', ...)`.
- `game/src/03_render.js`: wind uniforms in `U`, `WIND_GLSL`, `WIND_KIND`, `windVertex()`, a `wind` option in `hookWorld` (cache key includes it), gust bands in the ground shader.
- `game/src/04_world.js`: `partsOf` marks what the wind moves and bakes `aSway` (height up the plant); `buildInstances` passes the plant's catalogue height so near and far versions sway alike.
- `game/src/10_main.js`: `sBird()` call replaced by `birdSong()`.
- `game/js/ironhowl4.js`: rebuilt.

## Not happy with / not checked
- **Grass sway itself is subtle.** The grass on these maps is sparse, short tufts, so the leaning geometry alone does not read at phone size. The pale bands on the ground carry the "waves through a meadow" look. The field's crops are a ground texture, not plants, so the wheat waves are bands of light only.
- **Day wheat bands are mild**, storm bands are bold. Easy to turn up: `U.uCrop` in `windSetup`.
- **Woods birds are the weakest part**: small specks unless they cross open sky. They are already drawn about twice life size.
- **Perched birds are a simple dark wedge.** Fine from the ground at a distance, crude up close. I changed the perched shape once more after my last close-up picture and did not re-shoot it.
- **Plant shadows do not sway** (near trees and bushes cast the still shape). Not noticeable in my shots.
- **Sound was not heard**: the test browser has no audio. The caw and gull cry are new synth sounds and need a listen on a real device.
- **Not looked at**: docks at night (mission 2; birds are off by rule, `L.night`), missions 1, 3, 6 and later, Low and High quality, and the laptop size. Tree canopy sway and gull/woods birds returning were checked by numbers, not by eye in motion (the test machine draws a frame every 4 to 5 seconds).
- Fight noise from the test tool's CALM mode (it blows machines up as they spawn) keeps scaring birds, so bird tests were run with waves switched off instead.
