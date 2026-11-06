/* ===================== the three kinds of place: woods, field, docks =====================
   Each map gives: h(x,z) ground height, ground textures + weights, look (light, sky, fog), layout (plants), build (structures),
   spawn, trail (draped road), route (attract demo path), bounds (where the mech may walk). Pick one with ?map=woods|field|docks. */
function tmat(name,o={}){const t=tex(name,{glb:o.glb});if(o.rep)t.repeat.set(o.rep[0],o.rep[1]);const nm=o.alpha?null:nmap(name,{glb:o.glb,rep:o.rep});
  return hookWorld(new THREE.MeshStandardMaterial({normalMap:nm,normalScale:new THREE.Vector2(o.nk||1,o.nk||1),map:t,roughness:o.r==null?.8:o.r,metalness:o.m==null?.1:o.m,color:o.col==null?0xffffff:o.col,
    transparent:!!o.alpha,alphaTest:o.alpha?.45:0,side:o.ds?THREE.DoubleSide:THREE.FrontSide}));}
/* box geometry whose faces [+x,-x,+y,-y,+z,-z] repeat their texture every [u,v] metres (0 = stretch once) */
function sbox(w,h,d,reps){const g=new THREE.BoxGeometry(w,h,d);if(!reps)return g;const uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++){const r=reps[f];if(!r)continue;for(let i=f*4;i<f*4+4;i++)uv.setXY(i,uv.getX(i)*(r[0]?dims[f][0]/r[0]:1),uv.getY(i)*(r[1]?dims[f][1]/r[1]:1));}return g;}
function put(g,mats,x,y,z,ry,shadow){const m=new THREE.Mesh(g,mats);m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=shadow!==false;m.receiveShadow=true;S.add(m);return m;}
function gable(w,d,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3,uv.getY(i)/3);return g;}
function rectW(x,z,r,soft){return smooth(-soft,soft,Math.min(x-r[0],r[2]-x,z-r[1],r[3]-z));}
function pickW(o,rnd){let t=0;for(const k in o)t+=o[k];let r=rnd()*t;for(const k in o){r-=o[k];if(r<=0)return k;}return Object.keys(o)[0];}
function biome(id){return VEG.cat._biomes.find(b=>b.id===id)||VEG.cat._biomes[0];}
function propsAlong(rnd,list,side){for(let i=0;i<list.length;i++){const k=(i+.5)/list.length*(TRAIL.length-1),a=TRAIL[k|0],b=TRAIL[(k|0)+1],f=k%1,x=lerp(a[0],b[0],f),z=lerp(a[1],b[1],f);
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),sd=i%2?-1:1;plant(list[i],'prop',x+dz/l*side*sd,z-dx/l*side*sd,1,rnd);}}
/* session 5: arenas grew 1.6x (260 m across) so there is room to back off; K scales the woods and field layouts */
const K=1.6,kp=a=>a.map(p=>[p[0]*K,p[1]*K]),kc=a=>a.map(c=>[c[0]*K,c[1]*K,c[2]*K]),kr=a=>a.map(r=>[r[0]*K,r[1]*K,r[2]*K,r[3]*K,r[4]]);
const MAPS={
/* ---------------- woods: mixed forest, a trail, clearings ---------------- */
woods:{name:'WOODS',mix:'woods',spawn:{x:0,z:112,yaw:0},
  trail:kp([[0,82],[-12,56],[-22,32],[-6,12],[16,-4],[20,-28],[2,-46],[-18,-60],[-12,-82]]),
  clear:kc([[-32,38,15],[26,-14,17],[-24,-56,13],[34,50,11],[4,26,9],[-48,-10,12],[50,-50,12]]),
  h(x,z){const big=(fbm(x*.011+3.1,z*.011-7.4,4)-.5)*9,small=(fbm(x*.047,z*.047+11,2)-.5)*1.8;
    const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-6,PLAY+60,e),1.3)*28;return big+small*smooth(1.5,7,trailD(x,z))+rim;},
  ground:{a:'81-forest-floor',ar:6,b:'82-mossy-ground-with-roots',br:7,c:'06-dirt-and-gravel',cr:4.6,
    w(x,z){return [smooth(.45,.62,fbm(x*.03+5,z*.03-2,3)),smooth(5.5,3,trailD(x,z))*.5];}},
  look:{sun:[-.42,.62,-.66],sunCol:0xfff0d6,sunK:3.1,sky:0xd6e4ff,ground:0x6a5a44,hemiK:1.55,zen:0x2a5fb4,hor:0xb3c8de,fog:0xb3c8de,clouds:.75},
  layout(rnd,mixId){const mix=mixId==='creek'?{tree:{tree_willow:2,tree_cottonwood:1.4,tree_spruce:2.2,tree_aspen:1.2},grass:{grass_reeds:1.4,grass_meadow:2,grass_dry:.4}}:biome(mixId);
    for(let gx=-WORLD+4;gx<WORLD-4;gx+=7.5)for(let gz=-WORLD+4;gz<WORLD-4;gz+=7.5){
      const x=gx+(rnd()-.5)*6.5,z=gz+(rnd()-.5)*6.5,e=Math.max(Math.abs(x),Math.abs(z)),td=trailD(x,z),cd=clearD(x,z);
      if(Math.hypot(x-SPAWN.x,z-SPAWN.z)<13||td<6.5||cd<0)continue;
      if(rnd()>(e<PLAY?.62*smooth(6.5,12,td)*smooth(0,6,cd):.92))continue;plant(pickW(mix.tree,rnd),'tree',x,z,.82+rnd()*.4,rnd);}
    for(let i=0;i<20000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<2.6&&rnd()<.9)continue;plant(pickW(mix.grass,rnd),'grass',x,z,.75+rnd()*.7,rnd);}
    for(let i=0;i<600;i++){const x=(rnd()-.5)*2*(PLAY+10),z=(rnd()-.5)*2*(PLAY+10);if(trailD(x,z)<4)continue;plant(rnd()<.65?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.7,rnd);}
    propsAlong(rnd,['prop_drum','prop_tires','prop_icechest','prop_drum','prop_tires','prop_mailbox'],5.6);},
  build(){ribbon(TRAIL,7.5,'62-farm-track',10);boulders(30,mulberry(77));}},
/* ---------------- field: rolling farmland, a farm track, crops, a farmstead, relay masts ---------------- */
field:{name:'FIELD',mix:'meadow',spawn:{x:0,z:115,yaw:0},
  trail:kp([[0,88],[4,64],[-6,40],[-2,18],[14,0],[22,-22],[10,-44],[-12,-62],[-20,-88]]),
  crops:kr([[-74,-12,-24,28,'c'],[-72,40,-28,72,'b'],[34,-74,72,-34,'c'],[40,-24,76,8,'b'],[-60,-70,-26,-36,'b']]),
  farm:{x:67,z:54},masts:[[-64,-32],[77,-83],[-51,83]],
  h(x,z){const big=(fbm(x*.0075+11,z*.0075-3,4)-.5)*15,small=(fbm(x*.04,z*.04,2)-.5)*1.1;
    const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-4,PLAY+70,e),1.2)*30;
    const flat=Math.min(smooth(3,10,trailD(x,z)),smooth(18,38,Math.hypot(x-67,z-54)));return (big*.8+small)*(.35+.65*flat)+rim;},
  ground:{a:'60-meadow-ground',ar:5,b:'63-ploughed-field',br:6,c:'64-wheat-field',cr:4.5,
    w(x,z){let b=0,c=0;for(const r of MAPS.field.crops){const k=rectW(x,z,r,1.6);if(r[4]==='b')b=Math.max(b,k);else c=Math.max(c,k);}return [b,c];}},
  look:{sun:[-.35,.78,-.5],sunCol:0xfff4e2,sunK:3.3,sky:0xdbe9ff,ground:0x6f6a4a,hemiK:1.6,zen:0x2f6fd0,hor:0xc6daf0,fog:0xc4d6ea,clouds:.55,
    pano:'69-daytime-field-sky',ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[.9,.95,1],copies:3},exp:1.12},
  layout(rnd,mixId){const dry=mixId==='dry',HEDGE=dry?{tree_mesquite:3,tree_snag:.5}:{tree_oak:3,tree_cottonwood:1.5,tree_willow:.6},LONE=dry?{tree_mesquite:3,tree_snag:.6,tree_ponderosa:.5}:{tree_oak:3,tree_cottonwood:1.5,tree_aspen:.8},
      FAR=dry?{tree_mesquite:2,tree_ponderosa:1.5,tree_snag:.6}:{tree_oak:2,tree_cottonwood:1,tree_ponderosa:1.5,tree_spruce:1},GRASS=dry?{grass_dry:3,grass_meadow:.3}:{grass_meadow:3,grass_dry:1.2},
      mix=biome('meadow'),cropAt=(x,z)=>MAPS.field.crops.some(r=>rectW(x,z,r,3)>0),farmD=(x,z)=>Math.hypot(x-67,z-54);
    /* hedgerow trees along the crop edges and the far hills, a few loners in the meadow */
    for(const r of MAPS.field.crops)for(let t=0;t<1;t+=.06){const side=(t*4)|0,f=(t*4)%1,x=side===0?lerp(r[0],r[2],f):side===2?lerp(r[2],r[0],f):side===1?r[2]+2.5:r[0]-2.5,
      z=side===0?r[1]-2.5:side===2?r[3]+2.5:side===1?lerp(r[1],r[3],f):lerp(r[3],r[1],f);if(rnd()<.55&&trailD(x,z)>7&&farmD(x,z)>18)plant(pickW(HEDGE,rnd),'tree',x,z,.8+rnd()*.35,rnd);}
    for(let i=0;i<1400;i++){const x=(rnd()-.5)*2*(WORLD-8),z=(rnd()-.5)*2*(WORLD-8),e=Math.max(Math.abs(x),Math.abs(z));
      if(e<PLAY+4&&rnd()>.04)continue;if(trailD(x,z)<8||cropAt(x,z)||farmD(x,z)<22||Math.hypot(x-SPAWN.x,z-SPAWN.z)<14)continue;plant(pickW(e>PLAY?FAR:LONE,rnd),'tree',x,z,.8+rnd()*.4,rnd);}
    for(let i=0;i<22000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<3||cropAt(x,z)||farmD(x,z)<14)continue;plant(pickW(GRASS,rnd),'grass',x,z,.8+rnd()*.8,rnd);}
    for(let i=0;i<260;i++){const x=(rnd()-.5)*2*PLAY,z=(rnd()-.5)*2*PLAY;if(trailD(x,z)<5||cropAt(x,z)||farmD(x,z)<16)continue;plant(dry?(rnd()<.7?'bush_sage':'bush_pricklypear'):rnd()<.6?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.6,rnd);}
    propsAlong(rnd,['prop_mailbox','prop_tires','prop_drum','prop_icechest'],5.8);},
  build(){const rnd=mulberry(91);ribbon(TRAIL,7.5,'62-farm-track',10);
    const F=MAPS.field.farm,y=hgt(F.x,F.z);
    const red=tmat('66-red-barn-siding',{r:.85}),wood=tmat('67-wooden-fence-planks',{r:.9}),roof=tmat('10-corrugated-metal',{col:0x9a3a2e,r:.6,m:.4}),roof2=tmat('10-corrugated-metal',{col:0x7c828a,r:.6,m:.4}),dark=tmat('24-gunmetal',{col:0x55504a});
    /* barn: walls, a gable roof, a big door */
    put(sbox(22,9,14,[[4,4],[4,4],0,0,[4,4],[4,4]]),[red,red,dark,dark,red,red],F.x,y+4.5,F.z);put(gable(15,23.5,6),roof,F.x,y+9,F.z,Math.PI/2);addBox(F.x-11,F.z-7,F.x+11,F.z+7,15);
    put(sbox(6,7,.3),wood,F.x,y+3.5,F.z-7.1);
    /* farmhouse and silo */
    put(sbox(14,6,10,[[4,4],[4,4],0,0,[4,4],[4,4]]),[wood,wood,dark,dark,wood,wood],F.x-26,y+3,F.z+4);put(gable(11,15,4),roof2,F.x-26,y+6,F.z+4,Math.PI/2);addBox(F.x-33,F.z-1,F.x-19,F.z+9,10);
    const silo=tmat('12-rusted-steel-plate',{rep:[4,3],r:.7,m:.5});put(new THREE.CylinderGeometry(3.4,3.4,16,24),silo,F.x+16,y+8,F.z+10);put(new THREE.SphereGeometry(3.5,24,10,0,TAU,0,Math.PI/2),roof2,F.x+16,y+16,F.z+10);addCol(F.x+16,F.z+10,3.5,19);
    /* fences along the track */
    const rail=new THREE.BoxGeometry(.12,.16,1),post=new THREE.BoxGeometry(.22,1.5,.22);
    for(let i=1;i<TRAIL.length-1;i++){const a=TRAIL[i],b=TRAIL[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=Math.atan2(b[0]-a[0],b[1]-a[1]);if(i%2)continue;
      for(const sd of [-1,1]){const ox=Math.cos(ang)*5.2*sd,oz=-Math.sin(ang)*5.2*sd;
        for(let t=0;t<L;t+=4){const x=a[0]+(b[0]-a[0])*t/L+ox,z=a[1]+(b[1]-a[1])*t/L+oz,h0=hgt(x,z);put(post,wood,x,h0+.75,z,ang);
          for(const hh of [.5,1.1]){const m=put(rail,wood,x+(b[0]-a[0])/L*2,h0+hh,z+(b[1]-a[1])/L*2,ang);m.scale.z=4;}}}}
    /* round hay bales */
    const hay=tmat('64-wheat-field',{rep:[3,1],r:.95}),hayEnd=hookWorld(new THREE.MeshStandardMaterial({map:tex('68-round-hay-bale-end'),alphaTest:.4,roughness:.95}));
    const bg=new THREE.CylinderGeometry(1,1,1.4,20,1,false);bg.rotateZ(Math.PI/2);const bales=[];
    for(let i=0;i<44;i++){const r=MAPS.field.crops[i%MAPS.field.crops.length],x=lerp(r[0],r[2],.1+rnd()*.8),z=lerp(r[1],r[3],.1+rnd()*.8);if(r[4]!=='c')continue;
      bales.push(new THREE.Matrix4().compose(V3(x,hgt(x,z)+1,z),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),rnd()*TAU),V3(1,1,1)));addCol(x,z,1.1,2);}
    const bim=new THREE.InstancedMesh(bg,[hay,hayEnd,hayEnd],bales.length);bales.forEach((m,k)=>bim.setMatrixAt(k,m));bim.castShadow=bim.receiveShadow=true;S.add(bim);
    /* radio relay masts: lattice towers with a red light (mission 1 targets) */
    const truss=tmat('74-crane-truss',{alpha:true,ds:true,rep:[4,6],r:.6,m:.5});
    MAPS.field.mastObjs=[];
    for(const [mx,mz] of MAPS.field.masts){const g0=hgt(mx,mz),grp=new THREE.Group();grp.position.set(mx,g0,mz);grp.userData.keep=1;S.add(grp);   /* a pivot at the base so a destroyed mast can topple */
      const tw=new THREE.Mesh(new THREE.CylinderGeometry(.6,1.6,26,4,1,true),truss);tw.position.y=13;tw.rotation.y=Math.PI/4;tw.castShadow=true;grp.add(tw);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.4,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(1,.1,.05).multiplyScalar(4)}));lamp.position.y=26.4;grp.add(lamp);addBox(mx-1.6,mz-1.6,mx+1.6,mz+1.6,26);
      MAPS.field.mastObjs.push({x:mx,z:mz,y:g0,tower:grp,lamp,fall:0});}
  }},
/* ---------------- docks: Harbor 9 at sunset, container stacks, cranes, a ship, warehouses ---------------- */
docks:{name:'DOCKS',mix:'woods',spawn:{x:9,z:88,yaw:0},bounds:{x0:-128,x1:128,z0:-96,z1:96},quay:-100,
  blocksX:[-110,-76,-42,-8,26,60,94],blocksZ:[-80,-56,-32,-8,16,40,64],lanesX:[-93,-59,-25,9,43,77,111],
  trail:[],route:[[9,88],[9,28],[43,28],[43,-44],[-25,-44],[-25,28],[9,28]],
  h(x,z){return z<-100?-7:0;},
  ground:{a:'02-wet-concrete',ar:7,b:'79-dock-lane-markings',br:14,c:'07-harbor-paving',cr:5,rough:.7,
    w(x,z){const lane=Math.max(...MAPS.docks.lanesX.map(c=>smooth(6,4.5,Math.abs(x-c)))),c=smooth(-86,-94,z);return [lane*smooth(90,84,Math.abs(z)),c];}},
  look:{sun:[-.85,.3,-.42],sunCol:0xffb070,sunK:3.4,sky:0xb4a0d2,ground:0x6a5448,hemiK:2.1,zen:0x3a2a6a,hor:0xf0a070,fog:0xc8907e,clouds:.3,
    pano:'80-harbour-sunset-sky',ring:{tex:'33-harbor-skyline',h:60,lift:-8,tint:[.8,.72,.85],copies:3},exp:1.28},
  layout(){},
  build(){const rnd=mulberry(19),Qz=-100;
    /* water and the quay wall */
    const wt=tex('75-harbour-water',{rep:60});const water=new THREE.Mesh(new THREE.PlaneGeometry(700,320),new THREE.MeshStandardMaterial({map:wt,color:0xa8bcc0,roughness:.16,metalness:.3}));
    water.rotation.x=-Math.PI/2;water.position.set(0,-2.6,Qz-160);S.add(water);MAPS.docks.wt=wt;
    put(sbox(470,3.4,1,[0,0,0,0,0,[7,0]]),[tmat('09-blast-wall'),tmat('09-blast-wall'),tmat('07-harbor-paving'),tmat('09-blast-wall'),tmat('09-blast-wall'),tmat('76-quay-edge-with-fenders')],0,-1.7,Qz-.5,0,false);
    /* a moored ship */
    const hull=tmat('77-ship-hull-side',{r:.6,m:.3}),deck=tmat('12-rusted-steel-plate',{rep:[10,2]}),hdark=tmat('24-gunmetal',{col:0x3a2a28});
    put(sbox(190,18,22,[[0,0],[0,0],0,0,[28,0],[28,0]]),[hdark,hdark,deck,hdark,hull,hull],15,0,Qz-24,0,false);
    put(sbox(22,15,18,[[6,6],[6,6],0,0,[6,6],[6,6]]),tmat('14-docks-building-facade'),-66,16.5,Qz-24,0,true);
    /* two ship-to-shore cranes over the quay */
    const truss=tmat('74-crane-truss',{alpha:true,ds:true,r:.55,m:.5});const tb=(w,h,d,x,y,z)=>{const g=sbox(w,h,d,[[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5]]);return put(g,truss,x,y,z);};
    for(const cx of [-59,9,77]){const z1=Qz+10,z2=Qz+1,zm=(z1+z2)/2;for(const lx of [-7,7])for(const lz of [z1,z2]){tb(1.6,32,1.6,cx+lx,16,lz);addBox(cx+lx-1,lz-1,cx+lx+1,lz+1,32);}
      tb(16,2,1.6,cx,31,z1);tb(16,2,1.6,cx,31,z2);tb(1.6,2,10,cx-7,31,zm);tb(1.6,2,10,cx+7,31,zm);
      tb(3,2.4,78,cx,35,Qz-13);put(sbox(7,4.5,9),tmat('12-rusted-steel-plate',{rep:[2,2]}),cx,38,zm);
      put(sbox(3,2.4,3),tmat('24-gunmetal'),cx,32.5,Qz-26);}
    /* container stacks in blocks, lanes between them (each stack is one collider) */
    const L=12.2,H=2.6,W=2.44,cg=new THREE.BoxGeometry(L,H,W),endM=tmat('11-container-door-end',{r:.7,m:.3}),roofM=tmat('73-container-roof',{r:.7,m:.3}),botM=tmat('24-gunmetal');
    const kinds=[tmat('71-red-shipping-container-side',{r:.65,m:.35}),tmat('72-blue-shipping-container-side',{r:.65,m:.35}),tmat('10-corrugated-metal',{col:0x5f8a7a,r:.65,m:.35,rep:[3,1]}),tmat('10-corrugated-metal',{col:0xc8a040,r:.65,m:.35,rep:[3,1]})];
    const lists=kinds.map(()=>[]);
    for(const bx of MAPS.docks.blocksX)for(const bz of MAPS.docks.blocksZ){if(MISSION&&MISSION.yard&&Math.abs(bx)<50&&bz>-70&&bz<30)continue;   /* mission 11 clears a crane yard in the middle */
      if(Math.hypot(bx-SPAWN.x,bz-SPAWN.z)<18)continue;
      for(let ix=0;ix<2;ix++)for(let iz=0;iz<3;iz++){if(rnd()<.12)continue;const x=bx-L/2+ix*L+(ix?.15:-.15),z=bz-W+iz*W*1.02,n=1+(rnd()*3|0);
        for(let k=0;k<n;k++)lists[rnd()*4|0].push([x,H/2+k*H,z,rnd()<.5?0:Math.PI]);addBox(x-L/2,z-W/2,x+L/2,z+W/2,n*H,0);}}
    kinds.forEach((m,i)=>{const l=lists[i];if(!l.length)return;const im=new THREE.InstancedMesh(cg,[endM,endM,roofM,botM,m,m],l.length);const t=new THREE.Matrix4();
      l.forEach((p,k)=>{t.compose(V3(p[0],p[1],p[2]),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),p[3]),V3(1,1,1));im.setMatrixAt(k,t);});im.castShadow=im.receiveShadow=true;S.add(im);});
    /* warehouses along the back, the HARBOR 9 neon and a Hyperdot billboard */
    const clad=tmat('10-corrugated-metal',{col:0x8a9096,rep:[1,1]}),door=tmat('78-warehouse-roller-door',{r:.7,m:.3}),gravel=tmat('15-roof-gravel');
    for(const wx of [-104,-52,0,52,104]){put(sbox(34,12,18,[[4,4],[4,4],[6,6],0,[4,4],[34/3,0]]),[clad,clad,gravel,gravel,clad,door],wx,6,108);addBox(wx-17,99,wx+17,117,12,0);}
    const neon=new THREE.Mesh(new THREE.PlaneGeometry(11,5.5),new THREE.MeshBasicMaterial({map:tex('44-neon-sign-harbor-9'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(2,2,2)}));
    neon.position.set(0,13.6,98.9);neon.rotation.y=Math.PI;S.add(neon);
    const bb=new THREE.Mesh(new THREE.PlaneGeometry(9,9),tmat('46-hyperdot-arcade-billboard',{r:.5}));bb.position.set(121.1,7,108);bb.rotation.y=Math.PI/2;S.add(bb);
    /* lamp posts and bollards */
    const pole=tmat('24-gunmetal'),lampM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.85,.55).multiplyScalar(3)});
    const night=MISSION&&MISSION.look&&MISSION.look.night;if(night)lampM.color.multiplyScalar(2.2);
    const pool=night?poolTex():null;
    for(const x of MAPS.docks.lanesX)for(const z of [-88,-20,52,84]){put(new THREE.CylinderGeometry(.18,.25,13,8),pole,x+3.6,6.5,z);put(new THREE.BoxGeometry(1.6,.3,.7),lampM,x+3.6,13,z);addCol(x+3.6,z,.4,13);
      if(night){const g=new THREE.PlaneGeometry(22,22);g.rotateX(-Math.PI/2);g.translate(x+3.6,.06,z);(MAPS.docks._pools=MAPS.docks._pools||[]).push(g);}}
    if(night&&MAPS.docks._pools){const p=new THREE.Mesh(THREE.mergeGeometries(MAPS.docks._pools),new THREE.MeshBasicMaterial({map:pool,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.78,.45).multiplyScalar(.55)}));
      p.renderOrder=2;p.userData.keep=1;p.frustumCulled=false;S.add(p);}
    for(let x=-124;x<=124;x+=9.5)put(new THREE.CylinderGeometry(.35,.42,.8,10),pole,x,.4,Qz+1.2);
  },
  tick(dt){if(MAPS.docks.wt){MAPS.docks.wt.offset.x+=dt*.004;MAPS.docks.wt.offset.y+=dt*.0025;}}},
};
/* mossy boulders for the woods: lumpy rocks with a collider */
function boulders(n,rnd){const m=tmat('83-mossy-boulder-rock',{rep:[2,2],r:.95,m:0});
  for(let i=0;i<n;i++){let x,z,k=0;do{x=(rnd()-.5)*2*(PLAY-8);z=(rnd()-.5)*2*(PLAY-8);k++;}while((trailD(x,z)<8||Math.hypot(x-SPAWN.x,z-SPAWN.z)<15)&&k<20);
    const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position,r=1.6+rnd()*2.6;
    for(let j=0;j<p.count;j++){const vx=p.getX(j),vy=p.getY(j),vz=p.getZ(j),f=1+(fbm(vx*1.7+i*3,vz*1.7+vy*1.3,3)-.5)*.7;p.setXYZ(j,vx*f*r,vy*f*r*.62,vz*f*r*(.8+rnd()*.1));}
    g.computeVertexNormals();put(g,m,x,hgt(x,z)+r*.15,z,rnd()*TAU);addCol(x,z,r*.85,r*1.1);}}
/* a soft round glow for fake lamp light on the ground at night */
function poolTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const BND=()=>MAPDEF.bounds||{x0:-PLAY-6,x1:PLAY+6,z0:-PLAY-6,z1:PLAY+6};
function boxAt(x,z,y){const a=VEG.cols.get(colKey(x,z));if(!a)return false;for(const c of a)if(c.b&&x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1&&y<c.y0+c.h)return true;return false;}
/* after a map is built, join its fixed single-material meshes into one mesh per material (fences, posts, crane beams, lamps...) */
function mergeStatic(before){
  const by=new Map();
  for(const o of S.children.slice()){if(before.has(o)||!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent&&!o.material.alphaTest||o.userData.keep)continue;
    o.updateMatrixWorld(true);let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)continue;
    if(!by.has(o.material))by.set(o.material,{gs:[],cast:o.castShadow});by.get(o.material).gs.push(g);S.remove(o);}
  let n=0;for(const [m,v] of by){const mm=new THREE.Mesh(THREE.mergeGeometries(v.gs,false),m);mm.castShadow=v.cast;mm.receiveShadow=true;S.add(mm);n+=v.gs.length;}
  return n;}
