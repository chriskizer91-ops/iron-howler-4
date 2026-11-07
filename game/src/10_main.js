/* ===================== game flow ===================== */
let NIGHT_ON=false;
const G={mode:'load',paused:false,t:0,fdt:1/60,birdT:6,perf:{t:0,n:0,s:0},demoI:1,demoHop:4,score:0,kills:0,combo:0,lastKill:-9,wave:0,hpK:1,breakT:3,downT:0};
let M=null,CTLX=null;
function setQuality(q){QL=q;QC=QUAL[q];DYN=1;resize();setShadow();postSetup();S.fog.far=Math.min(QC.fog,LOOKNOW&&LOOKNOW.fogFar||1e9);S.fog.near=S.fog.far*.22;}
function cycleView(){SET.view=SET.view==='close'?'far':'close';store.set('view',SET.view);HUD.view(SET.view);}
function setPause(b){G.paused=b;HUD.menu();setVolume();if(!b&&!touchy&&G.mode==='play')lockMouse();if(b)jetLoop(0);}
function clearFight(){for(const e of EN){S.remove(e.o);if(e.beam)S.remove(e.beam);}bossClearMarks();EN.length=0;BOLTS.length=EBOLTS.length=MISS.length=BEACONS.length=0;for(const p of PK)S.remove(p.g);PK.length=0;}
function resetRun(){P=mkPlayer();CAMS.ready=false;clearFight();Object.assign(GUN,{tier:GUN.base,heat:0,over:false,cd:0,ventCd:0});MSL.ammo=12;SALVO.cd=0;SALVO.left=0;
  Object.assign(G,{score:0,kills:0,combo:0,lastKill:-9,wave:0,hpK:1,breakT:3});if(M)M.root.visible=true;$('down').style.display='none';}
function playerDown(){if(P.dead)return;P.dead=true;P.thrust=0;boom(P.x,P.y+2.5,P.z,2);boom(P.x+1,P.y+3.5,P.z-1,1.2);if(M)M.root.visible=false;
  G.mode='down';G.downT=2.4;
  if(MISSION){const can=missionDown();$('dscore').textContent=can?'REPAIRS LEFT '+MS.repairs:'NO REPAIRS LEFT';$('dgo').textContent=can?'TAP TO REPAIR AT THE CHECKPOINT':'';if(!can)G.downT=99;return;}
  $('dgo').textContent='TAP TO GO AGAIN';const best=+store.get('best',0);if(G.score>best)store.set('best',G.score);
  $('dscore').textContent='SCORE '+G.score.toLocaleString('en-US')+'  ·  WAVE '+G.wave+'  ·  BEST '+Math.max(best,G.score).toLocaleString('en-US');
  ARC.over(G.score,Math.min(60,Math.floor(G.score/400)+G.wave));}
function fpsLabel(){$('mfps').textContent='FRAME RATE: '+(SET.fps?'ON':'OFF');$('fps').style.display=SET.fps?'block':'none';}
function startPlay(){$('attract').style.display='none';CAMX=null;audioInit();resetRun();applyUpgrades();G.mode='play';G.paused=false;$('title').style.display='none';$('mlist').style.display='none';HUD.menu();ARC.begin();if(MISSION)startMission();
  if(!touchy){lockMouse();HUD.hint('WASD MOVE · MOUSE AIM · SPACE JET HOP, HOLD TO HOVER · V CAMERA · ESC PAUSE',9);}else HUD.hint('LEFT THUMB MOVES · RIGHT THUMB AIMS · JET TO HOP, HOLD TO HOVER',7);}
function startDemo(){resetRun();G.mode='demo';G.paused=false;G.demoI=1;$('title').style.display='none';HUD.menu();Object.assign(DM,{spawnT:4,viewT:9,orbT:20,orbit:0,view:'far'});CAMX=null;$('attract').style.display='block';}
/* attract mode: walk the trail, hop now and then */
function demoCtl(dt){const c={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false},RT=MAPDEF.route||TRAIL;const t=RT[G.demoI];if(!t)return c;
  const dx=t[0]-P.x,dz=t[1]-P.z;if(Math.hypot(dx,dz)<7){G.demoI++;if(G.demoI>=RT.length){G.demoI=1;P=mkPlayer();CAMS.ready=false;}}
  const want=Math.atan2(-dx,-dz),d=angD(want,P.yaw);c.turn=-clamp(d,-1.4*dt,1.4*dt);c.my=Math.abs(d)<.6?1:.3;
  G.demoHop-=dt;if(G.demoHop<0){c.jetHit=true;c.jet=true;G.demoHop=5+Math.random()*4;}return demoFight(c,dt);}
function handleEvents(){
  for(const e of P.ev){
    if(e.t==='jet'){sJet();CAMS.shake=Math.max(CAMS.shake,.45);dustPuff(P.x,P.z,12,1.1);}
    else if(e.t==='land'){sLand(e.k);CAMS.shake=Math.max(CAMS.shake,.4+e.k*.6);dustPuff(P.x,P.z,10+e.k*16|0,.9+e.k*.7);}
    else if(e.t==='nofuel'){sClick();HUD.flashFuel();}
    else if(e.t==='hover'){HUD.msg('HOVER',.7);}
    else if(e.t==='hoverout'){sClick();HUD.msg('HOVER TANK EMPTY',1.1);}
  }
  P.ev.length=0;
}
const _np=new THREE.Vector3();
function jetFX(dt){if(P.thrust<.05)return;for(const J of M.jets){J.n.getWorldPosition(_np);
  const k=P.thrust;if(Math.random()<k*dt*60)part({x:_np.x,y:_np.y-.4,z:_np.z,vx:(Math.random()-.5)*2,vy:-6-Math.random()*4,vz:(Math.random()-.5)*2,life:.25+Math.random()*.15,s0:.9,s1:.35,a:1.4*k,col:[1,.55,.22],glow:true,drag:2});
  if(Math.random()<k*dt*30)part({x:_np.x,y:_np.y-.6,z:_np.z,vx:(Math.random()-.5)*1.5,vy:-3-Math.random()*2,vz:(Math.random()-.5)*1.5,life:1.2+Math.random()*.8,s0:.8,s1:3.4,a:.3,col:SMOKE,drag:1.6,grav:-.6});}}
function tick(dt){
  G.t+=dt;U.uTime.value=G.t;if(MAPDEF.tick)MAPDEF.tick(dt);updRain(dt);updWeather(dt);updShieldFx(dt);if(G.mode==='play')updMarks(dt);if(RING)RING.position.set(cam.position.x,cam.position.y+RING.userData.lift,cam.position.z);
  /* the clouds drift; their shadows slide over the ground with them */
  U.uCloudOff.value.x+=dt*.0016;U.uCloudOff.value.y+=dt*.0007;
  const live=(G.mode==='play'||G.mode==='demo')&&!G.paused;
  if(live){
    let c=G.mode==='demo'?demoCtl(dt):readCtl(dt);
    if(CTLX){Object.assign(c,CTLX);CTLX.jetHit=false;CTLX.view=false;if(CTLX.turnOnce){c.turn=CTLX.turnOnce;CTLX.turnOnce=0;}}
    if(c.view)cycleView();if(c.pause&&G.mode==='play')setPause(true);
    rayAim();updPlayer(c,dt);updGun(c,dt);handleEvents();updMission(dt);
  }else if(G.mode==='play'){const c=readCtl(dt);if(c.pause)setPause(false);}
  else readCtl(dt);
  const fight=(G.mode==='play'&&!G.paused)||G.mode==='down'||G.mode==='demo';
  if(fight){updShots(dt);updEnemies(dt);updPickups(dt);}
  updDrone(dt);updBeams(fight?dt:0);if(live)updHoverFx(dt);
  updRadio(dt);updRadioX(dt);if(NIGHT_ON&&M&&M.ready&&!M.lamp){M.lamp=new THREE.SpotLight(0xfff2d8,1600,110,.55,.6,1.4);M.lamp.position.set(0,.3,-.4);M.head.add(M.lamp);const t=new THREE.Object3D();t.position.set(0,-3,-30);M.head.add(t);M.lamp.target=t;}
  if(G.mode==='down'&&MISSION&&MS.failT>0){MS.failT-=dt;if(MS.failT<=0)finishMission(false);}
  if(G.mode==='down'){G.downT-=dt;if(G.downT<=0&&$('down').style.display!=='flex'){$('down').style.display='flex';}
    if(Math.random()<dt*20)part({x:P.x+(Math.random()-.5)*2,y:P.y+1+Math.random()*2,z:P.z+(Math.random()-.5)*2,vx:0,vy:2.5,vz:0,life:2.4,s0:1.2,s1:5,a:.4,col:[.2,.2,.21],drag:.6,grav:-.5});}
  if(M){const ev=poseMech(M,{x:P.x,z:P.z,gy:P.y,legYaw:P.legYaw,aimYaw:P.yaw,spd:live?P.spd:0,air:P.air,vy:P.vy,land:P.land,thrust:P.thrust,pitch:P.pitch},live?dt:0);
    for(const e of ev){const k=clamp(Math.abs(P.spd)/WALK,.35,1);sStep(k);if(e.x!==undefined){dustPuff(e.x,e.z,3,.55);if(SOFT_GROUND())decal('print',e.x,e.z,1.9,(P.legYaw!=null?P.legYaw:P.yaw)+Math.PI);}if(SET.view==='close')CAMS.shake=Math.max(CAMS.shake,.16*k);}}
  const view=G.mode==='demo'?DM.view:G.mode==='title'||G.mode==='down'?'far':SET.view;
  updCam(live||G.mode!=='play'?dt:0,P,view);
  placeSun(P.x-Math.sin(P.yaw)*12,P.z-Math.cos(P.yaw)*12);
  U.uSunXZ.value.set(SUN.x/SUN.y,SUN.z/SUN.y);
  if(live)jetFX(dt);updFX(live?dt:0);
  updVeg(dt,P.x,3,P.z);
  jetLoop(live?P.thrust:0);
  if(live){G.birdT-=dt;if(G.birdT<0){sBird();G.birdT=4+Math.random()*8;}}
  HUD.fuel(P);HUD.frame();
}
/* auto quality: if frames are slow, lower the render scale, then the quality level */
function autoQ(dt){if(SET.quality!=='auto'||G.mode!=='play'||G.paused)return;const pf=G.perf;pf.t+=dt;pf.n++;
  if(pf.t>=1.8){const avg=pf.t/pf.n;pf.t=0;pf.n=0;
    if(avg>1/44){if(DYN>.66){DYN*=.88;resize();}else if(QL!=='low'){setQuality(QL==='high'?'med':'low');}}
    else if(avg<1/57&&DYN<1){DYN=Math.min(1,DYN*1.06);resize();}}}
let last=performance.now();
function frame(now){
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;G.fdt+=(raw-G.fdt)*.1;
  if(BAY.open){bayFrame(dt);requestAnimationFrame(frame);return;}
  if(!(DEV&&window.__freeze))tick(dt);autoQ(dt);renderFrame();if(SET.fps&&(G.fpsT=(G.fpsT||0)-raw)<=0){G.fpsT=.5;$('fps').textContent=Math.round(1/Math.max(.001,G.fdt))+' FPS · '+QL.toUpperCase();}HUD.dev();requestAnimationFrame(frame);
}
function boot(){
  pickMap();setupHud();setQuality(QL);const LK=MISSION&&MISSION.look?Object.assign({},MAPDEF.look,MISSION.look):MAPDEF.look;NIGHT_ON=!!LK.night;applyLook(LK);buildEnv(LK);setupTitle();U.tCloud.value=tex('34-fog',{srgb:false});
  buildGround();const before=new Set(S.children);MAPDEF.build();mergeStatic(before);if(MAPDEF.dress&&!Q.has('nodress'))MAPDEF.dress();M=buildMech();buildFX();buildWeapons();P=mkPlayer();
  let readySent=false;   /* textures loaded later (decals, effects) fire onLoad again: say ready only once */
  const done=()=>{if(readySent)return;readySent=true;G.mode=G.mode==='load'?'title':G.mode;$('load').style.display='none';$('title').style.display=G.mode==='title'?'flex':'none';document.title='IRONHOWL 4';ARC.post('ready',{title:ARC.title});};
  let vegDone=false,texDone=false;LM.onLoad=()=>{texDone=true;if(vegDone)done();};
  if(LK.rain)buildRain();
  Promise.all([loadVeg(MAPDEF.mix),loadEnemies().then(loadSet6)]).then(()=>{buildWeather(LK);envAll();navInit();navBuild();vegDone=true;if(texDone||LOADP>=1)done();});
  requestAnimationFrame(frame);
}
$('title').addEventListener('click',()=>{if(G.mode==='title')startPlay();});
/* map choice on the title screen: reloads the page with that map */
document.querySelectorAll('#maps button').forEach(b=>{b.classList.toggle('sel',b.dataset.map===MAPID);b.addEventListener('click',e=>{e.stopPropagation();if(b.dataset.map===MAPID)return;store.set('map',b.dataset.map);
  const q=new URLSearchParams(location.search);q.set('map',b.dataset.map);location.search=q.toString();});});
cv.addEventListener('click',()=>{if(G.mode==='play'&&!G.paused&&!touchy&&!MOUSE.locked)lockMouse();});
addEventListener('keydown',e=>{if(G.mode==='title'&&(e.code==='Enter'||e.code==='Space'))startPlay();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)setPause(true);});
addEventListener('message',e=>{const m=e.data;if(!m||m.src!=='hyperdot-arcade')return;
  if(m.cmd==='start'){if(G.mode==='title'||G.mode==='demo'||G.mode==='down'&&!MISSION||G.mode==='results')startPlay();else if(G.paused)setPause(false);}
  else if(m.cmd==='pause'){if(G.mode==='play'&&!G.paused)setPause(true);}
  else if(m.cmd==='resume'){if(G.mode==='play'&&G.paused)setPause(false);}
  else if(m.cmd==='attract'){ARC.live=false;if(G.mode!=='load')startDemo();else G.mode='demo';}
  else if(m.cmd==='mute'){ARC.muted=true;setVolume();}
  else if(m.cmd==='unmute'){ARC.muted=false;setVolume();}
});
if(DEV)window.__ih3={WX,MARKS,mortarAt,DIFF,BOSS_DEF,BOSS,MISSIONS,spawnGroup,makeTruck,get TRUCK_TPL(){return TRUCK_TPL;},SAVE,UPG,buyUpg,applyUpgrades,hangar,S,KEY,SKY,PFX,GUN,MSL,SALVO,MS,MISSION,TARGETS,hurtTarget,beginStep,finishMission,repairAtCheckpoint,EN,PK,AIM,startWave,spawnEnemy,dropPickup,hurtPlayer,rt(n=3){const t0=performance.now();for(let i=0;i<n;i++){R.render(S,cam);R.getContext().finish();}return +((performance.now()-t0)/n).toFixed(1);},G,get P(){return P;},get M(){return M;},VEG,get VEGN(){return VEGN;},R,cam,CAMS,SET,QUAL,setQuality,cycleView,startPlay,startDemo,setPause,
  ctl(o){CTLX=o;},showcase(o){CAMX=o;},
  /* run the game forward t seconds at 60 steps a second without drawing (for tests) */
  ff(t){const n=Math.round(t*60);for(let i=0;i<n;i++)tick(1/60);},
  info(){const i=R.info.render;return {calls:i.calls,tris:i.triangles,veg:VEGN.inst,ql:QL,mode:G.mode,x:+P.x.toFixed(1),z:+P.z.toFixed(1),air:P.air,fuel:+P.fuel.toFixed(2),hull:+P.hull.toFixed(0),shield:+P.shield.toFixed(0),tier:GUN.tier,heat:+GUN.heat.toFixed(0),over:GUN.over,msl:MSL.ammo,score:G.score,kills:G.kills,wave:G.wave,enemies:EN.filter(e=>!e.dead).length,bolts:BOLTS.length,ebolts:EBOLTS.length};}};
/* title screen: mission briefing when a mission is loaded, otherwise the sandbox map buttons and the mission list */
function setupTitle(){
  if(MISSION){$('maps').style.display='none';$('bmis').style.display='none';$('bend').style.display='none';$('tsub').textContent=MISSION.endless?'ENDLESS · '+MAPS[MISSION.map].name:'MISSION '+MISSION.id+' · '+MISSION.name;
    $('tbrief').innerHTML=MISSION.brief.map(l=>'<div>'+l+'</div>').join('')+'<div class="objs">'+MISSION.steps.filter((s,i,a)=>a.findIndex(q=>q.label===s.label)===i).map(s=>'· '+s.label).join('<br>')+'</div>';
    $('tgo').textContent='TAP TO DEPLOY';$('bmenu').style.display='';}
  $('bmis').onclick=e=>{e.stopPropagation();missionMenu();};
  $('bend').onclick=e=>{e.stopPropagation();endlessMenu();};$('elback').onclick=e=>{e.stopPropagation();$('elist').style.display='none';};
  $('mfps').onclick=e=>{e.stopPropagation();SET.fps=!SET.fps;store.set('fps',SET.fps?1:0);fpsLabel();};fpsLabel();
  $('bmenu').onclick=e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.delete('mission');location.search=q.toString();};
  $('mlback').onclick=e=>{e.stopPropagation();$('mlist').style.display='none';};
  $('rnext').onclick=()=>{const q=new URLSearchParams(location.search);q.set('mission',MISSION.id+1);location.search=q.toString();};
  $('rretry').onclick=()=>location.reload();
  $('bhang').onclick=e=>{e.stopPropagation();openBay();};$('rhang').onclick=e=>{e.stopPropagation();openBay();};$('hback').onclick=e=>{e.stopPropagation();$('hangar').style.display='none';};
  $('rmenu').onclick=()=>{const q=new URLSearchParams(location.search);q.delete('mission');location.search=q.toString();};
}
boot();
document.querySelectorAll('#maps button').forEach(b=>b.classList.toggle('sel',b.dataset.map===MAPID));
