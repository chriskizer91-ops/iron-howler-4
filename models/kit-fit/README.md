# Kit fit checks on the Wraith (session 1)

`fit_ac_arc_mpod.jpg` (6 Nov): Wraith V2 HD with the AC-4 autocannon (tier IV) on the left forearm (`fa_L`), the AR-1 Arc's
right-arm twin on `fa_R` and session 2's MP-9 missile pod on the left shoulder (`sh_L`). Each piece's `mount` empty is put
on the Wraith's mount of the same kind; nothing was moved by hand. The single fits are in each item's `previews/fit.jpg`.

```
python3 -I pipeline/fit_check.py <wraith print uv.blend> <wraith albedo.png> out.jpg \
  ac_uv.blend:ac_albedo.png:fa_L:t1_,t2_,t3_  arR_uv.blend:arR_albedo.png:fa_R  mpod.blend:mpod_full_print.png:sh_L
```
`glb2blend.py` turns another session's GLB into a .blend for the fit check (`python3 -I glb2blend.py in.glb out.blend`).
The rest (Watcher, jet pack, drone) gets added as session 2 finishes them.
