# Ironhowl 4: who builds what (parallel sessions)

Christopher runs up to four Claude sessions at the same time. Each one builds its own pieces from the same pictures, the
way `MODEL-PLAN.md` describes, and saves them to this repo. **All 40 pictures are already in the repo, in `art/kit-and-foes/`**
(6 character sheets and 34 HD views, with `README.txt` and `contact_sheet.jpg`). Nobody needs the zip. Wraith V2 HD (`models/wraith-v2-hd/`) is the standard to match.

## The split

| Session | Builds | Pictures (in `art/kit-and-foes/`) | Model bay ids |
| --- | --- | --- | --- |
| **1** (the first chat; owns `pipeline/`, `STATUS.md`, `MODEL-PLAN.md` and the design document) | **pipeline v2.1** (done), then the forearm weapons: autocannon tiers I–IV, Lance, Arc, plus a fit check of the kit on the Wraith | A00–A09 | `ac`, `lance`, `arc` |
| **2** | shoulder and back modules: missile pod, Watcher, jet pack; then the assist drone, docked and flying | B00–B09, C00–C04 | `mpod`, `watcher`, `jetpack`, `drone` |
| **3** | the Gunner, then its boss **Gunner Prime**, then the spawner pod | D00–D03, F05–F06 | `fgunner`, `gunnerprime`, `spod` |
| **4** | the Hound and its boss **Alpha Hound**, then the Skitter and its boss **Brood Skitter** (which wears session 3's spawner pod) | E00–E03, F00–F04 | `fhound`, `alphahound`, `fskitter`, `broodskitter` |

With only three sessions: session 1 also does the drone, session 2 also does the Gunner and spawner pod (Gunner Prime too),
and session 3 does the Hound and the Skitter with their bosses.

The old ids `gunner`, `hound` and `skitter` belong to the archived models, so don't reuse them.

## Paste this into each new session (change the number)
> You're session 2 of the Ironhowl 4 build. Clone the GitHub repo chriskizer91-ops/iron-howler-4 and read SESSIONS.md and
> MODEL-PLAN.md. Your pictures are already in the repo in art/kit-and-foes/. Build your pieces and follow the rules in SESSIONS.md.

## Rules for every session
1. **Read `MODEL-PLAN.md` first.** It covers the method, the commands and the checks. Christopher can't code, so explain in plain
   words, prove each step with screenshots and simple numbers, and keep phone screens uncluttered.
2. **Images:** `art/kit-and-foes/<group>/` (`A_wraith_forearm`, `B_wraith_shoulder_back`, `C_drone`, `D_gunner`, `E_hound`,
   `F_skitter`). Read `README.txt` first. It gives each item's real size in metres (width × length × height) and the pixel scale
   ChatGPT used for each item's views. Don't change these files.
3. **Check each item's views agree before tracing.** The request had a left/right slip: it asked for the forearm weapons'
   clamp on the wrong side in the front and back views, and the jet pack's side view the wrong way round. If a front or back
   view is the mirror image of what the side view shows, flip it. If a side view shows the right side instead of the left,
   print it as the right side (`sideR`). Note what you did in your status file.
4. **Pipeline v2.1 is ready.** Follow the "v2.1" section of `MODEL-PLAN.md`: `make_views.py` puts an item's separate view
   pictures on one sheet, and the parts file holds its joints, mounts and triangle budgets. Read `pipeline/CHANGELOG.md` after every pull.
5. **Stay in your own folders:** `models/<item>/` (model files, `source/`, `previews/`) for each piece you build. Don't edit other
   sessions' folders.
6. **`pipeline/` belongs to session 1.** Don't edit its files. If you need a change, copy the tool into
   `models/<item>/source/tools/`, change it there, and say so in your status file. Session 1 lists every pipeline change in
   `pipeline/CHANGELOG.md`, so pull and read it before each build.
7. **git:** run `git pull --rebase` before every commit. Make small commits, push to `main`, and never force-push or rewrite history.
8. **Project notes:** only session 1 edits `STATUS.md`, `MODEL-PLAN.md` and the design document. Every other session keeps its
   own project doc, `ironhowl4/SESSION-<n>.md`, covering what's done, the numbers, the links and any problems.
9. **Model bay** (https://claude.ai/artifact/LTv46FVbWAPFW3pyy3L2Mr, shared):
   - Read its live version and `index.html` first, add only your own entries in `MODELS`, then publish with that version.
     If it's refused because someone published in between, read it again and redo your change.
   - Kit entries get `grp:'kit'` and foes and bosses `grp:'foe'`, each with a short `vl` label (for example `vl:'LANCE'`).
     The first entry in a group also adds its button to the chassis row: `<button data-m="<id>">KIT</button>` or `FOES`.
     The group's pieces then show in the small row above it, as the Wraith versions do.
10. **Sizes:**
    - kit pieces: 60,000–100,000 triangles full, under 2,000 combat;
    - Gunner and Hound: 700,000–1,000,000 full, 5,000–10,000 combat;
    - Skitter: about 300,000 full, under 2,000 combat;
    - spawner pod: about 150,000 full, under 2,000 combat.

    Bosses get no new model files. A boss is a model bay entry that reuses the foe's files, scaled up, tinted, with its one
    change done in code (see the design document).
11. **Joints and mounts:**
    - Each kit piece has one empty called `mount` where it meets the Wraith: the forearm saddle `fa`, shoulder socket `sh`,
      back dock `bk`, or for the drone the drone dock. It's turned the same way as the Wraith's mount. On `fa`, +y runs along
      the forearm toward the muzzle and +z points out of the saddle.
    - Foes keep joints for walking, with every joint at zero rotation in the standing pose:
      - Gunner: `hips`, `thigh/knee/ankle_L/R`, `torso`, `arm_L/R`, `muzzle_L/R`;
      - Hound: `body`, `head`, `jaw`, `leg/knee/hock/paw` for FL, FR, BL and BR, and `tail0..n`;
      - Skitter: `body`, `leg0..3`, `knee0..3`, `foot0..3`.
12. **Check-ins with Christopher, as with the Wraith:** the blockout board first, then the large model blank, then printed, then the
    combat model with a phone screenshot. Walkers also get a walk test.
13. **Commits end with:**
    ```
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    ```
