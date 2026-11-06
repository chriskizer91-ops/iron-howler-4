  /* ---- session 4: the FORGE Skitter and its boss, the Brood Skitter (Skitter x3, black with glowing red seams, a spawner pod on its back).
     The pod is session 3's model (bay id spod): the Brood Skitter wears it as soon as that entry is in the bay. ---- */
  fskitter:{label:'SKITTER',sub:{full:'SWARM DRONE · FULL DETAIL',combat:'SWARM DRONE · COMBAT (BAKED)'},acc:'#ff4a3d',ty:.38,dist:5.6,size:.45,grp:'foe',vl:'SKITTER',paint:'fskitterf',
    parts:{full:1,combat:1},stance(r){},
    /* boss helper: black paint whose red primer and lights glow, and the spawner pod mounted on the shell */
    brood(r,k,pod){r.scale.setScalar(k);
      Promise.resolve().then(()=>{let tris=0;const done=new Map();
        r.traverse(o=>{if(!o.isMesh)return;tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;let m=done.get(o.material);
          if(!m){m=o.material.clone();m.color.setRGB(.34,.32,.32);
            m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n#ifdef USE_MAP\n{vec4 c_=texture2D(map,vMapUv);totalEmissiveRadiance+=vec3(1.,.025,.01)*1.25*smoothstep(.2,.42,c_.r-max(c_.g,c_.b));}\n#endif');};
            m.customProgramCacheKey=()=>'brood';done.set(o.material,m);}o.material=m;});
        if(!MODELS[pod])return;const v=tris>50000?'full':'combat';     /* the pod in the same detail as the Skitter */
        fetchParts(pod,v,()=>{}).then(x=>gunzip(x.gz)).then(buf=>new T.GLTFLoader().parse(buf,'',g=>{const p=g.scene;MODELS[pod].stance(p);dress(p,pod,v==='full');
          p.scale.setScalar(.8/k);p.position.set(0,.84,.12);r.add(p);}),()=>{});});}},
  broodskitter:{label:'BROOD SKITTER',sub:{full:'BOSS · x3 · SPAWNER POD',combat:'BOSS · COMBAT (BAKED)'},acc:'#ff2a1a',ty:1.6,dist:17,size:1.5,grp:'foe',vl:'BROOD SKITTER',
    paint:'fskitterf',src:{full:'fskitter',combat:'fskitter'},maps:{albedo:'fskitter',normal:'fskitter',orm:'fskitter'},parts:{full:1,combat:1},
    stance(r){MODELS.fskitter.brood(r,3,'spod');}},
