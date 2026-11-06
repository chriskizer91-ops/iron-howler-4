/* ===================== missions: steps (destroy / reach / clear / hold), checkpoints, radio, results =====================
   ?mission=N loads that mission's map and look. Without it the game is the endless sandbox. Progress: hd-ironhowl3-save. */
const NIGHT_DOCKS={sun:[-.3,.55,.45],sunCol:0x9fb4ff,sunK:.7,sky:0x3a4668,ground:0x141820,hemiK:1.0,zen:0x04070f,hor:0x1c2846,fog:0x0e1626,clouds:.15,
  pano:'31-docks-night-sky',panoK:.9,ring:{tex:'33-harbor-skyline',h:60,lift:-8,tint:[1,1,1],copies:3},exp:1.45,night:true,tag:'NIGHT'};
const RAIN_DOCKS={sun:[-.4,.7,-.3],sunCol:0xb8c4d8,sunK:1.2,sky:0x8a96a8,ground:0x2a2e34,hemiK:1.7,zen:0x48505c,hor:0x77818e,fog:0x6a7482,clouds:.12,pano:null,
  ring:{tex:'33-harbor-skyline',h:60,lift:-8,tint:[.5,.55,.62],copies:3},exp:1.25,rain:true,fogFar:150,tag:'RAIN'};
const FOG_CREEK={sun:[-.5,.5,-.6],sunCol:0xe8eadc,sunK:1.9,sky:0xc8d4d0,ground:0x5a5a44,hemiK:1.7,zen:0x6a86a0,hor:0xc4ccc8,fog:0xb8c2bc,clouds:.95,exp:1.15,fogFar:105,tag:'FOG'};
const HAZE_DRY={sun:[-.4,.75,.5],sunCol:0xfff0d0,sunK:3.4,sky:0xf0e0c0,ground:0x8a7a5a,hemiK:1.9,zen:0x5a86c0,hor:0xe8d4b0,fog:0xdcc6a0,clouds:.25,pano:null,
  ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[1,.92,.8],copies:3},exp:1.1,fogFar:170,tag:'DRY'};
const BURN_WOODS={sun:[-.3,.5,.5],sunCol:0xff8a4a,sunK:1.1,sky:0x5a4a48,ground:0x24180f,hemiK:1.3,zen:0x0a0608,hor:0x6a2a14,fog:0x2e1810,clouds:.15,pano:'31-docks-night-sky',panoK:.55,exp:1.45,night:true,fire:true,fogFar:125,tag:'NIGHT FIRE'};
const STORM_FIELD={sun:[-.3,.6,.4],sunCol:0xa8b4c8,sunK:.9,sky:0x6a7080,ground:0x2a2c2a,hemiK:1.5,zen:0x262a34,hor:0x5a6070,fog:0x4a505a,clouds:.12,pano:null,
  ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[.35,.38,.42],copies:3},exp:1.25,rain:true,storm:true,fogFar:140,tag:'STORM'};
const DUSK_FIELD={sun:[-.82,.16,-.3],sunCol:0xff8a50,sunK:2.4,sky:0x9a86b4,ground:0x4a3a30,hemiK:1.3,zen:0x22305c,hor:0xf09468,fog:0xb88078,clouds:.85,pano:null,
  ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[.55,.45,.55],copies:3},exp:1.2,tag:'DUSK'};
const MISSIONS=[
  {id:1,name:'SUNLINE',map:'field',start:[0,115,0],
   brief:['FORGE steers its machines through the farm radio masts.','Knock out all three, then meet Rook at the truck by the barn.'],
   steps:[{t:'destroy',label:'DESTROY THE RELAY MASTS',masts:[2],wave:{skitter:4},radio:[['ROOK','Masts first. Then we talk about the big one.'],['ROOK','Left thumb to move, right thumb to aim. JET if they swarm you.']]},
          {t:'destroy',label:'DESTROY THE RELAY MASTS',masts:[0],wave:{skitter:5,gunner:1},cp:1,radio:[['FORGE','UNIT 07. YOU ARE OBSOLETE.'],['ROOK','Gunners keep their distance. Close in or hop around them.']]},
          {t:'destroy',label:'DESTROY THE RELAY MASTS',masts:[1],wave:{skitter:5,gunner:2},cp:1,radio:[['ROOK','Last mast. Tip: SALVO clears whatever is at your feet.']]},
          {t:'reach',label:'MEET ROOK AT THE TRUCK',at:[47,30],r:13,truck:1,radio:[['ROOK','That is the lot. Truck is by the barn.']]}]},
  {id:2,name:'NIGHT SHIFT',map:'docks',look:NIGHT_DOCKS,start:[9,88,0],
   brief:['Harbor 9, midnight. FORGE runs the container yard now.','Get through the lanes and cut the gate controls on the quay.'],
   steps:[{t:'reach',label:'GET INTO THE YARD',at:[9,28],r:10,wave:{skitter:5},radio:[['ROOK','Stay in the lanes. The stacks are too tall to hop.']]},
          {t:'clear',label:'CLEAR THE CROSSING',wave:{skitter:6,gunner:1},at:[9,28],cp:1,radio:[['FORGE','THE HARBOR IS MINE. LEAVE.']]},
          {t:'destroy',label:'DESTROY THE GATE CONTROLS',consoles:[[-25,-88],[43,-88]],wave:{gunner:2,skitter:4},cp:1,radio:[['ROOK','Two control boxes on the quay, red lights. Burn them.']]},
          {t:'reach',label:'GET TO THE MIDDLE CRANE',at:[9,-84],r:12,wave:{hound:1,skitter:4},radio:[['ROOK','Gate is dead. Head for the crane, I will lift you out.']]}]},
  {id:3,name:'PINEWALL',map:'woods',start:[0,112,0],
   brief:['A salvage convoy went quiet in the pine woods.','Find it and guard Rook while she pulls the cores out.'],
   steps:[{t:'reach',label:'FIND THE CONVOY',at:[38,-18],r:16,wreck:1,wave:{skitter:4,hound:1},radio:[['ROOK','Convoy beacon is east of the trail. Watch the trees.'],['ROOK','Hounds charge in a straight line. Hop over them.']]},
          {t:'hold',label:'GUARD ROOK',at:[38,-18],r:24,time:60,every:15,waves:[{hound:2,skitter:3},{skitter:6},{gunner:1,hound:1,skitter:3},{hound:3}],cp:1,radio:[['ROOK','Got the cores. One minute. Keep them off me.'],['FORGE','I SEE YOU, ROOK.']]},
          {t:'reach',label:'REACH THE NORTH RIDGE',at:[-19,-118],r:16,wave:{gunner:1,hound:2},cp:1,radio:[['ROOK','Done. Meet me at the north ridge.']]}]},
  {id:4,name:'HOLD THE FARM',map:'field',look:DUSK_FIELD,start:[0,115,0],
   brief:['Dusk. A storm and a FORGE column are both heading for the farm.','Hold the farmhouse relay until Rook finishes the upload.'],
   steps:[{t:'reach',label:'GET TO THE FARMHOUSE',at:[41,62],r:16,radio:[['ROOK','Storm is coming in. So is FORGE.']]},
          {t:'hold',label:'DEFEND THE FARMHOUSE',at:[45,52],r:34,time:150,every:16,waves:[{skitter:6},{hound:2,skitter:4},{gunner:2,skitter:3},{gunner:1,hound:2,skitter:4},{gunner:2,hound:2},{gunner:3,skitter:6}],cp:1,
           radio:[['ROOK','Two and a half minutes. Stay near the house.'],['FORGE','THE FIELDS BELONG TO THE FACTORY.']]}]},
  {id:5,name:'CONTAINER MAZE',map:'docks',look:RAIN_DOCKS,start:[9,88,0],
   brief:['Rain over Harbor 9. FORGE has planted spawner pods in the stacks.','Each pod keeps printing Skitters until it is destroyed. Find all four.'],
   steps:[{t:'destroy',label:'DESTROY THE SPAWNER PODS',spawners:[[-59,4],[43,-20],[-25,-62],[77,46]],wave:{skitter:4},cp:1,radio:[['ROOK','Four pods. The marker shows the nearest one.'],['ROOK','They print Skitters every few seconds. Do not linger.']]},
          {t:'reach',label:'GET TO THE MIDDLE CRANE',at:[9,-84],r:12,wave:{gunner:2,hound:1},cp:1,radio:[['FORGE','EVERY STACK HAS EYES.'],['ROOK','Pods are dead. Crane, now.']]}]},
  {id:6,name:'CREEKBED',map:'woods',mix:'creek',look:FOG_CREEK,start:[-14,-104,Math.PI],
   brief:['Fog along the creek. Rook is driving the salvage out through the woods.','Escort her truck to the south road. If it is destroyed, the mission fails.'],
   steps:[{t:'escort',label:'ESCORT ROOK',hp:700,route:[[-22.8,-118],[-28.8,-96],[3.2,-73.6],[32,-44.8],[25.6,-6.4],[-9.6,19.2],[-35.2,51.2],[-19.2,89.6],[-8.9,112]],
           waves:[{skitter:5},{hound:2,skitter:3},{gunner:1,skitter:4},{hound:3},{gunner:2,hound:1}],every:18,cp:1,
           radio:[['ROOK','I only drive while you are close. Stay within 35 metres.'],['ROOK','Some of them go for the truck. Kill those first.']]}]},
  {id:7,name:'DUST DEVIL',map:'field',ground:{a:'61-dry-prairie-ground'},mix:'dry',look:HAZE_DRY,start:[0,115,0],
   brief:['Dry country. The Thresher, FORGE\u2019s harvester, is clearing the fields.','Its four knees glow red: those are the weak points. Then hit the core.'],
   boss:'thresher',bossAt:[10,-24],
   steps:[{t:'reach',label:'FIND THE THRESHER',at:[8,14],r:46,boss:1,radio:[['ROOK','Something big is kicking up the dust out there.']]},
          {t:'boss',label:'BRING DOWN THE THRESHER',cp:1,radio:[['FORGE','HARVEST BEGINS.'],['ROOK','Shoot the red knees! Hop out of the red circles.']]}]},
  {id:8,name:'TANKER RUN',map:'docks',tag:'SUNSET',start:[9,88,0],
   brief:['Sunset. A FORGE tanker is loading at the quay.','Cut its three mooring winches before it sails. Lancers paint you with a red line, then fire.'],
   steps:[{t:'destroy',label:'CUT THE MOORING WINCHES',consoles:[[-93,-89],[-25,-89],[43,-89]],limit:240,wave:{lancer:2,skitter:4},cp:1,
           radio:[['ROOK','Four minutes. When you see the red line, get behind a stack or move.'],['FORGE','THE TIDE WAITS FOR NO ONE.']]}]},
  {id:9,name:'BURNING PINES',map:'woods',mix:'conifer',look:BURN_WOODS,boss:'stag',bossAt:[12,-66],start:[0,112,0],
   brief:['Night. FORGE has set the pine woods on fire to flush you out.','Hornets dive from above. Then the Stag: shoot its two antler pods, then its chest.'],
   steps:[{t:'reach',label:'CLIMB TO THE BURNING RIDGE',at:[-35,51],r:14,wave:{hornet:3},cp:1,radio:[['ROOK','Hornets. Look up, they dive and sting.'],['ROOK','The salvo locks on to them by itself.']]},
          {t:'clear',label:'CLEAR THE RIDGE',wave:{hornet:3,hound:2},radio:[['FORGE','BURN.']]},
          {t:'reach',label:'FIND THE STAG',at:[26,-6],r:44,boss:1,cp:1,radio:[['ROOK','Something tall is walking through the fire.']]},
          {t:'boss',label:'BRING DOWN THE STAG',cp:1,radio:[['ROOK','Shoot the red pods in its antlers. Back off to get the angle.'],['ROOK','Red circles: move. When it is close, it stomps.']]}]},
  {id:10,name:'STORM FRONT',map:'field',look:STORM_FIELD,start:[0,115,0],
   brief:['A storm over the fields. FORGE is raising relays to call in its heavy machines.','Take all three relays: stand in each ring until it fills. Lightning hits the machines too.'],
   steps:[{t:'capture',label:'TAKE THE RELAYS',points:[[-55,40],[50,-10],[-30,-70]],r:13,time:25,every:20,cp:1,
           waves:[{tank:1,skitter:3},{bulwark:1,hound:2},{mortar:1,skitter:4},{tank:1,bulwark:1},{hornet:3,hound:1}],
           radio:[['ROOK','Tanks: their front armour shrugs off your gun. Hit the sides or the back.'],['ROOK','Bulwarks carry a shield. Walk round them, hop over, or use missiles.']]}]},
  {id:11,name:'LOCKDOWN',map:'docks',yard:true,look:Object.assign({},NIGHT_DOCKS,{tag:'NIGHT SIEGE'}),boss:'maw',bossAt:[-8,-42],start:[9,88,0],
   brief:['Night siege at Harbor 9. Searchlights sweep the lanes; if one finds you, shells follow.','Knock out the three searchlight towers, then face the Maw in the crane yard.'],
   steps:[{t:'destroy',label:'KNOCK OUT THE SEARCHLIGHTS',lights:[[-59,44],[43,20],[-93,-24]],wave:{lancer:1,skitter:4},cp:1,radio:[['ROOK','Stay out of the white circles. FORGE shells whatever they light up.']]},
          {t:'reach',label:'INTO THE CRANE YARD',at:[-8,-12],r:36,boss:1,wave:{hound:2},cp:1,radio:[['FORGE','THE MAW IS HUNGRY.']]},
          {t:'boss',label:'BRING DOWN THE MAW',cp:1,radio:[['ROOK','Its mouth is armoured shut. Wait for the jaw to open, then pour it in.']]}]},
  {id:12,name:'HEART OF THE FORGE',map:'foundry',boss:'forge',bossAt:[FORGE_AT.x,FORGE_AT.z],tag:'FINAL',start:[0,100,0],
   brief:['Foundry 4. The gates are open. FORGE is waiting.','Break the four shield pylons, then the furnace, then the eye. Hop over the red beam.'],
   steps:[{t:'reach',label:'ENTER THE FOUNDRY YARD',at:[0,42],r:18,boss:1,wave:{skitter:4,bulwark:1},cp:1,radio:[['ROOK','This is it, Howl. Everything it built is between us and the core.'],['FORGE','UNIT 07. YOU ARE OBSOLETE.']]},
          {t:'boss',label:'DESTROY FORGE',cp:1,radio:[['FORGE','I BUILT EVERYTHING YOU SEE.'],['ROOK','Pylons first. Four of them, red orbs on top.']]}]},
];
const MID=parseInt(Q.get('mission')||'0',10),EMAP=(Q.get('endless')||'').toLowerCase(),MISSION=EMAP&&endlessBoss(EMAP)?endlessDef(EMAP):MISSIONS.find(m=>m.id===MID)||null;
/* difficulty climbs across the campaign: enemy damage and toughness per mission (mission 1 is gentle) */
const DIFF=MISSION?{dmg:[.8,.85,.9,.95,1,1,1.05,1.1,1.1,1.15,1.2,1.25][MISSION.id-1]||1,hp:[.85,.9,.9,.95,1,1,1,1.05,1.05,1.1,1.15,1.15][MISSION.id-1]||1}:{dmg:1,hp:1};
const MS={step:-1,t:0,waveT:0,wi:0,hold:0,repairs:3,cp:null,kills0:0,time:0,done:false,objs:[],truck:null,zone:null,built:{},limitT:0,wpos:null,escort:null};
const SAVE={get(){try{return JSON.parse(store.get('save','{}'))||{};}catch(e){return {};}},put(o){store.set('save',JSON.stringify(o));}};
function unlocked(){return Math.max(1,SAVE.get().unlocked||1);}
/* ---- destructible objectives: radio masts (built by the field map), gate control boxes (made here) ---- */
const TARGETS=[];
function addTarget(o){o.hp=o.hpMax;o.dead=false;TARGETS.push(o);return o;}
function hitTargets(x0,y0,z0,x1,y1,z1){for(const t of TARGETS){if(t.dead)continue;for(const s of t.spheres){if(segSphere(x0,y0,z0,x1,y1,z1,s[0],s[1],s[2],s[3])>=0)return t;}}return null;}
function hurtTarget(t,d){if(t.dead)return;if(t.immune&&t.immune()){if(Math.random()<.3)sparks(t.x,t.y+3,t.z,3,[.8,.9,1]);return;}t.hp-=d;t.flash=1;if(t.hp<=0){t.dead=true;boom(t.x,t.y+3,t.z,1.8);setTimeout(()=>boom(t.x+1,t.y+6,t.z,1.2),250);addScore(300);addScrap(40);if(t.die)t.die();}}
function makeConsole(x,z){const y=hgt(x,z),g=new THREE.Group();g.position.set(x,y,z);
  const body=new THREE.Mesh(sbox(2.6,3.2,1.8),tmat('12-rusted-steel-plate',{rep:[2,2]}));body.position.y=1.6;body.castShadow=body.receiveShadow=true;g.add(body);
  const lamp=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.12,.05).multiplyScalar(4)});
  for(const dx of [-.7,0,.7]){const l=new THREE.Mesh(new THREE.BoxGeometry(.4,.25,.1),lamp);l.position.set(dx,2.6,.92);g.add(l);}
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3,6),tmat('25-brushed-steel'));ant.position.set(.9,4.6,0);g.add(ant);S.add(g);
  return addTarget({x,z,y,hpMax:170,spheres:[[x,y+1.6,z,1.9]],obj:g,die(){g.rotation.z=.5;g.position.y-=.8;lamp.color.setRGB(.15,.02,.01);}});}
function mastTarget(i){const m=MAPS.field.mastObjs[i];return addTarget({x:m.x,z:m.z,y:m.y,hpMax:260,spheres:[[m.x,m.y+3,m.z,2.4],[m.x,m.y+8,m.z,2],[m.x,m.y+13,m.z,1.6]],obj:m.tower,
  die(){m.fall=1;m.lamp.material.color.setRGB(.1,.02,.01);}});}
/* Rook's truck: a quick boxy stand-in (the real model comes with the escort mission) */
function makeTruck(x,z,yaw,burnt,moving){if(TRUCK_TPL){const g=truckModel(burnt);g.position.set(x,hgt(x,z),z);g.rotation.y=yaw||0;S.add(g);if(!moving)addBox(x-2.5,z-4.5,x+2.5,z+4.5,3.5);return g;}
  const g=new THREE.Group(),y=hgt(x,z);g.position.set(x,y,z);g.rotation.y=yaw||0;
  const body=burnt?tmat('12-rusted-steel-plate',{col:0x3a3330}):tmat('53-howler-armour-large-plates',{rep:[1,1]}),dark=tmat('24-gunmetal',{col:burnt?0x222222:0x666a70});
  const add=(geo,m,px,py,pz)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;g.add(o);};
  add(new THREE.BoxGeometry(2.6,2.2,2.4),body,0,2.1,2.6);add(new THREE.BoxGeometry(2.7,1.2,5.2),dark,0,1.5,-1.2);add(new THREE.BoxGeometry(2.4,.9,4.8),body,0,2.5,-1.2);
  const wg=new THREE.CylinderGeometry(.62,.62,.5,14);wg.rotateZ(Math.PI/2);for(const wz of [2.6,-.4,-2.6])for(const wx of [-1.35,1.35])add(wg,tmat('57-rubber-and-cables'),wx,.62,wz);
  add(new THREE.BoxGeometry(.3,2.6,.3),dark,.8,3.6,-2.8);S.add(g);if(!moving)addBox(x-2.5,z-4.5,x+2.5,z+4.5,3.5);return g;}
/* a soft ring on the ground showing where to stand (hold steps) or go (reach steps) */
function zoneRing(x,z,r,col){const g=new THREE.RingGeometry(r-.5,r,64);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:new THREE.Color(...col),transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.set(x,hgt(x,z)+.25,z);m.renderOrder=3;S.add(m);return m;}
/* ---- radio strip ---- */
const RADIO=[];let radioT=0;
function radio(lines){for(const l of lines)RADIO.push(l);}
function updRadio(dt){radioT-=dt;if(radioT<=0){const el=$('radio');if(RADIO.length){const [who,txt]=RADIO.shift();el.innerHTML='<b class="'+(who==='FORGE'?'fg':'rk')+'">'+who+'</b> '+txt;el.style.opacity=1;radioT=3.8;if(who==='FORGE')sEShot();else sClick();}else if(el.style.opacity!=='0'){el.style.opacity=0;}}}
/* ---- running a mission ---- */
function spawnGroup(def,cx,cz,ring){for(const id in def){let x=cx,z=cz;
    for(let k=0;k<30;k++){const a=Math.random()*TAU,d=(ring||[12,26]);x=cx+Math.cos(a)*(d[0]+Math.random()*(d[1]-d[0]));z=cz+Math.sin(a)*(d[0]+Math.random()*(d[1]-d[0]));const B=BND();x=clamp(x,B.x0+4,B.x1-4);z=clamp(z,B.z0+4,B.z1-4);
      const c=navCell(x,z);if(c>=0&&!NAV.block[c]&&Math.hypot(x-P.x,z-P.z)>30)break;}
    BEACONS.push({x,z,t:1.3});for(let i=0;i<def[id];i++){const a=Math.random()*TAU,r=Math.random()*5+(i?2:0),c=collide(x+Math.cos(a)*r,z+Math.sin(a)*r,EDEF[id].r);spawnEnemy(id,c[0],c[1]);}}}
function stepPos(s){if(MS.wpos)return MS.wpos;if(s.spawners||s.lights){return MS.objs.find(t=>!t.dead)||null;}if(s.masts)return MAPS.field.mastObjs[s.masts[0]];if(s.consoles){const live=MS.objs.find(t=>!t.dead);return live||{x:s.consoles[0][0],z:s.consoles[0][1]};}if(s.at)return {x:s.at[0],z:s.at[1]};return null;}
function beginStep(i){
  MS.step=i;MS.t=0;MS.wi=0;MS.waveT=4;MS.hold=0;MS.objs=[];const s=MISSION.steps[i];if(!s)return finishMission(true);
  if(MS.zone){S.remove(MS.zone);MS.zone=null;}
  if(s.cp)MS.cp={step:i,x:P.x,z:P.z,yaw:P.yaw,tier:GUN.tier};MS.wpos=null;
  const first=!MS.built[i];
  if(first){MS.built[i]=s.masts?s.masts.map(mastTarget):s.consoles?s.consoles.map(c=>makeConsole(c[0],c[1])):s.spawners?s.spawners.map(c=>makeSpawner(c[0],c[1])):s.lights?s.lights.map(c=>makeSearchlight(c[0],c[1])):[];if(s.limit)MS.limitT=s.limit;}
  MS.objs=MS.built[i];for(const t of MS.objs)if(!t.dead)t.hp=t.hpMax;
  if(s.t==='escort')escortBegin(s,first);
  if(s.t==='capture')captureBegin(s,first);
  if(s.t==='endless')endlessBegin();
  if(s.boss||s.t==='boss'){if(!BOSS.o)BOSS_DEF[MISSION.boss].make(...(MISSION.bossAt||[10,-24]));BOSS.idle=s.t!=='boss';}
  if(s.truck&&!MS.truck)MS.truck=makeTruck(s.at[0],s.at[1],-.6);
  if(s.wreck&&!MS.wreck){MS.wreck=[makeTruck(s.at[0]+4,s.at[1]-3,.9,1),makeTruck(s.at[0]-6,s.at[1]+5,2.4,1)];}
  if(s.t==='hold'||s.t==='reach')MS.zone=zoneRing(s.at[0],s.at[1],s.r,s.t==='hold'?[1,.6,.2]:[.4,.9,1]);
  if(s.wave){const p=stepPos(s)||{x:P.x-Math.sin(P.yaw)*60,z:P.z-Math.cos(P.yaw)*60};spawnGroup(s.wave,p.x,p.z,s.t==='clear'?[8,22]:[10,26]);}
  if(s.radio&&first)radio(s.radio);
  HUD.banner(s.label);if(i>0&&s.cp){HUD.msg('CHECKPOINT',1.6);sPickup();}
}
function updMission(dt){
  if(!MISSION||G.mode!=='play'||MS.done)return;
  MS.t+=dt;MS.time+=dt;const s=MISSION.steps[MS.step];if(!s)return;
  for(const m of MAPS.field.mastObjs||[])if(m.fall&&m.fall<90){m.fall+=dt*60;m.tower.rotation.z=Math.min(1.5,(m.fall/60)*(m.fall/60)*1.5);}
  let txt=s.label,ok=false;
  if(s.t==='destroy'){const left=MS.objs.filter(t=>!t.dead).length;txt+=' '+(MS.objs.length-left)+'/'+MS.objs.length;
    if(s.masts){const all=MISSION.steps.filter(q=>q.masts).length,doneN=MISSION.steps.indexOf(s);txt=s.label+' '+(doneN+(left?0:1))+'/'+all;}ok=left===0;}
  else if(s.t==='reach'){ok=Math.hypot(P.x-s.at[0],P.z-s.at[1])<s.r;}
  else if(s.t==='escort'){const r=escortStep(s,dt);txt=r.txt;ok=r.ok;MS.wpos=r.pos;}
  else if(s.t==='endless'){const r=endlessStep(s,dt);txt=r.txt;ok=false;MS.wpos=r.pos;}
  else if(s.t==='capture'){const r=captureStep(s,dt);txt=r.txt;ok=r.ok;MS.wpos=r.pos;}
  else if(s.t==='boss'){const r=BOSS_DEF[MISSION.boss].step(s,dt);txt=r.txt;ok=r.ok;MS.wpos=r.pos;}
  else if(s.t==='clear'){ok=MS.t>3&&EN.filter(e=>!e.dead).length===0&&BEACONS.length===0;}
  else if(s.t==='hold'){const inside=Math.hypot(P.x-s.at[0],P.z-s.at[1])<s.r;if(inside)MS.hold+=dt;const left=Math.max(0,s.time-MS.hold);
    txt+=' '+Math.floor(left/60)+':'+String(Math.floor(left%60)).padStart(2,'0')+(inside?'':' · GET BACK IN THE RING');
    MS.waveT-=dt;if(MS.waveT<=0&&left>0){MS.waveT=s.every;const w=s.waves[MS.wi%s.waves.length];MS.wi++;const a=Math.random()*TAU;spawnGroup(w,s.at[0]+Math.cos(a)*70,s.at[1]+Math.sin(a)*70,[0,14]);}
    ok=left<=0;}
  if(s.spawners)updSpawners(dt);
  if(BOSS.o&&s.t!=='boss'&&!BOSS.dead)BOSS_DEF[MISSION.boss].idle(dt);
  if(s.limit&&!ok){MS.limitT-=dt;const L=Math.max(0,MS.limitT);txt+=' · '+Math.floor(L/60)+':'+String(Math.floor(L%60)).padStart(2,'0');
    if(L<=30&&Math.floor(L)!==Math.floor(L+dt))sClick();if(L<=0){HUD.msg('OUT OF TIME',3);finishMission(false);return;}}
  HUD.set('obj','text',txt);
  if(ok){addScore(500);beginStep(MS.step+1);}
}
function finishMission(won){if(MISSION.endless)return endlessOver();if(MS.done)return;MS.done=true;G.mode='results';
  const time=MS.time|0,bonus=won?2000+Math.max(0,600-time)*5+MS.repairs*400:0;if(won){addScore(bonus);addScrap(150+MS.repairs*25);}const got=bankScrap();
  const sv=SAVE.get();sv.best=sv.best||{};if(won){sv.unlocked=Math.max(sv.unlocked||1,MISSION.id+1);}sv.best[MISSION.id]=Math.max(sv.best[MISSION.id]||0,G.score);SAVE.put(sv);
  const tickets=Math.min(80,Math.floor(G.score/400)+(won?10:0));ARC.over(G.score,tickets);
  $('rtitle').textContent=won?'MISSION COMPLETE':'MISSION FAILED';$('rtitle').className='logo'+(won?'':' bad');
  $('rstats').innerHTML=[['MISSION',MISSION.id+' · '+MISSION.name],['SCORE',G.score.toLocaleString('en-US')],['TIME',Math.floor(time/60)+':'+String(time%60).padStart(2,'0')],['KILLS',G.kills],['REPAIRS LEFT',MS.repairs],['SCRAP',got+' (TOTAL '+scrap()+')'],['TICKETS',tickets]].map(r=>'<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
  $('rnext').style.display=won&&MISSIONS.find(m=>m.id===MISSION.id+1)?'':'none';$('results').style.display='flex';jetLoop(0);
}
/* falling in a mission: repair at the last checkpoint (3 repairs per mission), then the mission is lost */
function missionDown(){if(MS.repairs<=0){MS.failT=2.2;return false;}return true;}   /* counted in game time (tick), so it also works when timers are slowed */
function repairAtCheckpoint(){MS.repairs--;const cp=MS.cp||{step:0,x:MISSION.start[0],z:MISSION.start[1],yaw:MISSION.start[2],tier:GUN.base};
  clearFight();P=mkPlayer();applyUpgrades();P.x=cp.x;P.z=cp.z;P.y=hgt(cp.x,cp.z);P.yaw=P.legYaw=cp.yaw;CAMS.ready=false;if(M)M.root.visible=true;
  P.hull=P.hullMax;P.shield=P.shieldMax;P.cells=P.cells;GUN.tier=Math.max(GUN.base,(cp.tier||1)-1);GUN.heat=0;GUN.over=false;$('down').style.display='none';G.mode='play';
  for(const t of MS.objs)if(!t.dead){t.hp=t.hpMax;}beginStep(cp.step);HUD.msg('REPAIRED · '+MS.repairs+' LEFT',2);}
function startMission(){MS.scrap=0;MS.built={};MS.escort=null;MS.wpos=null;MS.done=false;MS.repairs=3;MS.cp=null;MS.time=0;RADIO.length=0;P.x=MISSION.start[0];P.z=MISSION.start[1];P.y=hgt(P.x,P.z);P.yaw=P.legYaw=MISSION.start[2];CAMS.ready=false;beginStep(0);}
/* mission list on the title screen */
function missionMenu(){const box=$('mlist'),u=unlocked(),best=SAVE.get().best||{};
  box.querySelector('.cards').innerHTML=MISSIONS.map(m=>{const lock=m.id>u;return '<button class="mcard'+(lock?' lock':'')+'" data-id="'+m.id+'"'+(lock?' disabled':'')+'><b>'+m.id+' · '+m.name+'</b><span>'+
    (lock?'LOCKED':MAPS[m.map].name+(m.tag||m.look&&m.look.tag?' · '+(m.tag||m.look.tag):'')+(best[m.id]?' · BEST '+best[m.id].toLocaleString('en-US'):''))+'</span></button>';}).join('');
  box.querySelectorAll('.mcard').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.set('mission',b.dataset.id);q.delete('map');location.search=q.toString();}));
  box.style.display='flex';}
