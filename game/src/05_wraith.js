/* ===================== the Wraith, the player's mech (Ironhowl 4) =====================
   The combat model and its kit are the Wraith V2 HD set in the repo's models/ folder (printed from ChatGPT's pictures and baked).
   The Wraith's empties are its joints: hips > thigh/knee/hock/ankle (legs), torso > arm/elbow/wrist, head, and five mounts:
   fa_L, fa_R (forearms), sh_L, sh_R (shoulders), bk (back). Every kit piece has an empty called `mount`: it is placed on the
   Wraith's mount of its slot, so nothing is positioned by hand. The drone docks on the jet pack's `drone_dock`.
   The loadout (which piece sits on which mount) is chosen in the modification bay (06i_bay.js) and saved. */
const IH4M=(window.IH4_MODELS||'../models/');
/* the kit: bay id -> files. Forearm weapons have a left and a right version (mirror twins). */
const KIT={
  ac:{dir:'autocannon',L:'ac_L',R:'ac_R',orm:'ac_combat_orm',slot:'fa'},
  ln:{dir:'lance',L:'ln_L',R:'ln_R',orm:'ln_combat_orm',slot:'fa'},
  ar:{dir:'arc',L:'ar_L',R:'ar_R',orm:'ar_combat_orm',slot:'fa'},
  mpod:{dir:'mpod',stem:'mpod',slot:'sh'},watcher:{dir:'watcher',stem:'watcher',slot:'sh'},
  jetpack:{dir:'jetpack',stem:'jetpack',slot:'bk'},drone:{dir:'drone',stem:'drone',slot:'drone'}};
const WRAITH={dir:'wraith-v2-hd',stem:'wraith_v2'};
const SLOTS=['fa_L','fa_R','sh_L','sh_R','bk','drone'];
const LOAD_DEF={fa_L:'ac',fa_R:'ac',sh_L:'watcher',sh_R:'mpod',bk:'jetpack',drone:'drone'};
function loadout(){let s={};try{s=(SAVE.get().loadout)||{};}catch(e){}return Object.assign({},LOAD_DEF,s);}
function hasKit(id){const L=loadout();return SLOTS.some(k=>L[k]===id);}
function kitStem(id,slot){const k=KIT[id];return k.stem||(slot&&slot.endsWith('_R')?k.R:k.L);}
/* files: combat model and its maps, or the full model and its print */
function kitFiles(dir,stem,full,orm){const b=IH4M+dir+'/'+stem;
  return full?{glb:b+'_full.glb',map:b+'_full_print.webp'}:{glb:b+'_combat.glb',map:b+'_combat_albedo.webp',nrm:b+'_combat_normal.webp',orm:IH4M+dir+'/'+(orm||stem+'_combat_orm')+'.webp'};}
const GLBC={},KMAT={};
function loadGLB(url,lm){if(!GLBC[url])GLBC[url]=new Promise((res,rej)=>new THREE.GLTFLoader(lm||LM).load(url,g=>res(g.scene),undefined,rej));
  return GLBC[url].then(sc=>sc.clone(true));}
function k4tex(url){const t=new THREE.TextureLoader(LM).load(url);t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function k4lin(url){const t=k4tex(url);t.colorSpace=THREE.NoColorSpace;return t;}
/* one material per model: the print (full) or the baked maps (combat) */
function kitMat(f,world){const key=f.map+(world?'w':'');if(KMAT[key])return KMAT[key];
  const m=f.nrm?new THREE.MeshStandardMaterial({map:k4tex(f.map),normalMap:k4lin(f.nrm),roughnessMap:k4lin(f.orm),metalnessMap:k4lin(f.orm),roughness:1,metalness:1})
               :new THREE.MeshStandardMaterial({map:k4tex(f.map),roughness:.62,metalness:.18});
  return KMAT[key]=world?hookWorld(m):m;}
function dressModel(sc,mat){sc.traverse(o=>{if(o.isMesh){o.material=mat;o.castShadow=o.receiveShadow=true;}});return sc;}
/* put a kit piece on a mount: the piece's own `mount` empty lands exactly on the host's mount */
function onMount(host,sc){sc.updateMatrixWorld(true);const mt=sc.getObjectByName('mount');
  const hold=new THREE.Group();hold.name='kit';host.add(hold);
  if(mt){const inv=mt.matrixWorld.clone().invert();inv.decompose(sc.position,sc.quaternion,sc.scale);}
  hold.add(sc);return hold;}
/* load the Wraith (full or combat) with its kit as the loadout says; returns {root, J (joints by name), holds by slot} */
function buildWraithModel(full,world,lm){
  const W={root:new THREE.Group(),J:{},holds:{},kit:{}};
  const wf=kitFiles(WRAITH.dir,WRAITH.stem,full);
  return loadGLB(wf.glb,lm).then(sc=>{dressModel(sc,kitMat(wf,world));W.root.add(sc);sc.traverse(o=>{if(o.name)W.J[o.name]=W.J[o.name]||o;});W.body=sc;
    return refitModel(W,loadout(),full,world,lm);}).then(()=>W);}
function refitModel(W,L,full,world,lm){
  for(const s in W.holds){const h=W.holds[s];if(h&&h.parent)h.parent.remove(h);}W.holds={};W.kit={};
  const jobs=SLOTS.filter(s=>s!=='drone'&&L[s]&&KIT[L[s]]).map(s=>{const id=L[s],k=KIT[id],stem=kitStem(id,s),f=kitFiles(k.dir,stem,full,k.orm);
    return loadGLB(f.glb,lm).then(sc=>{dressModel(sc,kitMat(f,world));W.holds[s]=onMount(W.J[s],sc);W.kit[s]=id;});});
  return Promise.all(jobs).then(()=>{   /* the drone docks on the jet pack */
    if(L.drone==='drone'&&W.holds.bk){const dock=W.holds.bk.getObjectByName('drone_dock');const k=KIT.drone,f=kitFiles(k.dir,k.stem,full);
      if(dock)return loadGLB(f.glb,lm).then(sc=>{dressModel(sc,kitMat(f,world));W.holds.drone=onMount(dock,sc);W.kit.drone='drone';});}});}

/* ---------------- the Wraith in the field ---------------- */
function buildMech(){
  mechMats();   /* Ironhowl 3's materials: the FORGE machines still use them */
  const M={root:new THREE.Group(),ready:false,phase:0,lean:0,roll:0,tier:0,arms:[],pods:[],jets:[]};S.add(M.root);
  buildWraithModel(false,true).then(W=>{M.W=W;M.root.add(W.root);const J=W.J;
    M.hips=J.hips;M.torso=J.torso;M.head=J.head;M.hip0=J.hips.position.y;M.tor0=J.torso.position.y;
    W.root.updateMatrixWorld(true);M.legs=[-1,1].map(sd=>legSetup(J,sd<0?'L':'R',sd,M.hip0));
    M.jl=new THREE.PointLight(0xff9a40,0,14,1.8);M.jl.position.set(0,0,1.6);M.torso.add(M.jl);
    rigKit(M);M.ready=true;M.tier=0;setTier(M,GUN.tier||1);});
  return M;
}
/* after the bay changes the loadout */
function refitKit(M){if(!M||!M.W)return Promise.resolve();M.ready=false;
  return refitModel(M.W,loadout(),false,true).then(()=>{rigKit(M);M.ready=true;const t=M.tier;M.tier=0;setTier(M,t||GUN.tier||1);});}
/* muzzles, missile tubes and jet nozzles from the fitted kit */
function rigKit(M){const W=M.W,_p=new THREE.Vector3();W.root.updateMatrixWorld(true);
  M.arms=['fa_L','fa_R'].map((s,i)=>{const hold=W.holds[s],arm=W.J[i?'arm_R':'arm_L'];if(!hold)return {sh:arm,muzzle:arm,hold:null,kick:0,sd:i?1:-1};
    /* forward = the Wraith's front (-z) seen from the mount; the muzzle sits at the front face of the weapon's box */
    const q=new THREE.Quaternion();W.root.getWorldQuaternion(q);const wf=new THREE.Vector3(0,0,-1).applyQuaternion(q);
    hold.parent.getWorldQuaternion(q);const fwd=wf.applyQuaternion(q.invert()).normalize();
    const bb=localBox(hold),mz=new THREE.Object3D();hold.add(mz);bb.getCenter(_p);
    const ax=['x','y','z'].sort((a,b)=>Math.abs(fwd[b])-Math.abs(fwd[a]))[0];_p[ax]=fwd[ax]>0?bb.max[ax]:bb.min[ax];mz.position.copy(_p);
    return {sh:arm,muzzle:mz,hold,base:hold.position.clone(),fwd,kick:0,sd:i?1:-1,kind:W.kit[s]};});
  M.pods=[];for(const s of ['sh_R','sh_L']){const h=W.holds[s];if(h&&W.kit[s]==='mpod')for(let i=0;i<9;i++){const t=h.getObjectByName('tube'+i);if(t)M.pods.push(t);}}
  if(!M.pods.length)M.pods=[W.J.sh_R,W.J.sh_L];
  M.jets=[];const jp=W.holds.bk;
  for(const s of ['R','L']){const n=jp&&jp.getObjectByName('exhaust_'+s);if(!n)continue;   /* the jet pack's nozzles point their +y along the thrust */
    const f1=new THREE.Mesh(new THREE.CylinderGeometry(.22,.02,1,10,1,true),MT.flame);f1.castShadow=false;n.add(f1);
    const f2=new THREE.Mesh(new THREE.CylinderGeometry(.12,.01,1,8,1,true),MT.flame2);f2.castShadow=false;n.add(f2);M.jets.push({n,f1,f2});}
}
/* a group's box in its own frame (works whatever way the mech is standing) */
function localBox(g){const bb=new THREE.Box3(),inv=new THREE.Matrix4(),m=new THREE.Matrix4();g.updateMatrixWorld(true);inv.copy(g.matrixWorld).invert();
  g.traverse(o=>{if(!o.isMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bb.union(o.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(inv,o.matrixWorld)));});return bb;}
/* gun tiers: the autocannon carries all four barrel sets (t1_ .. t4_); show the chosen one */
function setTier(M,t){if(!M.ready||!M.W||M.tier===t)return;M.tier=t;
  for(const s of ['fa_L','fa_R']){const h=M.W.holds[s];if(h&&M.W.kit[s]==='ac')h.traverse(o=>{const m=/^t(\d)_/.exec(o.name||'');if(m)o.visible=+m[1]===t;});}}
/* ---------------- walking: each foot stays planted while the body moves over it ----------------
   Leg chain: thigh > knee > hock > ankle. The thigh and the lower leg (hock to ankle) turn together, so the leg works as two
   links, hip to ankle (the same solver as the walk test). Angles are in the leg's side plane, in the hips' frame. */
const _ang=v=>Math.atan2(v.z,v.y),_wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function legSetup(J,s,sd,hip0){const w=n=>{const v=new THREE.Vector3();J[n+'_'+s].getWorldPosition(v);return v;};
  const H=w('thigh'),K=w('knee'),Hk=w('hock'),A=w('ankle');
  const t0={y:K.y-H.y,z:K.z-H.z},s0={y:Hk.y-K.y,z:Hk.z-K.z},m0={y:A.y-Hk.y,z:A.z-Hk.z},P0={y:t0.y+m0.y,z:t0.z+m0.z};
  const L={s,sd,thigh:J['thigh_'+s],knee:J['knee_'+s],hock:J['hock_'+s],ankle:J['ankle_'+s],Hy:H.y-hip0,Hz:H.z,Ay:A.y,Az:A.z,ox:A.x,P:P0,Q:s0,
    lp:Math.hypot(P0.y,P0.z),lq:Math.hypot(s0.y,s0.z),sign:1,plant:true,gy:0};
  L.reach=H.y-A.y;
  L.sign=[1,-1].map(g=>[g,legSolve(L,{y:P0.y+s0.y,z:P0.z+s0.z},g)]).sort((a,b)=>(Math.abs(a[1].a)+Math.abs(a[1].b))-(Math.abs(b[1].a)+Math.abs(b[1].b)))[0][0];
  return L;}
function legSolve(l,D,sg){let d=Math.hypot(D.y,D.z);d=Math.min((l.lp+l.lq)*.995,Math.max(Math.abs(l.lp-l.lq)*1.01,d));
  const phD=_ang(D),g=Math.acos(clamp((l.lp*l.lp+d*d-l.lq*l.lq)/(2*l.lp*d),-1,1)),phP=phD+sg*g;
  const Pp={y:Math.cos(phP)*l.lp,z:Math.sin(phP)*l.lp},Qp={y:Math.cos(phD)*d-Pp.y,z:Math.sin(phD)*d-Pp.z};
  return {a:_wrap(phP-_ang(l.P)),b:_wrap(_ang(Qp)-_ang(l.Q))};}
/* pose the Wraith for this frame. st: {x,z,gy,legYaw,aimYaw,spd (m/s along the legs, minus = backwards),air,vy,land,thrust,pitch}
   returns foot-plant events [{x,z,side}] for sound, dust and shake (same as Ironhowl 3) */
function poseMech(M,st,dt){
  const ev=[];if(!M.ready)return ev;
  const sp=Math.abs(st.spd),sf=clamp(sp/7.5,0,1),w=smooth(.15,1.4,sp),S_=lerp(1.3,3.2,sf);
  if(!st.air)M.phase+=st.spd*dt/(2*S_);
  const cy=Math.cos(st.legYaw),sy=Math.sin(st.legYaw),comp=st.land*.6;
  const bob=st.air?0:Math.abs(Math.sin(M.phase*TAU))*.1*w;
  const hipY=st.gy+M.hip0-bob-comp-(st.air?0:.05*w);
  M.root.position.set(st.x,0,st.z);
  M.hips.position.y=hipY;M.torso.position.y=hipY+(M.tor0-M.hip0);
  M.hips.rotation.y=st.legYaw;M.torso.rotation.y=st.aimYaw;
  M.lean+=((st.air?-.1:-.05*sf*Math.sign(st.spd||1))+st.land*.25-M.lean)*damp(6,dt);
  M.roll+=((st.air?0:Math.sin(M.phase*TAU)*.025*w)-M.roll)*damp(8,dt);
  M.torso.rotation.x=M.lean;M.torso.rotation.z=M.roll;M.hips.rotation.z=M.roll*.6;
  for(const L of M.legs){
    let tz=0,lift=0,pitch=0;
    if(st.air){tz=-.2+L.sd*.1;lift=.55+(st.vy>0?.25:0);}
    else{let u=(M.phase+(L.sd>0?.5:0))%1;if(u<0)u+=1;
      if(u<.5){tz=lerp(-S_/2,S_/2,u/.5);}else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s*s*(3-2*s));lift=Math.sin(Math.PI*s)*.5*w;pitch=-.3*Math.sin(Math.PI*s)*w;}
      tz*=w;const nowPlant=u<.5;if(nowPlant&&!L.plant&&w>.3)ev.push({side:L.sd});L.plant=nowPlant;}
    const fx=st.x+L.ox*cy+tz*sy,fz=st.z-L.ox*sy+tz*cy;L.gy=st.air?st.gy:hgt(fx,fz);
    const D={y:(st.air?-L.reach*.82+lift:(L.gy+L.Ay+lift)-(hipY+L.Hy)),z:(L.Az+tz)-L.Hz};
    const r=legSolve(L,D,L.sign);
    L.thigh.rotation.x=r.a;L.knee.rotation.x=r.b-r.a;L.hock.rotation.x=r.a-r.b;L.ankle.rotation.x=-r.a+(st.air?.3:pitch);
    const e=ev[ev.length-1];if(e&&e.side===L.sd&&e.x===undefined){e.x=fx;e.z=fz;}
  }
  for(const A of M.arms){A.kick*=Math.exp(-dt*16);if(A.sh)A.sh.rotation.x=st.pitch*.85+Math.sin(M.phase*TAU+(A.sd>0?Math.PI:0))*.04*w;
    if(A.hold)A.hold.position.copy(A.base).addScaledVector(A.fwd,-A.kick*.28);}
  const th=st.thrust,fl=.6+Math.random()*.4;
  for(const J of M.jets){J.f1.visible=J.f2.visible=th>.02;const l1=(.5+th*1.6)*fl,l2=(.35+th*.95)*fl;J.f1.scale.set(1,l1,1);J.f1.position.y=.15+.5*l1;
    J.f2.scale.set(1,l2,1);J.f2.position.y=.15+.5*l2;}
  if(M.jl)M.jl.intensity=th*60*fl;
  return ev;
}
