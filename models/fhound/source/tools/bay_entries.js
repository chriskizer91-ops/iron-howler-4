  /* ---- session 4: the FORGE Hound and its boss, the Alpha Hound (made the Wraith V2 HD way: traced from E01-E03, printed, baked).
     Bosses reuse the foe's files: bigger, tinted, and one change made here in code. ---- */
  fhound:{label:'HOUND',sub:{full:'FORGE HUNTER · FULL DETAIL',combat:'FORGE HUNTER · COMBAT (BAKED)'},acc:'#ff4a3d',ty:1.15,dist:9.2,grp:'foe',vl:'HOUND',paint:'fhoundf',
    parts:{full:1,combat:1},stance(r){},
    /* boss helper: scale the whole machine by k, grow the named parts by g about the middle of their base, tint the printed paint */
    boss(r,k,names,g,tint){r.scale.setScalar(k);
      r.traverse(o=>{if(!o.isMesh||!names.some(n=>o.name===n||o.name.startsWith(n+'_')))return;
        o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,px=(b.min.x+b.max.x)/2,pz=(b.min.z+b.max.z)/2,py=b.min.y;
        o.geometry.translate(-px,-py,-pz);o.geometry.scale(g,g,g);o.geometry.translate(px,py,pz);});
      Promise.resolve().then(()=>{const done=new Map();r.traverse(o=>{if(!o.isMesh)return;let m=done.get(o.material);
        if(!m){m=o.material.clone();m.color.setRGB(...tint);done.set(o.material,m);}o.material=m;});});}},
  alphahound:{label:'ALPHA HOUND',sub:{full:'BOSS · x1.7 · HORNS AND BLADES x2',combat:'BOSS · COMBAT (BAKED)'},acc:'#ff6a2a',ty:1.95,dist:15.6,size:1.7,grp:'foe',vl:'ALPHA HOUND',
    paint:'fhoundf',src:{full:'fhound',combat:'fhound'},maps:{albedo:'fhound',normal:'fhound',orm:'fhound'},parts:{full:1,combat:1},
    stance(r){MODELS.fhound.boss(r,1.7,['horn_R','horn_L','spine1','spine2','spine3','spine4'],2,[1.75,.78,.55]);}},
