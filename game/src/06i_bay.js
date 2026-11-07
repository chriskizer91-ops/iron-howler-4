/* ===================== the modification bay (Ironhowl 4) =====================
   The full-detail Wraith (949,948 triangles, the sharper sheet printed on) stands in the bay with its kit on its mounts.
   Tap a glowing mount (or its name at the bottom) to see what it holds and swap it; each piece has an armory-book card.
   The loadout is saved (hd-ironhowl4-save .loadout) and fitted to the combat Wraith in the field when the bay closes.
   UPGRADES opens Ironhowl 3's six upgrade tracks (scrap from wrecks). On Low quality the bay shows the combat models. */
const KIT_INFO={
  ac:{name:'AC-4 AUTOCANNON',role:'Forearm. The main gun: heats up as it fires, VENT dumps the heat. Power chips raise it a tier.',
    stats:[['BARRELS','1 to 4 (tiers I-IV)'],['RATE','6 to 9 a second'],['DAMAGE','11 a shot at tier I'],['RANGE','170 m'],['GUIDANCE','aim assist']],live:'IN THE FIELD NOW'},
  ln:{name:'LN-1 LANCE',role:'Forearm. Rail cannon: hold to charge, one long-range shot that pierces.',
    stats:[['CHARGE','1.2 s'],['DAMAGE','120'],['RANGE','260 m'],['PIERCES','3 machines'],['GUIDANCE','none']],live:'IN THE FIELD NOW · HOLD FIRE TO CHARGE'},
  ar:{name:'AR-1 ARC',role:'Forearm. Short-range lightning that jumps between nearby machines. For swarms.',
    stats:[['RANGE','35 m'],['JUMPS','4 machines'],['DAMAGE','14 a jump'],['RATE','4 a second'],['GUIDANCE','nearest machine']],live:'IN THE FIELD NOW'},
  mpod:{name:'MP-9 MISSILE POD',role:'Shoulder. Nine tubes: keep a machine near the crosshair to lock it, then fire. Locked missiles turn hard.',
    stats:[['SALVO','2 (8 with upgrades)'],['AMMO','12'],['LOCK','0.6 s'],['GUIDANCE','heat-seeking'],['RANGE','180 m']],live:'IN THE FIELD NOW (MISSILES NEED ONE)'},
  watcher:{name:'WT-1 WATCHER',role:'Shoulder. Sensor pod: radar, marks targets, faster missile lock, warns of incoming fire.',
    stats:[['RADAR','220 m'],['MISSILE LOCK','40% faster'],['MARKS','8 targets'],['WARNING','incoming fire']],live:'IN THE FIELD NOW · RADAR AT THE TOP RIGHT'},
  jetpack:{name:'JP-2 JET PACK',role:'Back. Jet hops; keep holding JET in the air to hover for about 30 s. Carries the drone.',
    stats:[['FUEL CELLS','2 (4 with upgrades)'],['HOP','30 m tap, 55 m hold'],['HOVER','about 30 s'],['CARRIES','assist drone']],live:'IN THE FIELD NOW'},
  drone:{name:'DR-1 ASSIST DRONE',role:'Docks on the jet pack and flies beside you: small gun, marks targets, repairs between waves.',
    stats:[['GUN','5 a shot, 3 a second'],['REPAIR','2 hull a second'],['SHIELD','40'],['RANGE','60 m']],live:'IN THE FIELD NOW · FLIES WHEN MACHINES COME CLOSE'}};
const BAY_SLOTS=[{s:'fa_L',n:'LEFT ARM',o:['ac','ln','ar']},{s:'fa_R',n:'RIGHT ARM',o:['ac','ln','ar']},{s:'sh_L',n:'LEFT SHOULDER',o:['watcher','mpod',null]},
  {s:'sh_R',n:'RIGHT SHOULDER',o:['mpod','watcher',null]},{s:'bk',n:'BACK',o:['jetpack']},{s:'drone',n:'DRONE',o:['drone',null]}];
const BAY={shT:0,shDirty:true,open:false,scene:null,cam:null,W:null,yaw:.55,pitch:.1,dist:14,ty:3.3,tgt:new THREE.Vector3(0,3.3,0),want:{x:0,y:3.3,z:0,d:14},sel:null,changed:false,
  marks:{},auto:true,prev:null,full:true,mode:'bay'};   /* mode: bay, brief or book (06l_brief.js) */
const BLM=new THREE.LoadingManager();
function bayInit(){
  if(BAY.scene)return;const sc=new THREE.Scene();sc.background=new THREE.Color(0x07080a);
  {const room=new THREE.Scene(),g=new THREE.SphereGeometry(30,32,16),c=[],p=g.attributes.position;   /* the bay's light: a ring of strips and two softboxes, as reflections */
   for(let i=0;i<p.count;i++){const y=p.getY(i)/30,k=y>0?.16+.14*y:.07;c.push(k,k*1.01,k*1.05);}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
   room.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
   const strip=new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1).multiplyScalar(6)});
   for(let i=0;i<12;i++){const a=i/12*TAU,m=new THREE.Mesh(new THREE.BoxGeometry(.35,10,.35),strip);m.position.set(Math.cos(a)*14,6,Math.sin(a)*14);room.add(m);}
   const box=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.97,.92).multiplyScalar(7)});
   for(const x of [-4,4]){const m=new THREE.Mesh(new THREE.BoxGeometry(6,.1,3),box);m.position.set(x,15,0);room.add(m);}
   sc.environment=new THREE.PMREMGenerator(R).fromScene(room,.02).texture;}
  const key=new THREE.DirectionalLight(0xfff3e6,2.2);key.position.set(5,11,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-5,right:5,top:7,bottom:-2,near:1,far:30});key.shadow.bias=-.0004;key.shadow.normalBias=.02;sc.add(key);
  const rim=new THREE.DirectionalLight(0xbfd6ff,1.1);rim.position.set(-4,6,-8);sc.add(rim);
  const fl=new THREE.Mesh(new THREE.CircleGeometry(16,64),new THREE.MeshStandardMaterial({color:0x0d0e10,roughness:.5,metalness:.15}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;sc.add(fl);
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.3,4.36,96),new THREE.MeshBasicMaterial({color:new THREE.Color(1,.5,.18).multiplyScalar(2.2)}));ring.rotation.x=-Math.PI/2;ring.position.y=.005;sc.add(ring);
  BAY.cam=new THREE.PerspectiveCamera(40,1,.1,200);BAY.scene=sc;
  /* the mount markers: small glowing rings that face the camera */
  const cv_=document.createElement('canvas');cv_.width=cv_.height=64;const x=cv_.getContext('2d');x.strokeStyle='#fff';x.lineWidth=7;x.beginPath();x.arc(32,32,24,0,TAU);x.stroke();
  x.fillStyle='#fff';x.beginPath();x.arc(32,32,7,0,TAU);x.fill();const mt=new THREE.CanvasTexture(cv_);
  for(const B of BAY_SLOTS){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:mt,color:0xffb347,depthTest:false,transparent:true}));sp.scale.setScalar(.42);sp.renderOrder=9;sc.add(sp);BAY.marks[B.s]=sp;}
  bayInput();
}
function openBay(){
  bayInit();BAY.open=true;BAY.shDirty=true;BAY.prev=G.mode;G.mode='bay';BAY.changed=false;BAY.sel=null;BAY.auto=true;BAY.mode='bay';BAY.want={x:0,y:3.3,z:0,d:14};
  if(typeof STG!=='undefined'&&STG.grp)STG.grp.visible=false;if(BAY.W)BAY.W.root.visible=true;$('bayname').querySelector('b').textContent='MODIFICATION BAY';$('bayup').style.display='';$('baydone').textContent='DONE';
  for(const id of ['title','results','down'])$(id).dataset.was=$(id).style.display,$(id).style.display='none';
  $('bay').style.display='block';document.body.classList.add('inbay');bayUI();
  BAY.full=QL!=='low'&&!window.IH4_LIGHT;   /* the light one-file game carries no full-detail models: the bay shows the combat ones */
  if(!BAY.W){$('bayload').style.display='flex';$('baylb').style.width='0';$('baylt').textContent=BAY.full?'LOADING THE FULL-DETAIL WRAITH':'LOADING THE WRAITH';
    BLM.onProgress=(u,a,b)=>{$('baylb').style.width=(100*a/Math.max(1,b))+'%';};
    /* one load at a time: closing and reopening before it finishes must not start a second Wraith */
    if(!BAY.loading)BAY.loading=buildWraithModel(BAY.full,false,BLM).then(W=>{BAY.W=W;BAY.loading=null;W.root.visible=BAY.mode==='bay';BAY.scene.add(W.root);$('bayload').style.display='none';bayUI();})
      .catch(e=>{BAY.loading=null;$('baylt').textContent='COULD NOT LOAD THE BAY MODEL';console.error(e);});}
}
function closeBay(){BAY.open=false;
  /* drop input that piled up while the room was open (drags, keys), so nothing jumps when play resumes */
  TS.ldx=TS.ldy=0;TS.look=-1;TS.id=-1;TS.ax=TS.ay=0;TS.fire=false;TS.fireId=-1;TS.jet=false;MOUSE.dx=MOUSE.dy=0;MOUSE.l=false;HIT.clear();if(HUD.stick)HUD.stick(false);$('bay').style.display='none';document.body.classList.remove('inbay');BAY.cam.clearViewOffset();G.mode=BAY.prev||'title';
  for(const id of ['title','results','down'])$(id).style.display=$(id).dataset.was||'none';
  if(BAY.changed&&M){refitKit(M);if(typeof applyUpgrades==='function'&&P)applyUpgrades();}if(G.mode==='title')titlePilot();}
function setLoadout(slot,id){const sv=SAVE.get();sv.loadout=Object.assign({},loadout(),{[slot]:id});SAVE.put(sv);BAY.changed=true;
  if(BAY.W)refitModel(BAY.W,loadout(),BAY.full,false,BLM).then(bayUI);bayUI();}
/* the screen: slot names along the bottom, the chosen slot's card above them */
function bayUI(){if(BAY.mode!=='bay')return;   /* a late refit must not redraw over the brief or the book */
  const L=loadout();$('bayscrap').textContent='SCRAP '+(scrap()).toLocaleString('en-US');
  $('bayslots').innerHTML='<button data-s=""'+(BAY.sel?'':' class="on"')+'>WRAITH</button>'+BAY_SLOTS.map(B=>'<button data-s="'+B.s+'"'+(BAY.sel===B.s?' class="on"':'')+'>'+B.n+'</button>').join('');
  $('bayslots').querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();baySelect(b.dataset.s||null);});
  const on=$('bayslots').querySelector('.on');if(on)on.scrollIntoView({inline:'center',block:'nearest'});
  const card=$('baycard');
  if(!BAY.sel){$('baysub').textContent='WRAITH · TAP A MOUNT TO CHANGE ITS KIT';
    const hull=[100,120,140,160,180,200][upgLv('hull')],sh=[60,80,100,120,140,160][upgLv('shield')],cells=upgLv('jets')>=4?4:upgLv('jets')>=1?3:2;
    const nx=PILOT.lv[PL.lv];
    card.innerHTML='<b>WRAITH · RECON SUPPORT</b><span class="role">The player\'s mech. 6.6 m tall, five mounts for kit.</span>'+
      statRows([['PILOT','LV '+PL.lv+(nx?' · '+(nx-PL.xp).toLocaleString('en-US')+' XP TO LV '+(PL.lv+1):' · TOP LEVEL')],['HULL',hull],['SHIELD',sh],['FUEL CELLS',cells],['GUN TIER',['I','II','III','IV'][Math.min(3,upgLv('gun'))]],['ARMS',name(L.fa_L)+' · '+name(L.fa_R)],['SHOULDERS',name(L.sh_L)+' · '+name(L.sh_R)]])+
      '<button class="tgl'+(PL.all?' on':'')+'">TEST: UNLOCK ALL · '+(PL.all?'ON':'OFF')+'</button>';
    card.querySelector('.tgl').onclick=e=>{e.stopPropagation();const sv=SAVE.get();sv.unlockAll=!sv.unlockAll;SAVE.put(sv);pilotRefresh();BAY.changed=true;
      if(BAY.W)refitModel(BAY.W,loadout(),BAY.full,false,BLM).then(bayUI);bayUI();};return;}
  const B=BAY_SLOTS.find(q=>q.s===BAY.sel),cur=L[B.s]||null,I=cur?KIT_INFO[cur]:null;
  $('baysub').textContent=B.n;
  card.innerHTML='<div class="opts">'+B.o.map(o=>{const lk=!kitOpen(o);return '<button data-o="'+(o||'')+'"'+(o===cur?' class="on"':lk?' class="lock" disabled':'')+'>'+(o?KIT_INFO[o].name.split(' ').slice(1).join(' '):'EMPTY')+(lk?' · LV '+PILOT.kit[o]:'')+'</button>';}).join('')+'</div>'+
    (I?'<b>'+I.name+'</b><span class="role">'+I.role+'</span>'+statRows(I.stats)+'<span class="live">'+I.live+'</span>':'<span class="role">Nothing on this mount.</span>');
  card.querySelectorAll('.opts button').forEach(b=>b.onclick=e=>{e.stopPropagation();const o=b.dataset.o||null;if(o!==cur&&kitOpen(o))setLoadout(B.s,o);});
  function name(id){return id?KIT_INFO[id].name.split(' ').slice(1).join(' '):'EMPTY';}
}
function statRows(r){return '<div class="stats">'+r.map(([a,b])=>'<span>'+a+'</span><b>'+b+'</b>').join('')+'</div>';}
function baySelect(s){BAY.sel=s;BAY.auto=!s;const p=new THREE.Vector3();
  if(s&&BAY.marks[s]&&BAY.marks[s].visible){p.copy(BAY.marks[s].position);BAY.want={x:p.x,y:p.y,z:p.z,d:s==='bk'||s==='drone'?7.5:6.5};
    if(s==='bk'||s==='drone')BAY.yaw=Math.PI-.5;else if(s.endsWith('_L'))BAY.yaw=-.9;else BAY.yaw=.9;}   /* turn so the mount faces you */
  else BAY.want={x:0,y:3.3,z:0,d:14};bayUI();}
/* drag to turn, pinch or wheel to zoom, tap a ring to pick its mount */
function bayInput(){const pts=new Map();let pd=0,down=null;
  cv.addEventListener('pointerdown',e=>{if(!BAY.open)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY,t:performance.now()};BAY.auto=false;});
  addEventListener('pointermove',e=>{if(!BAY.open)return;const p=pts.get(e.pointerId);if(!p)return;
    if(pts.size===1){BAY.yaw-=(e.clientX-p.x)*.008;BAY.pitch=clamp(BAY.pitch+(e.clientY-p.y)*.006,-.15,1.1);}
    p.x=e.clientX;p.y=e.clientY;if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pd)BAY.want.d=clamp(BAY.want.d*pd/d,3,24);pd=d;}});
  const up=e=>{if(!BAY.open)return;pts.delete(e.pointerId);pd=0;
    if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<10&&performance.now()-down.t<400)bayTap(e.clientX,e.clientY);down=null;};
  addEventListener('pointerup',up);addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{if(BAY.open)BAY.want.d=clamp(BAY.want.d*(1+e.deltaY*.001),3,24);},{passive:true});
  $('baydone').onclick=e=>{e.stopPropagation();if(BAY.mode==='brief')briefDone();else{if(BAY.mode==='book')viewClose();closeBay();}};$('bayup').onclick=e=>{e.stopPropagation();hangar();};
  $('hback').addEventListener('click',()=>{if(BAY.open)bayUI();});}
function bayTap(x,y){const v=new THREE.Vector3(),r=cv.getBoundingClientRect();let best=null,bd=46;
  for(const s in BAY.marks){const m=BAY.marks[s];if(!m.visible)continue;v.copy(m.position).project(BAY.cam);
    const sx=r.left+(v.x+1)/2*r.width,sy=r.top+(1-v.y)/2*r.height,d=Math.hypot(sx-x,sy-y);if(d<bd){bd=d;best=s;}}
  if(best)baySelect(best);}
const _bp=new THREE.Vector3(),_bb=new THREE.Box3();
function bayFrame(dt){
  const c=BAY.cam,w=cv.clientWidth||innerWidth,h=cv.clientHeight||innerHeight;if(Math.abs(c.aspect-w/h)>.001){c.aspect=w/h;c.fov=w<h?50:38;c.updateProjectionMatrix();}
  if(BAY.auto)BAY.yaw+=dt*.18;
  const k=damp(5,dt);BAY.tgt.x+=(BAY.want.x-BAY.tgt.x)*k;BAY.tgt.y+=(BAY.want.y-BAY.tgt.y)*k;BAY.tgt.z+=(BAY.want.z-BAY.tgt.z)*k;BAY.dist+=(BAY.want.d-BAY.dist)*k;
  const d=BAY.dist*(c.aspect<1?(BAY.mode!=='bay'?1.5:BAY.sel?1.15:1.3):1),ty=BAY.tgt.y-(c.aspect>1.2&&!BAY.sel?BAY.dist*(BAY.mode==='bay'?.055:.1):0);   /* the brief and book lift the model clear of the card */
  if(c.aspect<1)c.setViewOffset(w,h,0,h*.16,w,h);else c.clearViewOffset();   /* phone: the model sits above the card */
  c.position.set(BAY.tgt.x+Math.sin(BAY.yaw)*Math.cos(BAY.pitch)*d,ty+Math.sin(BAY.pitch)*d,BAY.tgt.z+Math.cos(BAY.yaw)*Math.cos(BAY.pitch)*d);c.lookAt(BAY.tgt.x,ty,BAY.tgt.z);
  /* rings sit on the mounts; the chosen one is brighter, the others dim */
  const W=BAY.W,p=_bp;
  for(const B of BAY_SLOTS){const m=BAY.marks[B.s];let n=null;
    if(BAY.mode!=='bay'){m.visible=false;continue;}
    if(W){if(B.s==='drone')n=W.holds.drone||(W.holds.bk&&W.holds.bk.getObjectByName('drone_dock'));else n=W.holds[B.s]||W.J[B.s];}
    m.visible=!!n;if(!n)continue;
    if(W.holds[B.s]){_bb.setFromObject(W.holds[B.s]).getCenter(p);}else n.getWorldPosition(p);
    m.position.copy(p);m.material.opacity=BAY.sel?(BAY.sel===B.s?1:.35):.85;m.scale.setScalar((BAY.sel===B.s?.55:.42)*(BAY.dist/14)**.5);}
  /* nothing in the room moves (the camera circles), so its shadow is redrawn twice a second, or at once after a change, not every frame */
  const au=R.shadowMap.autoUpdate;R.shadowMap.autoUpdate=false;BAY.shT-=dt;if(BAY.shT<=0||BAY.shDirty){R.shadowMap.needsUpdate=true;BAY.shT=.5;BAY.shDirty=false;}
  const ex=R.toneMappingExposure;R.toneMappingExposure=1.18;R.render(BAY.scene,c);R.toneMappingExposure=ex;R.shadowMap.autoUpdate=au;   /* the room has its own light, whatever the map's exposure */
}
