/* ===================== session 7: Hornet, Tank, Mortar crawler, Bulwark; shared artillery marks; fire, lightning, searchlights; capture points;
   the Stag, the Maw and FORGE. Models: models/mech/{hornet,tank,mortar,bulwark,stag,maw,forge}.glb (blender/build_set7.py) ===================== */
/* ---- artillery marks: a red disc on the ground, then a blast. Used by Mortar crawlers, the Stag, FORGE and the searchlights ---- */
const MARKS=[];
function mortarAt(x,z,delay,dmg,r){const B=BND();x=clamp(x,B.x0,B.x1);z=clamp(z,B.z0,B.z1);MARKS.push({x,z,t:delay,dmg:dmg||22,r:r||4.6,m:warnDisc(x,z)});}
function volley(n,spread,delay,dmg,lead){for(let i=0;i<n;i++){const a=Math.random()*TAU,r=i?3+Math.random()*spread:0;mortarAt(P.x+Math.cos(a)*r+P.vx*(lead||.9),P.z+Math.sin(a)*r+P.vz*(lead||.9),delay+i*.07,dmg);}}
function updMarks(dt){for(let i=MARKS.length-1;i>=0;i--){const k=MARKS[i];k.t-=dt;k.m.material.opacity=.25+.45*Math.abs(Math.sin(k.t*(k.t<.6?20:8)));
  if(k.t<=0){const y=hgt(k.x,k.z);boom(k.x,y+.5,k.z,.9);sBoom(.35);if(Math.hypot(P.x-k.x,P.z-k.z)<k.r+.3&&P.y-hgt(P.x,P.z)<2.5)hurtPlayer(k.dmg,k.x,k.z);
    S.remove(k.m);k.m.material.dispose();MARKS.splice(i,1);}}}
function clearMarks(){for(const k of MARKS){S.remove(k.m);k.m.material.dispose();}MARKS.length=0;}
const fwdOf=yaw=>[-Math.sin(yaw),-Math.cos(yaw)];
/* hits from the front of a shielded or armoured machine: x,z is where the shot landed (falls back to the player's position) */
function frontDot(e,x,z){if(x==null){x=P.x;z=P.z;}const dx=x-e.x,dz=z-e.z,d=Math.hypot(dx,dz)||1,f=fwdOf(e.yaw);return (dx*f[0]+dz*f[1])/d;}
function eBolt(from,tx,ty,tz,speed,dmg,o){let ax=tx-from.x,ay=ty-from.y,az=tz-from.z;const l=Math.hypot(ax,ay,az)||1;
  EBOLTS.push(Object.assign({x:from.x,y:from.y,z:from.z,vx:ax/l*speed,vy:ay/l*speed,vz:az/l*speed,life:3,dmg},o||{}));}
function flashAt(p,s){part({x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,life:.09,s0:s||1.4,s1:.5,a:2,col:[1,.35,.1],glow:true});}
/* ---------------- Hornet: flying drone. Circles you high up, dives, fires its stinger, climbs away ---------------- */
EDEF.hornet={hp:45,r:1.4,cy:0,speed:13,score:120,drop:.25,file:'hornet',sc:1.15,scrap:12,fly:true,boom:.9,turn:5,
  init(e,N){e.body=N('body');e.rot=[0,1,2,3].map(i=>N('rot'+i));e.mz=N('mz');e.alt=9;e.st='hover';e.orb=Math.random()*TAU;},
  brain(e,dt,dist,dx,dz,face){let mvx=0,mvz=0,sp=e.d.speed,altT=11;
    if(e.st==='hover'){e.orb+=dt*.5*e.strafe;const tx=P.x+Math.cos(e.orb)*24,tz=P.z+Math.sin(e.orb)*24,ox=tx-e.x,oz=tz-e.z,od=Math.hypot(ox,oz)||1;
      mvx=ox/od*Math.min(1,od/6);mvz=oz/od*Math.min(1,od/6);if(e.cd<=0&&dist<42&&!P.dead){e.st='dive';e.t=0;e.shots=3;e.bt=0;}}
    else if(e.st==='dive'){altT=4.5;mvx=dx/dist;mvz=dz/dist;sp=15;if(dist<20||e.t>2.4){e.bt-=dt;sp=4;
        if(e.bt<=0&&e.shots>0){e.bt=.14;e.shots--;e.mz.getWorldPosition(_w);eBolt(_w,P.x+P.vx*.3,P.y+3,P.z+P.vz*.3,34,6);sEShot();flashAt(_w,.9);}
        if(e.shots<=0){e.st='climb';e.t=0;e.cd=3.4+Math.random()*1.5;}}}
    else{altT=13;mvx=-dx/dist;mvz=-dz/dist;sp=12;if(e.t>1.3)e.st='hover';}
    e.alt+=(altT-e.alt)*damp(1.6,dt);return [mvx,mvz,sp,face];},
  pose(e,dt,sp){for(const r of e.rot)r.rotation.y+=dt*40;const f=fwdOf(e.yaw),fs=e.vx*f[0]+e.vz*f[1];
    e.body.rotation.x=-clamp(fs*.025,-.35,.35);e.body.position.y=Math.sin(e.phase*2)*.15;}};
/* ---------------- Tank: heavy cannon on a slow turret. The front armour takes a third of the damage: hit it from the side or the back ---------------- */
EDEF.tank={hp:420,r:2.7,cy:1.4,speed:3.4,score:600,drop:.8,chip:.6,file:'tank',sc:1,scrap:60,turn:.8,boom:2,
  init(e,N){e.tur=N('turret');e.gun=N('gun');e.mz=N('mz');e.wheels=[];for(const s of 'LR')for(let i=0;i<6;i++){const w=N('w'+s+i);if(w)e.wheels.push(w);}e.tyaw=0;e.rec=0;},
  armor(e,x,z){const f=frontDot(e,x,z);return f>.55?.33:f<-.5?1.5:1;},
  brain(e,dt,dist,dx,dz,face){const seen=los(e.x,e.z);let mvx=0,mvz=0,sp=e.d.speed,want=face;
    if(dist>62||!seen){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);}
    else if(dist<26){mvx=-dx/dist;mvz=-dz/dist;sp*=.8;want=face;}
    /* turret turns on its own toward you (1.1 rad/s) */
    const tw=angD(face-e.yaw,e.tyaw);e.tyaw+=clamp(tw,-dt*1.1,dt*1.1);
    if(seen&&dist<85&&e.cd<=0&&Math.abs(tw)<.08&&!P.dead){e.cd=4.4+Math.random();e.rec=1;e.mz.getWorldPosition(_w);
      const g=7,spd=44,t=dist/spd,vy=((P.y+2.6)-_w.y)/t+.5*g*t;const f=fwdOf(e.yaw+e.tyaw);
      EBOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:f[0]*spd,vy,vz:f[1]*spd,life:3.5,dmg:24,g,s:2.4});
      sBoom(.45);flashAt(_w,3);for(let i=0;i<5;i++)part({x:_w.x,y:_w.y,z:_w.z,vx:f[0]*4+(Math.random()-.5)*2,vy:1+Math.random(),vz:f[1]*4+(Math.random()-.5)*2,life:1,s0:1.5,s1:3.5,a:.5,col:[.35,.33,.3]});}
    return [mvx,mvz,sp,want];},
  pose(e,dt,sp){e.tur.rotation.y=e.tyaw;e.rec=Math.max(0,e.rec-dt*2.5);e.gun.position.z=e.rec*.6;const s=Math.hypot(e.vx,e.vz);for(const w of e.wheels)w.rotation.x-=s*dt/.38;}};
/* ---------------- Mortar crawler: six legs, stays 50-90 m away, lobs shells that land on red discs ---------------- */
EDEF.mortar={hp:260,r:2.6,cy:1.8,speed:3.2,score:500,drop:.6,file:'mortar',sc:1,scrap:50,turn:1.6,boom:1.6,
  init(e,N){e.body=N('body');e.legs=[0,1,2,3,4,5].map(i=>N('leg'+i));e.tube=N('tube');e.mz=N('mz');e.rec=0;},
  brain(e,dt,dist,dx,dz,face){let mvx=0,mvz=0,sp=e.d.speed;
    if(dist<46){mvx=-dx/dist;mvz=-dz/dist;}else if(dist>92){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];}else sp=0;
    if(dist<110&&e.cd<=0&&!P.dead){e.cd=7+Math.random()*2;e.rec=1;volley(3,6,2.2,22,1.4);e.mz.getWorldPosition(_w);sBoom(.3);flashAt(_w,2.2);
      for(let i=0;i<6;i++)part({x:_w.x,y:_w.y,z:_w.z,vx:(Math.random()-.5)*2,vy:6+Math.random()*3,vz:(Math.random()-.5)*2,life:1.4,s0:1.4,s1:4,a:.5,col:[.3,.28,.26]});}
    return [mvx,mvz,sp,face];},
  pose(e,dt,sp){const run=Math.min(1,sp/3);e.body.position.y=1.7+Math.sin(e.phase*3)*.06*run;e.legs.forEach((L,i)=>{const s=Math.sin(e.phase*3+(i%2?Math.PI:0)+(i>>1)*.6);
    L.rotation.x=s*.32*run;L.rotation.z=(i%2?-1:1)*Math.max(0,Math.cos(e.phase*3+(i%2?Math.PI:0)+(i>>1)*.6))*.18*run;});
    e.rec=Math.max(0,e.rec-dt*2);e.tube.rotation.x=-.32-e.rec*.12;e.tube.position.y=.75-e.rec*.25;}};
/* ---------------- Bulwark: a big shield in front. Shots from the front do almost nothing: walk round it, hop over, or use missiles ---------------- */
EDEF.bulwark={hp:380,r:1.9,cy:2.5,speed:3.6,score:550,drop:.7,chip:.4,file:'bulwark',sc:1,scrap:55,turn:1.0,boom:1.6,
  init(e,N){e.hips=N('hips');e.torso=N('torso');e.armR=N('armR');e.armL=N('armL');e.mzR=N('mzR');e.gp=0;
    e.legs=[-1,1].map(sd=>{const s=sd<0?'L':'R';return {thigh:N('thigh_'+s),knee:N('knee_'+s),ankle:N('ankle_'+s),sd};});},
  armor(e,x,z){if(frontDot(e,x,z)>.35){if(Math.random()<.5)sparks(e.x-Math.sin(e.yaw)*1.6,e.y+2.6,e.z-Math.cos(e.yaw)*1.6,3,[.8,.9,1]);return .1;}return 1;},
  brain(e,dt,dist,dx,dz,face){let mvx=0,mvz=0,sp=e.d.speed;const seen=los(e.x,e.z);
    if(e.st==='bash'){sp=0;if(e.t>.35&&!e.hitDone){e.hitDone=true;if(dist<e.d.r+RAD+2.2&&P.y-hgt(P.x,P.z)<2){hurtPlayer(18,e.x,e.z);P.vx+=dx/dist*12;P.vz+=dz/dist*12;CAMS.shake=.6;}thump(70,35,.25,.5,400,.3);}
      if(e.t>1){e.st='move';e.cd=2.2;e.hitDone=false;}return [0,0,0,face];}
    if(dist>6){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];}
    if(dist<7.5&&e.cd<=0){e.st='bash';e.t=0;}
    else if(seen&&dist>8&&dist<30&&e.cd<=0&&!P.dead){e.cd=2.8+Math.random();e.mzR.getWorldPosition(_w);sEShot();flashAt(_w,1.6);
      for(let i=0;i<5;i++)eBolt(_w,P.x+(Math.random()-.5)*4,P.y+2.6+(Math.random()-.5)*2,P.z+(Math.random()-.5)*4,30,4);}
    return [mvx,mvz,sp,face];},
  pose(e,dt,sp){const run=Math.min(1,sp/3.5),bash=e.st==='bash'?Math.sin(Math.min(1,e.t/.35)*Math.PI/2):0;e.gp+=dt*sp/1.7;
    e.hips.position.y=2.0-Math.abs(Math.sin(e.gp*TAU))*.08*run;e.torso.position.y=e.hips.position.y;e.torso.rotation.x=-.08-bash*.25;e.armL.rotation.x=-bash*.5;
    e.legs.forEach(L=>{let u=(e.gp+(L.sd>0?.5:0))%1;let tz=0,lift=0;const S_=1.1*run;if(u<.5)tz=lerp(-S_/2,S_/2,u/.5);else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s);lift=Math.sin(Math.PI*s)*.3*run;}
      legIK(L,-(1.95-.3-lift),tz,0,1.05,1.05,false);});
    e.armR.rotation.x=Math.atan2(P.y+2.6-(e.y+3.2),Math.hypot(P.x-e.x,P.z-e.z))*.9;}};
/* ---------------- weather and set dressing per mission ---------------- */
const WX={fire:[],bolt:null,boltT:4,showT:0,flash:0,lights:[],hemi0:1};
function buildWeather(L){
  WX.hemi0=HEMI.intensity;
  if(L.fire){/* trees on fire: 46 trunks picked at random, away from where you start */
    const all=[],rnd=mulberry(9);for(const a of VEG.cols.values())for(const c of a)if(!c.b&&c.r>.3&&Math.hypot(c.x-SPAWN.x,c.z-SPAWN.z)>30)all.push(c);
    for(let i=0;i<80&&all.length;i++){const c=all.splice((rnd()*all.length)|0,1)[0];WX.fire.push([c.x,c.z,Math.min(14,c.h||9)]);}
    /* one glow point per burning tree and one merged light pool under them: two draw calls in all */
    const pos=[],pools=[];for(const f of WX.fire){const y=hgt(f[0],f[1]);pos.push(f[0],y+f[2]*.45,f[1]);const g=new THREE.PlaneGeometry(26,26);g.rotateX(-Math.PI/2);g.translate(f[0],y+.1,f[1]);pools.push(g);}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    WX.glow=new THREE.Points(pg,new THREE.PointsMaterial({map:poolTex(),size:16,sizeAttenuation:true,color:new THREE.Color(1,.45,.12).multiplyScalar(1.6),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    WX.glow.frustumCulled=false;S.add(WX.glow);
    const pm=new THREE.Mesh(THREE.mergeGeometries(pools),new THREE.MeshBasicMaterial({map:poolTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.42,.12).multiplyScalar(.9)}));
    pm.renderOrder=2;pm.frustumCulled=false;S.add(pm);}
  if(L.storm){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(3*2*14),3));
    WX.bolt=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:new THREE.Color(2.5,2.6,3),transparent:true,opacity:1,fog:false}));WX.bolt.visible=false;WX.bolt.frustumCulled=false;S.add(WX.bolt);}}
function updWeather(dt){const L=LOOKNOW||{};
  if(WX.glow)WX.glow.material.opacity=.75+.25*Math.sin(G.t*9)*Math.sin(G.t*5.3);
  if(WX.fire.length){for(const f of WX.fire){const dx=f[0]-P.x,dz=f[1]-P.z;if(dx*dx+dz*dz>90*90)continue;f[2]+=dt;
      if(Math.random()<dt*9)part({x:f[0]+(Math.random()-.5)*3,y:2+Math.random()*f[2],z:f[1]+(Math.random()-.5)*3,vx:0,vy:3+Math.random()*3,vz:0,life:.8,s0:3.4,s1:.7,a:1.3,col:[1,.42+Math.random()*.2,.1],glow:true});
      if(Math.random()<dt*1.6)part({x:f[0],y:f[2]+Math.random()*4,z:f[1],vx:1,vy:2.5,vz:.4,life:4,s0:4,s1:10,a:.35,col:[.12,.1,.09]});}
    if(Math.random()<dt*14)part({x:cam.position.x+(Math.random()-.5)*30,y:cam.position.y-6+Math.random()*4,z:cam.position.z+(Math.random()-.5)*30,vx:(Math.random()-.5),vy:2+Math.random()*2,vz:(Math.random()-.5),life:2.5,s0:.25,s1:.1,a:1.6,col:[1,.5,.15],glow:true});}
  if(WX.bolt){WX.flash=Math.max(0,WX.flash-dt*5);HEMI.intensity=WX.hemi0*(1+WX.flash*4);WX.showT-=dt;WX.bolt.visible=WX.showT>0&&Math.random()<.8;
    WX.boltT-=dt;if(WX.boltT<=0){WX.boltT=6+Math.random()*7;WX.showT=.24;WX.flash=1;
      /* a strike somewhere 18-70 m from you; machines within 7 m of it take 140 damage */
      const a=Math.random()*TAU,r=18+Math.random()*52,x=P.x+Math.cos(a)*r,z=P.z+Math.sin(a)*r,y=hgt(x,z),p=WX.bolt.geometry.attributes.position;let px=x,py=y,pz=z;
      for(let i=0;i<14;i++){const ny=y+(i+1)*9,nx=x+(Math.random()-.5)*7*(i>0),nz=z+(Math.random()-.5)*7*(i>0);p.setXYZ(i*2,px,py,pz);p.setXYZ(i*2+1,nx,ny,nz);px=nx;py=ny;pz=nz;}
      p.needsUpdate=true;boom(x,y+.5,z,1.4);setTimeout(()=>thump(38,18,1.4,.75,180,.55),r*8);
      for(const e of EN)if(!e.dead&&Math.hypot(e.x-x,e.z-z)<7)hurtEnemy(e,140,x,y,z);}}
  if(WX.lights.length)updLights(dt);}
/* ---------------- searchlight towers (mission 11): if the light finds you, FORGE calls in shells ---------------- */
function makeSearchlight(x,z){const y=hgt(x,z),g=new THREE.Group();g.position.set(x,y,z);S.add(g);const gm=tmat('24-gunmetal'),h=16;
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const l=new THREE.Mesh(new THREE.BoxGeometry(.35,h,.35),gm);l.position.set(a*1.4,h/2,b*1.4);l.castShadow=true;g.add(l);}
  const top=new THREE.Mesh(new THREE.BoxGeometry(4,1.2,4),tmat('54-forge-armour'));top.position.y=h;g.add(top);
  const lampM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.95,.8).multiplyScalar(4)}),lamp=new THREE.Mesh(new THREE.CylinderGeometry(.8,1,1.2,14),lampM);lamp.position.y=h+1.2;g.add(lamp);
  const coneG=new THREE.ConeGeometry(7,1,24,1,true);coneG.translate(0,-.5,0);
  const cone=new THREE.Mesh(coneG,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.95,.8),transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
  cone.frustumCulled=false;S.add(cone);const pg=new THREE.CircleGeometry(7,32);pg.rotateX(-Math.PI/2);
  const pool=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({map:poolTex(),transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.95,.8).multiplyScalar(1.4)}));pool.renderOrder=3;S.add(pool);
  addBox(x-2,z-2,x+2,z+2,h);
  const L={x,z,y,h,cone,pool,lamp,a:Math.random()*TAU,spotT:0};WX.lights.push(L);
  return addTarget({x,z,y,hpMax:380,spheres:[[x,y+h+.6,z,2.6],[x,y+h*.5,z,2.2]],obj:g,light:L,die(){L.dead=true;S.remove(cone);S.remove(pool);lampM.color.setRGB(.05,.05,.05);g.rotation.z=.25;}});}
function updLights(dt){for(const L of WX.lights){if(L.dead)continue;L.a+=dt*.35;
  /* the beam sweeps a figure-eight; it drifts toward you when you are near */
  let gx=L.x+Math.sin(L.a)*26,gz=L.z+Math.sin(L.a*2)*16;const pd=Math.hypot(P.x-L.x,P.z-L.z);if(pd<48){gx=lerp(gx,P.x,.6);gz=lerp(gz,P.z,.6);}
  const gy=hgt(gx,gz),top=new THREE.Vector3(L.x,L.y+L.h+1.2,L.z),len=Math.hypot(gx-L.x,gy-top.y,gz-L.z);
  L.cone.position.copy(top);L.cone.scale.set(1,len,1);L.cone.lookAt(gx,gy,gz);L.cone.rotateX(-Math.PI/2);L.pool.position.set(gx,gy+.12,gz);
  const lit=Math.hypot(P.x-gx,P.z-gz)<7&&!P.dead;L.spotT=lit?L.spotT+dt:Math.max(0,L.spotT-dt);
  if(lit&&L.spotT>.6&&(L.callT=(L.callT||0)-dt)<=0){L.callT=2.6;volley(3,5,1.7,18,1.1);if(!L.told){L.told=1;radio([['FORGE','TARGET ILLUMINATED.']]);}}}}
/* ---------------- capture points (mission 10): stand inside each one until it fills ---------------- */
function captureBegin(s,first){if(!first&&MS.caps)return;MS.caps=s.points.map(p=>{const y=hgt(p[0],p[1]),ring=zoneRing(p[0],p[1],s.r,[1,.6,.2]);
  const pil=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,9,10),tmat('24-gunmetal'));pil.position.set(p[0],y+4.5,p[1]);pil.castShadow=true;S.add(pil);
  const lm=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.5,.15).multiplyScalar(3)}),lamp=new THREE.Mesh(new THREE.SphereGeometry(.8,12,8),lm);lamp.position.set(p[0],y+9.4,p[1]);S.add(lamp);addCol(p[0],p[1],.8,9);
  return {x:p[0],z:p[1],prog:0,done:false,ring,lm};});MS.waveT=6;MS.wi=0;}
function captureStep(s,dt){let n=0,cur=null;for(const c of MS.caps){if(c.done){n++;continue;}
    if(Math.hypot(P.x-c.x,P.z-c.z)<s.r&&!P.dead){c.prog+=dt/s.time;cur=c;c.ring.material.opacity=.45+.4*Math.abs(Math.sin(G.t*6));
      if(c.prog>=1){c.done=true;c.ring.material.color.setRGB(.3,.8,1);c.lm.color.setRGB(.3,.8,1).multiplyScalar(3);sPickup();HUD.msg('RELAY TAKEN',2);radio([['ROOK',['One relay is ours.','Two down. One to go!','That is all three!'][n]]]);n++;}}}
  MS.waveT-=dt;if(MS.waveT<=0){MS.waveT=s.every;const w=s.waves[MS.wi%s.waves.length];MS.wi++;const t=cur||MS.caps.find(c=>!c.done)||MS.caps[0];spawnGroup(w,t.x,t.z,[44,64]);}
  const next=cur||MS.caps.filter(c=>!c.done).sort((a,b)=>Math.hypot(P.x-a.x,P.z-a.z)-Math.hypot(P.x-b.x,P.z-b.z))[0];
  return {txt:s.label+' '+n+'/'+MS.caps.length+(cur?' · '+Math.floor(cur.prog*100)+'%':''),ok:n===MS.caps.length,pos:next||null};}
/* ---------------- boss helpers ---------------- */
function partT(node,hp,r,die,extra){const t=addTarget(Object.assign({x:BOSS.x,z:BOSS.z,y:0,hpMax:hp,spheres:[[BOSS.x,5,BOSS.z,r]],node,die},extra||{}));(BOSS.parts=BOSS.parts||[]).push(t);return t;}
function followParts(){BOSS.o.updateMatrixWorld(true);for(const t of BOSS.parts){if(t.dead)continue;t.node.getWorldPosition(_w);const q=t.spheres[0];q[0]=_w.x;q[1]=_w.y;q[2]=_w.z;t.x=_w.x;t.z=_w.z;t.y=_w.y-3;}}
function pushOut(x,z,r,hmax){const ox=P.x-x,oz=P.z-z,od=Math.hypot(ox,oz);if(od<r&&od>.01&&P.y-hgt(P.x,P.z)<(hmax||5)){P.x=x+ox/od*r;P.z=z+oz/od*r;}}
function bossBase(x,z,file){const g=BOSS_TPL?BOSS_TPL.clone(true):new THREE.Group();g.position.set(x,hgt(x,z),z);S.add(g);const N=n=>g.getObjectByName(n)||new THREE.Group();
  Object.assign(BOSS,{o:g,x,z,yaw:Math.atan2(-(P.x-x),-(P.z-z)),dead:false,deadT:0,walk:0,idle:true,parts:[],t:0});return N;}
function bossDie(B,lines){B.dead=true;CAMS.shake=1;for(let i=0;i<10;i++)setTimeout(()=>boom(B.x+(Math.random()-.5)*12,3+Math.random()*8,B.z+(Math.random()-.5)*12,1.9),i*200);radio(lines);clearMarks();}
function walkLegs(B,dt,sp,amp){B.walk+=dt*sp*.09;for(let i=0;i<B.legs.length;i++){const ph=B.walk*TAU+((i===0||i===3)?0:Math.PI);B.legs[i].rotation.x=Math.sin(ph)*amp*Math.min(1,sp/2);}}
const pct=t=>Math.max(0,Math.ceil(t.hp/t.hpMax*100))+'%';
/* ---------------- the Stag (mission 9): antler pods first, then the chest furnace. Artillery volleys, a stomp when you are close, a charge when it is hurt ---------------- */
function makeStag(x,z){const N=bossBase(x,z),B=BOSS;
  Object.assign(B,{kind:'stag',body:N('body'),head:N('head'),plate:N('plate'),mzA:N('mzA'),mzB:N('mzB'),legs:['FL','FR','BL','BR'].map(s=>N('hip'+s)),volT:4,spawnT:14,stompT:3,chargeT:8,st:'walk'});
  const ant=n=>partT(N('ant'+n),600,1.5,()=>{const k=B.ants.filter(a=>a.dead).length;CAMS.shake=.7;radio([['ROOK',k<2?'One antler gone!':'Both antlers gone! Its chest is opening!']]);});
  B.ants=[ant('L'),ant('R')];B.chestT=null;}
function stagIdle(dt){const B=BOSS;B.head.rotation.y=Math.sin(G.t*.5)*.4;B.body.position.y=8.6+Math.sin(G.t)*.1;}
function stagStep(s,dt){const B=BOSS;B.idle=false;B.t+=dt;const A=B.ants.filter(a=>!a.dead).length;
  if(!A&&!B.chestT){B.chestT=partT(N0(B,'chest'),1500,1.8,()=>bossDie(B,[['FORGE','THE HERD... IS BROKEN.'],['ROOK','The Stag is down! Fire is spreading, move!']]));}
  if(B.dead){B.deadT+=dt;B.body.position.y=Math.max(2.5,B.body.position.y-dt*3);B.body.rotation.z=Math.min(.3,B.body.rotation.z+dt*.2);
    return {txt:'THE STAG IS DOWN',ok:B.deadT>2.6,pos:{x:B.x,z:B.z}};}
  const dx=P.x-B.x,dz=P.z-B.z,d=Math.hypot(dx,dz)||1,face=Math.atan2(-dx,-dz);let sp=0,dir=face;
  if(B.st==='charge'){sp=22;dir=B.cdir;B.ct+=dt;if(!B.hit&&d<6&&P.y-hgt(P.x,P.z)<3){B.hit=1;hurtPlayer(32,B.x,B.z);P.vx+=dx/d*14;P.vz+=dz/d*14;CAMS.shake=.9;}
    if(B.ct>1.8){B.st='walk';B.chargeT=9;}}
  else if(B.st==='aim'){B.ct+=dt;B.head.rotation.x=Math.min(.45,B.ct*.6);if(B.ct>1){B.st='charge';B.ct=0;B.hit=0;B.cdir=face;sHowl();}}
  else if(B.st==='stomp'){B.ct+=dt;const k=Math.min(1,B.ct/1.1);B.ring.scale.setScalar(.2+k*.8);B.ring.material.opacity=.3+.5*k;B.body.rotation.x=-k*.18;
    if(B.ct>1.1){B.st='walk';B.stompT=6;S.remove(B.ring);B.body.rotation.x=0;dustPuff(B.x,B.z,30,8);thump(44,20,.8,.8,220,.5);CAMS.shake=1;
      if(d<17&&P.y-hgt(P.x,P.z)<1.6){hurtPlayer(28,B.x,B.z);P.vx+=dx/d*12;P.vz+=dz/d*12;}}}
  else{B.head.rotation.x=Math.max(0,B.head.rotation.x-dt);
    if(d>50)sp=4.6;else if(d<26){sp=3.2;dir=face+Math.PI;}
    B.stompT-=dt;B.chargeT-=dt;
    if(d<18&&B.stompT<=0){B.st='stomp';B.ct=0;B.ring=zoneRing(B.x,B.z,17,[1,.15,.05]);B.ring.position.y+=.2;}
    else if(!A&&B.chargeT<=0&&d<70){B.st='aim';B.ct=0;}}
  /* facing: turns toward you except while backing off */
  B.yaw+=clamp(angD(face,B.yaw),-dt*.7,dt*.7);
  if(sp){const f=fwdOf(dir);B.x+=f[0]*sp*dt;B.z+=f[1]*sp*dt;const Bd=BND();B.x=clamp(B.x,Bd.x0+8,Bd.x1-8);B.z=clamp(B.z,Bd.z0+8,Bd.z1-8);}
  walkLegs(B,dt,sp,.3);B.o.position.set(B.x,hgt(B.x,B.z),B.z);B.o.rotation.y=B.yaw;B.body.position.y=8.6+Math.sin(B.walk*TAU*2)*.15*Math.min(1,sp/3);
  B.head.rotation.y=clamp(angD(face,B.yaw),-.6,.6);
  /* artillery from the twin guns on its back */
  B.volT-=dt;if(B.volT<=0&&B.st!=='charge'){B.volT=A?6.2:4.6;volley(A?6:8,10,1.8,22,1);for(const m of [B.mzA,B.mzB]){m.getWorldPosition(_w);flashAt(_w,3);part({x:_w.x,y:_w.y,z:_w.z,vx:0,vy:6,vz:0,life:1.5,s0:2,s1:5,a:.5,col:[.3,.28,.26]});}sBoom(.5);}
  B.spawnT-=dt;if(B.spawnT<=0){B.spawnT=A?18:14;spawnGroup({hornet:A?2:3},B.x,B.z,[6,12]);}
  if(!A){B.plate.rotation.x=Math.min(1.4,B.plate.rotation.x+dt);}
  followParts();for(const L of B.legs){_v.set(0,-7.7,0);L.localToWorld(_v);pushOut(_v.x,_v.z,1.8,6);}
  const pos=B.chestT&&!B.chestT.dead?B.chestT:B.ants.find(a=>!a.dead);
  return {txt:A?s.label+' · ANTLERS '+(2-A)+'/2':'HIT THE CHEST FURNACE · '+pct(B.chestT),ok:false,pos};}
function N0(B,n){return B.o.getObjectByName(n)||new THREE.Group();}
/* ---------------- the Maw (mission 11): the mouth core can only be hurt while the jaw is open. Side guns can be shot off ---------------- */
function makeMaw(x,z){const N=bossBase(x,z),B=BOSS;
  Object.assign(B,{kind:'maw',body:N('body'),jaw:N('jaw'),mzL:N('mzL'),mzR:N('mzR'),legs:['FL','FR','BL','BR'].map(s=>N('hip'+s)),jawT:5,jawK:0,open:0,fanT:0,biteT:4,callT:16,st:'walk',burst:[0,0],bcd:[2,3]});
  const tur=n=>partT(N('tur'+n),450,1.6,()=>{radio([['ROOK','Side gun is scrap!']]);});B.turs=[tur('L'),tur('R')];
  B.core=partT(N('mouth'),2400,1.8,()=>bossDie(B,[['FORGE','THE MAW... FALLS SILENT.'],['ROOK','Lockdown is broken. Foundry 4 is next.']]),{immune:()=>B.open<.55});}
function mawIdle(dt){const B=BOSS;B.body.position.y=6.2+Math.sin(G.t*.7)*.1;}
function mawStep(s,dt){const B=BOSS;B.idle=false;const turs=B.turs.filter(t=>!t.dead).length;
  if(B.dead){B.deadT+=dt;B.body.position.y=Math.max(3,B.body.position.y-dt*2.5);B.jaw.rotation.x=Math.max(-.6,B.jaw.rotation.x-dt);return {txt:'THE MAW IS DOWN',ok:B.deadT>2.6,pos:{x:B.x,z:B.z}};}
  const dx=P.x-B.x,dz=P.z-B.z,d=Math.hypot(dx,dz)||1,face=Math.atan2(-dx,-dz);let sp=0;
  B.yaw+=clamp(angD(face,B.yaw),-dt*.6,dt*.6);
  /* jaw cycle: growl, open for 3.6 s and spray bolts, close */
  B.jawT-=dt;if(B.st==='walk'&&B.jawT<=0){B.st='open';B.ct=0;sHowl();radio([['ROOK','The jaw is opening. Shoot inside!']]);}
  if(B.st==='open'){B.ct+=dt;B.open=Math.min(1,B.open+dt*1.8);B.fanT-=dt;
    if(B.open>.8&&B.fanT<=0){B.fanT=.85;B.core.node.getWorldPosition(_w);sEShot();flashAt(_w,4);for(let i=-4;i<=4;i++){const a=B.yaw+i*.16,f=fwdOf(a);EBOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:f[0]*26,vy:((P.y+2.6)-_w.y)/Math.max(8,d)*26,vz:f[1]*26,life:3,dmg:7,s:1.6});}}
    if(B.ct>3.6){B.st='walk';B.jawT=turs?8.5:6;}}
  else{B.open=Math.max(0,B.open-dt*2);
    if(B.st==='bite'){B.ct+=dt;if(B.ct<.7)B.body.position.y=6.2-B.ct*.8;else{sp=24;if(!B.hit&&d<9&&P.y-hgt(P.x,P.z)<3){B.hit=1;hurtPlayer(36,B.x,B.z);P.vx+=dx/d*14;P.vz+=dz/d*14;CAMS.shake=1;}if(B.ct>1.1){B.st='walk';B.biteT=7;}}}
    else{if(d>15)sp=3.4;B.biteT-=dt;if(d<15&&B.biteT<=0){B.st='bite';B.ct=0;B.hit=0;sHowl();}}}
  B.jaw.rotation.x=-B.open*.75;
  if(sp){const f=fwdOf(B.yaw),c=collide(B.x+f[0]*sp*dt,B.z+f[1]*sp*dt,4.5),Bd=BND();B.x=clamp(c[0],Bd.x0+8,Bd.x1-8);B.z=clamp(c[1],Bd.z0+8,Bd.z1-8);}
  walkLegs(B,dt,sp,.28);B.o.position.set(B.x,hgt(B.x,B.z),B.z);B.o.rotation.y=B.yaw;if(B.st==='walk')B.body.position.y=lerp(B.body.position.y,6.2+Math.sin(B.walk*TAU*2)*.15,damp(4,dt));
  /* side guns: three-shot bursts when they can see you */
  B.turs.forEach((t,i)=>{if(t.dead)return;B.bcd[i]-=dt;if(B.bcd[i]<=0&&d<70&&los(B.x,B.z)){B.bcd[i]=3+Math.random();B.burst[i]=3;}
    if(B.burst[i]>0&&(B['bt'+i]=(B['bt'+i]||0)-dt)<=0){B['bt'+i]=.18;B.burst[i]--;(i?B.mzR:B.mzL).getWorldPosition(_w);eBolt(_w,P.x+P.vx*.4,P.y+3,P.z+P.vz*.4,30,7);sEShot();}});
  B.callT-=dt;if(B.callT<=0){B.callT=22;spawnGroup({hound:2},B.x,B.z,[10,16]);}
  followParts();pushOut(B.x,B.z,7.5,9);
  return {txt:'BRING DOWN THE MAW · '+(B.open>.55?'MOUTH OPEN! SHOOT INSIDE':'WAIT FOR THE JAW')+' · '+pct(B.core),ok:false,pos:B.core};}
/* ---------------- FORGE (mission 12): three phases. Pylons hold its shield up; then the furnace; then the eye ---------------- */
function makeForge(x,z){const N=bossBase(x,z),B=BOSS;B.yaw=Math.PI;B.o.rotation.y=Math.PI;
  Object.assign(B,{kind:'forge',gear:N('gear'),doorL:N('doorL'),doorR:N('doorR'),phase:1,spT:4,spin:0,sp:0,volT:8,waveT:20,beamT:9,beam:null,lavaT:4,wi:0});
  /* the shield dome and its four pylons */
  const dome=new THREE.Mesh(new THREE.SphereGeometry(19,32,16,0,TAU,0,Math.PI/2),new THREE.MeshBasicMaterial({color:new THREE.Color(1,.25,.1),transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  dome.position.set(x,hgt(x,z),z);S.add(dome);B.dome=dome;
  B.pylons=[[-52,-36],[52,-36],[-40,16],[40,16]].map(([px,pz])=>{const y=hgt(px,pz),g=new THREE.Group();g.position.set(px,y,pz);S.add(g);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2.2,10,12),tmat('54-forge-armour'));body.position.y=5;body.castShadow=true;g.add(body);
    const lm=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.2,.06).multiplyScalar(3)}),orb=new THREE.Mesh(new THREE.SphereGeometry(1.3,14,10),lm);orb.position.y=11;g.add(orb);
    const bg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(px,y+11,pz),new THREE.Vector3(x,hgt(x,z)+14,z)]);
    const line=new THREE.Line(bg,new THREE.LineBasicMaterial({color:new THREE.Color(2.5,.5,.2),transparent:true,opacity:.8,fog:false}));S.add(line);addBox(px-2,pz-2,px+2,pz+2,10);
    return addTarget({x:px,z:pz,y,hpMax:500,spheres:[[px,y+11,pz,1.9],[px,y+5,pz,2.2]],die(){S.remove(line);lm.color.setRGB(.06,.02,.02);g.rotation.x=.2;radio([['ROOK',['One pylon down.','Two pylons.','One pylon left!','Shield is down! Hit the furnace!'][B.pylons.filter(p=>p.dead).length-1]]]);}});});
  B.furnace=null;B.eye=null;}
function forgeIdle(dt){const B=BOSS;B.gear.rotation.y+=dt*.3;}
function forgeSpiral(B,arms,speed,dmg){const y=hgt(B.x,B.z)+3.2;for(let i=0;i<arms;i++){const a=B.spin+i*TAU/arms,f=fwdOf(a);   /* starts on a ring outside FORGE's own collider */
  EBOLTS.push({x:B.x+f[0]*15,y,z:B.z+f[1]*15,vx:f[0]*speed,vy:-.4,vz:f[1]*speed,life:6,dmg,s:1.5});}B.spin+=.21;}
function forgeStep(s,dt){const B=BOSS;B.idle=false;
  const alive=B.pylons.filter(p=>!p.dead).length;
  if(B.phase===1&&!alive){B.phase=2;S.remove(B.dome);CAMS.shake=.8;B.furnace=partT(N0(B,'furnace'),2000,2.6,()=>{B.phase=3;CAMS.shake=1;radio([['FORGE','YOU WILL NOT TOUCH THE EYE.'],['ROOK','The eye! Hop over the red beam!']]);
      B.eye=partT(N0(B,'eye'),2200,2,()=>bossDie(B,[['FORGE','UNIT 07... YOU... ARE...'],['ROOK','Foundry 4 is silent. Howl, bring her home.']]));});radio([['FORGE','SHIELD LOST. OPENING THE FURNACE.']]);}
  if(B.dead){B.deadT+=dt;B.gear.rotation.y+=dt*(4-B.deadT);if(Math.random()<dt*8)boom(B.x+(Math.random()-.5)*20,2+Math.random()*16,B.z+(Math.random()-.5)*14,1.6);
    if(B.beam)B.beam.visible=false;return {txt:'FORGE IS DOWN',ok:B.deadT>4,pos:{x:B.x,z:B.z}};}
  const ph=B.phase,d=Math.hypot(P.x-B.x,P.z-B.z);B.gear.rotation.y+=dt*(ph===3?2.4:.5);
  if(B.dome)B.dome.material.opacity=.1+.06*Math.sin(G.t*3);
  if(ph>=2){B.doorL.position.x=Math.max(-4.2,B.doorL.position.x-dt*2);B.doorR.position.x=Math.min(4.2,B.doorR.position.x+dt*2);}
  /* spiral bursts of bolts from the eye */
  B.spT-=dt;if(B.spT<=0){B.spT=ph===1?8:ph===2?6:5;B.spLeft=ph===1?3.2:4;}
  if(B.spLeft>0){B.spLeft-=dt;if((B.spShot=(B.spShot||0)-dt)<=0){B.spShot=ph===3?.1:.13;forgeSpiral(B,ph===1?6:8,ph===3?22:19,6);if(Math.random()<.3)sEShot();}}
  /* phase 2+: shells; phase 3: lava bursts and the sweeping beam */
  if(ph>=2){B.volT-=dt;if(B.volT<=0){B.volT=ph===2?7:9;volley(6,9,1.8,22,1);sBoom(.5);}}
  if(ph===3){B.lavaT-=dt;if(B.lavaT<=0){B.lavaT=3;for(let i=0;i<3;i++){const a=Math.random()*TAU,r=6+Math.random()*16;mortarAt(P.x+Math.cos(a)*r,P.z+Math.sin(a)*r,1.4,20,5);}}
    B.beamT-=dt;if(!B.beam){const g=new THREE.BoxGeometry(.5,.5,1);g.translate(0,0,-.5);B.beam=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.08,.03).multiplyScalar(1.6),transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));B.beam.visible=false;B.beam.frustumCulled=false;S.add(B.beam);}
    if(B.beamT<=0&&!B.bs){B.bs={t:0,a0:Math.atan2(-(P.x-B.x),-(P.z-B.z))-1.4};radio([['ROOK','Beam! Jump!']]);}
    if(B.bs){const k=B.bs;k.t+=dt;const warm=k.t<1.2,a=warm?k.a0:k.a0+(k.t-1.2)/2.4*2.8,len=85;B.beam.visible=true;B.beam.position.set(B.x,hgt(B.x,B.z)+1.6,B.z);B.beam.rotation.y=a;
      B.beam.scale.set(warm?.25:2.2,warm?.25:2.2,len);B.beam.material.opacity=warm?.5+.4*Math.sin(G.t*30):.95;
      if(!warm){const pa=Math.atan2(-(P.x-B.x),-(P.z-B.z)),prev=k.prev==null?a:k.prev;if(Math.abs(angD(pa,(a+prev)/2))<Math.abs(a-prev)/2+.03&&d<len&&P.y-hgt(P.x,P.z)<2.2&&!k.hit){k.hit=1;hurtPlayer(30,B.x,B.z);}k.prev=a;
        if(Math.random()<dt*30){const r=8+Math.random()*60,f=fwdOf(a);sparks(B.x+f[0]*r,hgt(B.x+f[0]*r,B.z+f[1]*r)+.5,B.z+f[1]*r,2,[1,.4,.1]);}}
      if(k.t>3.6){B.bs=null;B.beam.visible=false;B.beamT=9;}}}
  /* waves from the yard gates */
  B.waveT-=dt;if(B.waveT<=0){B.waveT=ph===1?24:20;const W=[{skitter:4,bulwark:1},{hound:2,hornet:2},{tank:1,skitter:3},{mortar:1,bulwark:1,skitter:2}],w=W[B.wi++%W.length],gx=(Math.random()<.5?-1:1)*70;spawnGroup(w,gx,30,[0,14]);}
  if(Math.random()<dt*3)part({x:B.x+(Math.random()-.5)*9,y:20,z:B.z+(Math.random()-.5)*6,vx:0,vy:4,vz:0,life:3,s0:3,s1:8,a:.4,col:[.14,.12,.11]});
  followParts();
  let txt,pos;if(ph===1){txt='DESTROY THE SHIELD PYLONS '+(4-alive)+'/4';pos=B.pylons.filter(p=>!p.dead).sort((a,b)=>Math.hypot(P.x-a.x,P.z-a.z)-Math.hypot(P.x-b.x,P.z-b.z))[0];}
  else if(ph===2){txt='HIT THE FURNACE · '+pct(B.furnace);pos=B.furnace;}else{txt='HIT THE EYE · '+pct(B.eye);pos=B.eye;}
  return {txt,ok:false,pos};}
const BOSS_DEF={thresher:{make:(x,z)=>makeThresher(x,z),step:(s,dt)=>bossStep(s,dt),idle:dt=>bossIdle(dt)},
  stag:{make:makeStag,step:stagStep,idle:stagIdle},maw:{make:makeMaw,step:mawStep,idle:mawIdle},forge:{make:makeForge,step:forgeStep,idle:forgeIdle}};
