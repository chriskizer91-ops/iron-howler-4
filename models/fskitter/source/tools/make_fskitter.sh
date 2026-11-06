#!/bin/sh
# FORGE Skitter, every step (MODEL-PLAN.md v2.1/v2.2), run from models/fskitter/source:   sh tools/make_fskitter.sh /path/to/work
# Blender scripts run with python3 -I. Writes the model files one folder up and the boards into ../previews.
set -e
W=${1:-/tmp/fskitter}; P=../../../pipeline; A=../../../art/kit-and-foes/F_skitter; D=..
mkdir -p $W
# 1. the four views on one sheet at one scale (468.9 px per metre), then the top view moved front to back to agree with the side
python3 $P/make_views.py . fskitter 0.9 $A/F01_skitter_front.png $A/F02_skitter_side.png $A/F03_skitter_back.png $A/F04_skitter_top.png --px 422
python3 tools/top_fix.py fskitter_sheet.png fskitter_sheet_fix.png
# 2. the traced parts
python3 parts_fskitter.py parts.json
# 3. blockout and its board
python3 -I tools/build_v2.py parts.json fskitter_sheet_fix.png $W/block.blend --board $W/b
python3 -I tools/v2_board.py $W/block.blend parts.json fskitter_sheet_fix.png $D/previews/1_blockout.jpg "FORGE Skitter - blockout"
# 4. large model, blank
python3 -I tools/build_v2.py parts.json fskitter_sheet_fix.png $W/full.blend --fine
python3 -I tools/v2_board.py $W/full.blend parts.json fskitter_sheet_fix.png $D/previews/2_large_blank.jpg "FORGE Skitter - large model, blank"
# 6. print (no sharper pictures needed: the HD views are the pictures)
python3 -I $P/v2_print.py $W/full.blend print.json $W/print fskitter 2048
python3 -I tools/v2_board.py $W/print/fskitter_uv.blend parts.json fskitter_sheet_fix.png $D/previews/3_large_printed.jpg "FORGE Skitter - large model, printed" --tex $W/print/fskitter_albedo.png
# 7. combat model and bake
python3 -I tools/build_v2.py parts.json fskitter_sheet_fix.png $W/lo.blend --lo
python3 -I $P/v2_bake.py $W/print/fskitter_uv.blend $W/print/fskitter_albedo.png $W/lo.blend $W/combat fskitter 2048
# 8. export
python3 -I $P/v2_export.py $W/print/fskitter_uv.blend $W/full.glb
python3 -I $P/glb_quant.py $W/full.glb $D/fskitter_full.glb
python3 -I $P/glb_quant.py $W/combat/fskitter_combat.glb $D/fskitter_combat.glb
cp $W/print/fskitter_albedo.png $D/fskitter_full_print.png; cp $W/combat/fskitter_albedo.png $D/fskitter_combat_albedo.png; cp $W/combat/fskitter_normal.png $D/fskitter_combat_normal.png
cp ../../wraith-v2-hd/wraith_v2_combat_orm.webp $D/fskitter_combat_orm.webp
python3 -c "
from PIL import Image
for a, q in (('fskitter_full_print', 88), ('fskitter_combat_albedo', 88), ('fskitter_combat_normal', 92)): Image.open('$D/' + a + '.png').convert('RGB').save('$D/' + a + '.webp', quality=q, method=6)"
# for the model bay and the walk test: gzip + base64 parts
mkdir -p $W/bay; python3 -I $P/pack.py $D/fskitter_full.glb $W/bay/fskitter_full; python3 -I $P/pack.py $D/fskitter_combat.glb $W/bay/fskitter_combat
