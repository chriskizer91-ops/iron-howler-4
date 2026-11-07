/* ===================== Ironhowl 4: the kit's own behaviours (session 3) =====================
   Each forearm fires its own weapon when you hold FIRE:
     AC-4 autocannon  Ironhowl 3's gun (06b_weapons.js): heat, VENT, tiers. One autocannon arm fires at 60 % of the pair's rate.
     LN-1 Lance       charges while FIRE is held (1.2 s) and fires by itself when full; let go early (past a quarter) for a weaker
                      shot. A rail shot: instant, 260 m, goes through up to 3 machines (100 %, 80 %, 60 % of 120 damage).
     AR-1 Arc         4 zaps a second at the machine nearest the crosshair within 35 m; each zap jumps on to the nearest machine
                      within 12 m of the last, up to 4 machines, 14 damage each.
   WT-1 Watcher (shoulder): radar (220 m), red marks on up to 8 machines, missile lock 40 % faster, a yellow warning at the screen
     edge for shots and Hound charges coming from outside your view.
   DR-1 assist drone: leaves the jet pack when machines come within 70 m and flies beside you; small gun (5 a shot, 3 a second,
     60 m); between fights it repairs the hull (2 a second); its own 40 shield, and when that breaks it goes home to recharge.
   JP-2 jet pack: keep holding JET after a hop and you hover (06_player.js): 30 s of hover per full tank, refilled on the ground. */
const LANCE={charge:1.2,dmg:120,range:260,pierce:3,fall:[1,.8,.6],cool:.35};
const ARCW={range:35,hop:12,jumps:4,dmg:14,rate:4,cone:.95};
const WATCH={radar:220,marks:8,lockK:.6};   /* lockK: lock time multiplier (40 % faster) */
const LOCK={time:.6,cone:.6,range:180};
const DRN={gun:5,rate:3,range:60,repair:2,shield:40,wake:70,recharge:4};
const KX={beams:[],bm:null,col:new THREE.Color(),m4:new THREE.Matrix4(),q:new THREE.Quaternion(),s:new THREE.Vector3(),p:new THREE.Vector3(),z:new THREE.Vector3(0,0,1),d:new THREE.Vector3()};
const _ka=new THREE.Vector3(),_kb=new THREE.Vector3();
function kitKind(i){const A=M&&M.ready&&M.arms[i];return A&&A.kind||'ac';}
function kitHas(id){return !!(M&&M.W&&Object.values(M.W.kit).includes(id));}

/* ---- beams: one instanced mesh of glowing cylinders for the rail shots, the lightning and the drone's repair beam ---- */
function kitFxInit(){if(KX.bm)return;const g=new THREE.CylinderGeometry(1,1,1,6,1,true);g.rotateX(Math.PI/2);
  const m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  KX.bm=new THREE.InstancedMesh(g,m,400);KX.bm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);KX.bm.setColorAt(0,KX.col.setRGB(0,0,0));
  KX.bm.count=0;KX.bm.frustumCulled=false;KX.bm.renderOrder=4;S.add(KX.bm);}
function beam(a,b,r,col,life){KX.beams.push({a:[a.x,a.y,a.z],b:[b.x,b.y,b.z],r,col,life,t:0});}
/* a jagged line from a to b: n pieces, each corner pushed sideways by up to j metres */
function bolt(a,b,r,col,life,j){const n=Math.max(3,Math.min(10,Math.round(a.distanceTo(b)/2.2)));let p=a.clone();
  for(let i=1;i<=n;i++){const q=i===n?b.clone():a.clone().lerp(b,i/n).add(new THREE.Vector3((Math.random()-.5)*2*j,(Math.random()-.5)*2*j,(Math.random()-.5)*2*j));
    beam(p,q,r,col,life);p=q;}}
function updBeams(dt){if(!KX.bm)kitFxInit();const L=KX.beams;let n=0;
  for(let i=L.length-1;i>=0;i--){const B=L[i];B.t+=dt;if(B.t>=B.life){L.splice(i,1);continue;}}
  for(const B of L){if(n>=400)break;const f=1-B.t/B.life,a=B.a,b=B.b;KX.d.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=KX.d.length();if(len<1e-3)continue;
    KX.p.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);KX.q.setFromUnitVectors(KX.z,KX.d.multiplyScalar(1/len));const r=B.r*(.4+.6*f);KX.s.set(r,r,len);
    KX.m4.compose(KX.p,KX.q,KX.s);KX.bm.setMatrixAt(n,KX.m4);KX.bm.setColorAt(n,KX.col.setRGB(B.col[0]*f,B.col[1]*f,B.col[2]*f));n++;}
  KX.bm.count=n;KX.bm.instanceMatrix.needsUpdate=true;if(KX.bm.instanceColor)KX.bm.instanceColor.needsUpdate=true;}
function sRail(k){nz('highpass',5200,700,.5,.42*k+.12,1.4);thump(110,34,.35,.5*k+.15,0,0);tone('sawtooth',1400,90,.32,.07);}
function sCharge(){tone('sine',180,1100,LANCE.charge,.05);}
function sArc(){nz('bandpass',4200,1500,.09,.11,3);tone('square',1900,700,.06,.025);}
let HOVS=0;function updHoverFx(dt){if(!P.hovering)return;HOVS-=dt;if(HOVS<=0){HOVS=.38;nz('bandpass',420,760,.45,.1,.8);}}
function sWarn(){tone('square',1320,1320,.07,.05);setTimeout(()=>tone('square',1320,1320,.07,.05),110);}

/* ---- the forearms: called from updGun every frame ---- */
function kitArms(c,dt){if(!M||!M.ready)return;const hold=c.fire&&!P.dead;let lances=0;
  M.arms.forEach((A,i)=>{if(A.kind==='ln')lanceArm(A,hold,dt,lances++);else if(A.kind==='ar')arcArm(A,hold,dt,i);});}
function lanceArm(A,hold,dt,k){A.cd=Math.max(0,(A.cd||0)-dt);if(A.ch==null)A.ch=0;
  if(hold&&A.cd<=0){if(!A.chg){A.chg=true;A.ch=k?-.125:0;if(!k)sCharge();}A.ch=Math.min(1,A.ch+dt/LANCE.charge*(UP.chargeK||1));if(A.ch>=1)railShot(A,1);}
  else if(!hold&&A.chg){A.chg=false;if(A.ch>=.25)railShot(A,A.ch);A.ch=0;}
  else if(!hold)A.ch=0;
  /* the charge: a glow at the muzzle that grows, and sparks drawn into it */
  if(!A.glow){A.glow=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.8,1).multiplyScalar(4),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    A.glow.renderOrder=5;A.muzzle.add(A.glow);}
  const ch=Math.max(0,A.ch||0);A.glow.visible=ch>0;if(ch>0){const s=.08+ch*.32+(ch>=.99?Math.random()*.06:0);A.glow.scale.setScalar(s/Math.max(1e-3,A.muzzle.getWorldScale(_kb).x));A.glow.material.opacity=.5+ch*.5;
    if(Math.random()<dt*40*ch){A.muzzle.getWorldPosition(_ka);const a=Math.random()*TAU,b=Math.random()*TAU,r=1.2;
      part({x:_ka.x+Math.cos(a)*r,y:_ka.y+Math.sin(b)*r,z:_ka.z+Math.sin(a)*r,vx:-Math.cos(a)*r*5,vy:-Math.sin(b)*r*5,vz:-Math.sin(a)*r*5,life:.2,s0:.25,s1:.05,a:1.5,col:[.55,.8,1],glow:true});}}}
function railShot(A,k){A.muzzle.getWorldPosition(_ka);const s=_ka.clone();
  const d=new THREE.Vector3(AIM.x-s.x,AIM.y-s.y,AIM.z-s.z);if(d.lengthSq()<1)d.set(-Math.sin(P.yaw),0,-Math.cos(P.yaw));d.normalize();
  /* where it stops: the ground or a tree trunk (2 m steps, then 0.25 m) */
  let len=LANCE.range;for(let t=2;t<=LANCE.range;t+=2){const x=s.x+d.x*t,y=s.y+d.y*t,z=s.z+d.z*t;if(y<hgt(x,z)||treeAt(x,z,y)){let u=t-2;while(u<t){u+=.25;const x2=s.x+d.x*u,y2=s.y+d.y*u,z2=s.z+d.z*u;if(y2<hgt(x2,z2)||treeAt(x2,z2,y2))break;}len=u;break;}}
  const e1=s.clone().addScaledVector(d,len);
  const hits=[];for(const e of EN){if(e.dead||e.spawnT>0)continue;const t=segSphere(s.x,s.y,s.z,e1.x,e1.y,e1.z,e.x,e.y+e.d.cy,e.z,e.d.r*1.1);if(t>=0)hits.push([t,e]);}
  hits.sort((a,b)=>a[0]-b[0]);const dmg=LANCE.dmg*k*UP.dmgK*(UP.railK||1);
  hits.slice(0,LANCE.pierce+(UP.pierce||0)).forEach(([t,e],i)=>{const hx=s.x+(e1.x-s.x)*t,hy=s.y+(e1.y-s.y)*t,hz=s.z+(e1.z-s.z)*t;
    hurtEnemy(e,dmg*(LANCE.fall[i]||.6),hx,hy,hz);e.kx+=d.x*6*k;e.kz+=d.z*6*k;sparks(hx,hy,hz,10,[.6,.85,1]);});
  const tg=hitTargets(s.x,s.y,s.z,e1.x,e1.y,e1.z);if(tg)hurtTarget(tg,dmg);
  if(hits.length)GUN.hitT=.2;
  /* the beam: a white core in a blue sleeve, a flash at the muzzle and where it lands */
  beam(s,e1,.09+.07*k,[2.2,2.4,2.6],.22+.12*k);beam(s,e1,.3+.2*k,[.25,.55,1.3],.3+.15*k);
  for(let i=0;i<3;i++)part({x:s.x+d.x*i*.6,y:s.y+d.y*i*.6,z:s.z+d.z*i*.6,vx:0,vy:0,vz:0,life:.1,s0:1.8-i*.4,s1:.6,a:2,col:[.7,.9,1],glow:true});
  if(len<LANCE.range-1){sparks(e1.x,e1.y+.1,e1.z,8,[.6,.85,1]);part({x:e1.x,y:e1.y+.3,z:e1.z,vx:0,vy:1,vz:0,life:.9,s0:1,s1:3,a:.35,col:DUST,drag:1.5});}
  A.kick=1.6;CAMS.shake=Math.max(CAMS.shake,.18+.15*k);MFL.position.copy(s);GUN.flash=1;sRail(k);A.ch=0;A.chg=false;A.cd=LANCE.cool;}
function arcArm(A,hold,dt,i){if(A.cd==null)A.cd=i?.5/ARCW.rate:0;A.cd-=dt;if(!hold){A.cd=Math.max(A.cd,i?.5/ARCW.rate:0);return;}
  if(A.cd>0)return;A.cd+=1/ARCW.rate;if(A.cd<0)A.cd=0;arcZap(A);}
function arcZap(A){A.muzzle.getWorldPosition(_ka);const s=_ka.clone(),fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  const ok=e=>!e.dead&&e.spawnT<=0;
  /* first: the machine under the crosshair if it is close enough, otherwise the one nearest the crosshair line in front of you */
  let first=AIM.e&&ok(AIM.e)&&Math.hypot(AIM.e.x-P.x,AIM.e.z-P.z)<ARCW.range+AIM.e.d.r?AIM.e:null;
  if(!first){let best=1e9;for(const e of EN){if(!ok(e))continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>ARCW.range+e.d.r)continue;
    const ang=Math.acos(clamp((dx*fx+dz*fz)/(d||1),-1,1));if(ang>ARCW.cone)continue;const sc=ang+d/80;if(sc<best){best=sc;first=e;}}}
  const col=[.35,.6,1.9],pts=[s];
  if(!first){/* nothing to hit: a short crackle toward the crosshair, or the nearest spawner pod or target */
    let tg=null,bd=ARCW.range;for(const t of TARGETS){if(t.dead)continue;const q=t.spheres[0],d=Math.hypot(q[0]-P.x,q[2]-P.z)-q[3];if(d<bd){const ang=Math.acos(clamp(((q[0]-P.x)*fx+(q[2]-P.z)*fz)/(Math.hypot(q[0]-P.x,q[2]-P.z)||1),-1,1));if(ang<ARCW.cone){bd=d;tg=t;}}}
    if(tg){const q=tg.spheres[0],p=new THREE.Vector3(q[0],q[1],q[2]);bolt(s,p,.07,col,.11,.7);hurtTarget(tg,ARCW.dmg*UP.dmgK);sparks(p.x,p.y,p.z,4,[.6,.85,1]);}
    else{const p=new THREE.Vector3(AIM.x,AIM.y,AIM.z).sub(s);p.setLength(Math.min(9,p.length()));p.add(s);bolt(s,p,.05,col,.08,.6);}
    sArc();return;}
  const hit=[first];let cur=first;
  while(hit.length<ARCW.jumps+(UP.jumps||0)){let nx=null,bd=ARCW.hop;for(const e of EN){if(!ok(e)||hit.includes(e))continue;const d=Math.hypot(e.x-cur.x,e.z-cur.z)-e.d.r-cur.d.r;if(d<bd){bd=d;nx=e;}}
    if(!nx)break;hit.push(nx);cur=nx;}
  let p=s;for(const e of hit){const q=new THREE.Vector3(e.x+(Math.random()-.5)*e.d.r*.6,e.y+e.d.cy*(.6+Math.random()*.6),e.z+(Math.random()-.5)*e.d.r*.6);
    bolt(p,q,.07,col,.11,Math.min(1.4,.08*p.distanceTo(q)+.3));bolt(p,q,.025,[1.6,1.8,2.2],.08,.3);
    hurtEnemy(e,ARCW.dmg*UP.dmgK,q.x,q.y,q.z);sparks(q.x,q.y,q.z,4,[.6,.85,1]);p=q;}
  part({x:s.x,y:s.y,z:s.z,vx:0,vy:0,vz:0,life:.08,s0:1.3,s1:.5,a:1.8,col:[.6,.8,1],glow:true});A.kick=.4;GUN.hitT=.12;sArc();}

/* ---- missile lock (MP-9): a machine near the crosshair for 0.6 s is locked (0.36 s with the Watcher); missiles at locked
   machines turn hard, missiles at others turn gently, and with nothing in front they fly at the crosshair ---- */
function updLock(dt){const T=LOCK.time*(kitHas('watcher')?WATCH.lockK:1)*(UP.lockK||1);cam.getWorldDirection(_kb);
  for(const e of EN){if(e.dead||e.spawnT>0){e.lk=0;continue;}const ex=e.x-cam.position.x,ey=e.y+e.d.cy-cam.position.y,ez=e.z-cam.position.z,d=Math.hypot(ex,ey,ez);
    const a=Math.acos(clamp((ex*_kb.x+ey*_kb.y+ez*_kb.z)/(d||1),-1,1));e.lka=a;const inC=MSL.ammo>0&&kitHas('mpod')&&a<LOCK.cone&&d<LOCK.range;
    const was=(e.lk||0)>=1;e.lk=inC?Math.min(1,(e.lk||0)+dt/T):Math.max(0,(e.lk||0)-dt*2);if(!was&&e.lk>=1)tone('sine',1500,1700,.05,.03);}}
function lockCands(){return EN.filter(e=>!e.dead&&e.spawnT<=0&&e.lka<LOCK.cone&&Math.hypot(e.x-P.x,e.z-P.z)<LOCK.range).sort((a,b)=>((b.lk>=1)-(a.lk>=1))||(a.lka-b.lka));}

/* ---- the Watcher's warnings: a yellow arc at the screen edge before a shot or a charge reaches you ---- */
let WARN_T=0;
function updWarn(dt){WARN_T-=dt;if(!kitHas('watcher')||P.dead)return;const cx=P.x,cy=P.y+3,cz=P.z;
  for(const b of EBOLTS){if(b.warned)continue;const rx=cx-b.x,ry=cy-b.y,rz=cz-b.z,v2=b.vx*b.vx+b.vy*b.vy+b.vz*b.vz||1,t=(rx*b.vx+ry*b.vy+rz*b.vz)/v2;
    if(t<0||t>1.1)continue;const mx=b.x+b.vx*t-cx,my=b.y+b.vy*t-cy,mz=b.z+b.vz*t-cz;if(mx*mx+my*my+mz*mz>16)continue;
    b.warned=true;if(Math.abs(angD(Math.atan2(-(b.x-P.x),-(b.z-P.z)),P.yaw))<.6)continue;   /* only shots from outside your view */
    HUD.warn(b.x-b.vx*.2,b.z-b.vz*.2);if(WARN_T<=0){WARN_T=.5;sWarn();}}
  for(const e of EN){if(e.dead)continue;if(e.st==='aim'&&e.id==='hound'){if(!e.warned){e.warned=true;if(Math.abs(angD(Math.atan2(-(e.x-P.x),-(e.z-P.z)),P.yaw))<.6)continue;HUD.warn(e.x,e.z);if(WARN_T<=0){WARN_T=.5;sWarn();}}}else if(e.st!=='charge')e.warned=false;}}

/* ---- the assist drone ---- */
const DR={st:'dock',hold:null,P:null,sh:DRN.shield,cd:0,tg:null,t:0,pos:new THREE.Vector3(),fix:0,rep:0};
function droneDockNow(){const h=DR.hold;if(!h)return;const dock=M&&M.W&&M.W.holds.bk&&M.W.holds.bk.getObjectByName('drone_dock');
  if(dock&&h.parent!==dock){dock.add(h);}h.position.set(0,0,0);h.quaternion.identity();h.scale.set(1,1,1);DR.st='dock';DR.fix=0;}
function updDrone(dt){const h=M&&M.ready&&M.W&&M.W.holds.drone;
  if(h!==DR.hold||DR.P!==P){if(DR.hold&&DR.hold!==h&&DR.hold.parent)DR.hold.parent.remove(DR.hold);DR.hold=h||null;DR.P=P;DR.sh=DRN.shield;droneDockNow();}
  if(!h)return;const dock=M.W.holds.bk&&M.W.holds.bk.getObjectByName('drone_dock');if(!dock)return;
  const live=(G.mode==='play'&&!G.paused)||G.mode==='demo';if(!live){if(G.mode!=='play'&&DR.st!=='dock')droneDockNow();return;}
  if(P.dead){if(DR.st!=='dock')droneDockNow();return;}
  DR.t+=dt;DR.cd-=dt;
  const near=EN.some(e=>!e.dead&&e.spawnT<=0&&Math.hypot(e.x-P.x,e.z-P.z)<DRN.wake),fix=!near&&P.hull<P.hullMax;
  if(DR.st==='dock'){DR.sh=Math.min(DRN.shield,DR.sh+DRN.recharge*dt);
    if((near||fix)&&DR.sh>=DRN.shield*.5){h.updateMatrixWorld(true);S.attach(h);DR.st='fly';DR.pos.copy(h.position);sJet();}
    return;}
  /* where it wants to be: beside your right shoulder, a little ahead; when repairing it circles you slowly */
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);let want=new THREE.Vector3();
  const goHome=DR.st==='home'||(!near&&!fix);
  if(goHome){dock.getWorldPosition(want);}
  else if(fix){const a=DR.t*.6;want.set(P.x+Math.cos(a)*4.2,P.y+5.2+Math.sin(DR.t*1.7)*.3,P.z+Math.sin(a)*4.2);}
  else want.set(P.x+rx*2.7-fx*.4,P.y+7.8+Math.sin(DR.t*2.1)*.3,P.z+rz*2.7-fz*.4);   /* above your right shoulder: on screen on a phone too */
  const k=damp(goHome?4.5:3,dt);h.position.lerp(want,k);
  /* face the target (or the way you face), lean into the flight */
  let tg=null;if(near&&!goHome){tg=AIM.e&&!AIM.e.dead&&Math.hypot(AIM.e.x-h.position.x,AIM.e.z-h.position.z)<DRN.range?AIM.e:null;
    if(!tg){let bd=DRN.range;for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-h.position.x,e.z-h.position.z);if(d<bd){bd=d;tg=e;}}}}
  DR.tg=tg;const yaw=tg?Math.atan2(-(tg.x-h.position.x),-(tg.z-h.position.z)):goHome?P.yaw:P.yaw;
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0));if(goHome){dock.getWorldQuaternion(q);}h.quaternion.slerp(q,damp(6,dt));
  const gun=h.getObjectByName('gun');
  if(tg){const mz=h.getObjectByName('muzzle')||h;mz.getWorldPosition(_ka);const ty=tg.y+tg.d.cy,d=Math.hypot(tg.x-_ka.x,tg.z-_ka.z);
    if(gun)gun.rotation.x=clamp(Math.atan2(ty-_ka.y,d),-1,.4);
    if(DR.cd<=0){DR.cd=1/DRN.rate;let ax=tg.x-_ka.x,ay=ty-_ka.y,az=tg.z-_ka.z;const l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
      BOLTS.push({x:_ka.x,y:_ka.y,z:_ka.z,vx:ax*BOLT.speed,vy:ay*BOLT.speed,vz:az*BOLT.speed,life:(DRN.range+10)/BOLT.speed,dmg:DRN.gun*UP.dmgK*(UP.droneK||1)});
      part({x:_ka.x+ax*.2,y:_ka.y+ay*.2,z:_ka.z+az*.2,vx:0,vy:0,vz:0,life:.06,s0:.7,s1:.3,a:2,col:[1,.75,.4],glow:true});nz('bandpass',2600,900,.05,.08,1);}}
  else if(gun)gun.rotation.x*=1-damp(4,dt);
  /* repairs: a green beam to your hull */
  if(fix&&!goHome&&h.position.distanceTo(want)<2.5){P.hull=Math.min(P.hullMax,P.hull+DRN.repair*(UP.repairK||1)*dt);const rp=h.getObjectByName('repair')||h;rp.getWorldPosition(_ka);
    _kb.set(P.x+(Math.random()-.5)*1.5,P.y+3+Math.random()*1.5,P.z+(Math.random()-.5)*1.5);beam(_ka,_kb,.05,[.3,1.6,.55],.07);
    if(Math.random()<dt*14)part({x:_kb.x,y:_kb.y,z:_kb.z,vx:0,vy:1,vz:0,life:.5,s0:.4,s1:.1,a:1.4,col:[.4,1,.5],glow:true});
    DR.rep+=dt;if(DR.rep>2.5){DR.rep=0;HUD.msg('DRONE REPAIRING',1);}}
  /* its shield: enemy shots that pass close hit the drone instead */
  if(DR.st==='fly')for(let i=EBOLTS.length-1;i>=0;i--){const b=EBOLTS[i],dx=b.x-h.position.x,dy=b.y-h.position.y,dz=b.z-h.position.z;if(dx*dx+dy*dy+dz*dz<1.1){
    DR.sh-=b.dmg;EBOLTS.splice(i,1);sparks(b.x,b.y,b.z,5,[.5,.8,1]);if(DR.sh<=0){DR.sh=0;DR.st='home';HUD.msg('DRONE SHIELD DOWN · RETURNING',1.4);sShield();}}}
  /* home: dock when it reaches the jet pack */
  if(goHome){dock.getWorldPosition(_kb);if(h.position.distanceTo(_kb)<.35){droneDockNow();return;}}
  /* fans: a little tilt into the direction of flight */
  for(const n of ['fan_L','fan_R']){const f=h.getObjectByName(n);if(f)f.rotation.x=Math.sin(DR.t*9+(n==='fan_L'?0:1))*.04-(goHome?0:.12);}}

/* ---- the Watcher's HUD: radar, marks, the lock brackets; the Lance's charge bar ---- */
const KH={marks:[],rt:0};
function kitHud(){if(!P||!M||!M.ready)return;const W=kitHas('watcher'),hasM=kitHas('mpod');
  /* lance charge bar under the crosshair, only while charging */
  let ch=0;for(const A of M.arms)if(A.kind==='ln')ch=Math.max(ch,A.ch||0);
  HUD.set('lch','cls',ch>0?(ch>=.99?'on full':'on'):'');HUD.set('lchb','width',Math.round(ch*100)+'%');
  /* the heat bar belongs to the autocannon */
  const ac=M.arms.some(A=>A.kind==='ac'||!A.kind);$('heat').style.visibility=ac?'':'hidden';
  /* radar (Watcher) */
  const rd=$('radar');rd.style.display=W&&G.mode==='play'?'block':'none';
  if(W&&G.mode==='play'&&(KH.rt-=1/60)<=0){KH.rt=.1;const cv=rd,g=cv.getContext('2d'),w=cv.width,r=w/2-3,k=r/WATCH.radar;g.clearRect(0,0,w,w);
    g.fillStyle='rgba(8,14,18,.55)';g.beginPath();g.arc(w/2,w/2,r,0,TAU);g.fill();g.strokeStyle='rgba(124,240,255,.35)';g.lineWidth=1;
    for(const f of [1,.5]){g.beginPath();g.arc(w/2,w/2,r*f,0,TAU);g.stroke();}
    const sw=(G.t*1.6)%TAU;g.fillStyle='rgba(124,240,255,.10)';g.beginPath();g.moveTo(w/2,w/2);g.arc(w/2,w/2,r,sw-.5,sw);g.fill();
    const c=Math.cos(P.yaw),s=Math.sin(P.yaw),pt=(x,z)=>{const dx=x-P.x,dz=z-P.z,u=dx*c-dz*s,v=dx*s+dz*c;return [w/2+u*k,w/2+v*k,Math.hypot(dx,dz)];};
    if(MISSION&&!MS.done){const st=MISSION.steps[MS.step],p=st&&stepPos(st);if(p){let [x,y,d]=pt(p.x,p.z);if(d>WATCH.radar){x=w/2+(x-w/2)*WATCH.radar/d;y=w/2+(y-w/2)*WATCH.radar/d;}g.fillStyle='#7cf0ff';g.fillRect(x-2.5,y-2.5,5,5);}}
    for(const t of TARGETS){if(t.dead)continue;const [x,y,d]=pt(t.x,t.z);if(d>WATCH.radar)continue;g.fillStyle='#ff9a3a';g.fillRect(x-3,y-3,6,6);}
    for(const e of EN){if(e.dead||e.spawnT>0)continue;const [x,y,d]=pt(e.x,e.z);if(d>WATCH.radar)continue;const z=e.d.boss?3.6:e.id==='skitter'?1.6:2.4;
      g.fillStyle=e.d.boss?'#ffd76a':'#ff4a3a';g.beginPath();g.arc(x,y,z,0,TAU);g.fill();}
    g.fillStyle='#fff';g.beginPath();g.moveTo(w/2,w/2-5);g.lineTo(w/2+3.5,w/2+4);g.lineTo(w/2-3.5,w/2+4);g.closePath();g.fill();}
  /* marks: the Watcher marks up to 8 machines on screen (bosses and gunners first); without it only the missile lock shows */
  let list=[];if(G.mode==='play'){for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);
    if(W?d<WATCH.radar:hasM&&(e.lk||0)>.02)list.push([e,(e.d.boss?0:e.id==='gunner'?1e3:2e3)+d]);}}
  list.sort((a,b)=>a[1]-b[1]);list=list.slice(0,W?WATCH.marks:4);
  while(KH.marks.length<8){const el=document.createElement('div');el.className='mk';el.innerHTML='<i></i>';document.body.appendChild(el);KH.marks.push(el);}
  KH.marks.forEach((el,i)=>{const it=list[i];if(!it){if(el.style.display!=='none')el.style.display='none';return;}const e=it[0],sc=e.d.sc||1;
    _ka.set(e.x,e.y+e.d.cy+e.d.r*.9+.6,e.z).project(cam);if(_ka.z>1||Math.abs(_ka.x)>1.05||Math.abs(_ka.y)>1.05){el.style.display='none';return;}
    el.style.display='block';el.style.transform='translate('+((_ka.x*.5+.5)*innerWidth).toFixed(0)+'px,'+((-_ka.y*.5+.5)*innerHeight).toFixed(0)+'px)';
    const lk=e.lk||0,cls='mk'+(e.d.boss?' boss':'')+(lk>=1?' lock':lk>.02?' locking':'')+(DR.tg===e?' dr':'');if(el.className!==cls)el.className=cls;
    el.style.setProperty('--lk',lk.toFixed(2));});}
if(DEV){const I=window.__ih4||(window.__ih4={});Object.assign(I,{DR,LANCE,ARCW,KX,kitHas});
  Object.defineProperties(I,{M:{get:()=>M},AIM:{get:()=>AIM}});}   /* getters: M is made later */
