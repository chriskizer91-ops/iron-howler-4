/* ===================== FORGE machines, path-finding, waves, pickups, damage and score ===================== */
const EDEF={
  skitter:{hp:30,r:1.3,cy:1.25,speed:9.5,score:50,drop:.12,file:'skitter',sc:1.4,scrap:5},
  hound:{hp:95,r:1.7,cy:1.95,speed:8.2,score:150,drop:.4,file:'hound',sc:1.15,scrap:15},
  gunner:{hp:230,r:1.4,cy:2.7,speed:4.6,score:400,drop:1,file:'gunner',sc:1.05,scrap:35}};
const EN=[],EMAT={},ETPL={};
let ENEMY_READY=false;
function loadEnemies(){
  const k=(a,w)=>{a.vertexColors=true;return hookWorld(a,{wear:w});};
  EMAT.egrey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),normalMap:nmap('23-grey-armour'),normalScale:new THREE.Vector2(nmapK('23-grey-armour'),nmapK('23-grey-armour')),color:0x9c8884,roughness:.5,metalness:.45}),1);
  EMAT.egun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),normalMap:nmap('24-gunmetal'),normalScale:new THREE.Vector2(nmapK('24-gunmetal'),nmapK('24-gunmetal')),color:0x6c7078,roughness:.45,metalness:.7}));
  EMAT.edark=k(new THREE.MeshStandardMaterial({color:0x121316,roughness:.7,metalness:.4}));
  EMAT.esteel=MT.steel;
  EMAT.ered=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.12,.05).multiplyScalar(2.2)});
  EMAT.emblem=hookWorld(new THREE.MeshStandardMaterial({map:tex('29-enemy-emblem',{clamp:true,glb:true}),transparent:true,alphaTest:.35,roughness:.55,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  const L=new THREE.GLTFLoader(LM),jobs=Object.keys(EDEF).map(id=>new Promise(ok=>L.load('models/mech/'+EDEF[id].file+'.glb',g=>{
    g.scene.traverse(o=>{if(o.isMesh){o.material=EMAT[o.material.name]||EMAT.egun;o.castShadow=o.material!==EMAT.emblem;o.receiveShadow=true;}});
    mergeParts(g.scene);ETPL[id]=g.scene;ok();},undefined,()=>ok())));
  return Promise.all(jobs).then(()=>{ENEMY_READY=true;});
}
/* ---- path-finding: a flow field on a 2 m grid, rebuilt when the player moves to another cell ---- */
const NAV={c:2,n:0,o:0,block:null,dist:null,pc:-1,t:0};
function navInit(){const ext=PLAY+10;NAV.o=-ext;NAV.n=Math.ceil(ext*2/NAV.c);const n=NAV.n;NAV.block=new Uint8Array(n*n);NAV.dist=new Float32Array(n*n);
  const seen=new Set();
  for(const a of VEG.cols.values())for(const c of a){if(seen.has(c))continue;seen.add(c);
    if(c.b){const i0=Math.floor((c.x0-1.2-NAV.o)/NAV.c),i1=Math.floor((c.x1+1.2-NAV.o)/NAV.c),j0=Math.floor((c.z0-1.2-NAV.o)/NAV.c),j1=Math.floor((c.z1+1.2-NAV.o)/NAV.c);
      for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)if(i>=0&&j>=0&&i<n&&j<n)NAV.block[j*n+i]=1;continue;}
    const r=c.r+1.1,i0=Math.floor((c.x-r-NAV.o)/NAV.c),i1=Math.floor((c.x+r-NAV.o)/NAV.c),j0=Math.floor((c.z-r-NAV.o)/NAV.c),j1=Math.floor((c.z+r-NAV.o)/NAV.c);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){if(i<0||j<0||i>=n||j>=n)continue;const cx=NAV.o+(i+.5)*NAV.c,cz=NAV.o+(j+.5)*NAV.c;if(Math.hypot(cx-c.x,cz-c.z)<r)NAV.block[j*n+i]=1;}}}
const navCell=(x,z)=>{const i=Math.floor((x-NAV.o)/NAV.c),j=Math.floor((z-NAV.o)/NAV.c);return i<0||j<0||i>=NAV.n||j>=NAV.n?-1:j*NAV.n+i;};
function navBuild(){const n=NAV.n,D=NAV.dist;D.fill(1e9);const s=navCell(P.x,P.z);if(s<0)return;NAV.pc=s;
  /* Dijkstra with a bucket queue is overkill here: a two-pass chamfer sweep (8 neighbours) is fast and good enough */
  D[s]=0;const B=NAV.block,d1=1,d2=1.414;
  for(let it=0;it<3;it++){
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;if(B[k])continue;let v=D[k];
      if(i>0&&D[k-1]+d1<v)v=D[k-1]+d1;if(j>0){if(D[k-n]+d1<v)v=D[k-n]+d1;if(i>0&&D[k-n-1]+d2<v)v=D[k-n-1]+d2;if(i<n-1&&D[k-n+1]+d2<v)v=D[k-n+1]+d2;}D[k]=v;}
    for(let j=n-1;j>=0;j--)for(let i=n-1;i>=0;i--){const k=j*n+i;if(B[k])continue;let v=D[k];
      if(i<n-1&&D[k+1]+d1<v)v=D[k+1]+d1;if(j<n-1){if(D[k+n]+d1<v)v=D[k+n]+d1;if(i<n-1&&D[k+n+1]+d2<v)v=D[k+n+1]+d2;if(i>0&&D[k+n-1]+d2<v)v=D[k+n-1]+d2;}D[k]=v;}}
}
/* direction toward the player through the woods from (x,z); falls back to straight at the player */
function navDir(x,z){const k=navCell(x,z),n=NAV.n,D=NAV.dist;let bx=P.x-x,bz=P.z-z;
  if(k>=0&&D[k]<1e8){let best=D[k],bi=-1,bj=-1;const i=k%n,j=(k/n)|0;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=n||jj>=n)continue;const v=D[jj*n+ii];if(v<best){best=v;bi=ii;bj=jj;}}
    if(bi>=0&&D[k]>2){bx=NAV.o+(bi+.5)*NAV.c-x;bz=NAV.o+(bj+.5)*NAV.c-z;}}
  const l=Math.hypot(bx,bz)||1;return [bx/l,bz/l];}
/* can the enemy see the player (no trunk in between)? */
function los(x,z){const dx=P.x-x,dz=P.z-z,d=Math.hypot(dx,dz),st=Math.ceil(d/3);for(let i=1;i<st;i++){const t=i/st;if(treeAt(x+dx*t,z+dz*t,hgt(x+dx*t,z+dz*t)+2.5))return false;}return true;}
/* ---- spawning ---- */
function spawnEnemy(id,x,z){const d=EDEF[id],tp=ETPL[id];if(!tp)return null;
  const o=tp.clone(true);const N=n=>o.getObjectByName(n);
  const e={id,d,o,x,z,y:hgt(x,z),yaw:Math.atan2(-(P.x-x),-(P.z-z)),hp:d.hp*G.hpK*DIFF.hp,dead:false,spawnT:1.3,st:'move',t:0,cd:1+Math.random()*1.5,
    kx:0,kz:0,flash:0,phase:Math.random()*10,strafe:Math.random()<.5?1:-1,strT:2+Math.random()*2,vx:0,vz:0};
  if(d.init)d.init(e,N);
  else if(id==='skitter'){e.body=N('body');e.legs=[0,1,2,3].map(i=>N('leg'+i));}
  else if(id==='hound'){e.body=N('body');e.head=N('head');e.legs=['FL','FR','BL','BR'].map(s=>({up:N('leg'+s),kn:N('knee'+s)}));}
  else{e.hips=N('hips');e.torso=N('torso');e.armR=N('armR');e.armL=N('armL');e.mzR=N('mzR');e.mzL=N('mzL');
    e.legs=[-1,1].map(sd=>{const s=sd<0?'L':'R';return {thigh:N('thigh_'+s),knee:N('knee_'+s),ankle:N('ankle_'+s),sd};});e.gp=0;}
  /* each enemy gets its own copy of the armour material so it can flash when hit */
  e.mat=EMAT.egrey.clone();e.mat.onBeforeCompile=EMAT.egrey.onBeforeCompile;e.mat.customProgramCacheKey=EMAT.egrey.customProgramCacheKey;
  o.traverse(m=>{if(m.isMesh&&m.material===EMAT.egrey)m.material=e.mat;});
  if(!Q.has('noskin'))skinify(o);   /* speed pass: one skinned mesh per material instead of one mesh per part */
  o.scale.setScalar(d.sc||1);o.position.set(x,e.y,z);o.visible=false;S.add(o);EN.push(e);
  return e;}
/* waves arrive in front of the player, 55-80 m ahead, with a red beacon first */
const WAVES=[{skitter:4},{skitter:6,hound:1},{hound:2,skitter:4},{gunner:1,skitter:4},{gunner:2,hound:2},{gunner:2,hound:2,skitter:6}];
const BEACONS=[];
function spawnSpot(){const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  for(let tries=0;tries<40;tries++){const a=(Math.random()-.5)*1.2,d=55+Math.random()*25,ca=Math.cos(a),sa=Math.sin(a);
    const B=BND(),dx=fx*ca-fz*sa,dz=fx*sa+fz*ca,x=clamp(P.x+dx*d,B.x0+4,B.x1-4),z=clamp(P.z+dz*d,B.z0+4,B.z1-4);
    if(Math.hypot(x-P.x,z-P.z)<35)continue;const k=navCell(x,z);if(k<0||NAV.block[k])continue;return [x,z];}
  const B=BND();return [clamp(P.x-Math.sin(P.yaw)*60,B.x0+4,B.x1-4),clamp(P.z-Math.cos(P.yaw)*60,B.z0+4,B.z1-4)];}
function startWave(){
  const w=WAVES[G.wave%WAVES.length];G.hpK=1+Math.floor(G.wave/WAVES.length)*.3;G.wave++;
  HUD.banner('WAVE '+G.wave);
  for(const id in w){const [cx,cz]=spawnSpot();BEACONS.push({x:cx,z:cz,t:1.3});
    for(let i=0;i<w[id];i++){const a=Math.random()*TAU,r=Math.random()*(id==='skitter'?6:4)+(i?2:0);let x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      const cl=collide(x,z,EDEF[id].r);spawnEnemy(id,cl[0],cl[1]);}}
}
/* ---- damage ---- */
function hurtEnemy(e,dmg,x,y,z){if(e.dead)return;if(e.d.armor)dmg*=e.d.armor(e,x,z);e.hp-=dmg;e.flash=1;if(e.hp<=0)killEnemy(e);}
function killEnemy(e){e.dead=true;S.remove(e.o);if(e.beam)S.remove(e.beam);e.mat.dispose();
  boom(e.x,e.y+e.d.cy,e.z,e.d.boom||(e.id==='skitter'?.7:e.id==='hound'?1.1:1.5));
  const now=G.t;G.combo=now-G.lastKill<3?G.combo+1:1;G.lastKill=now;const mult=Math.min(3,1+.25*(G.combo-1));
  addScore(Math.round(e.d.score*mult*(G.hpK||1)));G.kills++;addScrap(e.d.scrap||10);
  if(Math.random()<e.d.drop)dropPickup(e.x,e.z,Math.random()<(e.d.chip||(e.id==='gunner'?.55:0))?'chip':null);
}
function hurtPlayer(dmg,fx,fz){if(P.dead||G.mode!=='play'&&G.mode!=='demo')return;if(G.mode==='demo'){shieldFlash();return;}dmg*=DIFF.dmg;P.regenT=P.regenDelay||3;
  const s=Math.min(P.shield,dmg);P.shield-=s;dmg-=s;if(s>0){sShield();shieldFlash();HUD.hit(fx,fz,'s');}
  if(dmg>0){P.hull-=dmg;sHurt();HUD.hit(fx,fz,'h');CAMS.shake=Math.max(CAMS.shake,.3+dmg*.02);}
  if(P.hull<=0){P.hull=0;playerDown();}}
function addScore(n){if(G.mode==='demo')return;G.score+=n;ARC.score(G.score);}
/* ---- pickups: chip (gun tier), repair, shield, missiles, fuel ---- */
const PK=[],PKDEF={chip:{col:[1,.85,.2],name:'GUN TIER'},repair:{col:[.35,1,.45],name:'REPAIR'},shield:{col:[.4,.7,1],name:'SHIELD'},
  missile:{col:[1,.5,.2],name:'MISSILES'},fuel:{col:[.92,.95,1],name:'JET FUEL'}};
let PKG=null,PKB=null;
function dropPickup(x,z,kind){
  if(!kind){const r=Math.random();kind=r<.34?'chip':r<.58?'repair':r<.76?'missile':r<.9?'fuel':'shield';}
  if(kind==='chip'&&GUN.tier>=4)kind='missile';
  if(!PKG){PKG=new THREE.OctahedronGeometry(.55,0);PKB=new THREE.CylinderGeometry(.08,.08,14,6,1,true);PKB.translate(0,7,0);}
  const c=new THREE.Color(...PKDEF[kind].col),gem=new THREE.Mesh(PKG,new THREE.MeshBasicMaterial({color:c.clone().multiplyScalar(2.4)}));
  const beam=new THREE.Mesh(PKB,new THREE.MeshBasicMaterial({color:c.clone().multiplyScalar(.9),transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));
  const g=new THREE.Group();g.add(gem,beam);const cl=collide(x,z,.8);g.position.set(cl[0],hgt(cl[0],cl[1]),cl[1]);S.add(g);
  PK.push({kind,g,gem,beam,x:cl[0],z:cl[1],t:0,life:28});}
function updPickups(dt){for(let i=PK.length-1;i>=0;i--){const p=PK[i];p.t+=dt;p.gem.rotation.y+=dt*2.4;p.gem.position.y=1.4+Math.sin(p.t*3)*.25;
  p.g.visible=p.life-p.t>5||Math.sin(p.t*18)>0;
  if(!P.dead&&Math.hypot(P.x-p.x,P.z-p.z)<3.4){collect(p.kind);S.remove(p.g);PK.splice(i,1);continue;}
  if(p.t>p.life){S.remove(p.g);PK.splice(i,1);}}}
function collect(k){sPickup();
  if(k==='chip'){GUN.tier=Math.min(4,GUN.tier+1);HUD.msg('GUN TIER '+['','I','II','III','IV'][GUN.tier],1.6);}
  else if(k==='repair'){P.hull=Math.min(P.hullMax,P.hull+UP.repair);HUD.msg('REPAIR +'+UP.repair,1.2);}
  else if(k==='shield'){P.shield=P.shieldMax;HUD.msg('SHIELD FULL',1.2);}
  else if(k==='missile'){MSL.ammo=Math.min(MSL.max,MSL.ammo+6);HUD.msg('MISSILES +6',1.2);}
  else {P.fuel=P.cells;HUD.msg('JET FUEL FULL',1.2);}
  addScore(25);}
/* ---- enemy brains ---- */
function updEnemies(dt){
  NAV.t-=dt;if(NAV.t<=0||navCell(P.x,P.z)!==NAV.pc){navBuild();NAV.t=.5;}
  for(let i=BEACONS.length-1;i>=0;i--){const b=BEACONS[i];b.t-=dt;if(Math.random()<dt*30)part({x:b.x+(Math.random()-.5)*2,y:hgt(b.x,b.z)+.3,z:b.z+(Math.random()-.5)*2,vx:0,vy:8+Math.random()*6,vz:0,life:.5,s0:.9,s1:.3,a:1.4,col:[1,.2,.08],glow:true});if(b.t<=0)BEACONS.splice(i,1);}
  let alive=0;
  for(const e of EN){if(e.dead)continue;alive++;
    if(e.spawnT>0){e.spawnT-=dt;if(e.spawnT<=0){e.o.visible=true;dustPuff(e.x,e.z,8,e.d.r*.8);}continue;}
    e.t+=dt;e.cd-=dt;e.flash=Math.max(0,e.flash-dt*7);e.mat.emissive.setRGB(e.flash*1.4,e.flash*.5,e.flash*.3);
    const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz)||1,face=Math.atan2(-dx,-dz);let mvx=0,mvz=0,sp=e.d.speed,want=face;
    const tg=truckGoal(e,dist);
    if(tg){mvx=tg[0];mvz=tg[1];sp=tg[2];if(sp)want=Math.atan2(-mvx,-mvz);}
    else if(e.d.brain){const r=e.d.brain(e,dt,dist,dx,dz,face);mvx=r[0];mvz=r[1];sp=r[2];want=r[3];}
    else if(e.id==='lancer'){const r=lancerBrain(e,dt,dist,dx,dz);mvx=r[0];mvz=r[1];sp=r[2];want=face;}
    else if(e.id==='skitter'){
      if(dist>2.8){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);
        const s=Math.sin(e.t*3+e.phase)*.5;mvx+=-nd[1]*s;mvz+=nd[0]*s;}
      else if(e.cd<=0&&!P.dead){e.cd=1;hurtPlayer(4,e.x,e.z);sZap();sparks(lerp(e.x,P.x,.6),e.y+1.2,lerp(e.z,P.z,.6),6,[.6,.85,1]);}
    }else if(e.id==='hound'){
      if(e.st==='move'){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);if(dist<20&&dist>6&&e.cd<=0&&los(e.x,e.z)){e.st='aim';e.t=0;}}
      else if(e.st==='aim'){sp=0;want=face;if(e.t>.75){e.st='charge';e.t=0;e.cx=dx/dist;e.cz=dz/dist;sHowl();}}
      else if(e.st==='charge'){mvx=e.cx;mvz=e.cz;sp=26;want=Math.atan2(-mvx,-mvz);
        if(!P.dead&&dist<e.d.r+RAD+.4&&P.y-hgt(P.x,P.z)<1.6&&!e.hitDone){e.hitDone=true;hurtPlayer(18,e.x,e.z);P.vx+=e.cx*9;P.vz+=e.cz*9;}
        if(e.t>1.1){e.st='rest';e.t=0;e.hitDone=false;}}
      else{sp=1.5;mvx=dx/dist;mvz=dz/dist;if(e.t>1.3){e.st='move';e.cd=1.2+Math.random();}}
    }else{/* gunner: hold 24-42 m, strafe, shoot bursts when it can see you */
      const seen=los(e.x,e.z);e.strT-=dt;if(e.strT<=0){e.strafe*=-1;e.strT=2+Math.random()*2.5;}
      if(dist>42||!seen){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];}
      else if(dist<24){mvx=-dx/dist;mvz=-dz/dist;}
      else{mvx=-dz/dist*e.strafe;mvz=dx/dist*e.strafe;sp*=.7;}
      want=face;
      if(seen&&dist<55&&e.cd<=0&&!P.dead){e.burst=3;e.cd=2.4+Math.random();e.bt=0;}
      if(e.burst>0){e.bt-=dt;if(e.bt<=0){e.bt=.18;e.burst--;const mz=e.burst%2?e.mzR:e.mzL;mz.getWorldPosition(_w);
        const lead=dist/30*.6,tx=P.x+P.vx*lead,ty=P.y+3.2,tz=P.z+P.vz*lead;let ax=tx-_w.x,ay=ty-_w.y,az=tz-_w.z;const l=Math.hypot(ax,ay,az)||1;
        EBOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:ax/l*30,vy:ay/l*30,vz:az/l*30,life:2.4,dmg:8});sEShot();part({x:_w.x,y:_w.y,z:_w.z,vx:0,vy:0,vz:0,life:.08,s0:1.2,s1:.5,a:2,col:[1,.3,.1],glow:true});}}
    }
    /* move with separation from other machines, trunk collisions and knockback */
    for(const o of EN){if(o===e||o.dead||o.spawnT>0)continue;const ox=e.x-o.x,oz=e.z-o.z,rr=e.d.r+o.d.r,d2=ox*ox+oz*oz;if(d2<rr*rr&&d2>1e-4){const d=Math.sqrt(d2);mvx+=ox/d*(rr-d)/rr*1.5;mvz+=oz/d*(rr-d)/rr*1.5;}}
    if(dist<e.d.r+RAD&&!(e.st==='charge')){mvx-=dx/dist;mvz-=dz/dist;}
    e.vx+=(mvx*sp-e.vx)*damp(6,dt);e.vz+=(mvz*sp-e.vz)*damp(6,dt);
    let nx=e.x+(e.vx+e.kx)*dt,nz=e.z+(e.vz+e.kz)*dt;e.kx*=Math.exp(-dt*4);e.kz*=Math.exp(-dt*4);
    const c=e.d.fly?[nx,nz]:collide(nx,nz,e.d.r),B=BND();e.x=clamp(c[0],B.x0,B.x1);e.z=clamp(c[1],B.z0,B.z1);e.y=hgt(e.x,e.z)+(e.d.fly?e.alt:0);
    {const tr=e.d.turn||(e.st==='aim'?6:4);e.yaw+=clamp(angD(want,e.yaw),-dt*tr,dt*tr);}
    poseEnemy(e,dt,Math.hypot(e.vx,e.vz));
  }
  for(let i=EN.length-1;i>=0;i--)if(EN[i].dead)EN.splice(i,1);
  if(G.mode==='play'&&!P.dead&&!MISSION){if(alive===0&&BEACONS.length===0){G.breakT-=dt;if(G.breakT<=0){startWave();G.breakT=4;}}}
}
function poseEnemy(e,dt,sp){
  e.o.position.set(e.x,e.y,e.z);e.o.rotation.y=e.yaw;e.phase+=dt*(1.2+sp*(e.id==='skitter'?.9:e.id==='hound'?.42:.5));const ph=e.phase;
  if(e.d.pose){e.d.pose(e,dt,sp);return;}
  if(e.id==='skitter'){e.body.position.y=.95+Math.abs(Math.sin(ph*2))*.08;e.legs.forEach((L,i)=>{const s=(i===0||i===3)?1:-1;L.rotation.y=Math.sin(ph*2)*.35*s*Math.min(1,sp/3);L.rotation.x=Math.max(0,Math.cos(ph*2)*s)*.25*Math.min(1,sp/3);});}
  else if(e.id==='hound'){const run=Math.min(1,sp/6),aim=e.st==='aim'?1:0;e.body.position.y=1.75-aim*.35+Math.sin(ph*2)*.08*run;e.body.rotation.x=aim*.12;
    e.legs.forEach((L,i)=>{const o=i<2?0:Math.PI*.9,s=Math.sin(ph*2+o+(i%2)*.4);L.up.rotation.x=s*.65*run-aim*.3;L.kn.rotation.x=(i<2?-.35:.35)+Math.cos(ph*2+o)*.4*run;});
    EMAT.ered.color.setRGB(1,.12,.05).multiplyScalar(2.2);}
  else{const ln=e.id==='lancer',HY=ln?3.0:1.9,run=Math.min(1,sp/4);e.gp+=dt*sp/(ln?2.2:1.6);e.hips.position.y=HY-Math.abs(Math.sin(e.gp*TAU))*.07*run;e.torso.position.y=e.hips.position.y;
    e.legs.forEach(L=>{let u=(e.gp+(L.sd>0?.5:0))%1;let tz=0,lift=0;const S_=1.2*run;if(u<.5)tz=lerp(-S_/2,S_/2,u/.5);else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s);lift=Math.sin(Math.PI*s)*.35*run;}
      if(ln)legIK(L,-(2.95-.2-lift),tz*1.4,0,1.55,1.55,true);   /* the Lancer's knees bend backward */
      else legIK(L,-(1.85-.25-lift),tz,0,1,1,false);   /* gunner knees bend forward */});
    e.armR.rotation.x=e.armL.rotation.x=Math.atan2(P.y+(ln?3.2:2.6)-(e.y+(ln?3.55:2.85)),Math.hypot(P.x-e.x,P.z-e.z))*.9;}
}

/* speed pass: merge a machine's parts into one skinned mesh per material. Each joint node becomes a bone, so the animation code is unchanged,
   and a machine costs about 4-6 draw calls instead of about 20 (twice that with shadows). */
function skinify(root){root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),bones=[],bi=new Map(),groups=new Map();
  root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||!o.visible)return;const p=o.parent;if(!bi.has(p)){bi.set(p,bones.length);bones.push(p);}
    const a=o.geometry.attributes,key=o.material.uuid+(a.color?'c':'')+(a.uv?'u':'');if(!groups.has(key))groups.set(key,{m:o.material,list:[],cast:o.castShadow});groups.get(key).list.push(o);});
  if(bones.length<2)return;const made=[],M_=new THREE.Matrix4();
  for(const {m,list,cast} of groups.values()){
    const gs=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();for(const n of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(n))g.deleteAttribute(n);
      g.applyMatrix4(M_.multiplyMatrices(inv,o.matrixWorld));const c=g.attributes.position.count,si=new Uint16Array(c*4),sw=new Float32Array(c*4),b=bi.get(o.parent);
      for(let i=0;i<c;i++){si[i*4]=b;sw[i*4]=1;}g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));return g;});
    const merged=gs.length>1?THREE.mergeGeometries(gs,false):gs[0];if(!merged)continue;
    const sm=new THREE.SkinnedMesh(merged,m);sm.castShadow=cast;sm.receiveShadow=true;root.add(sm);made.push(sm);for(const o of list)o.parent.remove(o);}
  root.updateMatrixWorld(true);const sk=new THREE.Skeleton(bones);for(const sm of made)sm.bind(sk,sm.matrixWorld);}
