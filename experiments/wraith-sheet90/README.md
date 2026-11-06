# The Wraith experiment (sheet 90)

Christopher's idea: make the Wraith look much more like its concept sheet, then print the sheet itself onto the model.
Every version stays, labelled, and opens from the W1 / W2 / W3 row in the model bay.

| Version | What it is | Outline overlap with sheet 90 (front / side / back) |
|---|---|---|
| W1 | the first build (`models/classes/wraith/`) | 64% / 62% / 58% |
| W2 | remade: about 90 measurements nudged automatically until the outline matched the sheet best (`models/classes/wraith2/`) | 82% / 79% / 81% |
| W3 | W2's combat model with sheet 90 painted onto it (`models/classes/wraith3/`) | (W2's shape) |
| W4 | W2's combat model with ChatGPT's repaint of the guide pictures painted onto it | waiting for the pictures |
| W5 (maybe) | the same painting on the full model | not started |

## Pictures
- `W1_board.jpg`, `W1_outline.png`: the first build against the sheet
- `fit_start.png`: the outline before fitting (combat shapes, one shared scale)
- `../../models/classes/wraith2/W2_outline_fit.jpg`, `W2_board.jpg`: after fitting
- `../../models/classes/wraith3/W3_view.jpg`: the sheet painted on
- `guide/`: the three guide pictures for ChatGPT (1024 x 1536, 212 px per metre), their outlines, the mapping (`wraith2_guide.json`) and `CHATGPT_PROMPT.md`

## Limits found
- The sheet only shows one side, so the other side is painted from it mirrored (the 09 is flipped back so it reads right).
- The sheet's lighting is part of the paint, so W3 looks darker and grittier than a clean texture would.
- Where the model's parts sit differently from the drawing (behind the shoulder, under the arms), the paint lands on the wrong part. W2's tighter outline keeps this small, and W4 avoids it because ChatGPT paints over the model's own outline.
