# Living places: the docks and the foundry (builder "industrial", session 7)

Branch `life-industrial`. New files `game/src/04i_life_docks.js` and `game/src/04j_life_foundry.js`.
Nothing added has a collider, nothing changes damage, missions, the HUD or the bay.

## Docks (Harbor 9): what a player notices
- **The water moves.** Slow swells lift and drop the surface, small ripples slide the sunset (or the moonlight) across it, and a pale foam line works along the quay wall and the ship's side.
- **The ship is afloat.** It rises, falls and rolls a little. It now carries stacks of coloured containers on deck, a funnel that smokes downwind, masts and lights.
- **The cranes work.** Each trolley runs out along its boom, lowers a spreader on four cables, lifts a container off the ship, carries it ashore and sets it on a landing platform 15 m up between the crane's legs. After a rest it carries it back. A work light rides on every trolley and a slow warning light blinks on every crane top.
- **Buoys** (green and yellow) bob out on the water, each with a flashing light. Best seen from the west and east ends of the quay.
- **Pennants** on every lamp post stream and snap in the wind (they follow the shared wind direction if it is there).
- **The HARBOR 9 neon** stutters now and then. One lamp in the middle lane is tired and buzzes on and off.
- **At night** (mission 2) the ship's cargo and the crane loads are floodlit and the water carries moonlit ripples.
- **Reacting to the fight:** an explosion makes the lamps near it stutter (the lamp and, at night, its pool of light on the ground), jolts the neon if it is close, and sets the crane loads swinging on their cables.

## Foundry (Foundry 4): what a player notices
- **The molten channels flow** toward the middle of the yard: bright metal with dark crust plates riding on it. The furnace mouths burn with the same fire. The channels now run all the way to spouts in the side walls.
- **Ladles pour.** Four ladles ride overhead rails just outside the walls (east, west, two at the back). Each carries a glowing load to a pouring point on the wall top, tips, and pours a bright stream with a shower of sparks and a puff of smoke. A pour at a side wall sends a bright surge down that channel.
- **Embers** drift up across the whole yard.
- **Steam** bursts from pipes high on the walls every few seconds (with a hiss that is quieter the further away it is).
- **Welding** flickers blue-white with falling sparks, high on the hall roof and on a rail tower.
- **Heat glow** on the ground in front of every furnace mouth, on the walls behind the furnaces and behind each pour; a fire glow on every stack top.
- **The FOUNDRY 4 neon** stutters now and then. One lamp is tired.
- **Reacting to the fight:** the first shot or explosion sets off the **alarm**: amber beacons turn on the wall tops and a short horn sounds. They go quiet 18 seconds after the last shot, and come back with the next. Explosions make nearby lamps stutter and jolt the neon.
- The platform at `FORGE_AT` is untouched; the nearest moving thing to it is a pouring point 33 m to either side, up on the back wall. No beacon sits behind the platform.

## Budget (Medium, phone size, `perf:` in look.py, CALM=1; before -> after)
Allowed per place: +20 draws, +40k triangles, +8 KB per frame.

| place / look | where | draws | triangles | KB per frame |
|---|---|---|---|---|
| docks sunset | spawn | 279 -> 287 (+8) | 207.8k -> 220.8k (+13.0k) | 29.7 -> 32.7 (+3.0) |
| docks sunset | quay under the middle crane | 254 -> 262 (+8) | 200.4k -> 213.4k | 29.7 -> 32.8 |
| docks sunset | east end, looking over the water | 254 -> 266 (+12) | 196.8k -> 209.8k | 29.7 -> 33.0 |
| docks night (mission 2) | spawn | 285 -> 294 (+9) | 208.3k -> 221.2k | 32.2 -> 36.0 (+3.8) |
| docks night | quay | 256 -> 269 (+13) | 200.7k -> 213.6k | 31.0 -> 34.4 |
| docks night | east end | 256 -> 267 (+11) | 197.0k -> 210.0k | 30.2 -> 33.6 |
| foundry sandbox | spawn | 225 -> 236 (+11) | 157.3k -> 160.0k (+2.7k) | 30.1 -> 33.0 (+2.9) |
| foundry sandbox | mid yard | 222 -> 233 (+11) | 156.4k -> 159.1k | 30.4 -> 33.9 |
| foundry sandbox | facing an east-wall pour | 193 -> 204 (+11) | 149.6k -> 152.3k | 30.5 -> 34.2 |
| foundry mission 6 | spawn | 229 -> 242 (+13) | 157.6k -> 160.3k | 33.5 -> 37.4 (+3.9) |
| foundry mission 6 | mid yard | 226 -> 239 (+13) | 156.7k -> 159.4k | 32.4 -> 36.0 |
| foundry mission 6 | facing an east-wall pour | 194 -> 205 (+11) | 149.6k -> 152.3k | 31.4 -> 35.1 |

The draw and KB numbers wobble by a few between runs, because machines being spawned and their explosions are in the count.
Ambient particles from these places: docks about 35 (funnel smoke); foundry about 25 at rest, up to about 90 with two pours, a steam burst and a weld at once.
Low quality: no errors; the water sheet has a quarter of the triangles, half the pennants, no buoys, 130 embers instead of 320, about half the smoke and sparks.

## Files touched
- new `game/src/04i_life_docks.js` (docks, plus three small helpers the foundry also uses: `lifeGlow` soft lights in one draw, `lifeLampRig` lamps that flicker one by one, `lifeNeon`)
- new `game/src/04j_life_foundry.js`
- `game/src/04b_maps.js`, docks section only: the water, hull and deckhouse are kept out of the merge (`userData.keep=1`) and handles are stored (`MAPS.docks.water, shipParts, neon, lampM, poolMesh`). If the life file is missing the docks look exactly as before.
- `game/src/04c_foundry.js`: handles stored (`MAPS.foundry.neon, lampM, poolMesh`). Nothing else.
- `game/js/ironhowl4.js` is the rebuilt bundle.

## Things to know, and what I was not happy with
- The ship's deckhouse moved 5 m aft and is a quarter narrower, so the first crane has a clear hold to work over.
- The foundry channels were extended 14 m to the side walls (flat on the ground like the old channel, no collider). Sparks from a pour and steam can drift a few metres into the edge of the yard; they are only particles.
- The brief suggested `sVent()` for the steam. I used the same hiss made quieter with distance, without the thump, because `sVent()` is the Wraith's own vent sound and at full volume every few seconds it would be confused with it.
- I added two quiet sounds: the pour hiss (only within 80 m) and the three-note yard horn when the alarm starts. Easy to remove if unwanted (search `nz(` and `tone(` in `04j_life_foundry.js`).
- From the docks spawn the cranes and ship are 180 m away in the fog, so the crane work shows as pale shapes with lights; it reads properly from the middle of the yard onward. The water can only be seen at the quay, mostly at its west and east ends, because the ship fills the middle.
- The ladle buckets are dark against a dark sky. Their glowing loads and the pours read well; the buckets themselves less so.
- Lamp stutter at sunset is subtle (only the lamp head dims; there are no light pools then). At night it is clear.
- The test browser runs at a frame every few seconds, so I checked motion by stepping the life clock by hand between pictures; I have not watched it at real speed on a phone. Speeds and timings (crane cycle, pour every 20 s or so per ladle, beacon spin) may want tuning by eye.
- Not tested: mission 11's cleared crane yard and the Endless docks/foundry variants (same build code, so I expect no difference).
