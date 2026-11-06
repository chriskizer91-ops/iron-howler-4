#!/bin/sh
# FORGE Hound, every step (MODEL-PLAN.md v2.1/v2.2), run from models/fhound/source:   sh tools/make_fhound.sh /path/to/work
# Blender scripts run with python3 -I. Writes the model files one folder up and the boards into ../previews.
set -e
W=${1:-/tmp/fhound}; P=../../../pipeline; A=../../../art/kit-and-foes/E_hound; D=..
mkdir -p $W
# 1. the three views on one sheet at one scale (300 px per metre; the views agree, so no flips)
python3 $P/make_views.py . fhound 2.4 $A/E01_hound_front.png $A/E02_hound_side.png $A/E03_hound_back.png --px 720
python3 tools/spear_fix.py fhound_sheet.png fhound_sheet_print.png
# 2. the traced parts
python3 parts_fhound.py parts.json
# 3. blockout and its board
python3 -I tools/build_v2.py parts.json fhound_sheet.png $W/block.blend --board $W/b
python3 -I tools/v2_board.py $W/block.blend parts.json fhound_sheet.png $D/previews/1_blockout.jpg "FORGE Hound - blockout"
# 4. large model, blank
python3 -I tools/build_v2.py parts.json fhound_sheet.png $W/full.blend --fine
python3 -I tools/v2_board.py $W/full.blend parts.json fhound_sheet.png $D/previews/2_large_blank.jpg "FORGE Hound - large model, blank"
# 6. print (no sharper pictures needed: the HD views are the pictures)
python3 -I $P/v2_print.py $W/full.blend print.json $W/print fhound 2048
python3 -I tools/v2_board.py $W/print/fhound_uv.blend parts.json fhound_sheet.png $D/previews/3_large_printed.jpg "FORGE Hound - large model, printed" --tex $W/print/fhound_albedo.png
# 7. combat model and bake
python3 -I tools/build_v2.py parts.json fhound_sheet.png $W/lo.blend --lo
python3 -I $P/v2_bake.py $W/print/fhound_uv.blend $W/print/fhound_albedo.png $W/lo.blend $W/combat fhound 2048
# 8. export
python3 -I $P/v2_export.py $W/print/fhound_uv.blend $W/full.glb
python3 -I $P/glb_quant.py $W/full.glb $D/fhound_full.glb
python3 -I $P/glb_quant.py $W/combat/fhound_combat.glb $D/fhound_combat.glb
cp $W/print/fhound_albedo.png $D/fhound_full_print.png; cp $W/combat/fhound_albedo.png $D/fhound_combat_albedo.png; cp $W/combat/fhound_normal.png $D/fhound_combat_normal.png
cp ../../wraith-v2-hd/wraith_v2_combat_orm.webp $D/fhound_combat_orm.webp
python3 -c "
from PIL import Image
for a, q in (('fhound_full_print', 88), ('fhound_combat_albedo', 88), ('fhound_combat_normal', 92)): Image.open('$D/' + a + '.png').convert('RGB').save('$D/' + a + '.webp', quality=q, method=6)"
# for the model bay and the walk test: gzip + base64 parts
mkdir -p $W/bay; python3 -I $P/pack.py $D/fhound_full.glb $W/bay/fhound_full; python3 -I $P/pack.py $D/fhound_combat.glb $W/bay/fhound_combat
