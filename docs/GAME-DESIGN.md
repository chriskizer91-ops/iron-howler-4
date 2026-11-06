# Ironhowl 4 — game design document

Nov 6, 2026 · @Chris

## Overview

Ironhowl 4 is an upgrade of Ironhowl 3: a third-person mech shooter that runs in the browser on a phone (Pixel 7a) and a laptop (MSI, Edge). It is set in 2176, 50 years after Ironhowl 3 (2126). You pilot the Wraith against FORGE's unmanned machines, one mission at a time, and spend salvage on upgrades between missions.

The loop (repeats every mission, as in Ironhowl 3):

1. **Intel brief:** the foes headed your way, shown as turnable full-detail models with their specs ("10 Skitters headed your way").
2. **Mission:** walk, hop and hover through a map, clear its objectives, with Rook on the radio.
3. **Salvage:** wrecks drop scrap and pickups.
4. **Upgrade bay:** fit and upgrade kit on the full-detail Wraith and read its spec sheet, then the next brief.

Controls (from Ironhowl 3): left thumb moves, right thumb aims, JET and SALVO buttons; mouse and keys on a laptop.

Story direction (chosen 6 Nov): someone is steering FORGE. The machines are still FORGE's and still unmanned, but a company or a person has taken over its factories and uses them as a private army. The game opens with the salvage rush: you guard crews digging in FORGE's old 2126 zones, and slowly find out who is waking the machines. Names, characters and the villain are still to be worked out.

## The player mech: Wraith

The Wraith (sheet 90, recon support) is the only mech the player can pick. Other mechs may come after everything else is done; the kit is interchangeable so it would fit them too.

- Size: 6.6 m tall with the antenna, 4.0 m across the arms, 2.7 m deep.
- Models: full 949,948 triangles (upgrade bay), combat 7,464 (in game). Done: `models/wraith-v2-hd/`.
- Starting numbers carried over from Ironhowl 3: hull 100, shield 60 (comes back 3 s after the last hit), autocannon tier I, 12 missiles, 2 jet fuel cells.
- Movement: walk and run (feet planted, as in the walk test), jet hop (tap about 30 m, hold about 55 m in Ironhowl 3), and new in Ironhowl 4 a jet hover of about 30 s, to be balanced.

| Mount | Where on the Wraith | Space there | Holds |
| --- | --- | --- | --- |
| fa\_L, fa\_R | outer side of each forearm | forearm 1.4 m long, 0.9 m wide, 1.2 m tall | a forearm weapon |
| sh\_L, sh\_R | on top of each shoulder pad, 5.7 m up | pad 0.75 m wide, 1.1 m long | a shoulder module |
| bk | the back dock, 4.9 m up | 1.5 m wide, 1.5 m tall | a back module |
| drone dock | on top of the back module | about 0.8 m | the assist drone |

## Weapons and upgrade kit

The first kit set is seven pieces, all interchangeable, made from scratch from new ChatGPT images (proposed; change any of it). Each one also gets an armory-book spec card: range, damage, rate, lock-on time, guidance (none, heat-seeking, laser-guided or fire-and-forget).

| Kit | Mount | What it does | What upgrading improves |
| --- | --- | --- | --- |
| Autocannon, tiers I–IV (1 to 4 barrels) | forearm | the main gun; builds heat, vents when hot (as in Ironhowl 3) | tier, damage, cooling |
| Lance rail cannon | forearm | hold to charge, one long-range shot that pierces | charge time, damage, pierce |
| Arc projector | forearm | short-range lightning that jumps between nearby machines (for swarms) | jumps, range, damage |
| Missile pod | shoulder | SALVO: auto-aimed missiles at the nearest machines, even behind you | missiles per salvo, ammo, recharge |
| Watcher sensor pod | shoulder | AI assist: radar, marks targets, faster missile lock, warns of incoming fire | radar range, lock time, extra assists |
| Jet pack | back | jet hops and the 30 s hover | fuel cells, hover time, stomp landing |
| Assist drone | follows you, docks on the back | small gun, marks targets, repairs between waves | gun, repair, its own shield |

Upgrades with no model of their own, from Ironhowl 3: hull, shield and cooling.

How upgrading works (Ironhowl 3, kept): wrecks drop scrap; each upgrade track has 5 levels costing 150, 300, 500, 800 and 1,200 scrap. New in Ironhowl 4: pilot levels unlock new kit and AI assists. Pickups in missions (Ironhowl 3): gun chip (one tier up for the mission), repair, shield, missiles, fuel.

Left for later, from sheets 91–95: Talon claws, Furnace flamer, Hammer, Longtooth, Storm-12, Sentry, Thunderspine, Swarm, Veil, Glacier, Bulwark shield, Ghost, Mender and Root.

## Foes

Three FORGE machines, made from scratch from new ChatGPT images: Skitter, Hound and Gunner. They are unmanned. They share one look: charcoal armour worn through to red primer, glowing red eyes, FORGE's gear-and-eye emblem.

| Foe | Size | How it fights | Ironhowl 3 numbers (hit points, speed m/s, scrap) | Kit |
| --- | --- | --- | --- | --- |
| Skitter | about 1 m tall, 1.9 m across | swarm; rushes in and zaps at close range | 30, 9.5, 5 | spawner pod that keeps printing Skitters until destroyed |
| Hound | 2.4 m tall, 4.5 m long | fast four-legged pack hunter; charges in a straight line, leaps | 95, 8.2, 15 | built in: jaw, tail spike |
| Gunner | about 5 m tall, two legs | heavy; keeps its distance, heavy arm cannon plus twin rotary guns | 230, 4.6, 35 | built in: arm cannon, rotary guns |

Intel brief: before each mission the foes coming are shown as full-detail models turning in a HUD panel, with their spec cards and how many are coming; no timer. A foe's card goes into the armory book the first time you beat one.

**Bosses:** each boss is one of the three foes made bigger, recoloured and changed in one way. That needs no new images, and each is easy to change. The recolour is a tint on the printed paint, set in code. Proposed:

| Boss | Made from | Size in game | The one change | Colour |
| --- | --- | --- | --- | --- |
| Gunner Prime | Gunner | ×1.8, about 9 m tall | the heavy cannon on both arms (the right arm mirrored onto the left) | bone white, red lights |
| Alpha Hound | Hound | ×1.7, about 4 m tall | horns and spine blades twice as big | rust red |
| Brood Skitter | Skitter | ×3, about 2.7 m tall | a spawner pod on its back that keeps printing Skitters | black with glowing red seams |

Ironhowl 3's other machines (Hornet, Lancer, Bulwark, Tank, Mortar) may come back later, after a look at concept boards (`art-requests/IH4_CONCEPT_BOARDS_REQUEST.md`).

## Missions and levels

Ironhowl 3 had 12 missions across four places, plus an Endless mode; Ironhowl 4's missions will be new, so this is for reference. Mission steps in Ironhowl 3: destroy targets, reach a spot, clear an area, hold a spot for a time, escort Rook's truck, capture points, and boss fights, with checkpoints between steps.

| # | Ironhowl 3 mission | Place | Goal |
| --- | --- | --- | --- |
| 1 | Sunline | farm fields | destroy three relay masts, meet Rook at the truck |
| 2 | Night Shift | docks, night | get through the container yard, cut the gate controls |
| 3 | Pinewall | pine woods | find the lost convoy, guard Rook for 60 s |
| 4 | Hold the Farm | fields, dusk storm | hold the farmhouse for 2.5 minutes |
| 5 | Container Maze | docks, rain | destroy four spawner pods |
| 6 | Creekbed | woods, fog | escort Rook's truck to the south road |
| 7 | Dust Devil | dry fields | boss: the Thresher (knees, then core) |
| 8 | Tanker Run | docks, sunset | cut three mooring winches; Lancers |
| 9 | Burning Pines | woods on fire, night | Hornets, then the Stag (antler pods, then chest) |
| 10 | Storm Front | fields, storm | capture three relays; lightning hits machines too |
| 11 | Lockdown | docks, night siege | knock out three searchlight towers, then the Maw |
| 12 | Heart of the Forge | the foundry | four shield pylons, the furnace, then FORGE's eye |

Endless (Ironhowl 3): waves that keep getting harder; every 5th wave is heavy, every 10th brings the place's boss, supplies drop between waves.

## Screens

Four screens, kept uncluttered for a phone:

- **Upgrade bay:** the full-detail Wraith, turnable. Tap a mount (forearm, shoulder, back, drone) to swap or upgrade its kit; its spec card shows beside the model, with the numbers before and after.
- **Armory book:** a card for every piece of kit and every foe beaten, like the jet and tank books (range, damage, top speed, armour).
- **Intel brief:** before each mission, the foes coming as full-detail models turning in a HUD panel, with counts and specs; no timer.
- **Mission HUD (Ironhowl 3, kept small):** top left shield, hull, jets, gun tier, missiles; top middle score; crosshair with the gun's heat. New: hover fuel and the drone's state.

## Art and models

Every model is made the Wraith V2 HD way (`MODEL-PLAN.md` in the repo):

1. ChatGPT makes a character sheet, then sharp front, side and back views.
2. The shape is traced from those views.
3. The views are printed onto the full model as its paint.
4. That is baked onto a light combat model.

Every model is done (6 Nov); the numbers are the real triangle counts. All of them are in one offline file each: ironhowl4\_game\_models\_full.html (full and combat) and ironhowl4\_game\_models\_light.html (combat only, for the phone).

| Asset | Full model | Combat model | Status |
| --- | --- | --- | --- |
| Wraith | 949,948 | 7,464 | done (re-printed 6 Nov) |
| Autocannon (tiers I–IV in one model) | 79,988 | 1,510 | done, left and right arm |
| Lance | 79,990 | 1,512 | done, left and right arm |
| Arc | 79,984 | 1,902 | done, left and right arm |
| Missile pod | 89,994 | 1,854 | done |
| Watcher | 79,990 | 1,901 | done |
| Jet pack | 99,986 | 1,936 | done |
| Assist drone | 69,994 | 1,808 | done |
| Gunner (and Gunner Prime) | 949,952 | 8,098 | done |
| Hound (and Alpha Hound) | 899,956 | 7,570 | done |
| Skitter (and Brood Skitter) | 299,974 | 1,986 | done |
| Spawner pod | 149,992 | 1,792 | done |

The image request for ChatGPT, 40 images in one zip, is `art-requests/IH4_KIT_AND_FOES_IMAGE_REQUEST.md` in the repo. Models are checked in the [model bay](https://claude.ai/artifact/LTv46FVbWAPFW3pyy3L2Mr) and walkers in the [walk test](https://claude.ai/artifact/YNRKCwkntMSmoMF5EcH5DL).

Places (the environments) get remade later, probably by another Claude chat, using Ironhowl 3's maps as the starting point. Concept boards of possible places are in the concept-board request.

## Open questions for Christopher

- [x] First kit set: autocannon, Lance, Arc, missile pod, Watcher, jet pack, assist drone (confirmed 6 Nov; images being made).
- [x] Bosses: yes, as bigger, recoloured foes with one change (6 Nov). The three above are proposals.
- [x] Other Ironhowl 3 machines: maybe later, after concept boards.
- [x] Missions: new ones.
- [ ] Story: direction chosen (someone is steering FORGE, opening with the salvage rush); the villain, Rook's role and the pilot are still open. The three directions were:
  - **FORGE's backup wakes up.** Ironhowl 3 ended with FORGE's eye broken at Foundry 4. In 2176 a buried copy of FORGE wakes, and its factories print a new generation: the Gunner, the Hound and the Skitter.
  - **Someone is steering FORGE.** The machines are still FORGE's and still unmanned, but a company or a person has taken over its factories and uses them as a private army. That gives the story a human villain to unmask.
  - **The salvage rush.** FORGE's 2126 wrecks are worth a fortune, and crews dig in the old zones, until the wrecks start waking up. You protect the crews, and the scrap you earn is the story's own currency.
- [ ] Levelling: what does a pilot level unlock (kit, AI assists, drone abilities), and how many levels?
- [ ] Hover: 30 s per full tank to start, tuned in play?
