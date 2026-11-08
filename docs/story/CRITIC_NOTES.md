# Ironhowl 4 · Chapter 1 · Editor's notes

**Verdict:** This is strong and close to ready. Each of the 20 scenes adds exactly one new thing. The radio carries the fight and the scenes carry the story, and no scene repeats a radio line. Every mid scene sits at the right step (I checked each `at` against the mission steps). All the bible's fair clues are in and none is explained. Nobody dies, the voice never uses capitals, Rook never says "Jo", and Vane stays a suspect. Every line fits the limits: the longest scene line is 106 characters and the longest radio line is 78. What's left is a short list of surgical fixes, not a rewrite.

## The most important problems

1. **One line gives away the twist's surname.** In M2's closing scene Bess says "the Howell place". Howl and Howell are one letter apart, and a sharp teenager will catch it in mission 2. The bible keeps the Howell name for chapter 2, where Bess recognises the brand. Change it to "the place across the creek" (the bible puts the Howell farm across the creek from the Calloways). The clue stays, and in chapter 2 the reveal clicks backwards ("*that* house") instead of confirming a guess the player already made.

2. **The family is never introduced as a family.** Nothing in chapter 1 tells the player that Bess is Jo's gran or that Pip is Jo's brother, and nobody says Jo's name aloud until mission 4. The bible says this chapter is about protecting the Calloways, but a player skimming on a phone only sees "a big woman" and "a kid". Three small additions fix it: "Jo!" from Pip in the first scene, "Gran" from Jo, and "my kid brother" in mission 4 (edits 2, 3 and 9).

3. **Key words get worn out before their big moments.**
   - "Fifty years" appears 5 times, 3 of them from Rook. Chapter 3's best line, "Fifty years, Danny. You could have written.", needs those words to still land.
   - "Somebody" appears 4 times in mission 6 alone, around the bible's key line "Somebody moved him."
   - Jo's "I find things" comes twice in mission 1. The second time is the bible's own line for Jo, and the first one steals it.
   - Rook dodges an emotional question with "Eyes ___, Wraith" twice (M4, M6).
   - Jo starts 5 lines with "Rook".

   Each of these is fixed by a trim (edits 3, 5, 10, 11, 13, 14, 15).

4. **Some props and pictures don't match the words.** The image prompts will be built from these descriptions, so the mismatches matter:
   - In M6, Rook holds up a *printed* log sheet, and then a new line "crawls onto" it. Make the log a screen (she already has a laptop in M5).
   - Crew 7's dad is missing from both M4 pictures. The closing scene shows only "two kids", and it's the very scene where Jo says nobody's been hurt. A careful player will wonder where Dad went.
   - The M1 mission card says "Meet the crew at the barn", but Jo *is* the crew, and the radio has you meeting Rook. (The step label "MEET THE DIG CREW" in the game code has the same problem; it isn't in the JSON, but it should probably read MEET ROOK.)

5. **M5's mid scene ends on the chapter's flattest line.** "Of course it's there. Of course it is." is vague, and the closing scene does the same dread better ("Fifty years I've stayed away from that gate"). A clipped answer to Jo's "cold since the war" is sharper, and it sets up the lit furnaces in M6.

## Line edits

1. M1 · mission card, line 2 · "Meet the crew at the barn and guard the dig. The Wraith is the only mech they've got." → "Meet Rook at the barn, then guard the dig. The Wraith is the only mech Crew 4 has." · Jo is the crew; the step meets Rook.
2. M1 · opening, picture 2 (`m1_open2`) · PIP "Wolves are done! Same wolves Howl had…" → "Wolves are done, Jo! Same wolves Howl had when he broke FORGE. Now it looks like a real war mech." · tells the player their own name in the first minute.
3. M1 · opening, picture 2 · JO "It's a survey mech, Pip. It finds things." → "It's a survey mech, Pip. Right, Gran?" · leaves "I find things" for the closing scene and shows who Bess is.
4. M1 · opening, picture 2 · BESS "Today it guards things. The co-op's sending a handler out. Calls herself Rook." → "Not today. The co-op's sending a handler out. Calls herself Rook." · answers the new line, and it's flatter, more like Bess.
5. M1 · radio, GUARD THE DIG · ROOK "Those drones have been dead fifty years. Wraith, get in the ring and hold." → "Scrap doesn't twitch. Wraith, get in the ring and hold." · drier, it's proven wrong at once, and it saves one "fifty years".
6. M2 · mid scene · ROOK "Maybe. Hold that thought." → "Maybe. Vane's a crook, but he's a careful one." · replaces a stock phrase; it reads two ways, so the suspicion of Vane survives.
7. M2 · closing scene · BESS "Fair like the Howell place? Your diggers flattened that house in a day." → "Fair like the place across the creek? Your diggers flattened that house in a day." · keeps Howl's surname hidden until chapter 2 (problem 1).
8. M4 · mid scene · ROOK "Howl. Best pilot I ever had. He never came out of Foundry 4." → "Howl. My pilot. He never came out of Foundry 4." · less stock, and "my" says what she lost.
9. M4 · mid scene · JO "Pip copied our wolves off an old poster of him." → "My kid brother copied our wolves off an old poster of him." · the Crew 7 kid doesn't know Pip, and it tells the player who Pip is.
10. M4 · mid scene · ROOK "Pip got the ears wrong. Eyes on the road, Wraith." → "Pip got the ears wrong." · let the best warm line end the scene; the "Eyes ___" dodge is used again at the M6 gate.
11. M4 · closing scene · JO "Rook, that's four fights now. Nobody's been hurt. Not once." → "That's four fights now. Nobody's been hurt. Not once." · one fewer "Rook" opener.
12. M5 · mid scene · ROOK "Of course it's there. Of course it is." → "Not any more." · answers "cold since the war", sets up the lit furnaces, and stays clipped.
13. M6 · mid scene · ROOK "We left him lying here fifty years. Somebody moved him." → "We left him lying here. Somebody moved him." · tighter, and saves "fifty years" for chapter 3.
14. M6 · closing, picture 1 (`m6_close`) · JO "Somebody's brand?" → "A cattle brand?" · a farm kid would know; it helps players who don't know what a brand is; one fewer "somebody".
15. M6 · closing, picture 2 (`m6_close2`) · JO "Rook. Look at the eye. Somebody's stitched the crack with new cable." → "Look at the eye. The crack's been stitched with new cable." · cuts a "Rook" opener and a "somebody".
16. M6 · closing, picture 2 · narration "It flickers red. One more line crawls onto Rook's log, older than the rest. No mark." → "It flickers red. One more line crawls across Rook's screen, older than the rest. No mark." · a line can't crawl onto paper (goes with edit 17).
17. M6 · picture `m6_close` · "holding up a printed log sheet; one small mark stands out on it" → "holding up her battered laptop, the log on its screen; one small mark stands out on it" · matches the M5 laptop and edit 16.
18. M4 · picture `m4_close` · "while two kids climb down beside her" → "while Crew 7's dad lifts his two kids down beside her" · Dad shouldn't vanish in the scene that says nobody's been hurt.
19. M2 · picture `m2_close` · add "and Bess, big with goggles pushed up, stands at the quay's edge with her arms folded" · Vane talks to her face to face ("Mrs. Calloway"), but she isn't in the picture.

All the new lines are within the limits; the longest is edit 2 at 97 characters.

### Smaller notes (no edit needed)
- **Brood Skitter:** the mission 4 boss is never mentioned in any scene or radio line, but Pip counts it in "three big ones down" in M5. The game's boss banner names it on screen, so it's fine. If you want one more laugh, give it a Pip name later.
- **"Copy, Wraith." twice:** the voice's "Copy, Wraith." (M5 radio) is word for word Rook's joke from the M4 opening. It reads like a deliberate clue: the voice talks army and is listening in. Keep it, but know it's there.
- **Lightning:** Rook's "It only hits them" (M5 radio) is true. In the game code, storm strikes damage machines only.
- **Built-in radio lines:** some radio lines live in the game code, outside this JSON: the truck-hit lines ("I am taking hits here!", `game/src/06f_more.js` line 86) and the relay-taken lines ("That is all three!", `game/src/06g_set7.js` line 130). They have no contractions and sound stiffer than the new Rook. Worth a quick pass when the JSON goes in.
- **Mission cards:** a few card lines run 81–86 characters, against about 80 in the version that's built now. That's fine unless the title screen wraps badly on the Pixel.

## What works best

- **Setups that pay off without anyone explaining them.**
  - Pip's "Bet she's never seen wolves like these" → Rook's "Pip got the ears wrong".
  - "Bring it home, Wraith" → Jo's "Bring what home? I'm standing in my own yard" → the M6 run for the gate.
  - Rook's "If he calls you friend, count your fingers" → Vane's "friend".
  - Biscuit → Marshmallow → "Fine, Pip. Biscuit and Marshmallow."

  Both a teenager and a parent get a reward for paying attention.
- **The voice tells on itself through how it talks.** Every UNKNOWN line tells someone to go home, never threatens to hurt anyone, and uses land words ("claimed", "my yards", "copy"). The nobody-dies clue is built into how he speaks, so Rook's "FORGE never let anyone walk" feels like something the player worked out, not a lecture.
- **The M6 gate scene.** It goes: plaque → "I learned every one of their names" → "Is that why I'm Wraith?" → "Eyes front, Wraith. Let's go knock." Four lines carry Rook's whole wound without saying it. The ending echoes it, from seven pilots to a seven lying on its side. Close runner-up: "Silas. You're standing under my hook."
