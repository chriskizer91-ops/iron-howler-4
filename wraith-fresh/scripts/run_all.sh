#!/usr/bin/env bash
# Rebuild the fresh Wraith model end-to-end from the reference sheet.
#
#   python -m venv .venv && .venv/bin/pip install bpy==5.2.3 numpy scipy scikit-image shapely pillow opencv-python-headless
#   PY=.venv/bin/python ./wraith-fresh/scripts/run_all.sh
#
# Blender runs headless through the `bpy` module (no Blender install needed).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(dirname "$HERE")
PY=${PY:-python}
SHEET=${SHEET:-$ROOT/reference/90_Wraith_Recon-Support.png}
WORK=${WORK:-$ROOT/build}
TEX=${TEX:-4096}
mkdir -p "$WORK" "$ROOT/models" "$ROOT/textures" "$ROOT/renders"

echo "== 1. silhouettes + per-part profiles"
$PY -I "$HERE/profiles.py" "$SHEET" "$WORK" export
$PY -I "$HERE/profiles.py" "$SHEET" "$WORK"                 # overlay_front/side.png (lasso check)
echo "== 2. blank hard-surface model"
$PY -I "$HERE/build_model.py" "$WORK/profiles.json" "$WORK/wraith_blank.blend" 6
echo "== 3. silhouette match vs sheet (IoU)"
$PY -I "$HERE/render_check.py" "$WORK/wraith_blank.blend" "$WORK/masks4x.npz" "$WORK"
echo "== 4. bake prep: join, UV, position/normal/colour bakes, per-view position maps"
$PY -I "$HERE/prep_bake.py" "$WORK/wraith_blank.blend" "$WORK/bake" "$TEX"
echo "== 5. project the sheet onto the UV texture"
$PY -I "$HERE/project_bake.py" "$SHEET" "$WORK/masks4x.npz" "$WORK/bake" "$WORK/bake/wraith_projected.png"
$PY -I "$HERE/apply_texture.py" "$WORK/bake/joined_uv.blend" "$WORK/bake/wraith_projected.png" "$WORK/wraith_projected.blend"
echo "== 6. unlit pixel comparison vs sheet"
$PY -I "$HERE/unlit_compare.py" "$WORK/wraith_projected.blend" "$SHEET" "$WORK/masks4x.npz" "$WORK/unlit"
echo "== 7. exports"
$PY -I "$HERE/export_glb.py" "$WORK/wraith_blank.blend" "$ROOT/models/wraith_blank_before.glb"
$PY -I "$HERE/export_glb.py" "$WORK/wraith_projected.blend" "$ROOT/models/wraith_projected_after.glb"
cp "$WORK/bake/wraith_projected.png" "$ROOT/textures/wraith_projected_${TEX}.png"
echo "== 8. presentation renders"
$PY -I "$HERE/final_renders.py" "$WORK/wraith_blank.blend" "$WORK/wraith_projected.blend" "$SHEET" "$WORK/final" 64
$PY -I "$HERE/compose_sheets.py" "$WORK/final" "$SHEET" "$WORK/unlit" "$ROOT/renders"
echo done
