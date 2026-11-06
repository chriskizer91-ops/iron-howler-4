/* ===================== weapons: autocannon tiers I-IV with heat and vent, missile salvos ===================== */
const GUN={tier:1,base:1,heat:0,over:false,cd:0,side:0,cool:0,ventCd:0,flash:0,hitT:0,
  rate:[0,6,7,8,9],dmg:[0,11,8.5,7.2,6.6],spread:[0,.004,.006,.02,.009]};
const HEAT={shot:2.3,cool:30,delay:.45,resume:38};
const MSL={ammo:12,max:24,salvo:2,cd:0};
const BOLTS=[],EBOLTS=[],MISS=[];
/* SALVO: 14 auto-aimed rounds from the shoulder pods at the nearest machines all around you (even behind), then a 12 s cooldown.
   It does not use the gun's heat, and it works in the air, so you can hop away and salvo at the same time. */
const SALVO={cd:0,cool:12,n:14,left:0,t:0,dmg:16,range:48};
const BOLT={speed:150,range:170};
let BM=null,EBM=null,MSM=null,MFL=null;
const _v=new THREE.Vector3(),_w=new THREE.Vector3(),_m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_up=new THREE.Vector3(0,1,0),_z=new THREE.Vector3(0,0,1);
function buildWeapons(){
  const g=new THREE.CylinderGeometry(.1,.1,1,6,1,true);g.rotateX(Math.PI/2);
  BM=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.78,.4).multiplyScalar(3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),160);
  const g2=new THREE.SphereGeometry(.22,10,6);g2.scale(1,1,2.6);
  EBM=new THREE.InstancedMesh(g2,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.22,.08).multiplyScalar(3.2),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),220);
  const g3=new THREE.CylinderGeometry(.09,.12,.9,8);g3.rotateX(Math.PI/2);
  MSM=new THREE.InstancedMesh(g3,hookWorld(new THREE.MeshStandardMaterial({color:0xd8d8d0,roughness:.5,metalness:.4})),40);
  for(const m of [BM,EBM,MSM]){m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);S.add(m);}
  BM.renderOrder=EBM.renderOrder=4;
  MFL=new THREE.PointLight(0xffb060,0,22,1.6);S.add(MFL);
}
/* where the crosshair points: the first enemy, tree or ground along the camera ray (aim assist bends it onto a nearby enemy) */
const AIM={x:0,y:0,z:0,e:null,dist:0};
function rayAim(){
  cam.getWorldDirection(_v);const ox=cam.position.x,oy=cam.position.y,oz=cam.position.z,dx=_v.x,dy=_v.y,dz=_v.z;
  let best=BOLT.range,hitE=null;
  /* aim assist: the enemy closest to the crosshair within a small cone */
  const cone=touchy?.12:.055;let ba=cone;
  for(const e of EN){if(e.dead||e.spawnT>0)continue;const ex=e.x-ox,ey=e.y+e.d.cy-oy,ez=e.z-oz,t=ex*dx+ey*dy+ez*dz;if(t<4||t>BOLT.range)continue;
    const px=ex-dx*t,py=ey-dy*t,pz=ez-dz*t,perp=Math.sqrt(px*px+py*py+pz*pz),ang=Math.max(0,perp-e.d.r)/t;
    if(ang<ba){ba=ang;hitE=e;best=t;}}
  for(const tg of TARGETS){if(tg.dead)continue;for(const s0 of tg.spheres){const ex=s0[0]-ox,ey=s0[1]-oy,ez=s0[2]-oz,t=ex*dx+ey*dy+ez*dz;if(t<4||t>BOLT.range)continue;const px=ex-dx*t,py=ey-dy*t,pz=ez-dz*t,ang=Math.max(0,Math.sqrt(px*px+py*py+pz*pz)-s0[3])/t;
    if(ang<ba){ba=ang;hitE=null;best=t;AIM.e=null;AIM.x=s0[0];AIM.y=s0[1];AIM.z=s0[2];AIM.dist=t;AIM.tg=1;}}}
  if(hitE){AIM.e=hitE;AIM.x=hitE.x;AIM.y=hitE.y+hitE.d.cy;AIM.z=hitE.z;AIM.dist=best;return;}
  if(AIM.tg){AIM.tg=0;return;}
  /* otherwise march the ray against ground and tree trunks */
  let t=6;for(;t<BOLT.range;t+=2){const x=ox+dx*t,y=oy+dy*t,z=oz+dz*t;if(y<hgt(x,z)){t-=1;break;}if(treeAt(x,z,y))break;}
  AIM.e=null;AIM.x=ox+dx*t;AIM.y=oy+dy*t;AIM.z=oz+dz*t;AIM.dist=t;
}
function treeAt(x,z,y){const a=VEG.cols.get(colKey(x,z));if(!a)return false;for(const c of a){if(c.b){if(x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1&&y<c.y0+c.h)return true;continue;}const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz<(c.r+.25)*(c.r+.25)&&y<hgt(c.x,c.z)+(c.h||9))return true;}return false;}
function updSalvo(c,dt){
  SALVO.cd=Math.max(0,SALVO.cd-dt);
  if(c.salvo&&!P.dead){if(SALVO.cd<=0&&SALVO.left<=0){for(const e of EN)e.pend=0;SALVO.left=SALVO.n;SALVO.t=0;SALVO.cd=SALVO.cool;HUD.msg('SALVO',.8);CAMS.shake=Math.max(CAMS.shake,.3);}else if(SALVO.left<=0)sClick();}
  if(SALVO.left>0){SALVO.t-=dt;while(SALVO.left>0&&SALVO.t<=0){SALVO.t+=.065;SALVO.left--;salvoRound(SALVO.n-SALVO.left);}}
}
function salvoRound(i){
  const near=EN.filter(e=>!e.dead&&e.spawnT<=0&&Math.hypot(e.x-P.x,e.z-P.z)<SALVO.range).sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z));
  const pod=M.ready?M.pods[i%2]:null;if(pod)pod.getWorldPosition(_w);else _w.set(P.x,P.y+5,P.z);
  let tx,ty,tz;
  /* spread the rounds: the nearest machine that is not already going to die from rounds in the air */
  let tg=null;if(near.length){const e=tg=near.find(o=>o.hp-(o.pend||0)>0)||near[0];e.pend=(e.pend||0)+SALVO.dmg;tx=e.x+(Math.random()-.5)*.4;ty=e.y+e.d.cy;tz=e.z+(Math.random()-.5)*.4;}
  else{const a=P.yaw+i/SALVO.n*TAU;tx=P.x-Math.sin(a)*14;tz=P.z-Math.cos(a)*14;ty=hgt(tx,tz);}
  let ax=tx-_w.x,ay=ty-_w.y,az=tz-_w.z;const l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
  BOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:ax*170,vy:ay*170,vz:az*170,life:(l+8)/170,dmg:SALVO.dmg,tg});
  part({x:_w.x+ax*.6,y:_w.y+ay*.6,z:_w.z+az*.6,vx:0,vy:0,vz:0,life:.07,s0:1.5,s1:.6,a:1.6,col:[1,.75,.4],glow:true});part({x:_w.x+ax*.9,y:_w.y+ay*.9,z:_w.z+az*.9,vx:0,vy:0,vz:0,life:.06,s0:1.7,s1:2.3,a:1.4,col:[1,1,1],glow:true,img:2,vr:0});MFL.position.copy(_w);GUN.flash=1;sGun(2);
}
function updGun(c,dt){
  updSalvo(c,dt);
  GUN.cd-=dt;GUN.ventCd=Math.max(0,GUN.ventCd-dt);GUN.flash=Math.max(0,GUN.flash-dt*12);GUN.hitT=Math.max(0,GUN.hitT-dt);
  if(M.ready)setTier(M,GUN.tier);
  const firing=c.fire&&!GUN.over&&!P.dead;
  if(firing&&GUN.cd<=0){
    const t=GUN.tier,A=M.ready?M.arms[GUN.side]:null;GUN.cd+=1/GUN.rate[t];if(GUN.cd<0)GUN.cd=0;GUN.side^=1;
    if(A){A.muzzle.getWorldPosition(_w);A.kick=1;}else _w.set(P.x,P.y+3.2,P.z);
    /* barrel offsets per tier, in the gun's own frame */
    const offs=t===1?[[0,0]]:t===2?[[-.11,0],[.11,0]]:t===3?[[-.12,-.07],[.12,-.07],[0,.13]]:[[.1,.1],[-.1,.1],[-.1,-.1],[.1,-.1]];
    const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
    for(const o of offs){const sx=_w.x+rx*o[0],sy=_w.y+o[1],sz=_w.z+rz*o[0];
      let ax=AIM.x-sx,ay=AIM.y-sy,az=AIM.z-sz;const l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
      const sp=GUN.spread[t];ax+=(Math.random()-.5)*sp*2;ay+=(Math.random()-.5)*sp*2;az+=(Math.random()-.5)*sp*2;
      BOLTS.push({x:sx,y:sy,z:sz,vx:ax*BOLT.speed,vy:ay*BOLT.speed,vz:az*BOLT.speed,life:BOLT.range/BOLT.speed,dmg:GUN.dmg[t]*UP.dmgK});}
    part({x:_w.x+fx*.4,y:_w.y,z:_w.z+fz*.4,vx:0,vy:0,vz:0,life:.08,s0:1.6+t*.25,s1:.8,a:2.6,col:[1,.7,.35],glow:true});
    if(Math.random()<.5)part({x:_w.x,y:_w.y,z:_w.z,vx:fx*2,vy:.8,vz:fz*2,life:.7,s0:.4,s1:1.4,a:.22,col:SMOKE,drag:2});
    MFL.position.copy(_w);GUN.flash=1;
    GUN.heat+=HEAT.shot;GUN.cool=HEAT.delay;
    if(GUN.heat>=100){GUN.heat=100;GUN.over=true;sOver();HUD.msg('OVERHEAT · VENT IT',1.4);}
    sGun(t);
  }else if(!firing){GUN.cool-=dt;if(GUN.cool<=0)GUN.heat=Math.max(0,GUN.heat-HEAT.cool*dt);}
  if(GUN.over){GUN.cool-=dt;if(GUN.cool<=0)GUN.heat=Math.max(0,GUN.heat-HEAT.cool*.8*dt);if(GUN.heat<=HEAT.resume)GUN.over=false;
    if(M.ready&&Math.random()<dt*14){const A=M.arms[Math.random()<.5?0:1];A.muzzle.getWorldPosition(_w);part({x:_w.x,y:_w.y,z:_w.z,vx:(Math.random()-.5),vy:1.5+Math.random(),vz:(Math.random()-.5),life:1.2,s0:.4,s1:1.6,a:.35,col:[.85,.85,.88],drag:1});}}
  MFL.intensity=GUN.flash*90;
  /* vent: dump all heat with a steam blast that shoves close enemies back */
  if(c.vent&&GUN.ventCd<=0&&!P.dead){GUN.ventCd=GUN.ventCool||8;GUN.heat=0;GUN.over=false;sVent();CAMS.shake=Math.max(CAMS.shake,.35);
    for(let i=0;i<10;i++){const a=Math.random()*TAU;part({x:P.x+Math.cos(a)*1.5,y:P.y+2+Math.random()*2,z:P.z+Math.sin(a)*1.5,vx:Math.cos(a)*3,vy:2+Math.random()*2,vz:Math.sin(a)*3,life:1.6,s0:2,s1:6,a:.8,col:[1,1,1],img:4,drag:1.5,grav:-.6});}
    for(let i=0;i<26;i++){const a=Math.random()*TAU,s=4+Math.random()*7;part({x:P.x+Math.cos(a)*1.2,y:P.y+1.5+Math.random()*2,z:P.z+Math.sin(a)*1.2,vx:Math.cos(a)*s,vy:.5+Math.random()*2,vz:Math.sin(a)*s,life:1.4+Math.random(),s0:1,s1:4.2,a:.4,col:[.92,.93,.95],drag:2.2,grav:-.4});}
    for(const e of EN){if(e.dead)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz)||1;if(d<10){hurtEnemy(e,15,e.x,e.y+1,e.z);e.kx+=dx/d*16*(1-d/12);e.kz+=dz/d*16*(1-d/12);}}}
  /* missiles: tap to fire a salvo at the enemies nearest the crosshair */
  MSL.cd-=dt;
  if(c.msl&&!P.dead){
    if(MSL.ammo<=0||MSL.cd>0){if(MSL.ammo<=0){sClick();HUD.msg('NO MISSILES',1);}}
    else{MSL.cd=.7;cam.getWorldDirection(_v);
      const cand=EN.filter(e=>!e.dead&&e.spawnT<=0).map(e=>{const ex=e.x-cam.position.x,ey=e.y+e.d.cy-cam.position.y,ez=e.z-cam.position.z,d=Math.hypot(ex,ey,ez);return {e,d,a:Math.acos(clamp((ex*_v.x+ey*_v.y+ez*_v.z)/d,-1,1))};})
        .filter(o=>o.a<.6&&o.d<120).sort((a,b)=>a.a-b.a);
      const n=Math.min(MSL.salvo,MSL.ammo);for(let i=0;i<n;i++){const tg=cand.length?cand[i%cand.length].e:null,pod=M.ready?M.pods[i%2]:null;
        if(pod)pod.getWorldPosition(_w);else _w.set(P.x,P.y+4.4,P.z);
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
        MISS.push({x:_w.x,y:_w.y,z:_w.z,vx:fx*14+(i%2?3:-3),vy:9,vz:fz*14,t:0,tg,life:4.5,ax:AIM.x,ay:AIM.y,az:AIM.z,delay:i*.09});}
      MSL.ammo-=n;sMissile();}
  }
}
/* move bolts and missiles, test hits */
function updShots(dt){
  const drop=(i)=>{const b=BOLTS[i];if(b.tg)b.tg.pend=Math.max(0,(b.tg.pend||0)-b.dmg);BOLTS.splice(i,1);};
  for(let i=BOLTS.length-1;i>=0;i--){const b=BOLTS[i];b.life-=dt;if(b.life<=0){drop(i);continue;}
    const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt,nz=b.z+b.vz*dt;let hit=null,ht=1;
    for(const e of EN){if(e.dead||e.spawnT>0)continue;const t=segSphere(b.x,b.y,b.z,nx,ny,nz,e.x,e.y+e.d.cy,e.z,e.d.r);if(t>=0&&t<ht){ht=t;hit=e;}}
    const hx=lerp(b.x,nx,ht),hy=lerp(b.y,ny,ht),hz=lerp(b.z,nz,ht);
    if(hit){drop(i);hurtEnemy(hit,b.dmg,hx,hy,hz);GUN.hitT=.12;sparks(hx,hy,hz,5,[1,.75,.35]);continue;}
    const tg=hitTargets(b.x,b.y,b.z,nx,ny,nz);if(tg){drop(i);hurtTarget(tg,b.dmg);GUN.hitT=.12;sparks(nx,ny,nz,6,[1,.75,.35]);continue;}
    if(ny<hgt(nx,nz)||treeAt(nx,nz,ny)){sparks(nx,Math.max(ny,hgt(nx,nz)+.1),nz,4,[1,.7,.3]);part({x:nx,y:Math.max(ny,hgt(nx,nz)+.2),z:nz,vx:0,vy:1,vz:0,life:.8,s0:.5,s1:1.6,a:.3,col:DUST,drag:1.5});drop(i);continue;}
    b.x=nx;b.y=ny;b.z=nz;}
  for(let i=MISS.length-1;i>=0;i--){const m=MISS[i];m.t+=dt;m.life-=dt;if(m.t<m.delay)continue;
    if(m.tg&&m.tg.dead)m.tg=null;
    const tx=m.tg?m.tg.x:m.ax,ty=m.tg?m.tg.y+m.tg.d.cy:m.ay,tz=m.tg?m.tg.z:m.az;
    if(m.t>m.delay+.25){/* home in */const sp=Math.min(62,Math.hypot(m.vx,m.vy,m.vz)+60*dt);let dx=tx-m.x,dy=ty-m.y,dz=tz-m.z;const dl=Math.hypot(dx,dy,dz)||1;
      const k=Math.min(1,dt*4.2);let vx=m.vx/sp,vy=m.vy/sp,vz=m.vz/sp;const cl=Math.hypot(m.vx,m.vy,m.vz)||1;vx=m.vx/cl;vy=m.vy/cl;vz=m.vz/cl;
      vx+=(dx/dl-vx)*k;vy+=(dy/dl-vy)*k;vz+=(dz/dl-vz)*k;const nl=Math.hypot(vx,vy,vz)||1;m.vx=vx/nl*sp;m.vy=vy/nl*sp;m.vz=vz/nl*sp;}
    else m.vy-=6*dt;
    m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;
    if(Math.random()<.9)part({x:m.x,y:m.y,z:m.z,vx:0,vy:.3,vz:0,life:1.1,s0:.35,s1:1.5,a:.33,col:SMOKE,drag:1});
    part({x:m.x,y:m.y,z:m.z,vx:0,vy:0,vz:0,life:.06,s0:.7,s1:.3,a:1.6,col:[1,.6,.25],glow:true});
    const near=m.tg&&Math.hypot(tx-m.x,ty-m.y,tz-m.z)<m.tg.d.r+.6;
    if(near||m.life<=0||m.y<hgt(m.x,m.z)+.1||treeAt(m.x,m.z,m.y)){boom(m.x,Math.max(m.y,hgt(m.x,m.z)+.3),m.z,1);splash(m.x,m.y,m.z,4.8,75);MISS.splice(i,1);}}
  for(let i=EBOLTS.length-1;i>=0;i--){const b=EBOLTS[i];b.life-=dt;if(b.g)b.vy-=b.g*dt;if(b.life<=0){EBOLTS.splice(i,1);continue;}
    const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt,nz=b.z+b.vz*dt;
    if(!P.dead&&segSphere(b.x,b.y,b.z,nx,ny,nz,P.x,P.y+3.3,P.z,2.0)>=0){hurtPlayer(b.dmg,b.x-b.vx,b.z-b.vz);sparks(nx,ny,nz,6,[.6,.8,1]);EBOLTS.splice(i,1);continue;}
    if(ny<hgt(nx,nz)||treeAt(nx,nz,ny)){sparks(nx,ny,nz,4,[1,.35,.15]);EBOLTS.splice(i,1);continue;}
    b.x=nx;b.y=ny;b.z=nz;}
  drawShots();
}
function segSphere(x0,y0,z0,x1,y1,z1,cx,cy,cz,r){const dx=x1-x0,dy=y1-y0,dz=z1-z0,fx=x0-cx,fy=y0-cy,fz=z0-cz,a=dx*dx+dy*dy+dz*dz,b=2*(fx*dx+fy*dy+fz*dz),c=fx*fx+fy*fy+fz*fz-r*r;
  if(c<0)return 0;const D=b*b-4*a*c;if(D<0||a<1e-9)return -1;const t=(-b-Math.sqrt(D))/(2*a);return t>=0&&t<=1?t:-1;}
function drawShots(){
  let n=0;for(const b of BOLTS){if(n>=160)break;const l=Math.hypot(b.vx,b.vy,b.vz);_v.set(b.vx/l,b.vy/l,b.vz/l);_q.setFromUnitVectors(_z,_v);
    _m4.compose(_w.set(b.x-_v.x*1.8,b.y-_v.y*1.8,b.z-_v.z*1.8),_q,V3(1,1,3.6));BM.setMatrixAt(n++,_m4);}
  BM.count=n;BM.instanceMatrix.needsUpdate=true;BM.visible=n>0;
  n=0;for(const b of EBOLTS){if(n>=220)break;const l=Math.hypot(b.vx,b.vy,b.vz);_v.set(b.vx/l,b.vy/l,b.vz/l);_q.setFromUnitVectors(_z,_v);_m4.compose(_w.set(b.x,b.y,b.z),_q,V3(b.s||1,b.s||1,b.s||1));EBM.setMatrixAt(n++,_m4);}
  EBM.count=n;EBM.instanceMatrix.needsUpdate=true;EBM.visible=n>0;
  n=0;for(const m of MISS){if(m.t<m.delay)continue;const l=Math.hypot(m.vx,m.vy,m.vz)||1;_v.set(m.vx/l,m.vy/l,m.vz/l);_q.setFromUnitVectors(_z,_v);_m4.compose(_w.set(m.x,m.y,m.z),_q,V3(1,1,1));MSM.setMatrixAt(n++,_m4);}
  MSM.count=n;MSM.instanceMatrix.needsUpdate=true;MSM.visible=n>0;
}
function sparks(x,y,z,n,col){if(n>2)part({x,y,z,vx:0,vy:0,vz:0,life:.14,s0:.7,s1:1.6,a:1.3,col:[1,1,1],glow:true,img:3});for(let i=0;i<n;i++){const a=Math.random()*TAU,b=Math.random()*2-1,s=4+Math.random()*7;
  part({x,y,z,vx:Math.cos(a)*s*Math.sqrt(1-b*b),vy:b*s+2,vz:Math.sin(a)*s*Math.sqrt(1-b*b),life:.25+Math.random()*.25,s0:.22,s1:.06,a:2,col,glow:true,drag:2,grav:12});}}
function boom(x,y,z,k){sBoom(k);CAMS.shake=Math.max(CAMS.shake,Math.min(.9,.7*k*12/Math.max(6,Math.hypot(x-P.x,z-P.z))));
  part({x,y,z,vx:0,vy:0,vz:0,life:.35,s0:4*k,s1:7*k,a:1.6,col:[1,.62,.28],glow:true});
  for(let i=0;i<2;i++)part({x:x+(Math.random()-.5)*k,y:y+.3*i,z:z+(Math.random()-.5)*k,vx:0,vy:1.2,vz:0,life:.5+i*.15,s0:2.6*k,s1:(7.5+i*2)*k,a:1.5,col:[1,1,1],glow:true,img:i,vr:(Math.random()-.5)*2});
  if(y-hgt(x,z)<3.5)decal('scorch',x,z,(2.4+Math.random()*1.4)*Math.max(.8,k)*1.5,Math.random()*TAU);
  for(let i=0;i<10*k;i++){const a=Math.random()*TAU,s=2+Math.random()*5*k;part({x,y,z,vx:Math.cos(a)*s,vy:1+Math.random()*4,vz:Math.sin(a)*s,life:1.4+Math.random(),s0:1.2*k,s1:4.4*k,a:.45,col:[.32,.3,.29],drag:1.8,grav:-.6});}
  sparks(x,y,z,10*k,[1,.62,.25]);MFL.position.set(x,y+1,z);GUN.flash=Math.max(GUN.flash,1.4*k);}
function splash(x,y,z,r,dmg){for(const t of TARGETS){if(t.dead)continue;const s=t.spheres[0];if(Math.hypot(s[0]-x,s[1]-y,s[2]-z)<r+s[3]+2)hurtTarget(t,dmg);}for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-x,e.y+e.d.cy-y,e.z-z);if(d<r+e.d.r)hurtEnemy(e,dmg*(1-.5*clamp(d/r,0,1)),e.x,e.y+e.d.cy,e.z);}}
