/* ===================== session 6: spawner pods, the Lancer, rain, Rook's truck (escort), the Thresher boss =====================
   Missions 5-8 themselves are listed in 06d_missions.js. Models: models/mech/lancer.glb, truck.glb, thresher.glb (blender/build_set6.py). */
EDEF.lancer={hp:170,r:1.4,cy:3.6,speed:3.6,score:450,drop:.7,file:'lancer',sc:1,scrap:40};
let TRUCK_TPL=null,BOSS_TPL=null;
const BOSS_ID=MISSION&&MISSION.boss||null;
function loadSet6(){const L=new THREE.GLTFLoader(LM),get=f=>new Promise(ok=>L.load('models/mech/'+f+'.glb',g=>ok(g.scene),undefined,()=>ok(null)));
  return Promise.all([get('truck'),BOSS_ID?get(BOSS_ID):null]).then(([t,b])=>{
    if(t){const red=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.1,.05).multiplyScalar(3)});
      t.traverse(o=>{if(o.isMesh){const n=o.material.name;o.material=n==='red'?red:MT[MECH_MAT[n]||n]||MT.gun;o.castShadow=n!=='eye'&&n!=='glow'&&n!=='red';o.receiveShadow=true;}});mergeParts(t,o=>/^(ty|hub)\d/.test(o.name));TRUCK_TPL=t;}
    if(b){/* the boss gets lighter, less metallic armour than the small machines so its shape reads from far away, and a deeper red so the knees read as red */
      const k=(m,w)=>{m.vertexColors=true;return hookWorld(m,{wear:w});};
      BMAT.egrey=k(new THREE.MeshStandardMaterial({map:tex('54-forge-armour'),normalMap:nmap('54-forge-armour'),normalScale:new THREE.Vector2(nmapK('54-forge-armour'),nmapK('54-forge-armour')),color:0xc4b8b4,roughness:.55,metalness:.25}),1);
      BMAT.egun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),normalMap:nmap('24-gunmetal'),normalScale:new THREE.Vector2(nmapK('24-gunmetal'),nmapK('24-gunmetal')),color:0x9a9ea6,roughness:.45,metalness:.45}));
      BMAT.edark=k(new THREE.MeshStandardMaterial({color:0x34363a,roughness:.65,metalness:.35}));BMAT.esteel=MT.steel;BMAT.emblem=EMAT.emblem;
      BMAT.ered=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.08,.03).multiplyScalar(1.5)});
      if(NIGHT_ON){BMAT.egrey.emissive.setRGB(.035,.025,.02);BMAT.egun.emissive.setRGB(.025,.02,.02);}   /* at night the bosses keep a faint glow so their shape reads */
      b.traverse(o=>{if(o.isMesh){o.material=BMAT[o.material.name]||BMAT.egun;o.castShadow=o.material!==BMAT.emblem&&o.material!==BMAT.ered;o.receiveShadow=true;}});mergeParts(b);BOSS_TPL=b;}});}
const BMAT={};
let BURNT=null;
function truckModel(burnt){const g=TRUCK_TPL.clone(true);
  if(burnt){if(!BURNT)BURNT=tmat('12-rusted-steel-plate',{col:0x3a3330});g.traverse(o=>{if(o.isMesh)o.material=o.material===MT.glass?MT.glass:BURNT;});}
  g.userData.wheels=[0,1,2,3,4,5].map(i=>g.getObjectByName('w'+i)).filter(Boolean);return g;}
/* ---- spawner pods: targets that keep printing Skitters ---- */
let POD_GEO=null;
function makeSpawner(x,z){const y=hgt(x,z),g=new THREE.Group();g.position.set(x,y,z);
  if(!POD_GEO)POD_GEO={shell:new THREE.SphereGeometry(2.4,22,12,0,TAU,0,Math.PI/2),base:new THREE.CylinderGeometry(2.8,3.1,.8,22),ring:new THREE.TorusGeometry(2.5,.13,6,30).rotateX(Math.PI/2),
    eye:new THREE.SphereGeometry(.5,12,8),fin:new THREE.BoxGeometry(.3,1.6,1.4)};
  const glow=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.12,.05).multiplyScalar(3)}),arm=tmat('54-forge-armour',{rep:[2,1]}),gm=tmat('24-gunmetal');
  const add=(geo,m,px,py,pz,ry)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.rotation.y=ry||0;o.castShadow=o.receiveShadow=m!==glow;g.add(o);return o;};
  add(POD_GEO.base,gm,0,.4,0);const shell=add(POD_GEO.shell,arm,0,.8,0);add(POD_GEO.ring,glow,0,.9,0);const eye=add(POD_GEO.eye,glow,0,3.1,0);
  for(let i=0;i<4;i++){const a=i/4*TAU+.4;add(POD_GEO.fin,gm,Math.sin(a)*2.3,1.4,Math.cos(a)*2.3,a);}
  S.add(g);addBox(x-2.6,z-2.6,x+2.6,z+2.6,3);
  return addTarget({x,z,y,hpMax:320,spheres:[[x,y+1.6,z,2.8]],obj:g,spawn:2+Math.random()*3,eye,glow,
    die(){glow.color.setRGB(.12,.02,.01);shell.scale.y=.45;eye.visible=false;}});}
function updSpawners(dt){for(const t of MS.objs){if(t.dead||t.spawn==null)continue;t.spawn-=dt;t.eye.scale.setScalar(1+.25*Math.max(0,Math.sin(G.t*6)));
  if(t.spawn<=0){t.spawn=8.5;if(EN.filter(e=>!e.dead).length<16){for(let i=0;i<2;i++){const a=Math.random()*TAU,c=collide(t.x+Math.cos(a)*4.8,t.z+Math.sin(a)*4.8,1.3);const e=spawnEnemy('skitter',c[0],c[1]);if(e)e.spawnT=.5;}
    for(let k=0;k<10;k++)part({x:t.x,y:t.y+3,z:t.z,vx:(Math.random()-.5)*6,vy:4+Math.random()*4,vz:(Math.random()-.5)*6,life:.5,s0:1.4,s1:.3,a:1.5,col:[1,.2,.08],glow:true});}}}}
/* ---- the Lancer: keeps its distance, paints you with a red line for 1.6 s, then fires one heavy shot at where the line ended.
   The line locks 0.3 s before the shot: move, hop, or put a stack in the way. ---- */
const LZ_GEO=new THREE.CylinderGeometry(.06,.06,1,6,1,true).rotateX(Math.PI/2).translate(0,0,.5);
function lancerBrain(e,dt,dist,dx,dz){
  if(!e.beam){e.beam=new THREE.Mesh(LZ_GEO,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.05,.02).multiplyScalar(1.3),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    e.beam.visible=false;e.beam.frustumCulled=false;S.add(e.beam);e.charge=0;}
  const seen=los(e.x,e.z);let mvx=0,mvz=0,sp=e.d.speed;
  if(dist<46){mvx=-dx/dist;mvz=-dz/dist;}else if(dist>85||!seen){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];}else sp=0;
  if(seen&&dist<110&&e.cd<=0&&!P.dead){e.charge+=dt;sp=0;if(e.charge<dt*1.5)sZap();}else if(e.charge>0)e.charge=Math.max(0,e.charge-dt*2);
  const show=e.charge>0;e.beam.visible=show;
  if(show){e.mzR.getWorldPosition(_w);if(e.charge<1.3||e.tx==null){e.tx=P.x;e.ty=P.y+3.2;e.tz=P.z;}
    const L=Math.hypot(e.tx-_w.x,e.ty-_w.y,e.tz-_w.z),k=e.charge/1.6;e.beam.position.copy(_w);e.beam.lookAt(e.tx,e.ty,e.tz);e.beam.scale.set(1+k*2.5,1+k*2.5,L);
    e.beam.material.opacity=.3+.6*k*(Math.sin(G.t*40)*.2+.8);
    if(e.charge>=1.6){e.charge=0;e.cd=3.6+Math.random()*1.6;e.beam.visible=false;sEShot();sBoom(.6);
      for(let i=0;i<14;i++){const f=i/14;part({x:lerp(_w.x,e.tx,f),y:lerp(_w.y,e.ty,f),z:lerp(_w.z,e.tz,f),vx:0,vy:.5,vz:0,life:.35,s0:1.1,s1:.2,a:1.6,col:[1,.25,.1],glow:true});}
      boom(e.tx,e.ty,e.tz,.55);if(Math.hypot(P.x-e.tx,P.z-e.tz)<2.6&&Math.abs(P.y+3.2-e.ty)<3.5)hurtPlayer(26,e.x,e.z);e.tx=null;}}
  return [mvx,mvz,sp];}
/* ---- rain: two stacked layers of streaks that follow the camera ---- */
let RAIN=null;
/* each drop is two thin crossed strips, so it reads on a phone screen too; the second layer sits 36 m above the first so the loop is seamless */
function buildRain(){const n=1500,P_=[],w=.035,L=1.3;
  for(let k=0;k<2;k++)for(let i=0;i<n;i++){const x=(Math.random()-.5)*80,y=Math.random()*36+k*36,z=(Math.random()-.5)*80;
    for(const [ax,az] of [[w,0],[0,w]])P_.push(x-ax,y,z-az, x+ax,y,z+az, x+ax+.1,y-L,z+az, x-ax,y,z-az, x+ax+.1,y-L,z+az, x-ax+.1,y-L,z-az);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P_,3));
  RAIN=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xb4c4d8,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}));RAIN.frustumCulled=false;RAIN.renderOrder=4;S.add(RAIN);RAIN.userData.o=0;}
function updRain(dt){if(!RAIN)return;const u=RAIN.userData;u.o=(u.o+dt*28)%36;RAIN.position.set(cam.position.x,cam.position.y-18-u.o,cam.position.z);}
/* ---- escort: Rook's truck drives the route while you are close and nothing is chewing on it ---- */
function escortBegin(s,first){
  if(first||!MS.escort){const a=s.route[0],b=s.route[1];MS.escort={x:a[0],z:a[1],hp:s.hp,max:s.hp,yaw:Math.atan2(-(b[0]-a[0]),-(b[1]-a[1])),sp:0,ri:1,route:s.route,hitT:0};
    MS.escort.obj=makeTruck(a[0],a[1],MS.escort.yaw,0,1);MS.waveT=12;MS.wi=0;return;}
  /* after a repair: back on your feet beside the truck, and Rook patches it up a little */
  const E=MS.escort;E.hp=Math.max(E.hp,E.max*.5);const fx=-Math.sin(E.yaw),fz=-Math.cos(E.yaw),c=collide(E.x-fx*10,E.z-fz*10,RAD);P.x=c[0];P.z=c[1];P.y=hgt(P.x,P.z);P.yaw=P.legYaw=E.yaw;CAMS.ready=false;MS.waveT=12;}
function escortStep(s,dt){const E=MS.escort;
  const T=E.route[E.ri],dx=T[0]-E.x,dz=T[1]-E.z,d=Math.hypot(dx,dz);
  const near=Math.hypot(P.x-E.x,P.z-E.z)<35,threat=EN.some(e=>!e.dead&&e.spawnT<=0&&Math.hypot(e.x-E.x,e.z-E.z)<9);
  E.sp+=((near&&!threat&&!P.dead?4.2:0)-E.sp)*damp(1.5,dt);
  if(d<2.5){if(E.ri<E.route.length-1)E.ri++;}else{E.x+=dx/d*E.sp*dt;E.z+=dz/d*E.sp*dt;E.yaw+=clamp(angD(Math.atan2(-dx,-dz),E.yaw),-dt*1.2,dt*1.2);}
  const o=E.obj;o.position.set(E.x,hgt(E.x,E.z),E.z);o.rotation.y=E.yaw;
  const nx=hgt(E.x-Math.sin(E.yaw)*3,E.z-Math.cos(E.yaw)*3)-hgt(E.x+Math.sin(E.yaw)*3,E.z+Math.cos(E.yaw)*3);o.rotation.x=Math.atan2(nx,6)*.8;
  if(o.userData.wheels)for(const w of o.userData.wheels)w.rotation.x-=E.sp*dt/.62;
  /* push the mech out of the truck */
  const px=P.x-E.x,pz=P.z-E.z,pd=Math.hypot(px,pz);if(pd<4.2&&pd>.01&&P.y-hgt(P.x,P.z)<3){P.x=E.x+px/pd*4.2;P.z=E.z+pz/pd*4.2;}
  /* machines that reach the truck chew on it */
  let bite=0;for(const e of EN){if(e.dead||e.spawnT>0)continue;if(Math.hypot(e.x-E.x,e.z-E.z)<5){bite+=e.id==='hound'?14:e.id==='skitter'?6:10;if(Math.random()<dt*5)sparks(E.x+(Math.random()-.5)*2,hgt(E.x,E.z)+1.5+Math.random(),E.z+(Math.random()-.5)*3,4,[1,.6,.3]);}}
  E.hp-=bite*dt;if(bite&&(E.hitT-=dt)<=0){E.hitT=4;radio([['ROOK',['They are on the truck!','Get them off me!','I am taking hits here!'][(Math.random()*3)|0]]]);}
  MS.waveT-=dt;if(MS.waveT<=0){MS.waveT=s.every;const w=s.waves[MS.wi%s.waves.length];MS.wi++;const n0=EN.length,ahead=Math.min(E.route.length-1,E.ri+1),A=E.route[ahead];
    spawnGroup(w,lerp(E.x,A[0],.7),lerp(E.z,A[1],.7),[34,52]);for(let i=n0;i<EN.length;i++)if(EN[i].id!=='gunner'&&Math.random()<.55)EN[i].tr=1;}
  if(E.hp<=0&&!MS.done){E.hp=0;boom(E.x,hgt(E.x,E.z)+2,E.z,2);boom(E.x,hgt(E.x,E.z)+3,E.z+1,1.4);HUD.msg('ROOK’S TRUCK IS DOWN',3);finishMission(false);}
  const end=E.route[E.route.length-1],done=E.ri===E.route.length-1&&Math.hypot(end[0]-E.x,end[1]-E.z)<3;
  return {txt:'ESCORT ROOK · TRUCK '+Math.max(0,Math.ceil(E.hp/E.max*100))+'%'+(near?threat?' · CLEAR THEM OFF':'':' · STAY CLOSE'),ok:done,pos:E};}
/* machines told to go for the truck (half of each escort wave) walk at it unless you are right on top of them */
function truckGoal(e,dist){const E=MS.escort;if(!e.tr||!E||E.hp<=0||dist<16)return null;const dx=E.x-e.x,dz=E.z-e.z,d=Math.hypot(dx,dz)||1;
  return d<3.5?[0,0,0]:[dx/d,dz/d,e.d.speed*.85];}
/* ---- the Thresher: a 16 m harvester walker. Four red knees are the weak points; with all four gone it drops and the core opens ---- */
const BOSS={o:null,dead:false};let WARN_GEO=null;
function makeThresher(x,z){
  const g=BOSS_TPL?BOSS_TPL.clone(true):new THREE.Group();g.position.set(x,hgt(x,z),z);S.add(g);const N=n=>g.getObjectByName(n)||new THREE.Group();
  Object.assign(BOSS,{o:g,body:N('body'),drum:N('drum'),hatch:N('hatch'),core:N('core'),x,z,yaw:Math.atan2(-(P.x-x),-(P.z-z)),mortT:5,spawnT:12,marks:[],dead:false,deadT:0,walk:0,idle:true,
    legs:['FL','FR','BL','BR'].map(s=>({s,hip:N('hip'+s),kn:N('knee'+s),sx:s[1]==='L'?-1:1}))});
  BOSS.coreT=null;
  BOSS.legT=BOSS.legs.map(L=>addTarget({x,z,y:0,hpMax:420,spheres:[[x,4,z,1.6]],
    die(){L.kn.traverse(m=>{if(m.isMesh&&m.material===BMAT.ered)m.material=BMAT.edark;});L.hip.rotation.x=.5;L.down=1;CAMS.shake=Math.max(CAMS.shake,.6);
      const n=BOSS.legT.filter(t=>t.dead).length;radio([['ROOK',['One knee down!','Two down. Keep moving!','One knee left!','It is down! Shoot the red core!'][n-1]]]);}}));
  return g;}
function warnDisc(x,z){if(!WARN_GEO)WARN_GEO=new THREE.CircleGeometry(4.6,32).rotateX(-Math.PI/2);
  const m=new THREE.Mesh(WARN_GEO,new THREE.MeshBasicMaterial({color:new THREE.Color(1,.1,.04).multiplyScalar(1.6),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.set(x,hgt(x,z)+.3,z);m.renderOrder=3;S.add(m);return m;}
/* standing idle in the dust before the fight */
function bossIdle(dt){const B=BOSS;if(B.dead)return;B.drum.rotation.x-=dt*1.5;B.body.position.y=9+Math.sin(G.t*.8)*.15;
  if(Math.random()<dt*6)dustPuff(B.x+(Math.random()-.5)*14,B.z+(Math.random()-.5)*14,2,2.2);}
function bossStep(s,dt){const B=BOSS;B.idle=false;
  const legsLeft=B.legT.filter(t=>!t.dead).length;
  if(legsLeft===0&&!B.coreT){B.hatch.rotation.x=0;B.coreT=addTarget({x:B.x,z:B.z,y:0,hpMax:1400,spheres:[[B.x,5,B.z,1.7]],
    die(){B.dead=true;CAMS.shake=1;for(let i=0;i<8;i++)setTimeout(()=>boom(B.x+(Math.random()-.5)*10,3+Math.random()*5,B.z+(Math.random()-.5)*10,1.8),i*220);radio([['FORGE','HARVEST... INTERRUPTED.'],['ROOK','Ha! Scrap metal!']]);}});}
  if(B.dead){B.deadT+=dt;B.o.rotation.z=Math.min(.22,B.o.rotation.z+dt*.1);B.body.position.y=Math.max(2.4,B.body.position.y-dt);if(Math.random()<dt*6)part({x:B.x+(Math.random()-.5)*8,y:6,z:B.z+(Math.random()-.5)*8,vx:0,vy:3,vz:0,life:2,s0:3,s1:7,a:.5,col:[.15,.14,.13]});}
  else{
    const dx=P.x-B.x,dz=P.z-B.z,want=Math.atan2(-dx,-dz);B.yaw+=clamp(angD(want,B.yaw),-dt*.45,dt*.45);
    const sp=legsLeft?3.4*(.55+.45*legsLeft/4):0,fx=-Math.sin(B.yaw),fz=-Math.cos(B.yaw);
    if(Math.hypot(dx,dz)>9){B.x+=fx*sp*dt;B.z+=fz*sp*dt;}const c=collide(B.x,B.z,4),Bd=BND();B.x=clamp(c[0],Bd.x0+12,Bd.x1-12);B.z=clamp(c[1],Bd.z0+12,Bd.z1-12);
    B.walk+=dt*sp*.32;B.o.position.set(B.x,hgt(B.x,B.z),B.z);B.o.rotation.y=B.yaw;B.drum.rotation.x-=dt*(legsLeft?7:.5);
    if(legsLeft){B.body.position.y=9-(4-legsLeft)*.7+Math.sin(B.walk*TAU*2)*.25;B.body.rotation.z=Math.sin(B.walk*TAU)*.03;}
    else{B.body.position.y=lerp(B.body.position.y,3.4,damp(1.5,dt));B.hatch.rotation.x=Math.min(1.5,B.hatch.rotation.x+dt*.8);}
    B.legs.forEach((L,i)=>{if(L.down){L.hip.rotation.z=lerp(L.hip.rotation.z,legsLeft?L.sx*.25:L.sx*1.1,damp(2,dt));return;}
      const ph=B.walk*TAU+(i===0||i===3?0:Math.PI);L.hip.rotation.x=Math.sin(ph)*.22;if(Math.cos(ph)<.9)L.stepT=0;if(!legsLeft)L.hip.rotation.z=lerp(L.hip.rotation.z,L.sx*1.1,damp(2,dt));
      if(Math.cos(ph)>.98&&sp>0&&!L.stepT){L.stepT=1;thump(48,24,.5,.55,260,.3);CAMS.shake=Math.max(CAMS.shake,.25);}});
    /* the drum: anything in front of it gets shredded */
    const ahead=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);
    if(legsLeft&&ahead>5&&ahead<12&&side<6&&P.y-hgt(P.x,P.z)<3.5){hurtPlayer(34*dt,B.x,B.z);if(Math.random()<dt*20)sparks(P.x,P.y+2,P.z,3,[1,.7,.3]);}
    /* mortar volley: red circles first, the shells land 1.7 s later. Hop or walk out. */
    B.mortT-=dt;if(B.mortT<=0){B.mortT=legsLeft?6.5:4.5;const n=legsLeft?5:7;for(let i=0;i<n;i++){const a=Math.random()*TAU,r=i?4+Math.random()*9:0,x=P.x+Math.cos(a)*r+P.vx*.9,z=P.z+Math.sin(a)*r+P.vz*.9;B.marks.push({x,z,t:1.7+i*.08,m:warnDisc(x,z)});}
      sEShot();for(let i=0;i<6;i++)part({x:B.x,y:B.body.position.y+hgt(B.x,B.z)+5,z:B.z,vx:(Math.random()-.5)*4,vy:12,vz:(Math.random()-.5)*4,life:.6,s0:2,s1:4,a:.6,col:[.3,.28,.26]});}
    B.spawnT-=dt;if(B.spawnT<=0){B.spawnT=legsLeft?20:14;spawnGroup({skitter:3},B.x,B.z,[10,16]);}
    /* keep the weak points on the moving knees, and keep the mech out of the feet */
    B.o.updateMatrixWorld(true);
    B.legs.forEach((L,i)=>{const t=B.legT[i];if(!t.dead){L.kn.getWorldPosition(_w);const q=t.spheres[0];q[0]=_w.x;q[1]=_w.y;q[2]=_w.z;t.x=_w.x;t.z=_w.z;t.y=_w.y-3;}
      _v.set(L.sx*4,-8.6,0);L.hip.localToWorld(_v);const ox=P.x-_v.x,oz=P.z-_v.z,od=Math.hypot(ox,oz);if(od<2.6&&od>.01&&P.y-hgt(P.x,P.z)<4){P.x=_v.x+ox/od*2.6;P.z=_v.z+oz/od*2.6;}});
    if(!legsLeft){const ox=P.x-B.x,oz=P.z-B.z,od=Math.hypot(ox,oz);if(od<6.5&&od>.01&&P.y-hgt(P.x,P.z)<5){P.x=B.x+ox/od*6.5;P.z=B.z+oz/od*6.5;}}
    if(B.coreT&&!B.coreT.dead){B.core.getWorldPosition(_w);const q=B.coreT.spheres[0];q[0]=_w.x;q[1]=_w.y;q[2]=_w.z;B.coreT.x=_w.x;B.coreT.z=_w.z;B.coreT.y=_w.y-3;B.core.scale.setScalar(1+.12*Math.sin(G.t*8));}
  }
  for(let i=B.marks.length-1;i>=0;i--){const k=B.marks[i];k.t-=dt;k.m.material.opacity=.25+.45*Math.abs(Math.sin(k.t*(k.t<.6?20:8)));
    if(k.t<=0){boom(k.x,hgt(k.x,k.z)+.5,k.z,.9);if(Math.hypot(P.x-k.x,P.z-k.z)<4.9&&P.y-hgt(P.x,P.z)<2.5)hurtPlayer(26,k.x,k.z);S.remove(k.m);k.m.material.dispose();B.marks.splice(i,1);}}
  const pos=B.coreT&&!B.coreT.dead?B.coreT:(B.legT.find(t=>!t.dead)||null);
  return {txt:B.dead?'THRESHER DOWN':legsLeft?s.label+' · KNEES '+(4-legsLeft)+'/4':'HIT THE CORE · '+Math.max(0,Math.ceil(B.coreT.hp/B.coreT.hpMax*100))+'%',ok:B.dead&&B.deadT>2.5,pos:pos||{x:B.x,z:B.z}};}
function bossClearMarks(){clearMarks();for(const k of BOSS.marks||[])S.remove(k.m);if(BOSS.marks)BOSS.marks.length=0;}
