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
