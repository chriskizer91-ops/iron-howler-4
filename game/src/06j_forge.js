/* ===================== Ironhowl 4's FORGE machines and their bosses =====================
   The Gunner, Hound and Skitter (and the spawner pod) are the new models in the repo's models/ folder (sessions 3 and 4 of the
   model build): each is printed from its ChatGPT pictures and baked onto one atlas. They keep Ironhowl 3's brains (how they move,
   aim and attack, 06c_enemies.js); this file gives them their models, their joints and their walk.
   Bosses (design document): the same files, bigger, recoloured, one thing changed:
     Gunner Prime  x1.8, bone white, the heavy cannon on both arms
     Alpha Hound   x1.7, rust red, horns and spine blades twice as big
     Brood Skitter x3, black with glowing red seams, a spawner pod on its back that keeps printing Skitters */
const F4={};
Object.assign(EDEF.skitter,{m4:['fskitter','fskitter'],sc:1,r:1.1,cy:.55,init:skInit,pose:skPose});
Object.assign(EDEF.hound,{m4:['fhound','fhound'],sc:1,r:1.6,cy:1.35,init:hdInit,pose:hdPose});
Object.assign(EDEF.gunner,{m4:['fgunner','fgunner'],sc:1,r:1.7,cy:2.6,init:gnInit,pose:gnPose});
EDEF.gprime=Object.assign({},EDEF.gunner,{hp:1500,score:3000,drop:1,scrap:300,sc:1.8,r:3,cy:4.6,speed:3.4,boom:3,boss:'GUNNER PRIME',burst:6,bolt:12,
  init(e,N){gnInit(e,N);primeArms(e,N);e.id='gunner';bossBanner(e);},dress:e=>tintMat(e,'bone')});
EDEF.ahound=Object.assign({},EDEF.hound,{hp:700,score:2200,drop:1,scrap:220,sc:1.7,r:2.7,cy:2.3,speed:9.5,boom:2.6,boss:'ALPHA HOUND',bite:30,
  init(e,N){hdInit(e,N);growParts(e.o,['horn_R','horn_L','spine1','spine2','spine3','spine4'],2);e.id='hound';bossBanner(e);},dress:e=>e.mat.color.setRGB(1.75,.78,.55)});
EDEF.brood=Object.assign({},EDEF.skitter,{hp:900,score:2500,drop:1,scrap:250,sc:3,r:3,cy:1.6,speed:5.5,boom:2.6,boss:'BROOD SKITTER',
  init(e,N){skInit(e,N);broodPod(e);e.id='skitter';bossBanner(e);e.spawnCd=4;},dress:e=>tintMat(e,'brood'),pose:broodPose});
/* the sandbox and Endless waves: after Ironhowl 3's six, a boss wave each */
WAVES.push({ahound:1,hound:2},{gprime:1,skitter:4},{brood:1,hound:1});
function f4load(id){const d=EDEF[id],[dir,stem]=d.m4,f=kitFiles(dir,stem,false);d.amat=kitMat(f,true);
  return loadGLB(f.glb).then(sc=>{dressModel(sc,d.amat);ETPL[id]=sc;sc.updateMatrixWorld(true);
    const J={};sc.traverse(o=>{if(o.name)J[o.name]=J[o.name]||o;});
    if(dir==='fgunner'&&!F4.gunner){const hw=new THREE.Vector3().setFromMatrixPosition(J.hips.matrixWorld).y;F4.gunner={hip0:J.hips.position.y,hipW:hw,tor0:J.torso.position.y,armY:new THREE.Vector3().setFromMatrixPosition(J.arm_R.matrixWorld).y,
      legs:[-1,1].map(sd=>legSetup(J,sd<0?'L':'R',sd,hw))};}
  }).catch(e=>console.error('FORGE model',id,e));}
/* the spawner pod model, for mission pods and the Brood Skitter */
let SPOD=null;
function spodModel(){if(!SPOD){const f=kitFiles('spod','spod',false);SPOD={mat:kitMat(f,true),p:loadGLB(f.glb)};}
  return SPOD.p.then(sc=>dressModel(sc.clone(true),SPOD.mat));}   /* a copy for each pod */
/* the mission spawner pods (06f_more.js) wear the model: x2.2 (5.7 m tall), turned to face the player's start, red seams glowing */
function spodDress(t,g,x,z,parts){spodModel().then(p=>{const m=SPOD.mat.clone();m.onBeforeCompile=sh=>{SPOD.mat.onBeforeCompile&&SPOD.mat.onBeforeCompile(sh);
    sh.fragmentShader=sh.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#ifdef USE_MAP\n{vec4 c_=texture2D(map,vMapUv);totalEmissiveRadiance+=vec3(1.,.06,.02)*1.6*smoothstep(.12,.34,c_.r-max(c_.g,c_.b));}\n#endif');};
    m.customProgramCacheKey=()=>'f4pod';p.traverse(o=>{if(o.isMesh)o.material=m;});
    p.scale.setScalar(2.2);p.rotation.y=Math.atan2(-(P.x-x),-(P.z-z));g.add(p);for(const o of parts)o.visible=false;
    t.eye.position.y=5.75;t.eye.geometry=SPOD.eyeG||(SPOD.eyeG=new THREE.SphereGeometry(.32,12,8));t.pod=p;t.podMat=m;if(t.dead)t.die();});}
/* ---- the Gunner: bird legs like the Wraith (thigh > knee > hock > ankle), solved so the feet stay planted ---- */
function gnInit(e,N){e.hips=N('hips');e.torso=N('torso');e.armR=N('arm_R');e.armL=N('arm_L');e.mzR=N('muzzle_R');e.mzL=N('muzzle_L');e.gp=0;
  e.legs=F4.gunner.legs.map(L=>Object.assign({},L,{thigh:N('thigh_'+L.s),knee:N('knee_'+L.s),hock:N('hock_'+L.s),ankle:N('ankle_'+L.s)}));}
function gnPose(e,dt,sp){const R=F4.gunner,run=Math.min(1,sp/3.5),S_=1.5*run;e.gp+=dt*sp/(2*Math.max(.6,S_));
  const bob=Math.abs(Math.sin(e.gp*TAU))*.08*run;e.hips.position.y=R.hip0-bob;e.torso.position.y=R.tor0-bob;e.torso.rotation.z=Math.sin(e.gp*TAU)*.03*run;
  for(const L of e.legs){let u=(e.gp+(L.sd>0?.5:0))%1;if(u<0)u+=1;let tz=0,lift=0;
    if(u<.5)tz=lerp(-S_/2,S_/2,u/.5);else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s*s*(3-2*s));lift=Math.sin(Math.PI*s)*.45*run;}
    const r=legSolve(L,{y:(L.Ay+lift)-(L.Hy+R.hipW-bob),z:(L.Az+tz)-L.Hz},L.sign);
    L.thigh.rotation.x=r.a;L.knee.rotation.x=r.b-r.a;L.hock.rotation.x=r.a-r.b;L.ankle.rotation.x=-r.a;}
  const k=e.d.sc||1,a=Math.atan2(P.y+3.2-(e.y+R.armY*k),Math.hypot(P.x-e.x,P.z-e.z))*.9;e.armR.rotation.x=e.armL.rotation.x=a;}
/* ---- the Hound: four legs (leg > knee > hock > paw), a jaw and a five-piece tail ---- */
function hdInit(e,N){e.body=N('body');e.head=N('head');e.jaw=N('jaw');e.by0=e.body.position.y;e.tail=[0,1,2,3,4].map(i=>N('tail'+i)).filter(Boolean);
  e.legs=['FL','FR','BL','BR'].map(s=>({up:N('leg'+s),kn:N('knee'+s),hk:N('hock'+s),pw:N('paw'+s)}));}
function hdPose(e,dt,sp){const run=Math.min(1,sp/6),aim=e.st==='aim'?1:0,chg=e.st==='charge'?1:0,ph=e.phase;
  e.body.position.y=e.by0-aim*.2+Math.sin(ph*2)*.07*run;e.body.rotation.x=aim*.08-chg*.06;
  e.legs.forEach((L,i)=>{const fr=i<2,o=fr?0:Math.PI*.9,s=Math.sin(ph*2+o+(i%2)*.5),c=Math.cos(ph*2+o+(i%2)*.5);
    const up=s*.55*run-aim*(fr?.2:-.15),kn=(fr?-1:1)*Math.max(0,c)*.6*run;
    L.up.rotation.x=up;L.kn.rotation.x=kn;if(L.hk)L.hk.rotation.x=-kn*.5;if(L.pw)L.pw.rotation.x=-(up+kn*.5);});
  if(e.jaw)e.jaw.rotation.x=-(aim?.42:chg?.3:.05+.04*Math.sin(ph*3));
  if(e.head)e.head.rotation.x=aim*.12+Math.sin(ph*2)*.04*run;
  e.tail.forEach((t,k)=>{t.rotation.y=Math.sin(ph*1.4-k*.6)*.1*(1+run);t.rotation.x=-.03*k*run;});}
/* ---- the Skitter: four legs, diagonal pairs move together (0 and 3, 1 and 2) ---- */
function skInit(e,N){e.body=N('body');e.by0=e.body.position.y;e.legs=[0,1,2,3].map(i=>({up:N('leg'+i),kn:N('knee'+i),side:i%2?-1:1}));}
function skPose(e,dt,sp){const run=Math.min(1,sp/3),ph=e.phase;e.body.position.y=e.by0+Math.abs(Math.sin(ph*2))*.05*run;
  e.legs.forEach((L,i)=>{const s=(i===0||i===3)?1:-1;L.up.rotation.y=Math.sin(ph*2)*.35*s*run;L.up.rotation.z=Math.max(0,Math.cos(ph*2)*s)*.3*run*L.side;});}
/* ---- bosses ---- */
function bossBanner(e){setTimeout(()=>{if(!e.dead&&G.mode==='play')HUD.banner(e.d.boss);},1600);}
function primeArms(e,N){for(const n of ['rotary_a','rotary_b'])for(let i=-1;i<6;i++){const o=N(i<0?n:'barrel_'+n.slice(-1)+i);if(o)o.visible=false;}
  const c=N('cannon'),aL=e.armL;
  if(c&&aL&&c.geometry){const g=c.geometry.clone();g.scale(-1,1,1);if(g.index){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}}
    const m2=new THREE.Mesh(g,c.material);m2.name='cannon_L';m2.position.copy(c.position);m2.position.x*=-1;m2.quaternion.copy(c.quaternion);m2.scale.copy(c.scale);
    m2.castShadow=m2.receiveShadow=true;(c.parent===e.armR?aL:c.parent).add(m2);}
  if(e.mzR&&e.mzL){e.mzL.position.copy(e.mzR.position);e.mzL.position.x*=-1;}}
function growParts(root,names,g){root.traverse(o=>{if(!o.isMesh||!names.some(n=>o.name===n||o.name.startsWith(n+'_')))return;
  o.geometry=o.geometry.clone();o.geometry.computeBoundingBox();const b=o.geometry.boundingBox,px=(b.min.x+b.max.x)/2,pz=(b.min.z+b.max.z)/2,py=b.min.y;
  o.geometry.translate(-px,-py,-pz);o.geometry.scale(g,g,g);o.geometry.translate(px,py,pz);});}
function broodPod(e){spodModel().then(p=>{if(e.dead)return;p.scale.setScalar(.8/e.d.sc);p.position.set(0,.84,.12);e.o.add(p);});}
function broodPose(e,dt,sp){skPose(e,dt,sp);if(e.spawnT>0||P.dead)return;e.spawnCd-=dt;
  if(e.spawnCd<=0){e.spawnCd=7;if(EN.filter(q=>!q.dead).length<16)for(let i=0;i<2;i++){const a=Math.random()*TAU,c=collide(e.x+Math.cos(a)*5,e.z+Math.sin(a)*5,1.1);const s=spawnEnemy('skitter',c[0],c[1]);if(s)s.spawnT=.4;}
    for(let k=0;k<10;k++)part({x:e.x,y:e.y+3.4,z:e.z,vx:(Math.random()-.5)*6,vy:4+Math.random()*4,vz:(Math.random()-.5)*6,life:.5,s0:1.4,s1:.3,a:1.5,col:[1,.2,.08],glow:true});}}
/* recolour a boss's printed paint in its own shader (the hit flash still works):
   bone: greys become bone white with their shading kept, red primer and lights stay red, white emblems turn dark
   brood: dark paint, and the red primer and lights glow */
function tintMat(e,kind){const m=e.mat,prev=m.onBeforeCompile;
  m.onBeforeCompile=(sh,r)=>{if(prev)prev(sh,r);
    if(kind==='bone')sh.fragmentShader=sh.fragmentShader.replace('#include <alphamap_fragment>','{vec3 c=diffuseColor.rgb;float l=dot(c,vec3(.3,.59,.11));float red=smoothstep(.06,.2,c.r-max(c.g,c.b));float emb=smoothstep(.36,.52,l)*(1.-red);'+
      'vec3 o=vec3(.83,.75,.61)*clamp(pow(l/.077,.75)*.82,0.,1.15);o=mix(o,c,red);diffuseColor.rgb=mix(o,vec3(.035,.03,.03),emb);}\n#include <alphamap_fragment>');
    else sh.fragmentShader=sh.fragmentShader.replace('#include <alphamap_fragment>','diffuseColor.rgb*=vec3(.34,.32,.32);\n#include <alphamap_fragment>')
      .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#ifdef USE_MAP\n{vec4 c_=texture2D(map,vMapUv);totalEmissiveRadiance+=vec3(1.,.025,.01)*1.25*smoothstep(.2,.42,c_.r-max(c_.g,c_.b));}\n#endif');};
  m.customProgramCacheKey=()=>'f4'+kind;m.needsUpdate=true;}
if(DEV)window.__ih4={spawnEnemy,EN,EDEF,F4,startWave,get P(){return P;},
  /* test camera on one machine: from angle ang (0 = in front of it), distance d, height h */
  look(e,ang,d,h,ly){const k=e.d.sc||1,a=e.yaw+(ang||0),ty=e.y+(ly||e.d.cy*k);CAMX={pos:[e.x-Math.sin(a)*d,ty+h,e.z-Math.cos(a)*d],at:[e.x,ty,e.z]};},
  free(){CAMX=null;},
  /* fight tests: start wave n (0 = the first), turn the Wraith to face a machine, read the state */
  wave(n){G.wave=n;startWave();},ewave(n){return n?endlessWave(n):startEWave();},face(e){const d=Math.hypot(e.x-P.x,e.z-P.z);P.yaw=Math.atan2(-(e.x-P.x),-(e.z-P.z));/* pitch so the close camera's crosshair ray passes through the machine's middle */
    let bp=0,be=1e9;for(let pt=.34;pt>=-.85;pt-=.01){const cy_=8.7-pt*1.2,ly=6.2+Math.tan(pt)*26,y=cy_+(ly-cy_)*(d+6.4)/32.4,er=Math.abs(y-(e.y-P.y+e.d.cy));if(er<be){be=er;bp=pt;}}P.pitch=bp;
    /* the close camera sits to the right of the mech (more when looking down), so the crosshair line runs to the right: turn so the machine is on it */
    const sd=1.5+Math.max(0,-bp-.2)*3;P.yaw+=Math.asin(Math.min(1,sd/Math.max(d,.1)));},
  st(){return {mode:G.mode,dead:!!P.dead,paused:!!G.paused,hull:Math.round(P.hull),shield:Math.round(P.shield||0),score:G.score,kills:G.kills,banner:document.getElementById('banner').textContent,
    foes:EN.filter(e=>!e.dead).map(e=>(e.d.boss?e.d.boss:e.id)+':'+Math.round(e.hp)+'@'+Math.round(Math.hypot(e.x-P.x,e.z-P.z))+'m'+(e.st?'/'+e.st:''))};}};
