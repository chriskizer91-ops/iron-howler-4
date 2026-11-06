# pipeline changes (session 1 keeps this)

- v2.0 (6 Nov 2026): the Wraith V2 HD pipeline, as in MODEL-PLAN.md.
- **v2.1 (6 Nov 2026): ready.** Any item from separate view pictures; see "v2.1" in MODEL-PLAN.md.
  - new `make_views.py`: front / side / back (/ top) pictures onto one sheet at one scale, with `views.json` and an outline mask;
  - `build_v2.py`: reads boxes, mapping and outline from the parts file (`"views"`), joints from `"skeleton"`, mount empties
    from `"mounts"`, triangle budgets from `"target"` / `"lo_target"`, and an optional third (top) outline per part, or the whole item's top outline; the Wraith's sheet path is unchanged
    (rebuilt at the same overlap: 91 / 86 / 83 %);
  - `project_sheet.py` / `v2_print.py`: print from an item's view sheet (`{"views": ...}`), including the top view; a right-side
    picture (`--sideR`) prints on the right side;
  - `sheetfit.py`: a top camera; `v2_board.py`: shows every view the item has, frames any size of item.
- **v2.2 (6 Nov 2026), from the autocannon.** Nothing earlier changes; the Wraith rebuilds the same.
  - `make_views.py`: when a picture sits on one exact background colour (all 34 ChatGPT views do: 200, 200, 202) the outline is
    every pixel that isn't that colour. Session 2 found the old test cut pale paint and bright rims off (0.2–4 % of each
    view; the Lance front loses most). Holes up to 1.5 % of the object (white letters) are filled as paint.
  - `build_v2.py`: `"zfrom": "side"` (whole item or per part) takes heights from the side view when the front view's are wrong
    (the autocannon's barrels).
  - `project_sheet.py`: unseen surfaces of v2.1 items are filled from the nearest printed colour (`"fill": "nearest"`, the
    default for items; the Wraith keeps its family tint). Print time 27 s.
  - new `mirror_item.py`: the left/right twin of an item (mesh, joints and mounts mirrored, faces kept outward).
  - new `fit_check.py`: kit pieces placed on the Wraith at their mounts, rendered from three angles.
  - `v2_board.py`: model tiles sized and framed from the model, the tile background matched to the sheet.
  - `project_sheet.py`: an `unmirror` box can name its view as a 5th entry (`[x0, y0, x1, y1, "front"]`), for lettering on a
    front or back picture that was flipped (the Lance, the Arc). Boxes without it work as before (the mirrored side).
- **v2.3 (6 Nov 2026), for the game files and the Wraith re-print.**
  - `project_sheet.py`: the nearest-colour fill takes colour only from the same part (session 3's change: a hidden flank is
    filled from its own part, not from a light beside it); any print can ask for it with `"fill": "nearest"` (the Wraith's
    `print.json` now does; session 2's pieces keep `"fill": "tint"`).
  - new `game_pack.py` + `web/game_models_template.html`: one self-contained HTML file with every model the game uses
    (full + combat, or `--light` combat only), opened straight from the disk, no internet needed.
