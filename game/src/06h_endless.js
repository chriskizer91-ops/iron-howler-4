/* ===================== session 8: Endless mode, extra radio lines, the attract demo that fights ===================== */
/* ---- Endless: ?endless=woods|field|docks|foundry. Waves that slowly get harder; every 5th is heavy, every 10th brings the arena's boss ---- */
/* a function, not a table, because the missions file asks for it before this file has run */
function endlessBoss(m){return {field:['thresher',[10,-24]],woods:['stag',[12,-66]],docks:['maw',[-8,-42]],foundry:['forge',null]}[m];}
function endlessDef(map){const sp=MAPS[map].spawn,b=endlessBoss(map);
  return {id:0,endless:true,name:'ENDLESS',map,yard:map==='docks',boss:b[0],bossAt:b[1]||[FORGE_AT.x,FORGE_AT.z],start:[sp.x,sp.z,sp.yaw||0],
    brief:['Endless. The waves keep coming, and each one is a little harder.','Every 5th wave is heavy. Every 10th brings this arena’s boss. Supplies drop between waves.'],
    steps:[{t:'endless',label:'SURVIVE THE WAVES'}]};}
const EW={wave:0,state:'break',t:5,boss:false,queue:[],qt:0};
/* machines join the waves in campaign order: [type, first wave, how common] */
const EN_ORDER=[['skitter',1,5],['hound',3,3],['gunner',5,2.2],['hornet',7,2.2],['lancer',9,1],['bulwark',11,1.1],['tank',13,.7],['mortar',15,.6]];
function endlessWave(n){const w={},add=(id,k)=>{w[id]=(w[id]||0)+k;};
  if(n%10===0){add('skitter',Math.min(8,2+(n/5|0)));add('hound',Math.min(4,n/10|0));return w;}
  if(n%5===0){add('gunner',2+(n/10|0));add('hound',2);if(n>=11)add('bulwark',1+(n/20|0));if(n>=13)add('tank',1+(n/25|0));else add('gunner',1);return w;}
  const pool=EN_ORDER.filter(t=>n>=t[1]),tot=pool.reduce((a,t)=>a+t[2],0),count=Math.min(24,3+n);
  for(let i=0;i<count;i++){let r=Math.random()*tot;for(const t of pool){r-=t[2];if(r<=0){add(t[0],1);break;}}}
  return w;}
function endlessBegin(){MS.repairs=0;Object.assign(EW,{wave:0,state:'break',t:6,boss:false,queue:[],qt:0});DIFF.dmg=.9;DIFF.hp=1;G.hpK=1;
  radio([['ROOK','Endless. They keep coming, and every wave is a little worse.'],['ROOK','Supplies drop between waves. Every tenth wave, something big.']]);}
function startEWave(){const n=++EW.wave;G.hpK=Math.min(2.2,1+.035*(n-1));DIFF.dmg=Math.min(1.6,.9+.025*(n-1));
  const w=endlessWave(n),list=[];for(const id in w)for(let i=0;i<w[id];i++)list.push(id);list.sort(()=>Math.random()-.5);
  EW.queue=[];for(let i=0;i<list.length;i+=6){const g={};for(const id of list.slice(i,i+6))g[id]=(g[id]||0)+1;EW.queue.push(g);}EW.qt=0;EW.state='fight';
  if(n%10===0&&MISSION.boss){if(BOSS.o&&BOSS.kind!=='forge')S.remove(BOSS.o);if(!(MISSION.boss==='forge'&&BOSS.o&&!BOSS.dead)){BOSS_DEF[MISSION.boss].make(...MISSION.bossAt);}
    BOSS.idle=false;EW.boss=true;radio([['FORGE',['SOMETHING LARGER IS COMING.','MEET MY BEST WORK.','YOU WILL NOT SURVIVE THIS ONE.'][(n/10-1)%3]]]);}
  HUD.banner(n%10===0?'WAVE '+n+' · BOSS':n%5===0?'WAVE '+n+' · HEAVY':'WAVE '+n);sClick();
  if(n>1&&n%4===1)radio([[Math.random()<.5?'ROOK':'FORGE',ENDLESS_LINES[Math.random()<.5?0:1][(Math.random()*6)|0]]]);}
const ENDLESS_LINES=[['Still standing. Good.','They are getting tougher, Howl. So are you.','Keep moving. Do not let them box you in.','Watch the edges. They like to flank.','Use the breaks. Grab the crates.','Another wave. Deep breath.'],
  ['YOUR RESISTANCE IS NOTED.','I HAVE MORE MACHINES THAN YOU HAVE TIME.','EVERY WAVE IS AN EXPERIMENT. YOU ARE THE SUBJECT.','RECALCULATING.','YOU CANNOT DO THIS FOREVER.','THE FACTORY NEVER SLEEPS.']];
function endlessStep(s,dt){const alive=EN.filter(e=>!e.dead).length;
  if(EW.state==='break'){EW.t-=dt;if(EW.t<=0)startEWave();return {txt:'WAVE '+(EW.wave+1)+' IN '+Math.max(1,Math.ceil(EW.t)),ok:false,pos:null};}
  let bossPos=null;if(EW.boss&&BOSS.o){const r=BOSS_DEF[MISSION.boss].step(s,dt);bossPos=r.pos;if(BOSS.dead&&BOSS.deadT>2.5){EW.boss=false;addScore(3000);}}
  if(EW.queue.length&&(EW.qt-=dt)<=0){EW.qt=7;const g=EW.queue.shift(),q=spawnSpot();spawnGroup(g,q[0],q[1],[0,10]);}
  const left=alive+EW.queue.reduce((a,g)=>a+Object.values(g).reduce((x,y)=>x+y,0),0);
  if(!left&&!EW.boss){addScore(EW.wave*200);EW.state='break';EW.t=8;HUD.banner('WAVE '+EW.wave+' CLEARED');sPickup();
    const f=fwdOf(P.yaw),dx=P.x+f[0]*9,dz=P.z+f[1]*9;dropPickup(dx-2,dz,'repair');dropPickup(dx+2,dz,'shield');if(EW.wave%3===0)dropPickup(dx,dz+2,'chip');
    return {txt:'WAVE '+EW.wave+' CLEARED',ok:false,pos:null};}
  let near=null,nd=1e9;for(const e of EN){if(e.dead)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<nd){nd=d;near=e;}}
  return {txt:'WAVE '+EW.wave+' · '+left+' LEFT'+(EW.boss?' · BOSS':''),ok:false,pos:bossPos||(nd>45?near:null)};}
function endlessOver(){if(MS.done)return;MS.done=true;G.mode='results';const time=MS.time|0,got=bankScrap(),sv=SAVE.get();sv.endless=sv.endless||{};
  const b=sv.endless[MISSION.map]||{wave:0,score:0},best={wave:Math.max(b.wave,EW.wave),score:Math.max(b.score,G.score)};sv.endless[MISSION.map]=best;SAVE.put(sv);
  const tickets=Math.min(80,Math.floor(G.score/400)+Math.floor(EW.wave/5)*2);ARC.over(G.score,tickets);
  $('rtitle').textContent='WAVE '+EW.wave;$('rtitle').className='logo';
  $('rstats').innerHTML=[['ARENA',MAPS[MISSION.map].name],['REACHED WAVE',EW.wave],['SCORE',G.score.toLocaleString('en-US')],['BEST',best.score.toLocaleString('en-US')+' · WAVE '+best.wave],
    ['KILLS',G.kills],['TIME',Math.floor(time/60)+':'+String(time%60).padStart(2,'0')],['SCRAP',got+' (TOTAL '+scrap()+')'],['TICKETS',tickets]].map(r=>'<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
  $('rnext').style.display='none';$('results').style.display='flex';jetLoop(0);}
function endlessMenu(){const box=$('elist'),E=SAVE.get().endless||{};
  box.querySelector('.cards').innerHTML=['field','woods','docks','foundry'].map(m=>{const b=E[m];return '<button class="mcard" data-map="'+m+'"><b>'+MAPS[m].name+'</b><span>'+
    (b?'BEST WAVE '+b.wave+' · '+b.score.toLocaleString('en-US'):'NOT PLAYED YET')+'</span></button>';}).join('');
  box.querySelectorAll('.mcard').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.delete('mission');q.delete('map');q.set('endless',b.dataset.map);location.search=q.toString();}));
  box.style.display='flex';}
/* ---- extra radio: checkpoints, low hull, overheating, combos, and FORGE getting angrier through the campaign ---- */
const RX={hullT:0,heatT:0,comboT:0,forgeT:40,lastCombo:0,wasOver:false};
const FORGE_POOL=[['UNIT 07. YOU ARE OBSOLETE.','YOUR CREW IS SMALL. MY FACTORY IS NOT.','I WILL BUILD A BETTER YOU.','RETURN TO THE SCRAPYARD.'],
  ['YOU ARE BECOMING AN INCONVENIENCE.','I HAVE STUDIED YOUR MOVEMENTS.','EVERY MACHINE YOU BREAK, I REBUILD.','STOP. THIS IS NOT A REQUEST.'],
  ['YOU WILL NOT REACH THE CORE.','I WILL MELT YOU DOWN MYSELF.','ENOUGH. ENOUGH!','THIS ENDS IN FIRE, UNIT 07.']];
function updRadioX(dt){if(G.mode!=='play'||!MISSION||MS.done||P.dead)return;
  RX.hullT-=dt;RX.heatT-=dt;RX.comboT-=dt;RX.forgeT-=dt;
  if(P.hull/P.hullMax<.3&&RX.hullT<=0){RX.hullT=25;radio([['ROOK',['Hull under a third. Find a green repair.','You are leaking oil. Back off and recover.','Shield first, Howl. Break line of sight.'][(Math.random()*3)|0]]]);}
  if(GUN.over&&!RX.wasOver&&RX.heatT<=0){RX.heatT=30;radio([['ROOK','Gun is cooking. Hit VENT.']]);}RX.wasOver=GUN.over;
  if(G.combo>=5&&RX.lastCombo<5&&RX.comboT<=0){RX.comboT=20;radio([['ROOK',['Five in a row!','That is a streak.','Look at you go.'][(Math.random()*3)|0]]]);}RX.lastCombo=G.combo;
  if(RX.forgeT<=0&&!MISSION.endless){RX.forgeT=45+Math.random()*30;if(Math.random()<.55){const tier=MISSION.id<=4?0:MISSION.id<=8?1:2;radio([['FORGE',FORGE_POOL[tier][(Math.random()*4)|0]]]);}}}
/* ---- attract demo: walks the route, and when machines show up it turns, shoots, hops over charges and fires the salvo. It cannot die. ---- */
const DM={spawnT:6,viewT:9,orbT:30,orbit:0,aimT:0,view:'far'};
function demoFight(c,dt){
  DM.spawnT-=dt;if(DM.spawnT<=0){DM.spawnT=12;if(EN.filter(e=>!e.dead).length<4){const q=spawnSpot();spawnGroup(Math.random()<.6?{skitter:3}:{hound:1,skitter:2},q[0],q[1],[0,8]);}}
  let near=null,nd=60;for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<nd&&los(e.x,e.z)){nd=d;near=e;}}
  if(near){const want=Math.atan2(-(near.x-P.x),-(near.z-P.z)),d=angD(want,P.yaw);c.turn=-clamp(d,-2.4*dt,2.4*dt);c.my=nd>24?.6:nd<10?-.5:0;
    c.pitch=clamp((Math.atan2(near.y+near.d.cy-(P.y+3.3),nd)-(P.pitch||0))*.5,-.05,.05);c.fire=Math.abs(d)<.25;
    if(near.id==='hound'&&near.st==='aim'&&nd<20){c.jetHit=true;c.jet=true;}
    if(EN.filter(e=>!e.dead&&Math.hypot(e.x-P.x,e.z-P.z)<30).length>=3)c.salvo=true;}
  /* the camera takes turns: far, close, and now and then a slow orbit */
  DM.viewT-=dt;if(DM.viewT<=0){DM.viewT=9;DM.view=DM.view==='far'?'close':'far';}
  DM.orbT-=dt;if(DM.orbT<=0&&!DM.orbit){DM.orbit=6;DM.orbT=32;}
  if(DM.orbit>0){DM.orbit-=dt;CAMX={a:Math.PI+G.t*.35,d:16,h:7,ly:3.5};if(DM.orbit<=0){DM.orbit=0;CAMX=null;}}
  return c;}
