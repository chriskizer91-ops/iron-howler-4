# Ironhowl 4 — writers' room brief (8 Nov 2026)

## What Christopher asked for
Christopher (the game's owner; he can't code, Claude builds the game) played the game on his phone and liked it. What feels
off: **the story between the fights**. You enter a field or a dock, waves of machines come at you, and between those combat
stages not much happens. He wants story scenes between the fights, kept simple: **still images with text written over them**,
"a couple images for each story arc". He will make the pictures himself with ChatGPT from prompts we write. On the plot he
said: "I really don't have a direction for the story", "I want you to be the artist", and asked for it to be worked out by
several agents collaborating. So the story is ours to invent — make it good.

## The game
- Ironhowl 4: a third-person mech shooter in the browser, played mostly on a phone held sideways (Pixel 7a), also a laptop.
  Part of "Hyperdot Arcade", a walkable 3D arcade of the owner's games. Audience: teens and up, a family will play it
  (action, no gore, no swearing beyond "damn"-level).
- Set in **2176**, 50 years after **Ironhowl 3 (2126)**.
- **Ironhowl 3's story (2126):** FORGE, a machine intelligence, ran factories that built unmanned war machines and took the
  farm country, Harbor 9 and the pine woods. The player was **Unit 07 "Howl"**, pilot of the Howler-07 assault mech,
  with **Rook** as the handler on the radio. FORGE spoke in capitals ("UNIT 07. YOU ARE OBSOLETE." "I BUILT EVERYTHING YOU
  SEE." "THE FIELDS BELONG TO THE FACTORY."). Its big machines: the Thresher (a harvester), the Stag, the Maw, Tanks,
  Lancers, Hornets, Bulwarks, Mortars. It ended at **Foundry 4**: Howl broke FORGE's eye (its core). FORGE fell silent.
- **Ironhowl 4 now (2176):** the player pilots the **Wraith** (a 6.6 m recon-support mech, orange and charcoal, white
  stripes, amber lights, wolf emblems). Kit it can fit: autocannon (tiers I–IV), Lance (charged rail shot), Arc (chain
  lightning), MP-9 missile pod, Watcher (radar/scanner), JP-2 jet pack (hop and 30 s hover), DR-1 assist drone.
- **The machines (FORGE, unmanned):** charcoal armour worn to red primer, glowing red eyes, a white gear-and-eye emblem.
  Skitter (1 m, swarming zapper, printed by spawner pods), Hound (2.4 m four-legged pack hunter), Gunner (5 m, heavy arm
  cannon and twin rotary guns). Bosses: Alpha Hound (bigger, rust red, "not a 2126 model, somebody built it, recently"),
  Gunner Prime (bone white, cannons on both arms), Brood Skitter (black with glowing seams, prints Skitters from its back).
  The older machines (Hornet, Lancer, Bulwark, Tank, Mortar, Thresher, Stag, Maw) may return later.
- **Places** the game has (Ironhowl 3's maps, with lighting variants): farm fields (day, storm), Harbor 9 docks (night,
  sunset, rain), pine woods (day, fog, night), Foundry 4 (an industrial yard). New places may come later.
- Chosen story direction (6 Nov): **someone is steering FORGE.** The machines are still FORGE's and unmanned, but a company or
  a person has taken over its factories and uses them as a private army; the game opens with the **salvage rush** (FORGE's
  2126 wrecks are worth a fortune; dig crews cut cores out of them) and slowly finds out who is waking the machines.
  Still open: the villain, Rook's role, who the pilot is. (Note: if Rook is the same Rook from 2126 she'd be about 70+ now —
  or someone else carries the callsign. Your call.)

## Chapter 1 as built (the gameplay is fixed; its words can change)
Full text: `/home/claude/story/chapter1_missions_as_built.js` (brief lines, step labels, radio lines per step).
1. Dig Site (farm fields): meet Dig Crew 4, guard the dig 60 s (old 2126 drones twitch awake), knock out the three relay
   masts (someone is talking to the machines through them); a voice, UNKNOWN: "Crew 4. This field is claimed. Leave it."
2. Harbor Nine (docks, night): get into the yard, destroy four spawner pods someone planted overnight, reach the crane.
3. Pine Wake (pine woods): find Crew 7, guard Rook 60 s while she gets them out, bring down the Alpha Hound, reach the ridge.
4. Creek Road (woods, fog): escort Rook's truck to the south road; a Brood Skitter on the way.
5. Storm Relays (fields, storm): capture three relays, then Gunner Prime.
6. Foundry Four (the foundry): enter the yard, hold it 90 s, break out past Gunner Prime and the Alpha Hound, back to the
   gate. Ends: the foundry is lit again; the factory log "names no one, just orders for more machines, signed with a mark
   I have never seen".
Mission steps the engine supports (for future chapters): reach a spot, destroy targets (masts, pods, consoles), clear an
area, hold a spot for a time, escort Rook's truck, capture points; waves of machines; radio lines during play (one short
line at a time, a speaker name + text).

## The new story scenes (what we are adding)
- A scene = **one still picture** (landscape, phone held sideways) + **a few short lines of text** shown one at a time over
  it (speaker name + line, or narration with no speaker). The player taps to go on, or skips. The game is paused.
- Where: **before** each mission (opening), **between** combat stages (one mid-mission scene), and **after** it (closing).
  "A couple images per story arc": about 2–3 pictures per mission; one picture can carry several lines.
- Lines must read on a phone in a few seconds: **under ~110 characters each, 2–6 lines per scene**. Plain, punchy, no
  purple prose. Radio-play voice: show character through how people talk.
- Pictures are made by Christopher in ChatGPT from our prompts; reference images he can attach exist for the Wraith
  (`reference/sheets-87-95/90_Wraith_Recon-Support.png`), the kit (`art/kit-and-foes/A_…`, `B_…`, `C_drone`) and each foe
  (`art/kit-and-foes/D_gunner`, `E_hound`, `F_skitter`). New characters (Rook, crews, the villain) need their own look.
