/* ===================== detail pass 3: set dressing. Small things you walk through (the mech steps over them), so paths and
   path-finding stay exactly the same: pebbles, logs, stumps, debris, pallets, cones, drums, puddles that mirror the sky, cracks and oil stains.
   Each kind is one instanced mesh, so a whole map's clutter costs about 10-16 draw calls. ===================== */
function rockGeo(r,seed){const g=new THREE.DodecahedronGeometry(r,1),p=g.attributes.position,rnd=mulberry(seed);
  for(let i=0;i<p.count;i++){const k=.78+rnd()*.4;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.7,p.getZ(i)*k);}g.computeVertexNormals();return g;}
/* place n copies where fn(rnd) says (returns [x,z] or null), avoiding walls, trunks and the spawn */
function scatter(geo,mat,n,fn,o={}){const rnd=mulberry(o.seed||17),im=new THREE.InstancedMesh(geo,mat,n);let k=0;
  for(let t=0;t<n*6&&k<n;t++){const q=fn(rnd);if(!q)continue;const [x,z]=q;if(treeAt(x,z,.5)||Math.hypot(x-SPAWN.x,z-SPAWN.z)<(o.clear||8))continue;
    const s=(o.s0||1)+rnd()*((o.s1||1)-(o.s0||1)),y=hgt(x,z)+(o.y||0)*s;
    _m4.compose(_w.set(x,y,z),_q.setFromEuler(new THREE.Euler(o.tilt?(rnd()-.5)*o.tilt:0,rnd()*TAU,o.tilt?(rnd()-.5)*o.tilt:0)),_v.set(s,s*(o.sy||1),s));im.setMatrixAt(k++,_m4);}
  im.count=k;im.castShadow=o.shadow!==false;im.receiveShadow=true;S.add(im);return im;}
const inPlay=(rnd,m)=>{const e=PLAY-(m||6);return [(rnd()-.5)*2*e,(rnd()-.5)*2*e];};
const inBounds=(rnd,m)=>{const B=BND(),k=m||4;return [B.x0+k+rnd()*(B.x1-B.x0-2*k),B.z0+k+rnd()*(B.z1-B.z0-2*k)];};
/* flat decals scattered on the ground (cracks, oil, leaves) */
function groundDecals(texName,n,fn,size,o={}){const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const m=new THREE.MeshStandardMaterial({map:tex(texName,{clamp:true}),transparent:true,depthWrite:false,roughness:o.r||.9,metalness:0,color:o.col||0xffffff,opacity:o.a||1,
    polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const im=scatter(g,m,n,fn,{s0:size[0],s1:size[1],y:0,shadow:false,seed:o.seed||23,clear:2});im.position.y=.04;im.renderOrder=1;return im;}
/* puddles: a soft blob mask on a dark glossy surface that picks up the sky reflections */
let PUDDLE_TEX=null;
function puddleTex(){if(PUDDLE_TEX)return PUDDLE_TEX;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const rnd=mulberry(5);g.fillStyle='#000';g.fillRect(0,0,256,256);g.filter='blur(10px)';g.fillStyle='#fff';
  for(let i=0;i<9;i++){g.beginPath();g.ellipse(128+(rnd()-.5)*110,128+(rnd()-.5)*110,30+rnd()*45,20+rnd()*30,rnd()*3,0,TAU);g.fill();}
  PUDDLE_TEX=new THREE.CanvasTexture(c);return PUDDLE_TEX;}
function puddles(n,fn,size,o={}){const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const m=new THREE.MeshStandardMaterial({color:o.col||0x0c1014,roughness:.06,metalness:.2,envMap:ENV,envMapIntensity:o.k||1.3,alphaMap:puddleTex(),transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const im=scatter(g,m,n,fn,{s0:size[0],s1:size[1],shadow:false,seed:o.seed||31,clear:3});im.position.y=.05;im.renderOrder=1;return im;}
/* ---------------- per map ---------------- */
MAPS.woods.dress=function(){
  const rock=tmat('83-mossy-boulder-rock',{r:.95,m:0}),bark=new THREE.MeshStandardMaterial({color:0x4a3c30,roughness:.95,normalMap:nmap('83-mossy-boulder-rock'),normalScale:new THREE.Vector2(1.4,1.4)});
  scatter(rockGeo(.35,3),rock,900,r=>inPlay(r),{s0:.5,s1:1.6,y:.1,seed:41});                                  // pebbles and stones
  const log=new THREE.CylinderGeometry(.42,.48,1,10);log.rotateZ(Math.PI/2);
  scatter(log,bark,90,r=>{const q=inPlay(r);return clearD(q[0],q[1])>4&&trailD(q[0],q[1])>5?q:null;},{s0:4,s1:8,sy:.12,y:.05,seed:43,n2:1});   // fallen logs
  scatter(new THREE.CylinderGeometry(.5,.65,1,10),bark,150,r=>inPlay(r),{s0:.8,s1:1.3,y:.5,sy:.7,seed:47});          // stumps
  groundDecals('40-scorch-mark',120,r=>inPlay(r),[2,4.5],{col:0x3a3020,a:.55,seed:49});                                   // dark leaf litter patches
};
MAPS.field.dress=function(){
  const rock=tmat('83-mossy-boulder-rock',{r:.95,m:0,col:0xb8b0a0}),wood=tmat('16-wooden-crate'),gm=tmat('24-gunmetal'),drum=tmat('18-red-drum-label',{r:.5,m:.4});
  scatter(rockGeo(.4,7),rock,700,r=>inPlay(r),{s0:.4,s1:1.5,y:.1,seed:51});
  const F=MAPS.field.farm;
  scatter(new THREE.BoxGeometry(1.2,.16,1.2),wood,26,r=>[F.x+(r()-.5)*40,F.z+(r()-.5)*36],{s0:1,s1:1.2,y:.08,seed:53});            // pallets by the farm
  scatter(new THREE.CylinderGeometry(.45,.45,1.3,12),drum,18,r=>[F.x+(r()-.5)*44,F.z+(r()-.5)*40],{s0:1,s1:1,y:.65,seed:55});        // drums
  scatter(new THREE.BoxGeometry(.18,1.2,.18),wood,60,r=>{const q=inPlay(r);return trailD(q[0],q[1])<9&&trailD(q[0],q[1])>5?q:null;},{s0:.8,s1:1.2,y:.4,tilt:.5,seed:57});  // old leaning posts
  scatter(new THREE.BoxGeometry(.9,.25,.6),gm,70,r=>inPlay(r),{s0:.6,s1:1.4,y:.1,tilt:.4,seed:59});                                     // rusted scrap
  if(LOOKNOW&&LOOKNOW.rain)puddles(40,r=>{const q=inPlay(r);return trailD(q[0],q[1])<4?q:null;},[2,5]);
  else puddles(10,r=>{const q=inPlay(r);return trailD(q[0],q[1])<3?q:null;},[1.5,3],{k:1});
};
MAPS.docks.dress=function(){
  const D=MAPS.docks,lane=r=>{const x=D.lanesX[(r()*D.lanesX.length)|0]+(r()-.5)*9,z=D.bounds.z0+4+r()*(D.bounds.z1-D.bounds.z0-8);return [x,z];};
  const wet=LOOKNOW&&(LOOKNOW.rain||LOOKNOW.night);
  puddles(wet?170:110,r=>lane(r),[3,8],{k:wet?1.7:1.4});
  groundDecals('41-impact-cracks',170,r=>lane(r),[1.5,4.5],{col:0x6a6a6a,a:.8,seed:61});
  groundDecals('40-scorch-mark',110,r=>lane(r),[1.5,4],{col:0x151515,a:.7,seed:63});                                  // oil stains
  const wood=tmat('16-wooden-crate'),haz=tmat('26-hazard-trim',{r:.6}),drumR=tmat('18-red-drum-label',{r:.5,m:.4}),drumB=tmat('19-blue-drum-label',{r:.5,m:.4});
  const edge=r=>{const x=D.lanesX[(r()*D.lanesX.length)|0]+(r()<.5?-1:1)*(5.5+r()*1.2),z=D.bounds.z0+4+r()*(D.bounds.z1-D.bounds.z0-8);return [x,z];};
  scatter(new THREE.BoxGeometry(1.2,.16,1.2),wood,140,edge,{s0:1,s1:1,y:.08,seed:65});
  scatter(new THREE.BoxGeometry(1.2,.9,1.2),wood,70,edge,{s0:.9,s1:1.1,y:.45,seed:66});
  scatter(new THREE.ConeGeometry(.28,.8,10),haz,110,edge,{s0:1,s1:1,y:.4,seed:67});                                       // traffic cones
  scatter(new THREE.CylinderGeometry(.45,.45,1.3,12),drumR,70,edge,{s0:1,s1:1,y:.65,seed:68});
  scatter(new THREE.CylinderGeometry(.45,.45,1.3,12),drumB,70,edge,{s0:1,s1:1,y:.65,seed:69});
  scatter(new THREE.TorusGeometry(.5,.14,8,16).rotateX(Math.PI/2),tmat('57-rubber-and-cables'),60,edge,{s0:1,s1:1.3,y:.14,seed:70});   // coiled hoses
};
MAPS.foundry.dress=function(){
  const B=MAPS.foundry.bounds,yard=r=>{const q=inBounds(r,6);return Math.hypot(q[0]-FORGE_AT.x,q[1]-FORGE_AT.z)>30?q:null;};
  puddles(120,yard,[3,8],{col:0x080808,k:1.6});
  groundDecals('41-impact-cracks',160,yard,[1.5,4.5],{col:0x5a5a5a,a:.85,seed:71});
  groundDecals('40-scorch-mark',110,yard,[2,5],{col:0x0a0a0a,a:.8,seed:72});
  groundDecals('08-painted-hazard-floor',12,yard,[3,5],{col:0x9a9a9a,a:.9,seed:73});
  const gm=tmat('24-gunmetal'),rust=tmat('12-rusted-steel-plate'),haz=tmat('26-hazard-trim',{r:.6});
  scatter(new THREE.BoxGeometry(1,.4,.7),rust,200,yard,{s0:.5,s1:1.6,y:.15,tilt:.6,seed:74});                             // scrap plates
  scatter(new THREE.CylinderGeometry(.25,.25,3,10).rotateZ(Math.PI/2),gm,80,yard,{s0:.8,s1:1.4,y:.25,seed:75});          // loose pipes
  scatter(new THREE.ConeGeometry(.28,.8,10),haz,30,yard,{s0:1,s1:1,y:.4,seed:76});
};
