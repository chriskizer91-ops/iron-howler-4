# Wraith W4: repaint pictures for ChatGPT

Three guide pictures of the remade Wraith (W2), at an exact, known scale:

- `wraith2_front.png`: the front
- `wraith2_side.png`: the left side, facing left
- `wraith2_rear.png`: the back

Each is 1024 × 1536 (portrait, 2:3). Claude paints the pictures ChatGPT returns back onto the combat model, so each returned
picture has to keep the mech in exactly the same place, at the same size, in the same pose.

## How to run it in ChatGPT

1. Start one new chat, so all three views get the same paint.
2. Upload `90_Wraith_Recon-Support.png` (the style to copy) and `wraith2_front.png`. Paste the prompt below.
3. When the front comes back, upload `wraith2_side.png` and say: "Same again for this side view, same paint as the front."
4. Then upload `wraith2_rear.png` and say: "Same again for this back view."
5. Pick portrait (2:3) if it asks for a size. Download all three and send them to Claude.

## Prompt (paste with the first picture)

> Repaint the mech in the second image (the grey-background render) in the style, colours and level of detail of the
> first image (the Wraith concept sheet). This is a texture paint-over, not a redesign:
>
> - Keep the mech's outline, pose, proportions and every part exactly as they are in the render. Do not move, resize,
>   add or remove anything. Its feet stay on the same spot and its head reaches the same height.
> - Same camera: flat-on, no perspective, same framing. Output the same size and shape (portrait 1024 × 1536).
> - Plain, even, light-grey background with no floor shadow, text, labels or border.
> - Soft, even, front-on studio light: no strong shadows and no dramatic rim light.
> - Paint scheme from the sheet: orange armour plates with worn edges and white diagonal stripes, a charcoal and gunmetal
>   frame, amber glowing lights and visor, and the number 09 in white on the chest and shoulder plates.
> - Add panel lines, bolts, scratches and small markings on the existing surfaces only.

## What Claude does with them

The pictures get lined up with the guide (it measures any small shift or size change ChatGPT made), then painted onto
W2's combat model. The result is W4, which opens from the W1 / W2 / W3 / W4 row in the model bay.
