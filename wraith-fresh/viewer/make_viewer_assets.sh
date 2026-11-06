#!/usr/bin/env bash
# Build the web-viewer assets next to index.html from the full-resolution GLBs.
# Needs node (npx) and the bpy venv python for the reference crops.
#   - Draco geometry (decoded by three.js' pure-JS decoder, no WebAssembly)
#   - 2048² WebP texture for the projected model
#   - GLBs shipped as base64 .txt (artifact hosting serves no .glb)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE"); M="$ROOT/models"
GT="npx -y @gltf-transform/cli@4.1.1"
TMP=$(mktemp -d)
$GT join "$M/wraith_blank_before.glb" "$TMP/b1.glb"
$GT draco "$TMP/b1.glb" "$HERE/before.glb" --method edgebreaker --quantize-position 14 --quantize-normal 10
$GT resize "$M/wraith_projected_after.glb" "$TMP/a1.glb" --width 2048 --height 2048
$GT webp "$TMP/a1.glb" "$TMP/a2.glb" --quality 90
$GT draco "$TMP/a2.glb" "$HERE/after.glb" --method edgebreaker --quantize-position 14 --quantize-normal 10 --quantize-texcoord 14
base64 -w0 "$HERE/before.glb" > "$HERE/before_glb.txt"
base64 -w0 "$HERE/after.glb" > "$HERE/after_glb.txt"
(cd "$TMP" && npm pack three@0.160.0 --silent >/dev/null && tar xzf three-0.160.0.tgz package/examples/jsm/libs/draco/draco_decoder.js \
  && cp package/examples/jsm/libs/draco/draco_decoder.js "$HERE/")
${PY:-python} -c "
from PIL import Image
im = Image.open('$ROOT/reference/90_Wraith_Recon-Support.png').convert('RGB')
for n, (a, b) in {'front': (340, 700), 'side': (790, 1080), 'rear': (1190, 1590)}.items():
    im.crop((a, 0, b, 520)).save('$HERE/ref_' + n + '.jpg', quality=90)
"
echo "viewer assets ready in $HERE (serve the folder over http)"
