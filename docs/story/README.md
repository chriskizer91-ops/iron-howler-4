# Ironhowl 4 · story (8 Nov 2026)

Christopher: "the thing that feels off is the story in between combat … It can be like text and images … I want you to
be the artist", with the plot worked out by several agents together. Chapter 1 now has story scenes (a still picture +
lines tapped through) before, between and after each mission's fights.

How it was made: three writers pitched (`pitch_A_mystery.md`, `pitch_B_heart.md`, `pitch_C_world.md`); Claude merged them
into `BIBLE.md` (the story: "Always Do"); a scene writer wrote `ch1_scenes.json`; an art director wrote `IMAGE_PROMPTS.md`;
a fresh critic reviewed (`CRITIC_NOTES.md`, all 19 edits applied). `BRIEF.md` is what every agent started from.

- Game side: `game/src/06o_story.js` (the scene player), `game/src/06p_story_text.js` (the words, generated).
- Change the words: edit `ch1_scenes.json`, then `python3 game/tools/story_build.py docs/story/ch1_scenes.json > game/src/06p_story_text.js`
  and `python3 game/tools/story_script.py docs/story/ch1_scenes.json > docs/story/ch1_script.md`, then `python3 game/build.py`.
- Pictures: all 20 arrived 8 Nov (originals and the 6 character sheets in `art/story-chapter1/`); the game uses webp copies
  in `game/art/story/<id>.webp`. A scene whose picture is missing shows `ph_<place>.webp`, a shot of its place from the game.
- The doc Christopher uses: https://claude.ai/artifact/JzPRqocp8MoTU2C2Cb4JWi (story, script, and the 26 prompts).
