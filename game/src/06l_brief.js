/* ===================== Ironhowl 4: the intel brief and the armory book (session 4) =====================
   Both use the modification bay's room (06i_bay.js): the same lights, floor, camera and touch controls (drag to turn,
   pinch or wheel to zoom), with a model on the stage instead of the Wraith.
   INTEL BRIEF: before a run, and later in a run when a wave brings a machine you haven't been briefed on (every boss),
     the game stops and shows the machines headed your way: a chip for each kind with how many are coming, the full-detail
     model turning, and its card. No timer: DEPLOY starts the fight.
   ARMORY BOOK (title screen): a card for every kit piece (locked ones say the pilot level that opens them) and for every
     machine; a machine's card is filled in the first time you destroy one, until then it stands as a dark shape.
   Full-detail models load in the background: the combat model shows at once, the full one replaces it when it arrives
   (on Low quality the combat model stays). */
const FOE_INFO={
  skitter:{name:'SKITTER',cls:'FORGE SWARM DRONE',size:'0.9 m tall, 1.9 m across',atk:'zap, 4 a hit, close range',
    fight:'Rushes in, zaps at close range, springs back and comes again. Comes in swarms.',tip:'Hover above 3 m and it can’t reach you. The Arc clears a swarm.'},
  hound:{name:'HOUND',cls:'FORGE PACK HUNTER',size:'2.4 m tall, 4.5 m long',atk:'charge, 18 a hit',
    fight:'Fast. Crouches, then charges in a straight line; backs off and charges again.',tip:'When it crouches, step aside or hop. Hovering keeps you out of reach.'},
  gunner:{name:'GUNNER',cls:'FORGE HEAVY',size:'about 5 m tall',atk:'arm cannon, bursts of 3 × 8',
    fight:'Keeps 24–42 m away and fires bursts from its arm cannon.',tip:'Close in fast, or out-range it with the Lance.'},
  spod:{name:'SPAWNER POD',cls:'FORGE FACTORY',size:'2.6 m tall, 2 m across',atk:'none: prints Skitters',hp:320,speed:0,scrap:0,
    fight:'Keeps printing Skitters until it is destroyed.',tip:'Destroy the pod first or the swarm never ends.'},
  ahound:{name:'ALPHA HOUND',cls:'BOSS · PACK LEADER',size:'about 4 m tall',atk:'charge, 30 a hit',
    fight:'A Hound 1.7 times the size, rust red, with horns and spine blades twice as big. Leads a pack.',tip:'Clear its Hounds, then keep moving: it charges harder and faster.'},
  gprime:{name:'GUNNER PRIME',cls:'BOSS · HEAVY',size:'about 9 m tall',atk:'two cannons, bursts of 6 × 12',
    fight:'A Gunner 1.8 times the size in bone white, with the heavy cannon on both arms.',tip:'Use cover between bursts. Missiles and the Lance from range.'},
  brood:{name:'BROOD SKITTER',cls:'BOSS · SWARM MOTHER',size:'about 2.7 m tall',atk:'zap, and prints Skitters',
    fight:'A Skitter three times the size, black with glowing seams. The pod on its back prints 2 Skitters every 7 s.',tip:'Kill it fast before the swarm grows. The Arc hits it and its brood together.'},
  hornet:{name:'HORNET',cls:'FORGE FLYER · IRONHOWL 3 MODEL',size:'about 2 m across',atk:'stinger',
    fight:'Circles high up, dives, fires its stinger, climbs away.',tip:'Hit it as it dives. Missiles lock on easily.'},
  lancer:{name:'LANCER',cls:'FORGE SNIPER · IRONHOWL 3 MODEL',size:'about 6 m tall',atk:'one heavy shot',
    fight:'Keeps its distance, paints you with a red line for 1.6 s, then fires where the line ended.',tip:'Move, hop or put cover in the way when the line locks.'},
  bulwark:{name:'BULWARK',cls:'FORGE SHIELD · IRONHOWL 3 MODEL',size:'about 5 m tall',atk:'gun behind a shield',
    fight:'A big shield in front: shots from the front do almost nothing.',tip:'Walk round it, hop over, or use missiles.'},
  tank:{name:'TANK',cls:'FORGE ARMOUR · IRONHOWL 3 MODEL',size:'about 7 m long',atk:'heavy cannon',
    fight:'Slow turret, heavy cannon. The front armour takes a third of the damage.',tip:'Hit it from the side or the back.'},
  mortar:{name:'MORTAR CRAWLER',cls:'FORGE ARTILLERY · IRONHOWL 3 MODEL',size:'six legs, about 6 m long',atk:'shells on red discs',
    fight:'Stays 50–90 m away and lobs shells that land on red discs.',tip:'Step off the red discs, then close in.'}};
const BOOK_KIT=['ac','ln','ar','mpod','watcher','jetpack','drone'],BOOK_FOES=['skitter','hound','gunner','spod','ahound','gprime','brood','hornet','lancer','bulwark','tank','mortar'];
const FOE_ORDER=['gprime','ahound','brood','tank','mortar','bulwark','lancer','gunner','hornet','hound','spod','skitter'];
const STG={grp:null,id:null,obj:null,seq:0,pct:-1};
let RUNSEEN=new Set();   /* machines briefed in this run */

/* ---------- the stage: one model, scaled so its biggest side fits the room, standing on the floor ---------- */
function stageInit(){bayInit();if(STG.grp)return;STG.grp=new THREE.Group();BAY.scene.add(STG.grp);}
function stageClear(){if(!STG.obj)return;STG.grp.remove(STG.obj);if(STG.obj.userData.full)STG.obj.traverse(o=>{if(o.isMesh)o.geometry.dispose();});STG.obj=null;}
function stagePut(o,full){stageClear();const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());
  const k=4.2/Math.max(s.y,s.x*.78,s.z*.78,.01);o.scale.multiplyScalar(k);o.position.y-=b.min.y*k;o.userData.full=full;STG.obj=o;STG.grp.add(o);
  BAY.want={x:0,y:s.y*k*.5,z:0,d:11.5};}
/* build a model for the stage: a machine (EDEF id or the spawner pod) or a kit piece; dark = a shape not yet known */
function stageModel(id,full,dark){
  const f=stageFiles(id,full);let p;
  if(f)p=loadGLB(f.glb,full?BLM:undefined).then(sc=>{const mat=dark?darkMat():kitMat(f,false).clone();dressModel(sc,mat);stageDress(id,sc,mat,dark);return sc;});
  else if(ETPL[id])p=Promise.resolve(ETPL[id].clone(true)).then(sc=>{if(dark)sc.traverse(o=>{if(o.isMesh)o.material=darkMat();});return sc;});   /* Ironhowl 3 models */
  else p=Promise.reject(new Error('no model for '+id));
  return p;}
function stageFiles(id,full){if(KIT[id])return kitFiles(KIT[id].dir,kitStem(id,'fa_R'),full,KIT[id].orm);
  if(id==='spod')return kitFiles('spod','spod',full);const d=EDEF[id];if(d&&d.m4){const base=d.m4;return kitFiles(base[0],base[1],full);}return null;}
let DARKM=null;function darkMat(){return DARKM||(DARKM=new THREE.MeshStandardMaterial({color:0x141518,roughness:.35,metalness:.85}));}
/* the bosses get the same changes as in the field (06j_forge.js) */
function stageDress(id,sc,mat,dark){const N=n=>sc.getObjectByName(n),e={o:sc,mat,d:EDEF[id]||{},dead:false};
  if(id==='gprime'){gnInit(e,N);primeArms(e,N);if(!dark)tintMat(e,'bone');}
  else if(id==='ahound'){growParts(sc,['horn_R','horn_L','spine1','spine2','spine3','spine4'],2);if(!dark)mat.color.setRGB(1.75,.78,.55);}
  else if(id==='brood'&&!dark){broodPod(e);tintMat(e,'brood');}}
function stageShow(id,dark){stageInit();const seq=++STG.seq;STG.id=id;STG.pct=-1;
  const wantFull=QL!=='low'&&!dark&&!!stageFiles(id,true);   /* Ironhowl 3 models have no full version */
  stageModel(id,false,dark).then(o=>{if(seq!==STG.seq)return;stagePut(o,false);BAY.yaw=.6;BAY.pitch=.12;BAY.auto=true;
    if(wantFull){STG.pct=0;BLM.onProgress=(u,a,b)=>{if(seq===STG.seq){STG.pct=Math.round(100*a/Math.max(1,b));briefSub();}};
      stageModel(id,true,false).then(F=>{if(seq!==STG.seq){F.traverse(q=>{if(q.isMesh)q.geometry.dispose();});return;}stagePut(F,true);STG.pct=-1;briefSub();})
        .catch(err=>{console.warn('full model',id,err);STG.pct=-1;briefSub();});}
    briefSub();}).catch(err=>{console.error('stage',id,err);});}
/* ---------- opening and closing (the bay's own open/close, in another mode) ---------- */
function viewOpen(mode){bayInit();stageInit();jetLoop(0);BAY.mode=mode;BAY.open=true;BAY.prev=G.mode;if(mode!=='brief')G.mode='bay';BAY.changed=false;BAY.sel=null;
  for(const id of ['title','results','down'])$(id).dataset.was=$(id).style.display,$(id).style.display='none';
  $('bay').style.display='block';document.body.classList.add('inbay');$('bayload').style.display='none';
  if(BAY.W)BAY.W.root.visible=false;STG.grp.visible=true;for(const s in BAY.marks)BAY.marks[s].visible=false;
  $('bayup').style.display='none';$('bayscrap').textContent='';if(document.pointerLockElement)document.exitPointerLock();}
function viewClose(){STG.seq++;stageClear();STG.id=null;STG.dark=undefined;   /* so the next open shows its model again */
  if(STG.grp)STG.grp.visible=false;if(BAY.W)BAY.W.root.visible=true;$('bayup').style.display='';$('baydone').textContent='DONE';BAY.mode='bay';}

/* ---------- intel brief ---------- */
const BRF={list:[],sel:0,sub:'',done:null};
/* comp: {machine id: how many}. Returns true if a brief opened. */
function briefMaybe(comp,label,force){if(G.mode!=='play'||BAY.open)return false;const ids=Object.keys(comp).filter(id=>comp[id]>0&&FOE_INFO[id]);
  const fresh=ids.filter(id=>!RUNSEEN.has(id));if(!fresh.length&&!force)return false;ids.forEach(id=>RUNSEEN.add(id));
  const list=ids.map(id=>({id,n:comp[id],fresh:fresh.includes(id)})).sort((a,b)=>FOE_ORDER.indexOf(a.id)-FOE_ORDER.indexOf(b.id));
  const tot=list.reduce((a,q)=>a+q.n,0);BRF.list=list;BRF.sel=Math.max(0,list.findIndex(q=>q.fresh));
  const fn=list.filter(q=>q.fresh&&EDEF[q.id]&&EDEF[q.id].boss).map(q=>FOE_INFO[q.id].name);BRF.after=fn[0]||label||'';
  BRF.sub=(label?label+' · ':'')+(fn.length?fn.join(', ')+' INBOUND':tot+(tot===1?' MACHINE':' MACHINES')+' HEADED YOUR WAY');
  viewOpen('brief');$('bayname').querySelector('b').textContent='INTEL BRIEF';$('baydone').textContent='DEPLOY';
  if(fn.length)sBriefBoss();else sClick();briefUI();return true;}
function briefSub(){if(!BAY.open)return;if(BAY.mode==='brief')$('baysub').textContent=BRF.sub+(STG.pct>=0?' · FULL DETAIL '+STG.pct+'%':'');
  else if(BAY.mode==='book')$('baysub').textContent=BOOK.sub+(STG.pct>=0?' · FULL DETAIL '+STG.pct+'%':'');}
function briefUI(){const L=BRF.list,q=L[BRF.sel];
  $('bayslots').innerHTML=L.map((it,i)=>'<button data-i="'+i+'"'+(i===BRF.sel?' class="on"':'')+'>'+it.n+' × '+FOE_INFO[it.id].name+(it.fresh&&EDEF[it.id]&&EDEF[it.id].boss?' ★':'')+'</button>').join('');
  $('bayslots').querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();BRF.sel=+b.dataset.i;briefUI();});
  const on=$('bayslots').querySelector('.on');if(on)on.scrollIntoView({inline:'center',block:'nearest'});
  $('baycard').innerHTML=foeCard(q.id,q.n);if(STG.id!==q.id)stageShow(q.id,false);briefSub();}
function foeCard(id,n){const I=FOE_INFO[id],d=EDEF[id]||{},hp=I.hp||d.hp,sp=I.speed!=null?I.speed:d.speed,scr=I.scrap!=null?I.scrap:d.scrap;
  return '<b>'+I.name+'</b><span class="role"><i class="cls">'+I.cls+'</i> '+I.fight+'</span>'+
    statRows([['HIT POINTS',(hp||0).toLocaleString('en-US')],['TOP SPEED',sp?sp+' m/s':'does not move'],['ATTACK',I.atk],['SIZE',I.size],['SCRAP',scr?scr+' a wreck':'—']].concat(n?[['COMING',n]]:[]))+
    '<span class="live">'+I.tip+'</span>';}
function briefDone(){viewClose();closeBay();if(!touchy&&G.mode==='play')lockMouse();if(BRF.after)HUD.banner(BRF.after);   /* the banner it covered */if(BRF.done){const f=BRF.done;BRF.done=null;f();}}
function sBriefBoss(){thump(70,30,.6,.35,0,0);tone('sawtooth',220,110,.5,.05);}

/* ---------- armory book ---------- */
const BOOK={tab:'kit',sel:'ac',sub:''};
function openBook(){viewOpen('book');$('bayname').querySelector('b').textContent='ARMORY BOOK';bookUI();}
function bookUI(){const sv=SAVE.get(),beat=sv.beaten||{},open=BOOK_KIT.filter(k=>kitOpen(k)).length,met=BOOK_FOES.filter(k=>beat[k]).length;
  BOOK.sub='KIT '+open+' OF '+BOOK_KIT.length+' OPEN · MACHINES '+met+' OF '+BOOK_FOES.length+' BEATEN';
  const chip=(id,txt,lock)=>'<button data-k="'+id+'"'+(BOOK.sel===id?' class="on"':lock?' class="dim"':'')+'>'+txt+'</button>';
  $('bayslots').innerHTML=BOOK_KIT.map(k=>chip(k,KIT_INFO[k].name.split(' ').slice(1).join(' '),!kitOpen(k))).join('')+'<i class="sep"></i>'+
    BOOK_FOES.map(k=>chip(k,beat[k]?FOE_INFO[k].name:'???',!beat[k])).join('');
  $('bayslots').querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();BOOK.sel=b.dataset.k;bookUI();});
  const on=$('bayslots').querySelector('.on');if(on)on.scrollIntoView({inline:'center',block:'nearest'});
  const id=BOOK.sel,isKit=!!KIT_INFO[id];let dark=false,html='';
  if(isKit){const I=KIT_INFO[id],lv=PILOT.kit[id]||1,L=loadout(),on_=SLOTS.filter(s=>L[s]===id).map(s=>(BAY_SLOTS.find(b=>b.s===s)||{n:s}).n);
    html='<b>'+I.name+'</b><span class="role">'+I.role+'</span>'+statRows(I.stats)+'<span class="live">'+
      (kitOpen(id)?(on_.length?'FITTED: '+on_.join(' · '):'OPEN · FIT IT IN THE MOD BAY'):'UNLOCKS AT PILOT LEVEL '+lv+' · '+Math.max(0,PILOT.lv[lv-1]-PL.xp).toLocaleString('en-US')+' XP TO GO')+'</span>';
    dark=!kitOpen(id);}
  else if(beat[id])html=foeCard(id)+'<span class="live">DESTROYED: '+(beat[id]===true?1:beat[id]).toLocaleString('en-US')+'</span>';
  else{dark=true;html='<b>???</b><span class="role">NOT YET BEATEN. Destroy one to add its card.</span>';}
  $('baycard').innerHTML=html;if(STG.id!==id||STG.dark!==dark){STG.dark=dark;stageShow(id,dark);}briefSub();}
