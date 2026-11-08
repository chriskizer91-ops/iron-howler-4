/* Ironhowl 4 - built from game/src by build.py */
(function(){'use strict';
/* ---- 01_base.js ---- */
/* ===================== basics =====================
   World: three.js axes. x east, y up, z south. A yaw of 0 faces north (-z);
   forward(yaw) = (-sin yaw, 0, -cos yaw), right(yaw) = (cos yaw, 0, -sin yaw). Object3D.rotation.y = yaw. */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const damp=(rate,dt)=>1-Math.exp(-rate*dt);
const angD=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const Q=new URLSearchParams(location.search);
const DEV=Q.has('dev');
const KP='hd-ironhowl4-';
const store={get(k,d){try{const v=localStorage.getItem(KP+k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(KP+k,String(v));}catch(e){}}};
const touchy=Q.has('touch')||matchMedia('(hover: none)').matches;
const EMBED=Q.get('embed')==='1';
/* arcade bridge. The 3D Hyperdot Arcade loads this page in an iframe with ?embed=1:
   game -> arcade {src:'hyperdot',id,type:'ready'|'score'|'over'|'exit',...}
   arcade -> game {src:'hyperdot-arcade',cmd:'start'|'pause'|'resume'|'attract'|'mute'|'unmute'} */
const ARC={id:'ironhowl4',title:'IRONHOWL 4',muted:false,live:false,last:0,sent:-1,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:this.id},data||{}),'*');}catch(e){}},
  begin(){this.live=true;this.sent=-1;},
  score(s){if(!this.live)return;const t=performance.now();if(s!==this.sent&&t-this.last>250){this.last=t;this.sent=s;this.post('score',{score:s});}},
  over(score,tickets){if(!this.live)return;this.live=false;this.post('over',{score,tickets:Math.max(0,Math.round(tickets||0))});},
  exit(){this.post('exit');}
};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* smooth value noise for terrain */
function hash2(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,o){let s=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){s+=vnoise(x*f,y*f)*a;n+=a;a*=.5;f*=2.03;}return s/n;}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

/* ---- 02_input.js ---- */
/* ===================== controls =====================
   readCtl(dt) gives one frame of intent:
   mx,my  move (-1..1, my = forward), turn/pitch (radians this frame), jet (held), jetHit (pressed this frame), view/pause (pressed). */
const KEYS=new Set(),HIT=new Set();
const MOUSE={dx:0,dy:0,locked:false,l:false,rHit:false};
addEventListener('mousedown',e=>{if(!MOUSE.locked)return;if(e.button===0)MOUSE.l=true;if(e.button===2)MOUSE.rHit=true;});
addEventListener('mouseup',e=>{if(e.button===0)MOUSE.l=false;});
addEventListener('contextmenu',e=>e.preventDefault());
const TS={id:-1,ox:0,oy:0,ax:0,ay:0,look:-1,lx:0,ly:0,fx:0,fy:0,ldx:0,ldy:0,jet:false,jetHit:false,fire:false,fireId:-1,msl:false,vent:false,salvo:false};
let PAD_PREV={};
addEventListener('keydown',e=>{if(e.repeat)return;
  if(STY.open){if(e.code==='Escape')storyClose();else if(['Space','Enter','ArrowRight','NumpadEnter'].includes(e.code)){e.preventDefault();storyNext();}return;}   /* IH4: a story scene takes the keys */
  KEYS.add(e.code);HIT.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>KEYS.delete(e.code));
addEventListener('blur',()=>{KEYS.clear();TS.id=-1;TS.look=-1;TS.jet=false;TS.fire=false;TS.fireId=-1;MOUSE.l=false;});
addEventListener('mousemove',e=>{if(MOUSE.locked){MOUSE.dx+=e.movementX||0;MOUSE.dy+=e.movementY||0;}});
/* IH4: losing the lock while the bay's room is open (an intel brief) is not a reason to pause */
document.addEventListener('pointerlockchange',()=>{MOUSE.locked=document.pointerLockElement===cv;if(!MOUSE.locked&&G.mode==='play'&&!G.paused&&!touchy&&!BAY.open&&!STY.open)setPause(true);});
function lockMouse(){if(touchy||EMBED&&!document.hasFocus()||BAY.open||STY.open)return;   /* never during a brief: its buttons need the cursor */
  try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
const STICK_R=58;
function touchStart(e){if(BAY.open||STY.open)return;   /* IH4: the brief's chips and card scroll, and its drags turn the model, not the camera */
  let field=false;
  for(const t of e.changedTouches){
    if(t.target.closest&&t.target.closest('button'))continue;field=true;
    if(t.clientX<innerWidth*.45&&TS.id<0){TS.id=t.identifier;TS.ox=t.clientX;TS.oy=t.clientY;TS.ax=TS.ay=0;HUD.stick(true,TS.ox,TS.oy,0,0);}
    else if(TS.look<0){TS.look=t.identifier;TS.lx=t.clientX;TS.ly=t.clientY;}
  }
  /* only block the browser's tap handling for touches on the game itself: blocking it on buttons stopped VIEW, pause and the menu from working */
  if(G.mode==='play'&&field)e.preventDefault();
}
function touchMove(e){if(BAY.open||STY.open)return;
  for(const t of e.changedTouches){
    if(t.identifier===TS.id){let dx=t.clientX-TS.ox,dy=t.clientY-TS.oy;const d=Math.hypot(dx,dy);
      if(d>STICK_R){/* the stick base follows the thumb so it never runs out of room */TS.ox+=dx/d*(d-STICK_R);TS.oy+=dy/d*(d-STICK_R);dx=t.clientX-TS.ox;dy=t.clientY-TS.oy;}
      TS.ax=dx/STICK_R;TS.ay=dy/STICK_R;HUD.stick(true,TS.ox,TS.oy,dx,dy);}
    else if(t.identifier===TS.look){TS.ldx+=t.clientX-TS.lx;TS.ldy+=t.clientY-TS.ly;TS.lx=t.clientX;TS.ly=t.clientY;}
    else if(t.identifier===TS.fireId){TS.ldx+=t.clientX-TS.fx;TS.ldy+=t.clientY-TS.fy;TS.fx=t.clientX;TS.fy=t.clientY;}   /* the FIRE finger keeps its own last spot */
  }
  if(G.mode==='play')e.preventDefault();
}
function touchEnd(e){for(const t of e.changedTouches){if(t.identifier===TS.id){TS.id=-1;TS.ax=TS.ay=0;HUD.stick(false);}if(t.identifier===TS.look)TS.look=-1;}}
addEventListener('touchstart',touchStart,{passive:false});
addEventListener('touchmove',touchMove,{passive:false});
addEventListener('touchend',touchEnd);addEventListener('touchcancel',touchEnd);
function readCtl(dt){
  const o={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false,view:false,pause:false,fire:false,msl:false,vent:false,salvo:false};
  const k=c=>KEYS.has(c);
  o.mx=(k('KeyD')?1:0)-(k('KeyA')?1:0);o.my=(k('KeyW')||k('ArrowUp')?1:0)-(k('KeyS')||k('ArrowDown')?1:0);
  o.turn+=((k('ArrowRight')?1:0)-(k('ArrowLeft')?1:0))*2.4*dt;
  if(MOUSE.locked){o.turn+=MOUSE.dx*.0026;o.pitch-=MOUSE.dy*.002;}
  MOUSE.dx=MOUSE.dy=0;
  o.jet=k('Space');o.jetHit=HIT.has('Space');o.fire=MOUSE.l||k('KeyF');o.msl=MOUSE.rHit||HIT.has('KeyG');o.vent=HIT.has('KeyR');o.salvo=HIT.has('KeyQ')||HIT.has('KeyE');MOUSE.rHit=false;o.view=HIT.has('KeyV');o.pause=HIT.has('KeyP')||HIT.has('Escape');
  /* touch */
  if(TS.id>=0){const m=Math.min(1,Math.hypot(TS.ax,TS.ay)),a=Math.atan2(TS.ay,TS.ax),dz=m<.12?0:(m-.12)/.88;o.mx+=Math.cos(a)*dz;o.my-=Math.sin(a)*dz;}
  if(TS.ldx||TS.ldy){o.turn+=TS.ldx*.0062*SET.sens;o.pitch-=TS.ldy*.004*SET.sens;TS.ldx=TS.ldy=0;}
  if(TS.jet)o.jet=true;if(TS.jetHit){o.jetHit=true;TS.jetHit=false;}
  if(TS.fire)o.fire=true;if(TS.msl){o.msl=true;TS.msl=false;}if(TS.vent){o.vent=true;TS.vent=false;}if(TS.salvo){o.salvo=true;TS.salvo=false;}
  /* gamepad */
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(const p of pads){if(!p||!p.connected)continue;const ax=i=>Math.abs(p.axes[i]||0)>.16?p.axes[i]:0,b=i=>p.buttons[i]&&p.buttons[i].pressed;
    o.mx+=ax(0);o.my-=ax(1);o.turn+=ax(2)*2.8*dt;o.pitch-=ax(3)*1.6*dt;
    if(b(0)||b(4))o.jet=true;const pr=PAD_PREV;if((b(0)||b(4))&&!pr.j)o.jetHit=true;if(b(3)&&!pr.v)o.view=true;if(b(9)&&!pr.s)o.pause=true;
    if(b(7)||b(5))o.fire=true;if(b(6)&&!pr.m)o.msl=true;if(b(1)&&!pr.x)o.vent=true;if(b(2)&&!pr.q)o.salvo=true;
    PAD_PREV={j:b(0)||b(4),v:b(3),s:b(9),m:b(6),x:b(1),q:b(2)};break;}
  const l=Math.hypot(o.mx,o.my);if(l>1){o.mx/=l;o.my/=l;}
  HIT.clear();
  return o;
}

/* ---- 03_render.js ---- */
/* ===================== renderer, quality, sky, light ===================== */
const cv=$('gl');
const SET={fps:store.get('fps','0')==='1'||store.get('fps',0)===1,quality:store.get('quality','auto'),view:store.get('view','close'),sens:parseFloat(store.get('sens','1'))||1,sound:store.get('sound','1')==='1'};
/* px = pixel budget; shadow = map size (0 = off); grass/near/far = draw distances in metres */
const QUAL={low:{bloom:0,px:.75e6,shadow:0,grass:24,grassNear:8,near:24,far:115,fog:100},
            med:{bloom:1,px:1.35e6,shadow:1024,grass:36,grassNear:12,near:32,far:165,fog:140},
            high:{bloom:1,px:3.4e6,shadow:2048,grass:52,grassNear:18,near:48,far:230,fog:185}};
let QL=SET.quality==='auto'?(touchy?'med':'high'):SET.quality,QC=QUAL[QL],DYN=1;
const R=new THREE.WebGLRenderer({canvas:cv,antialias:!Q.has('noaa'),powerPreference:'high-performance',stencil:false});
R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.18;
R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;R.shadowMap.autoUpdate=true;
const S=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(66,1,.1,700);
function resize(){
  const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,Math.sqrt(QC.px/(w*h)))*DYN;
  R.setPixelRatio(Math.max(.5,dpr));R.setSize(w,h,false);cv.style.width=w+'px';cv.style.height=h+'px';cam.aspect=w/h;cam.updateProjectionMatrix();postResize();
}
addEventListener('resize',resize);
/* shared uniforms used by every world material hook */
const U={tCloud:{value:null},uCloudOff:{value:new THREE.Vector2()},uCloudScale:{value:1/420},uCloudAmt:{value:.75},uSunXZ:{value:new THREE.Vector2()},
  uLeafGlow:{value:.26},uTime:{value:0}};
/* --- loading --- */
const LM=new THREE.LoadingManager();let LOADP=0;
LM.onProgress=(u,a,b)=>{LOADP=a/b;HUD.load(LOADP);};
const TL=new THREE.TextureLoader(LM);
const ART='art/';
function tex(n,o={}){const t=TL.load(ART+n+'.webp');t.wrapS=t.wrapT=o.clamp?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;if(o.rep)t.repeat.set(o.rep,o.rep);
  if(o.srgb!==false)t.colorSpace=THREE.SRGBColorSpace;if(o.glb)t.flipY=false;   /* models from Blender use glTF's upside-down v */t.anisotropy=Math.min(8,R.capabilities.getMaxAnisotropy());return t;}
/* --- light --- */
const SUN=new THREE.Vector3(-.42,.62,-.66).normalize();   /* direction toward the sun: high, from the north-west */
const HEMI=new THREE.HemisphereLight(0xd6e4ff,0x6a5a44,1.55);S.add(HEMI);
const KEY=new THREE.DirectionalLight(0xfff0d6,3.1);KEY.castShadow=true;S.add(KEY,KEY.target);
KEY.shadow.bias=-.0004;KEY.shadow.normalBias=.05;
function setShadow(){const s=QC.shadow;KEY.castShadow=s>0;R.shadowMap.enabled=s>0;if(s){KEY.shadow.mapSize.set(s,s);if(KEY.shadow.map){KEY.shadow.map.dispose();KEY.shadow.map=null;}
  const r=QL==='high'?42:34;Object.assign(KEY.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:260});KEY.shadow.camera.updateProjectionMatrix();}}
/* the shadow box follows a point in front of the mech, snapped to shadow texels so edges do not crawl */
function placeSun(fx,fz){
  const s=QC.shadow||1024,r=KEY.shadow.camera.right,step=2*r/s;
  const ux=Math.round(fx/step)*step,uz=Math.round(fz/step)*step;
  KEY.target.position.set(ux,0,uz);KEY.position.set(ux+SUN.x*120,SUN.y*120,uz+SUN.z*120);KEY.target.updateMatrixWorld();
}
/* --- sky dome: gradient, sun, drifting clouds (the same cloud texture throws the moving shadows on the ground) --- */
const SKYU={tPano:{value:null},uPano:{value:0},uPanoK:{value:1},uSun:{value:SUN},uZen:{value:new THREE.Color(0x2a5fb4)},uHor:{value:new THREE.Color(0xb3c8de)},uSunC:{value:new THREE.Color(1,.93,.8)},
  tCloud:U.tCloud,uCloudOff:U.uCloudOff,uCloudAmt:U.uCloudAmt};
const SKY=new THREE.Mesh(new THREE.SphereGeometry(500,32,16),new THREE.ShaderMaterial({uniforms:SKYU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
  fragmentShader:`uniform vec3 uSun,uZen,uHor,uSunC;uniform sampler2D tCloud,tPano;uniform vec2 uCloudOff;uniform float uCloudAmt,uPano,uPanoK;varying vec3 vD;
  void main(){vec3 d=normalize(vD);float h=max(d.y,0.);
    if(uPano>.5){vec2 uv=vec2(atan(d.x,-d.z)/6.2831853+.5,.5+asin(clamp(d.y,-1.,1.))/3.1415927);vec3 pc=texture2D(tPano,vec2(uv.x,max(uv.y,.502))).rgb*uPanoK;
      float sd=max(dot(d,uSun),0.);pc+=uSunC*pow(sd,700.)*10.;if(d.y<0.)pc=mix(pc,uHor,min(1.,-d.y*6.));gl_FragColor=vec4(pc,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;}
    vec3 c=mix(uHor,uZen,pow(h,.42));
    float sd=max(dot(d,uSun),0.);c+=uSunC*(pow(sd,900.)*28.+pow(sd,24.)*.55+pow(sd,4.)*.12);
    if(d.y>0.){vec2 uv=d.xz/(d.y+.1)*1.05+uCloudOff;
      float n1=texture2D(tCloud,uv).r,n2=texture2D(tCloud,uv*2.3).r,n=clamp((n1*.72+n2*.28-.2)/.36,0.,1.);
      n1=clamp((n1-.2)/.36,0.,1.);n2=clamp((n2-.2)/.36,0.,1.);
      float cl=smoothstep(.36,.86,n)*uCloudAmt*smoothstep(0.,.15,d.y);
      vec3 cc=mix(vec3(.46,.5,.58),vec3(1.05,1.03,1.),smoothstep(.25,.85,n2*.55+(1.-n1)*.65))+uSunC*pow(sd,6.)*.6;
      c=mix(c,cc,cl*.94);}
    else c=mix(uHor,uHor*.8,min(1.,-d.y*4.));
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`}));
SKY.renderOrder=-10;SKY.frustumCulled=false;S.add(SKY);
S.fog=new THREE.Fog(0xb3c8de,30,160);
/* --- material hook: cloud shadows on the sun light, optional dither fade (per instance), optional leaf lighting --- */
const LEAF_NORMAL=THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;','');
function hookWorld(mat,o={}){
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,{tCloud:U.tCloud,uCloudOff:U.uCloudOff,uCloudScale:U.uCloudScale,uCloudAmt:U.uCloudAmt,uSunXZ:U.uSunXZ,uLeafGlow:U.uLeafGlow});
    if(o.ground)Object.assign(sh.uniforms,{tAN:{value:o.ground.nA||FLATN},tBN:{value:o.ground.nB||FLATN},tCN:{value:o.ground.nC||FLATN},uNStr:{value:o.ground.nk||.9},tB:{value:o.ground.tB},tC:{value:o.ground.tC},uBRep:{value:o.ground.bRep},uCRep:{value:o.ground.cRep},uTint:{value:new THREE.Vector3(...o.ground.tint)}});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;'+(o.fade?'\nattribute float aFade;varying float vFade;':'')+(o.ground?'\nattribute float aTrail;varying float vTrail;attribute float aMix;varying float vMix;':''))
      .replace('#include <project_vertex>',`#include <project_vertex>
        vec4 wp4=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          wp4=instanceMatrix*wp4;
        #endif
        vWP=(modelMatrix*wp4).xyz;`+(o.fade?'vFade=aFade;':'')+(o.ground?'vTrail=aTrail;vMix=aMix;':''));
    let f=sh.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vWP;uniform sampler2D tCloud;uniform vec2 uCloudOff,uSunXZ;uniform float uCloudScale,uCloudAmt,uLeafGlow;`+(o.fade?'varying float vFade;':'')+(o.ground?'varying float vTrail;varying float vMix;uniform sampler2D tB,tC,tAN,tBN,tCN;uniform float uBRep,uCRep,uNStr;uniform vec3 uTint;':'')+`
      float cloudShade(){vec2 uv=(vWP.xz+vWP.y*uSunXZ)*uCloudScale+uCloudOff;float n=clamp((texture2D(tCloud,uv).r*.72+texture2D(tCloud,uv*2.3).r*.28-.2)/.36,0.,1.);
        return mix(1.,.4,smoothstep(.5,.78,n)*uCloudAmt);}`)
      .replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color*=cloudShade();');
    if(o.fade)f=f.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(vFade>.01){float dn=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(dn<vFade)discard;}`);
    /* worn paint: models keep a wear mask in the vertex colour alpha (1 clean, 0 bare metal) */
    if(o.wear)f=f.replace('#include <color_fragment>',`#include <color_fragment>
      float wr=0.;
      #ifdef USE_COLOR_ALPHA
        wr=clamp(1.-vColor.a,0.,1.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.5,.49,.47)*vColor.rgb,wr);diffuseColor.a=1.;
      #endif`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.3,wr);')
      .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.9,wr);');
    if(o.leaf)f=f.replace('#include <normal_fragment_begin>',LEAF_NORMAL)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*uLeafGlow*vec3(.9,1.,.7);');
    if(o.ground)f=f.replace('#include <map_fragment>',`#include <map_fragment>
      {float big=texture2D(tCloud,vWP.xz/71.).r;
       vec3 cb=texture2D(tB,vWP.xz*uBRep).rgb,cc=texture2D(tC,vWP.xz*uCRep).rgb;
       vec3 c=mix(diffuseColor.rgb,cb,clamp(vMix,0.,1.));c=mix(c,cc,clamp(vTrail,0.,1.));
       diffuseColor.rgb=c*uTint*(.82+big*.36);}`);
    /* ground bumps: the three ground normal maps blended like the colours, tilted into the terrain normal */
    if(o.ground)f=f.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      {vec3 nA=texture2D(tAN,vMapUv).xyz*2.-1.,nB=texture2D(tBN,vWP.xz*uBRep).xyz*2.-1.,nC=texture2D(tCN,vWP.xz*uCRep).xyz*2.-1.;
       vec3 nn=mix(nA,nB,clamp(vMix,0.,1.));nn=mix(nn,nC,clamp(vTrail,0.,1.));
       vec3 wn=(vec4(normal,0.)*viewMatrix).xyz;wn=normalize(wn+vec3(nn.x,0.,-nn.y)*uNStr);normal=normalize((viewMatrix*vec4(wn,0.)).xyz);}`);
    sh.fragmentShader=f;
  };
  mat.customProgramCacheKey=()=>'w'+(o.fade?1:0)+(o.leaf?1:0)+(o.ground?1:0)+(o.wear?1:0);
  return mat;
}

/* a ring of distant scenery (hills or a skyline) around the horizon; it follows the camera like the sky */
let RING=null;
function horizonRing(texName,height,lift,tint,copies){
  const t=tex(texName,{clamp:false});t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.repeat.set(copies||3,1);
  const g=new THREE.CylinderGeometry(420,420,height,64,1,true);
  const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.BackSide,depthWrite:false,fog:false,color:new THREE.Color(...(tint||[1,1,1]))});
  RING=new THREE.Mesh(g,m);RING.renderOrder=-9;RING.frustumCulled=false;RING.userData.lift=lift;S.add(RING);}
/* each map sets its own light, sky and fog */
let LOOKNOW=null;
function applyLook(L){LOOKNOW=L;if(L.fogFar){S.fog.far=Math.min(S.fog.far,L.fogFar);S.fog.near=S.fog.far*.22;}
  SUN.set(...L.sun).normalize();KEY.color.set(L.sunCol);KEY.intensity=L.sunK;HEMI.color.set(L.sky);HEMI.groundColor.set(L.ground);HEMI.intensity=L.hemiK;
  SKYU.uZen.value.set(L.zen);SKYU.uHor.value.set(L.hor);S.fog.color.set(L.fog);U.uCloudAmt.value=L.clouds;R.toneMappingExposure=L.exp||1.18;
  if(L.pano){SKYU.tPano.value=tex(L.pano);SKYU.uPano.value=1;SKYU.uPanoK.value=L.panoK||1;}
  if(L.ring)horizonRing(L.ring.tex,L.ring.h,L.ring.lift,L.ring.tint,L.ring.copies);
}

/* ---- 03b_post.js ---- */
/* ===================== detail pass 1: glow pass (bloom), metal reflections, surface bumps (normal maps), ground decals, shield flash =====================
   Bloom is on for High and Medium. It only picks up colours brighter than 1.7 in their strongest channel, so lit ground does not glow but red lights do. */
const NMAPS=new Set(['22-howler-armour','23-grey-armour','24-gunmetal','25-brushed-steel','53-howler-armour-large-plates','54-forge-armour','57-rubber-and-cables',
  '01-yard-concrete','02-wet-concrete','03-asphalt','06-dirt-and-gravel','07-harbor-paving','15-roof-gravel','60-meadow-ground','61-dry-prairie-ground','62-farm-track',
  '63-ploughed-field','64-wheat-field','81-forest-floor','82-mossy-ground-with-roots','83-mossy-boulder-rock','09-blast-wall','10-corrugated-metal','12-rusted-steel-plate',
  '17-concrete-barrier','04-steel-tread-plate','71-red-shipping-container-side','72-blue-shipping-container-side']);
const FLATN=(()=>{const t=new THREE.DataTexture(new Uint8Array([128,128,255,255]),1,1);t.needsUpdate=true;return t;})();
function nmapK(name){return NK[name]||1;}
function nmap(name,o={}){if(!NMAPS.has(name))return null;const t=tex(name+'-n',{glb:o.glb,srgb:false});if(o.rep)t.repeat.set(o.rep[0],o.rep[1]);return t;}
/* mech and machine paint gets gentler bumps than walls and ground */
const NK={'22-howler-armour':.5,'23-grey-armour':.5,'24-gunmetal':.45,'25-brushed-steel':.4,'54-forge-armour':.6,'53-howler-armour-large-plates':.5};
function addNormal(mat,name,k,o){const t=nmap(name,o);if(t){mat.normalMap=t;mat.normalScale.set(k,k);}return mat;}
/* ---- bloom ---- */
const POST={on:false,comp:null,bloom:null};
const HP_FRAG=`uniform sampler2D tDiffuse;uniform vec3 defaultColor;uniform float defaultOpacity,luminosityThreshold,smoothWidth;varying vec2 vUv;
  void main(){vec4 t=texture2D(tDiffuse,vUv);float v=max(t.r,max(t.g,t.b));float a=smoothstep(luminosityThreshold,luminosityThreshold+smoothWidth,v);
    gl_FragColor=mix(vec4(defaultColor,defaultOpacity),t,a);}`;
function postSetup(){const want=!!QC.bloom&&!Q.has('nobloom');
  if(want&&!POST.comp){const rt=new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:Q.has('noaa')?0:(QL==='high'?4:2)});
    POST.comp=new THREE.EffectComposer(R,rt);POST.comp.addPass(new THREE.RenderPass(S,cam));
    POST.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(256,256),.55,.42,1.7);POST.bloom.highPassUniforms.smoothWidth.value=.6;
    POST.bloom.materialHighPassFilter.fragmentShader=HP_FRAG;POST.bloom.materialHighPassFilter.needsUpdate=true;
    POST.comp.addPass(POST.bloom);POST.comp.addPass(new THREE.OutputPass());}
  /* glow switched off: its buffers (several screen-sized images) are freed, not kept */
  if(!want&&POST.comp){POST.comp.dispose();if(POST.bloom&&POST.bloom.dispose)POST.bloom.dispose();POST.comp=null;POST.bloom=null;}
  POST.on=want;postResize();}
function postResize(){if(!POST.comp)return;POST.comp.setPixelRatio(R.getPixelRatio());POST.comp.setSize(innerWidth,innerHeight);}
function renderFrame(){if(POST.on){R.info.autoReset=false;R.info.reset();POST.comp.render();}else{R.info.autoReset=true;R.render(S,cam);}}
/* ---- reflections: a small sky made from the map's own colours, turned into an environment map for anything metal ---- */
let ENV=null;
function buildEnv(L){const c=x=>new THREE.Color(x),sc=new THREE.Scene();
  const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{zen:{value:c(L.zen)},hor:{value:c(L.hor)},gr:{value:c(L.ground)},sun:{value:SUN.clone().normalize()},sc:{value:c(L.sunCol)},k:{value:(L.hemiK||1.5)*.6},sk:{value:L.sunK||2}},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 zen,hor,gr,sun,sc;uniform float k,sk;varying vec3 vD;
      void main(){vec3 d=normalize(vD);float y=d.y;vec3 col=y>0.?mix(hor,zen,pow(y,.55)):mix(hor,gr*.7,pow(min(1.,-y*3.),.6));col*=k;
        float s=max(0.,dot(d,sun));col+=sc*(pow(s,220.)*sk*1.6+pow(s,6.)*sk*.05);gl_FragColor=vec4(col,1.);}`});
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),m));const pm=new THREE.PMREMGenerator(R);ENV=pm.fromScene(sc,.02).texture;pm.dispose();}
function envAll(){if(!ENV)return;const seen=new Set();
  const f=m=>{if(!m||seen.has(m)||!m.isMeshStandardMaterial)return;seen.add(m);if(m.metalness>=.3){m.envMap=ENV;m.envMapIntensity=m.metalness>=.6?.95:.25+m.metalness*.5;m.needsUpdate=true;}};
  for(const o of [MT,EMAT,typeof BMAT!=='undefined'?BMAT:{}])for(const k in o)f(o[k]);
  S.traverse(o=>{if(o.isMesh){if(Array.isArray(o.material))o.material.forEach(f);else f(o.material);}});}
/* ---- ground decals: scorch marks where things blow up, claw prints where the mech walks (oldest replaced first) ---- */
const DEC={};
function decalSet(id,texName,max,dark){if(DEC[id])return DEC[id];const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const m=new THREE.MeshStandardMaterial({map:tex(texName,{clamp:true}),transparent:true,depthWrite:false,roughness:1,metalness:0,color:dark||0xffffff,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  const im=new THREE.InstancedMesh(g,m,max);im.count=0;im.receiveShadow=true;im.frustumCulled=false;im.renderOrder=1;S.add(im);return DEC[id]={im,max,i:0};}
function decal(id,x,z,size,rot){const D=id==='scorch'?decalSet('scorch','40-scorch-mark',48):decalSet('print','86-mech-footprint',72,0xb0a89c);
  _m4.compose(_w.set(x,hgt(x,z)+.05,z),_q.setFromAxisAngle(_v.set(0,1,0),rot||0),_v.set(size,1,size));D.im.setMatrixAt(D.i,_m4);D.i=(D.i+1)%D.max;D.im.count=Math.max(D.im.count,D.i===0?D.max:D.i);D.im.instanceMatrix.needsUpdate=true;}
const SOFT_GROUND=()=>MAPID==='woods'||MAPID==='field';
/* ---- shield flash: a hex bubble around the mech when the shield soaks a hit ---- */
let SHF=null;
function shieldFlash(){if(!SHF){const t=tex('59-shield-hex-pattern');t.repeat.set(5,2.5);
    SHF=new THREE.Mesh(new THREE.SphereGeometry(4.3,32,16),new THREE.MeshBasicMaterial({map:t,color:new THREE.Color(.35,.8,1).multiplyScalar(2.4),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
    SHF.renderOrder=6;SHF.k=0;S.add(SHF);}SHF.k=1;}
function updShieldFx(dt){if(!SHF)return;SHF.k=Math.max(0,SHF.k-dt*3.2);SHF.visible=SHF.k>0;SHF.material.opacity=SHF.k*.5;SHF.position.set(P.x,P.y+3.3,P.z);SHF.scale.setScalar(1+.06*(1-SHF.k));SHF.rotation.y+=dt*.6;}

/* ---- 04_world.js ---- */
/* ===================== the world: shared by every map (the maps themselves are in 04b_maps.js) =====================
   PLAY = half-size of the ground you can walk on (260 x 260 m since session 5; it was 160). Beyond it the ground rises (or meets water). */
const PLAY=130,WORLD=225;
let MAPID='woods',MAPDEF=null,TRAIL=[],CLEAR=[],SPAWN={x:0,z:70,yaw:0};
function pickMap(){const want=(MISSION?MISSION.map:(Q.get('map')||store.get('map','woods'))).toLowerCase();MAPID=MAPS[want]?want:'woods';MAPDEF=MAPS[MAPID];
  /* a mission can swap the ground texture and the plant mix (the page reloads per mission, so changing the map in place is fine) */
  if(MISSION&&MISSION.ground)Object.assign(MAPDEF.ground,MISSION.ground);if(MISSION&&MISSION.mix)MAPDEF.mix=MISSION.mix;
  TRAIL=MAPDEF.trail||[];CLEAR=MAPDEF.clear||[];SPAWN=MISSION?{x:MISSION.start[0],z:MISSION.start[1],yaw:MISSION.start[2]}:MAPDEF.spawn;if(!MISSION)store.set('map',MAPID);}
function segD(px,pz,ax,az,bx,bz){const vx=bx-ax,vz=bz-az,t=clamp(((px-ax)*vx+(pz-az)*vz)/(vx*vx+vz*vz),0,1),dx=px-ax-vx*t,dz=pz-az-vz*t;return Math.sqrt(dx*dx+dz*dz);}
function trailD(x,z){let d=1e9;for(let i=0;i<TRAIL.length-1;i++){const a=TRAIL[i],b=TRAIL[i+1];d=Math.min(d,segD(x,z,a[0],a[1],b[0],b[1]));}return d;}
function clearD(x,z){let d=1e9;for(const c of CLEAR)d=Math.min(d,Math.hypot(x-c[0],z-c[1])-c[2]);return d;}
function hgt(x,z){return MAPDEF.h(x,z);}
/* --- ground: a base texture, a second one (weight aMix) and a third (weight aTrail), each tiled in world space --- */
function buildGround(){
  const G_=MAPDEF.ground,n=WORLD,g=new THREE.PlaneGeometry(WORLD*2,WORLD*2,n,n);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,tr=new Float32Array(p.count),mx=new Float32Array(p.count);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,hgt(x,z));const w=G_.w(x,z);mx[i]=w[0];tr[i]=w[1];}
  g.setAttribute('aTrail',new THREE.BufferAttribute(tr,1));g.setAttribute('aMix',new THREE.BufferAttribute(mx,1));g.computeVertexNormals();
  const m=hookWorld(new THREE.MeshStandardMaterial({map:tex(G_.a,{rep:WORLD*2/G_.ar}),roughness:G_.rough||.96,metalness:0}),
    {ground:{tB:tex(G_.b),tC:tex(G_.c),bRep:1/G_.br,cRep:1/G_.cr,tint:G_.tint||[1,1,1],nA:nmap(G_.a,{rep:[WORLD*2/G_.ar,WORLD*2/G_.ar]}),nB:nmap(G_.b),nC:nmap(G_.c)}});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;S.add(mesh);return mesh;
}
/* a road or trail draped over the ground, textured along its length, soft at the edges */
function ribbon(pts,width,texName,repLen,lift){
  const sm=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    const L=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),n=Math.max(2,Math.ceil(L/1.5));
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);sm.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
  sm.push(pts[pts.length-1]);
  const pos=[],uv=[],col=[],idx=[];let v=0;
  for(let i=0;i<sm.length;i++){const a=sm[Math.max(0,i-1)],b=sm[Math.min(sm.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
    if(i>0)v+=Math.hypot(sm[i][0]-sm[i-1][0],sm[i][1]-sm[i-1][1])/repLen;
    for(const s of [-1,-.7,.7,1]){const x=sm[i][0]-dz*s*width/2,z=sm[i][1]+dx*s*width/2;pos.push(x,hgt(x,z)+(lift||.07),z);uv.push((s+1)/2,v);col.push(1,1,1,Math.abs(s)>.9?0:1);}}
  for(let i=0;i<sm.length-1;i++)for(let k=0;k<3;k++){const a=i*4+k,b=a+1,c=a+4,d=a+5;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,4));g.setIndex(idx);g.computeVertexNormals();
  const t=tex(texName);t.wrapS=THREE.ClampToEdgeWrapping;
  const m=hookWorld(new THREE.MeshStandardMaterial({map:t,vertexColors:true,transparent:true,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;mesh.renderOrder=1;S.add(mesh);return mesh;
}
/* --- vegetation: one InstancedMesh per model part; near and far versions swap by distance; trees between the camera and the mech dither out --- */
const VEG={list:[],byId:{},cat:null,ready:false,cols:new Map(),grassCell:12};
function colKey(x,z){return ((Math.floor(x/10)+200)*1000)+(Math.floor(z/10)+200);}
function addCol(x,z,r,h){const k=colKey(x,z);if(!VEG.cols.has(k))VEG.cols.set(k,[]);VEG.cols.get(k).push({x,z,r,h:h||9});}
/* a solid box (containers, buildings, crane legs) from x0..x1, z0..z1, standing on y0, h tall */
function addBox(x0,z0,x1,z1,h,y0){const c={b:1,x0,z0,x1,z1,h,y0:y0==null?hgt((x0+x1)/2,(z0+z1)/2):y0,x:(x0+x1)/2,z:(z0+z1)/2,r:Math.hypot(x1-x0,z1-z0)/2};
  for(let i=Math.floor(x0/10);i<=Math.floor(x1/10);i++)for(let j=Math.floor(z0/10);j<=Math.floor(z1/10);j++){const k=((i+200)*1000)+(j+200);if(!VEG.cols.has(k))VEG.cols.set(k,[]);VEG.cols.get(k).push(c);}return c;}
/* push a circle (x,z,rad) out of tree trunks; returns [x,z,hit] */
function collide(x,z,rad){let hit=false;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=VEG.cols.get(colKey(x+i*10,z+j*10));if(!a)continue;
    for(const c of a){if(c.b){const cx=clamp(x,c.x0,c.x1),cz=clamp(z,c.z0,c.z1),dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;
        if(d2<rad*rad){if(d2>1e-8){const d=Math.sqrt(d2);x=cx+dx/d*rad;z=cz+dz/d*rad;}else{const e=[x-c.x0,c.x1-x,z-c.z0,c.z1-z],m=Math.min(...e);if(m===e[0])x=c.x0-rad;else if(m===e[1])x=c.x1+rad;else if(m===e[2])z=c.z0-rad;else z=c.z1+rad;}hit=true;}continue;}
      const dx=x-c.x,dz=z-c.z,rr=rad+c.r,d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2);x=c.x+dx/d*rr;z=c.z+dz/d*rr;hit=true;}}}
  return [x,z,hit];}
function vegAsset(id,kind){if(VEG.byId[id])return VEG.byId[id];const a={id,kind,inst:[],parts:{near:[],far:[]},sel:[],selFar:[]};VEG.byId[id]=a;VEG.list.push(a);return a;}
function plant(id,kind,x,z,s,rnd){
  const a=vegAsset(id,kind),c=VEG.cat[id],y=hgt(x,z)-(kind==='tree'?.25:.05),r=rnd()*TAU;
  const m=new THREE.Matrix4().compose(V3(x,y,z),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),r),V3(s,s,s));
  const cr=Math.max(c.size_m[0],c.size_m[2])*.5*s;
  a.inst.push({x,y,z,s,m,cr,h:c.size_m[1]*s,f:0});
  if(c.collider&&kind==='tree')addCol(x,z,c.collider.r*s+.1,c.size_m[1]*s);
}
function partsOf(scene,kind,lod){
  const out=[];scene.updateMatrixWorld(true);
  scene.traverse(o=>{if(!o.isMesh)return;
    const leaf=/foliage|grass/i.test(o.material.name||'')||(o.material.userData&&o.material.userData.gameMat==='LEAF');
    if(!o.material.userData.ih3){o.material.userData.ih3=1;hookWorld(o.material,{fade:kind==='tree',leaf});
      /* the pack's far versions are painted darker than the near ones; lift them so the swap does not show */
      if(leaf){o.material.side=THREE.DoubleSide;o.material.color.multiplyScalar(lod==='far'?(kind==='grass'?1.25:1.8):1.2);}}
    if(leaf&&!o.geometry.userData.bent){o.geometry.userData.bent=1;const g=o.geometry,p=g.attributes.position,nn=g.attributes.normal;g.computeBoundingBox();
      const c=new THREE.Vector3();g.boundingBox.getCenter(c);const v=new THREE.Vector3(),w=new THREE.Vector3();
      for(let i=0;i<p.count;i++){v.set(p.getX(i),p.getY(i),p.getZ(i));w.set(nn.getX(i),nn.getY(i),nn.getZ(i));
        if(kind==='grass')w.multiplyScalar(.25).add(V3(0,1,0));else w.multiplyScalar(.35).add(v.sub(c).normalize().multiplyScalar(.65));
        w.normalize();nn.setXYZ(i,w.x,w.y,w.z);}nn.needsUpdate=true;}
    out.push({geo:o.geometry,mat:o.material,local:o.matrixWorld.clone(),leaf});});
  return out;
}
function buildInstances(a,lod,scene){
  const n=a.inst.length,parts=partsOf(scene,a.kind,lod);
  for(const p of parts){
    const im=new THREE.InstancedMesh(p.geo,p.mat,n);im.count=0;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow=lod==='near'&&a.kind!=='grass';im.receiveShadow=!p.leaf||a.kind==='grass';
    const fa=new THREE.InstancedBufferAttribute(new Float32Array(n),1);fa.setUsage(THREE.DynamicDrawUsage);p.geo=p.geo.clone();p.geo.setAttribute('aFade',fa);im.geometry=p.geo;p.fade=fa;
    const big=new Float32Array(n*16),t=new THREE.Matrix4();a.inst.forEach((s,i)=>{t.multiplyMatrices(s.m,p.local);big.set(t.elements,i*16);});
    p.big=big;p.im=im;S.add(im);a.parts[lod].push(p);
  }
}
function loadVeg(mixId){
  return fetch('models/catalog.json').then(r=>r.json()).then(c=>{
    VEG.cat={_biomes:c.biomes};c.manifest.assets.forEach(a=>VEG.cat[a.id]=a);MAPDEF.layout(mulberry(4242),mixId);
    const L=new THREE.GLTFLoader(LM),jobs=[];
    for(const a of VEG.list.filter(a=>a.inst.length)){const c=VEG.cat[a.id];for(const lod of ['near','far'])
      jobs.push(new Promise(ok=>L.load('models/'+c.files[lod],g=>{buildInstances(a,lod,g.scene);ok();},undefined,()=>ok())));}
    return Promise.all(jobs).then(()=>{VEG.ready=true;});
  });
}
const _cf=new THREE.Vector3();
let VEGN={tris:0,inst:0,by:{}};
/* every frame: choose which instances to draw (distance + view cone), near or far, and how faded */
function updVeg(dt,mx,my,mz){
  if(!VEG.ready)return;
  const cx=cam.position.x,cz=cam.position.z;cam.getWorldDirection(_cf);const fl=Math.hypot(_cf.x,_cf.z)||1,fx=_cf.x/fl,fz=_cf.z/fl;
  const hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect),cosT=Math.cos(Math.min(1.55,hf+.25));
  const NEAR=QC.near,FAR=QC.far,GR=QC.grass;let tris=0,inst=0;if(DEV)VEGN.by={};
  const segx=mx-cx,segz=mz-cz,segL2=segx*segx+segz*segz||1;
  for(const a of VEG.list){
    const isT=a.kind==='tree',K=a.kind,far=a.parts.far.length>0,nearD=isT?NEAR:K==='grass'?QC.grassNear:K==='bush'?NEAR*.55:NEAR,lim=K==='grass'?GR:K==='bush'?NEAR*1.3:K==='prop'?NEAR*1.5:FAR;
    const sn=a.sel,sf=a.selFar;sn.length=0;sf.length=0;
    for(let i=0;i<a.inst.length;i++){const s=a.inst[i],dx=s.x-cx,dz=s.z-cz,d2=dx*dx+dz*dz;if(d2>lim*lim)continue;
      const d=Math.sqrt(d2);if(d>s.cr+6&&(dx*fx+dz*fz)/d<cosT-s.cr/d)continue;
      if(!far||d<nearD)sn.push(i);else sf.push(i);}
    /* fade near trees that stand between the camera and the mech, or right against the lens */
    if(isT){for(const i of sn){const s=a.inst[i],dx=s.x-cx,dz=s.z-cz;let tgt=0;const t=(dx*segx+dz*segz)/segL2;
        if(t>-.05&&t<1.08){const px=dx-segx*t,pz=dz-segz*t,dp=Math.sqrt(px*px+pz*pz);if(dp<s.cr*.7+1.4)tgt=.86;}
        if(dx*dx+dz*dz<s.cr*s.cr*.4)tgt=1;
        s.f+=(tgt-s.f)*damp(tgt>s.f?10:4,dt);}}
    for(const lod of ['near','far']){const L=lod==='near'?sn:sf,PV=lod==='near'?(a.psn||(a.psn=[])):(a.psf||(a.psf=[]));
      /* only send what changed, and only the part in use: the same plants as last frame (no fading trees) send nothing */
      let same=!(isT&&lod==='near')&&PV.length===L.length;if(same)for(let k=0;k<L.length;k++)if(PV[k]!==L[k]){same=false;break;}
      if(!same){PV.length=L.length;for(let k=0;k<L.length;k++)PV[k]=L[k];}
      for(const p of a.parts[lod]){
        if(!same){const arr=p.im.instanceMatrix.array,fa=p.fade.array,big=p.big;
          for(let k=0;k<L.length;k++){const i=L[k]*16,o=k*16;for(let j=0;j<16;j++)arr[o+j]=big[i+j];fa[k]=lod==='near'&&isT?a.inst[L[k]].f:0;}
          p.im.count=L.length;p.im.visible=L.length>0;
          if(L.length){const ia=p.im.instanceMatrix;ia.clearUpdateRanges();ia.addUpdateRange(0,L.length*16);ia.needsUpdate=true;p.fade.clearUpdateRanges();p.fade.addUpdateRange(0,L.length);p.fade.needsUpdate=true;}}
        const tt=L.length*(p.geo.index?p.geo.index.count:p.geo.attributes.position.count)/3;tris+=tt;inst+=L.length;if(DEV){const k=a.kind+'.'+lod;VEGN.by[k]=(VEGN.by[k]||0)+tt;}}}
  }
  VEGN.tris=tris|0;VEGN.inst=inst;
}

/* ---- 04b_maps.js ---- */
/* ===================== the three kinds of place: woods, field, docks =====================
   Each map gives: h(x,z) ground height, ground textures + weights, look (light, sky, fog), layout (plants), build (structures),
   spawn, trail (draped road), route (attract demo path), bounds (where the mech may walk). Pick one with ?map=woods|field|docks. */
function tmat(name,o={}){const t=tex(name,{glb:o.glb});if(o.rep)t.repeat.set(o.rep[0],o.rep[1]);const nm=o.alpha?null:nmap(name,{glb:o.glb,rep:o.rep});
  return hookWorld(new THREE.MeshStandardMaterial({normalMap:nm,normalScale:new THREE.Vector2(o.nk||1,o.nk||1),map:t,roughness:o.r==null?.8:o.r,metalness:o.m==null?.1:o.m,color:o.col==null?0xffffff:o.col,
    transparent:!!o.alpha,alphaTest:o.alpha?.45:0,side:o.ds?THREE.DoubleSide:THREE.FrontSide}));}
/* box geometry whose faces [+x,-x,+y,-y,+z,-z] repeat their texture every [u,v] metres (0 = stretch once) */
function sbox(w,h,d,reps){const g=new THREE.BoxGeometry(w,h,d);if(!reps)return g;const uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++){const r=reps[f];if(!r)continue;for(let i=f*4;i<f*4+4;i++)uv.setXY(i,uv.getX(i)*(r[0]?dims[f][0]/r[0]:1),uv.getY(i)*(r[1]?dims[f][1]/r[1]:1));}return g;}
function put(g,mats,x,y,z,ry,shadow){const m=new THREE.Mesh(g,mats);m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=shadow!==false;m.receiveShadow=true;S.add(m);return m;}
function gable(w,d,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3,uv.getY(i)/3);return g;}
function rectW(x,z,r,soft){return smooth(-soft,soft,Math.min(x-r[0],r[2]-x,z-r[1],r[3]-z));}
function pickW(o,rnd){let t=0;for(const k in o)t+=o[k];let r=rnd()*t;for(const k in o){r-=o[k];if(r<=0)return k;}return Object.keys(o)[0];}
function biome(id){return VEG.cat._biomes.find(b=>b.id===id)||VEG.cat._biomes[0];}
function propsAlong(rnd,list,side){for(let i=0;i<list.length;i++){const k=(i+.5)/list.length*(TRAIL.length-1),a=TRAIL[k|0],b=TRAIL[(k|0)+1],f=k%1,x=lerp(a[0],b[0],f),z=lerp(a[1],b[1],f);
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),sd=i%2?-1:1;plant(list[i],'prop',x+dz/l*side*sd,z-dx/l*side*sd,1,rnd);}}
/* session 5: arenas grew 1.6x (260 m across) so there is room to back off; K scales the woods and field layouts */
const K=1.6,kp=a=>a.map(p=>[p[0]*K,p[1]*K]),kc=a=>a.map(c=>[c[0]*K,c[1]*K,c[2]*K]),kr=a=>a.map(r=>[r[0]*K,r[1]*K,r[2]*K,r[3]*K,r[4]]);
const MAPS={
/* ---------------- woods: mixed forest, a trail, clearings ---------------- */
woods:{name:'WOODS',mix:'woods',spawn:{x:0,z:112,yaw:0},
  trail:kp([[0,82],[-12,56],[-22,32],[-6,12],[16,-4],[20,-28],[2,-46],[-18,-60],[-12,-82]]),
  clear:kc([[-32,38,15],[26,-14,17],[-24,-56,13],[34,50,11],[4,26,9],[-48,-10,12],[50,-50,12]]),
  h(x,z){const big=(fbm(x*.011+3.1,z*.011-7.4,4)-.5)*9,small=(fbm(x*.047,z*.047+11,2)-.5)*1.8;
    const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-6,PLAY+60,e),1.3)*28;return big+small*smooth(1.5,7,trailD(x,z))+rim;},
  ground:{a:'81-forest-floor',ar:6,b:'82-mossy-ground-with-roots',br:7,c:'06-dirt-and-gravel',cr:4.6,
    w(x,z){return [smooth(.45,.62,fbm(x*.03+5,z*.03-2,3)),smooth(5.5,3,trailD(x,z))*.5];}},
  look:{sun:[-.42,.62,-.66],sunCol:0xfff0d6,sunK:3.1,sky:0xd6e4ff,ground:0x6a5a44,hemiK:1.55,zen:0x2a5fb4,hor:0xb3c8de,fog:0xb3c8de,clouds:.75},
  layout(rnd,mixId){const mix=mixId==='creek'?{tree:{tree_willow:2,tree_cottonwood:1.4,tree_spruce:2.2,tree_aspen:1.2},grass:{grass_reeds:1.4,grass_meadow:2,grass_dry:.4}}:biome(mixId);
    for(let gx=-WORLD+4;gx<WORLD-4;gx+=7.5)for(let gz=-WORLD+4;gz<WORLD-4;gz+=7.5){
      const x=gx+(rnd()-.5)*6.5,z=gz+(rnd()-.5)*6.5,e=Math.max(Math.abs(x),Math.abs(z)),td=trailD(x,z),cd=clearD(x,z);
      if(Math.hypot(x-SPAWN.x,z-SPAWN.z)<13||td<6.5||cd<0)continue;
      if(rnd()>(e<PLAY?.62*smooth(6.5,12,td)*smooth(0,6,cd):.92))continue;plant(pickW(mix.tree,rnd),'tree',x,z,.82+rnd()*.4,rnd);}
    for(let i=0;i<20000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<2.6&&rnd()<.9)continue;plant(pickW(mix.grass,rnd),'grass',x,z,.75+rnd()*.7,rnd);}
    for(let i=0;i<600;i++){const x=(rnd()-.5)*2*(PLAY+10),z=(rnd()-.5)*2*(PLAY+10);if(trailD(x,z)<4)continue;plant(rnd()<.65?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.7,rnd);}
    propsAlong(rnd,['prop_drum','prop_tires','prop_icechest','prop_drum','prop_tires','prop_mailbox'],5.6);},
  build(){ribbon(TRAIL,7.5,'62-farm-track',10);boulders(30,mulberry(77));}},
/* ---------------- field: rolling farmland, a farm track, crops, a farmstead, relay masts ---------------- */
field:{name:'FIELD',mix:'meadow',spawn:{x:0,z:115,yaw:0},
  trail:kp([[0,88],[4,64],[-6,40],[-2,18],[14,0],[22,-22],[10,-44],[-12,-62],[-20,-88]]),
  crops:kr([[-74,-12,-24,28,'c'],[-72,40,-28,72,'b'],[34,-74,72,-34,'c'],[40,-24,76,8,'b'],[-60,-70,-26,-36,'b']]),
  farm:{x:67,z:54},masts:[[-64,-32],[77,-83],[-51,83]],
  h(x,z){const big=(fbm(x*.0075+11,z*.0075-3,4)-.5)*15,small=(fbm(x*.04,z*.04,2)-.5)*1.1;
    const e=Math.max(Math.abs(x),Math.abs(z)),rim=Math.pow(smooth(PLAY-4,PLAY+70,e),1.2)*30;
    const flat=Math.min(smooth(3,10,trailD(x,z)),smooth(18,38,Math.hypot(x-67,z-54)));return (big*.8+small)*(.35+.65*flat)+rim;},
  ground:{a:'60-meadow-ground',ar:5,b:'63-ploughed-field',br:6,c:'64-wheat-field',cr:4.5,
    w(x,z){let b=0,c=0;for(const r of MAPS.field.crops){const k=rectW(x,z,r,1.6);if(r[4]==='b')b=Math.max(b,k);else c=Math.max(c,k);}return [b,c];}},
  look:{sun:[-.35,.78,-.5],sunCol:0xfff4e2,sunK:3.3,sky:0xdbe9ff,ground:0x6f6a4a,hemiK:1.6,zen:0x2f6fd0,hor:0xc6daf0,fog:0xc4d6ea,clouds:.55,
    pano:'69-daytime-field-sky',ring:{tex:'70-distant-hills',h:70,lift:-10,tint:[.9,.95,1],copies:3},exp:1.12},
  layout(rnd,mixId){const dry=mixId==='dry',HEDGE=dry?{tree_mesquite:3,tree_snag:.5}:{tree_oak:3,tree_cottonwood:1.5,tree_willow:.6},LONE=dry?{tree_mesquite:3,tree_snag:.6,tree_ponderosa:.5}:{tree_oak:3,tree_cottonwood:1.5,tree_aspen:.8},
      FAR=dry?{tree_mesquite:2,tree_ponderosa:1.5,tree_snag:.6}:{tree_oak:2,tree_cottonwood:1,tree_ponderosa:1.5,tree_spruce:1},GRASS=dry?{grass_dry:3,grass_meadow:.3}:{grass_meadow:3,grass_dry:1.2},
      mix=biome('meadow'),cropAt=(x,z)=>MAPS.field.crops.some(r=>rectW(x,z,r,3)>0),farmD=(x,z)=>Math.hypot(x-67,z-54);
    /* hedgerow trees along the crop edges and the far hills, a few loners in the meadow */
    for(const r of MAPS.field.crops)for(let t=0;t<1;t+=.06){const side=(t*4)|0,f=(t*4)%1,x=side===0?lerp(r[0],r[2],f):side===2?lerp(r[2],r[0],f):side===1?r[2]+2.5:r[0]-2.5,
      z=side===0?r[1]-2.5:side===2?r[3]+2.5:side===1?lerp(r[1],r[3],f):lerp(r[3],r[1],f);if(rnd()<.55&&trailD(x,z)>7&&farmD(x,z)>18)plant(pickW(HEDGE,rnd),'tree',x,z,.8+rnd()*.35,rnd);}
    for(let i=0;i<1400;i++){const x=(rnd()-.5)*2*(WORLD-8),z=(rnd()-.5)*2*(WORLD-8),e=Math.max(Math.abs(x),Math.abs(z));
      if(e<PLAY+4&&rnd()>.04)continue;if(trailD(x,z)<8||cropAt(x,z)||farmD(x,z)<22||Math.hypot(x-SPAWN.x,z-SPAWN.z)<14)continue;plant(pickW(e>PLAY?FAR:LONE,rnd),'tree',x,z,.8+rnd()*.4,rnd);}
    for(let i=0;i<22000;i++){const x=(rnd()-.5)*2*(PLAY+14),z=(rnd()-.5)*2*(PLAY+14);if(trailD(x,z)<3||cropAt(x,z)||farmD(x,z)<14)continue;plant(pickW(GRASS,rnd),'grass',x,z,.8+rnd()*.8,rnd);}
    for(let i=0;i<260;i++){const x=(rnd()-.5)*2*PLAY,z=(rnd()-.5)*2*PLAY;if(trailD(x,z)<5||cropAt(x,z)||farmD(x,z)<16)continue;plant(dry?(rnd()<.7?'bush_sage':'bush_pricklypear'):rnd()<.6?'bush_sage':'bush_oleander','bush',x,z,.9+rnd()*.6,rnd);}
    propsAlong(rnd,['prop_mailbox','prop_tires','prop_drum','prop_icechest'],5.8);},
  build(){const rnd=mulberry(91);ribbon(TRAIL,7.5,'62-farm-track',10);
    const F=MAPS.field.farm,y=hgt(F.x,F.z);
    const red=tmat('66-red-barn-siding',{r:.85}),wood=tmat('67-wooden-fence-planks',{r:.9}),roof=tmat('10-corrugated-metal',{col:0x9a3a2e,r:.6,m:.4}),roof2=tmat('10-corrugated-metal',{col:0x7c828a,r:.6,m:.4}),dark=tmat('24-gunmetal',{col:0x55504a});
    /* barn: walls, a gable roof, a big door */
    put(sbox(22,9,14,[[4,4],[4,4],0,0,[4,4],[4,4]]),[red,red,dark,dark,red,red],F.x,y+4.5,F.z);put(gable(15,23.5,6),roof,F.x,y+9,F.z,Math.PI/2);addBox(F.x-11,F.z-7,F.x+11,F.z+7,15);
    put(sbox(6,7,.3),wood,F.x,y+3.5,F.z-7.1);
    /* farmhouse and silo */
    put(sbox(14,6,10,[[4,4],[4,4],0,0,[4,4],[4,4]]),[wood,wood,dark,dark,wood,wood],F.x-26,y+3,F.z+4);put(gable(11,15,4),roof2,F.x-26,y+6,F.z+4,Math.PI/2);addBox(F.x-33,F.z-1,F.x-19,F.z+9,10);
    const silo=tmat('12-rusted-steel-plate',{rep:[4,3],r:.7,m:.5});put(new THREE.CylinderGeometry(3.4,3.4,16,24),silo,F.x+16,y+8,F.z+10);put(new THREE.SphereGeometry(3.5,24,10,0,TAU,0,Math.PI/2),roof2,F.x+16,y+16,F.z+10);addCol(F.x+16,F.z+10,3.5,19);
    /* fences along the track */
    const rail=new THREE.BoxGeometry(.12,.16,1),post=new THREE.BoxGeometry(.22,1.5,.22);
    for(let i=1;i<TRAIL.length-1;i++){const a=TRAIL[i],b=TRAIL[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=Math.atan2(b[0]-a[0],b[1]-a[1]);if(i%2)continue;
      for(const sd of [-1,1]){const ox=Math.cos(ang)*5.2*sd,oz=-Math.sin(ang)*5.2*sd;
        for(let t=0;t<L;t+=4){const x=a[0]+(b[0]-a[0])*t/L+ox,z=a[1]+(b[1]-a[1])*t/L+oz,h0=hgt(x,z);put(post,wood,x,h0+.75,z,ang);
          for(const hh of [.5,1.1]){const m=put(rail,wood,x+(b[0]-a[0])/L*2,h0+hh,z+(b[1]-a[1])/L*2,ang);m.scale.z=4;}}}}
    /* round hay bales */
    const hay=tmat('64-wheat-field',{rep:[3,1],r:.95}),hayEnd=hookWorld(new THREE.MeshStandardMaterial({map:tex('68-round-hay-bale-end'),alphaTest:.4,roughness:.95}));
    const bg=new THREE.CylinderGeometry(1,1,1.4,20,1,false);bg.rotateZ(Math.PI/2);const bales=[];
    for(let i=0;i<44;i++){const r=MAPS.field.crops[i%MAPS.field.crops.length],x=lerp(r[0],r[2],.1+rnd()*.8),z=lerp(r[1],r[3],.1+rnd()*.8);if(r[4]!=='c')continue;
      bales.push(new THREE.Matrix4().compose(V3(x,hgt(x,z)+1,z),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),rnd()*TAU),V3(1,1,1)));addCol(x,z,1.1,2);}
    const bim=new THREE.InstancedMesh(bg,[hay,hayEnd,hayEnd],bales.length);bales.forEach((m,k)=>bim.setMatrixAt(k,m));bim.castShadow=bim.receiveShadow=true;S.add(bim);
    /* radio relay masts: lattice towers with a red light (mission 1 targets) */
    const truss=tmat('74-crane-truss',{alpha:true,ds:true,rep:[4,6],r:.6,m:.5});
    MAPS.field.mastObjs=[];
    for(const [mx,mz] of MAPS.field.masts){const g0=hgt(mx,mz),grp=new THREE.Group();grp.position.set(mx,g0,mz);grp.userData.keep=1;S.add(grp);   /* a pivot at the base so a destroyed mast can topple */
      const tw=new THREE.Mesh(new THREE.CylinderGeometry(.6,1.6,26,4,1,true),truss);tw.position.y=13;tw.rotation.y=Math.PI/4;tw.castShadow=true;grp.add(tw);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.4,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(1,.1,.05).multiplyScalar(4)}));lamp.position.y=26.4;grp.add(lamp);addBox(mx-1.6,mz-1.6,mx+1.6,mz+1.6,26);
      MAPS.field.mastObjs.push({x:mx,z:mz,y:g0,tower:grp,lamp,fall:0});}
  }},
/* ---------------- docks: Harbor 9 at sunset, container stacks, cranes, a ship, warehouses ---------------- */
docks:{name:'DOCKS',mix:'woods',spawn:{x:9,z:88,yaw:0},bounds:{x0:-128,x1:128,z0:-96,z1:96},quay:-100,
  blocksX:[-110,-76,-42,-8,26,60,94],blocksZ:[-80,-56,-32,-8,16,40,64],lanesX:[-93,-59,-25,9,43,77,111],
  trail:[],route:[[9,88],[9,28],[43,28],[43,-44],[-25,-44],[-25,28],[9,28]],
  h(x,z){return z<-100?-7:0;},
  ground:{a:'02-wet-concrete',ar:7,b:'79-dock-lane-markings',br:14,c:'07-harbor-paving',cr:5,rough:.7,
    w(x,z){const lane=Math.max(...MAPS.docks.lanesX.map(c=>smooth(6,4.5,Math.abs(x-c)))),c=smooth(-86,-94,z);return [lane*smooth(90,84,Math.abs(z)),c];}},
  look:{sun:[-.85,.3,-.42],sunCol:0xffb070,sunK:3.4,sky:0xb4a0d2,ground:0x6a5448,hemiK:2.1,zen:0x3a2a6a,hor:0xf0a070,fog:0xc8907e,clouds:.3,
    pano:'80-harbour-sunset-sky',ring:{tex:'33-harbor-skyline',h:60,lift:-8,tint:[.8,.72,.85],copies:3},exp:1.28},
  layout(){},
  build(){const rnd=mulberry(19),Qz=-100;
    /* water and the quay wall */
    const wt=tex('75-harbour-water',{rep:60});const water=new THREE.Mesh(new THREE.PlaneGeometry(700,320),new THREE.MeshStandardMaterial({map:wt,color:0xa8bcc0,roughness:.16,metalness:.3}));
    water.rotation.x=-Math.PI/2;water.position.set(0,-2.6,Qz-160);S.add(water);MAPS.docks.wt=wt;
    put(sbox(470,3.4,1,[0,0,0,0,0,[7,0]]),[tmat('09-blast-wall'),tmat('09-blast-wall'),tmat('07-harbor-paving'),tmat('09-blast-wall'),tmat('09-blast-wall'),tmat('76-quay-edge-with-fenders')],0,-1.7,Qz-.5,0,false);
    /* a moored ship */
    const hull=tmat('77-ship-hull-side',{r:.6,m:.3}),deck=tmat('12-rusted-steel-plate',{rep:[10,2]}),hdark=tmat('24-gunmetal',{col:0x3a2a28});
    put(sbox(190,18,22,[[0,0],[0,0],0,0,[28,0],[28,0]]),[hdark,hdark,deck,hdark,hull,hull],15,0,Qz-24,0,false);
    put(sbox(22,15,18,[[6,6],[6,6],0,0,[6,6],[6,6]]),tmat('14-docks-building-facade'),-66,16.5,Qz-24,0,true);
    /* two ship-to-shore cranes over the quay */
    const truss=tmat('74-crane-truss',{alpha:true,ds:true,r:.55,m:.5});const tb=(w,h,d,x,y,z)=>{const g=sbox(w,h,d,[[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5],[2.5,2.5]]);return put(g,truss,x,y,z);};
    for(const cx of [-59,9,77]){const z1=Qz+10,z2=Qz+1,zm=(z1+z2)/2;for(const lx of [-7,7])for(const lz of [z1,z2]){tb(1.6,32,1.6,cx+lx,16,lz);addBox(cx+lx-1,lz-1,cx+lx+1,lz+1,32);}
      tb(16,2,1.6,cx,31,z1);tb(16,2,1.6,cx,31,z2);tb(1.6,2,10,cx-7,31,zm);tb(1.6,2,10,cx+7,31,zm);
      tb(3,2.4,78,cx,35,Qz-13);put(sbox(7,4.5,9),tmat('12-rusted-steel-plate',{rep:[2,2]}),cx,38,zm);
      put(sbox(3,2.4,3),tmat('24-gunmetal'),cx,32.5,Qz-26);}
    /* container stacks in blocks, lanes between them (each stack is one collider) */
    const L=12.2,H=2.6,W=2.44,cg=new THREE.BoxGeometry(L,H,W),endM=tmat('11-container-door-end',{r:.7,m:.3}),roofM=tmat('73-container-roof',{r:.7,m:.3}),botM=tmat('24-gunmetal');
    const kinds=[tmat('71-red-shipping-container-side',{r:.65,m:.35}),tmat('72-blue-shipping-container-side',{r:.65,m:.35}),tmat('10-corrugated-metal',{col:0x5f8a7a,r:.65,m:.35,rep:[3,1]}),tmat('10-corrugated-metal',{col:0xc8a040,r:.65,m:.35,rep:[3,1]})];
    const lists=kinds.map(()=>[]);
    for(const bx of MAPS.docks.blocksX)for(const bz of MAPS.docks.blocksZ){if(MISSION&&MISSION.yard&&Math.abs(bx)<50&&bz>-70&&bz<30)continue;   /* mission 11 clears a crane yard in the middle */
      if(Math.hypot(bx-SPAWN.x,bz-SPAWN.z)<18)continue;
      for(let ix=0;ix<2;ix++)for(let iz=0;iz<3;iz++){if(rnd()<.12)continue;const x=bx-L/2+ix*L+(ix?.15:-.15),z=bz-W+iz*W*1.02,n=1+(rnd()*3|0);
        for(let k=0;k<n;k++)lists[rnd()*4|0].push([x,H/2+k*H,z,rnd()<.5?0:Math.PI]);addBox(x-L/2,z-W/2,x+L/2,z+W/2,n*H,0);}}
    kinds.forEach((m,i)=>{const l=lists[i];if(!l.length)return;const im=new THREE.InstancedMesh(cg,[endM,endM,roofM,botM,m,m],l.length);const t=new THREE.Matrix4();
      l.forEach((p,k)=>{t.compose(V3(p[0],p[1],p[2]),new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),p[3]),V3(1,1,1));im.setMatrixAt(k,t);});im.castShadow=im.receiveShadow=true;S.add(im);});
    /* warehouses along the back, the HARBOR 9 neon and a Hyperdot billboard */
    const clad=tmat('10-corrugated-metal',{col:0x8a9096,rep:[1,1]}),door=tmat('78-warehouse-roller-door',{r:.7,m:.3}),gravel=tmat('15-roof-gravel');
    for(const wx of [-104,-52,0,52,104]){put(sbox(34,12,18,[[4,4],[4,4],[6,6],0,[4,4],[34/3,0]]),[clad,clad,gravel,gravel,clad,door],wx,6,108);addBox(wx-17,99,wx+17,117,12,0);}
    const neon=new THREE.Mesh(new THREE.PlaneGeometry(11,5.5),new THREE.MeshBasicMaterial({map:tex('44-neon-sign-harbor-9'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(2,2,2)}));
    neon.position.set(0,13.6,98.9);neon.rotation.y=Math.PI;S.add(neon);
    const bb=new THREE.Mesh(new THREE.PlaneGeometry(9,9),tmat('46-hyperdot-arcade-billboard',{r:.5}));bb.position.set(121.1,7,108);bb.rotation.y=Math.PI/2;S.add(bb);
    /* lamp posts and bollards */
    const pole=tmat('24-gunmetal'),lampM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.85,.55).multiplyScalar(3)});
    const night=MISSION&&MISSION.look&&MISSION.look.night;if(night)lampM.color.multiplyScalar(2.2);
    const pool=night?poolTex():null;
    for(const x of MAPS.docks.lanesX)for(const z of [-88,-20,52,84]){put(new THREE.CylinderGeometry(.18,.25,13,8),pole,x+3.6,6.5,z);put(new THREE.BoxGeometry(1.6,.3,.7),lampM,x+3.6,13,z);addCol(x+3.6,z,.4,13);
      if(night){const g=new THREE.PlaneGeometry(22,22);g.rotateX(-Math.PI/2);g.translate(x+3.6,.06,z);(MAPS.docks._pools=MAPS.docks._pools||[]).push(g);}}
    if(night&&MAPS.docks._pools){const p=new THREE.Mesh(THREE.mergeGeometries(MAPS.docks._pools),new THREE.MeshBasicMaterial({map:pool,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.78,.45).multiplyScalar(.55)}));
      p.renderOrder=2;p.userData.keep=1;p.frustumCulled=false;S.add(p);}
    for(let x=-124;x<=124;x+=9.5)put(new THREE.CylinderGeometry(.35,.42,.8,10),pole,x,.4,Qz+1.2);
  },
  tick(dt){if(MAPS.docks.wt){MAPS.docks.wt.offset.x+=dt*.004;MAPS.docks.wt.offset.y+=dt*.0025;}}},
};
/* mossy boulders for the woods: lumpy rocks with a collider */
function boulders(n,rnd){const m=tmat('83-mossy-boulder-rock',{rep:[2,2],r:.95,m:0});
  for(let i=0;i<n;i++){let x,z,k=0;do{x=(rnd()-.5)*2*(PLAY-8);z=(rnd()-.5)*2*(PLAY-8);k++;}while((trailD(x,z)<8||Math.hypot(x-SPAWN.x,z-SPAWN.z)<15)&&k<20);
    const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position,r=1.6+rnd()*2.6;
    for(let j=0;j<p.count;j++){const vx=p.getX(j),vy=p.getY(j),vz=p.getZ(j),f=1+(fbm(vx*1.7+i*3,vz*1.7+vy*1.3,3)-.5)*.7;p.setXYZ(j,vx*f*r,vy*f*r*.62,vz*f*r*(.8+rnd()*.1));}
    g.computeVertexNormals();put(g,m,x,hgt(x,z)+r*.15,z,rnd()*TAU);addCol(x,z,r*.85,r*1.1);}}
/* a soft round glow for fake lamp light on the ground at night */
function poolTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const BND=()=>MAPDEF.bounds||{x0:-PLAY-6,x1:PLAY+6,z0:-PLAY-6,z1:PLAY+6};
function boxAt(x,z,y){const a=VEG.cols.get(colKey(x,z));if(!a)return false;for(const c of a)if(c.b&&x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1&&y<c.y0+c.h)return true;return false;}
/* after a map is built, join its fixed single-material meshes into one mesh per material (fences, posts, crane beams, lamps...) */
/* a vertex range of a non-indexed geometry, as its own geometry (one material's part of a many-material mesh) */
function geoRange(g,start,count){const out=new THREE.BufferGeometry(),e=Math.min(g.attributes.position.count,start+count);
  for(const k in g.attributes){const a=g.attributes[k],s=a.itemSize;out.setAttribute(k,new THREE.BufferAttribute(a.array.slice(start*s,e*s),s));}return out;}
function mergeStatic(before){
  const by=new Map();
  for(const o of S.children.slice()){if(before.has(o)||!o.isMesh||o.isInstancedMesh||o.userData.keep)continue;
    const multi=Array.isArray(o.material),mats=multi?o.material:[o.material];   /* IH4: buildings with a roof and walls (several materials) merge too */
    if(mats.some(m=>m.transparent&&!m.alphaTest)||multi&&!o.geometry.groups.length)continue;
    o.updateMatrixWorld(true);let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
    if(!g.attributes.uv||!g.attributes.normal||Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute))continue;
    const parts=multi?g.groups.map(q=>[mats[q.materialIndex],geoRange(g,q.start,q.count)]):[[o.material,g]];
    for(const [m,pg] of parts){if(!m||!pg.attributes.position.count)continue;const key=m.uuid+(o.castShadow?'|c':'');   /* shadow casters and the rest stay apart */
      if(!by.has(key))by.set(key,{m,gs:[],cast:o.castShadow});by.get(key).gs.push(pg);}S.remove(o);}
  let n=0;for(const [,v] of by){const mm=new THREE.Mesh(THREE.mergeGeometries(v.gs,false),v.m);mm.castShadow=v.cast;mm.receiveShadow=true;S.add(mm);n+=v.gs.length;}
  return n;}

/* ---- 04c_foundry.js ---- */
/* ---------------- Foundry 4: FORGE's yard at night. Blast walls, yard buildings, furnace stacks, molten channels, the FOUNDRY 4 neon ----------------
   The FORGE platform sits at FORGE_AT; its collider is added here so path-finding knows about it before the boss model arrives. */
const FORGE_AT={x:0,z:-58};
MAPS.foundry={name:'FOUNDRY 4',mix:'woods',spawn:{x:0,z:100,yaw:0},bounds:{x0:-108,x1:108,z0:-96,z1:108},
  trail:[[0,112],[0,70],[0,30],[0,-20],[0,-40]],route:[[0,100],[0,46],[42,20],[42,-20],[-42,-20],[-42,20],[0,46]],clear:[],
  h(x,z){return (fbm(x*.02+4,z*.02-2,2)-.5)*.5;},
  ground:{a:'01-yard-concrete',ar:8,b:'15-roof-gravel',br:5,c:'03-asphalt',cr:9,rough:.8,
    w(x,z){const patch=smooth(.52,.66,fbm(x*.03+9,z*.03,3));return [patch*.8,smooth(9,6,Math.abs(x))*smooth(-44,-36,z)];}},
  look:{sun:[-.25,.5,.6],sunCol:0xff9a5a,sunK:1.1,sky:0x6a4a44,ground:0x2a1a14,hemiK:1.8,zen:0x07060a,hor:0x3a2220,fog:0x2a1612,clouds:.1,
    pano:'30-yard-night-sky',panoK:.85,ring:{tex:'32-industrial-skyline',h:70,lift:-6,tint:[.9,.7,.6],copies:3},exp:1.65,night:true,fogFar:190},
  layout(){},
  build(){const rnd=mulberry(404),B=MAPS.foundry.bounds;
    const wallM=tmat('09-blast-wall',{r:.85,m:.1}),facM=tmat('13-yard-building-facade',{r:.8,m:.1}),roofM=tmat('15-roof-gravel'),barM=tmat('17-concrete-barrier',{r:.85,m:0});
    const crateM=tmat('16-wooden-crate'),drumR=tmat('18-red-drum-label',{r:.5,m:.4}),drumB=tmat('19-blue-drum-label',{r:.5,m:.4}),gm=tmat('24-gunmetal'),plate=tmat('04-steel-tread-plate',{r:.5,m:.6});
    const hazard=tmat('26-hazard-trim'),grate=tmat('05-floor-grating',{alpha:true,ds:true});
    /* perimeter blast walls (9 m), with the south gate open behind the spawn */
    const wall=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),g=sbox(L,9,2.4,[[6,9],[6,9],[6,2.4],[6,2.4],[6,9],[6,9]]);const m=put(g,wallM,(x0+x1)/2,4.5,(z0+z1)/2,Math.atan2(-(z1-z0),x1-x0));
      addBox(Math.min(x0,x1)-1.3,Math.min(z0,z1)-1.3,Math.max(x0,x1)+1.3,Math.max(z0,z1)+1.3,9);return m;};
    const X=B.x1+3,Z0=B.z0-3,Z1=B.z1+3;wall(-X,Z0,X,Z0);wall(-X,Z0,-X,Z1);wall(X,Z0,X,Z1);wall(-X,Z1,-14,Z1);wall(14,Z1,X,Z1);
    for(const sx of [-1,1]){put(new THREE.BoxGeometry(3.4,12,3.4),gm,sx*15.5,6,Z1);put(new THREE.BoxGeometry(3.6,.5,3.6),hazard,sx*15.5,12.2,Z1);}
    /* yard buildings outside the walls, so the skyline is close and tall */
    const bld=(x,z,w,d,h)=>{put(sbox(w,h,d,[[12,10],[12,10],[0,0],[0,0],[12,10],[12,10]]),[facM,facM,roofM,roofM,facM,facM],x,h/2,z,0,false);};
    for(let x=-120;x<=120;x+=30)bld(x+rnd()*6,Z0-14-rnd()*6,22+rnd()*8,20,18+rnd()*14);
    for(let z=-80;z<=100;z+=30){bld(X+14+rnd()*5,z,20,22+rnd()*6,16+rnd()*12);bld(-X-14-rnd()*5,z,20,22+rnd()*6,16+rnd()*12);}
    /* the main hall behind FORGE with the FOUNDRY 4 neon */
    put(sbox(70,26,14,[[12,10],[12,10],[0,0],[0,0],[12,10],[12,10]]),[facM,facM,roofM,roofM,facM,facM],FORGE_AT.x,13,Z0-8,0,false);
    const neon=new THREE.Mesh(new THREE.PlaneGeometry(16,8),new THREE.MeshBasicMaterial({map:tex('45-neon-sign-foundry-4'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(2.2,2.2,2.2)}));
    neon.position.set(FORGE_AT.x,21,Z0-.9);S.add(neon);
    /* FORGE's platform: steel deck with hazard edge, and its collider */
    const fx=FORGE_AT.x,fz=FORGE_AT.z;put(new THREE.BoxGeometry(34,.5,28),plate,fx,.25,fz,0,false);
    for(const [w,d,x,z] of [[34,.6,fx,fz+14],[34,.6,fx,fz-14],[.6,28,fx+17,fz],[.6,28,fx-17,fz]])put(new THREE.BoxGeometry(w,.55,d),hazard,x,.3,z,0,false);
    addBox(fx-12.5,fz-9.5,fx+12.5,fz+9.5,16);
    /* molten channels across the yard: glowing strips in steel troughs */
    const melt=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.32,.06).multiplyScalar(1.4)});MAPS.foundry.melt=melt;
    for(const z of [-18,34]){for(const sx of [-1,1]){const x0=sx*16,x1=sx*96,cx=(x0+x1)/2,L=Math.abs(x1-x0);
      put(new THREE.BoxGeometry(L,.35,3.2),gm,cx,.12,z,0,false);put(new THREE.BoxGeometry(L,.1,2.2),melt,cx,.3,z,0,false);}}
    /* furnace stacks with glowing mouths (smoke comes from tick) */
    const stacks=[[-70,-70],[70,-70],[-88,10],[88,10],[-60,70],[60,70]];MAPS.foundry.stacks=stacks;
    for(const [x,z] of stacks){put(new THREE.CylinderGeometry(3.2,4.2,22,16),gm,x,11,z);put(new THREE.CylinderGeometry(3.4,3.4,1.2,16),hazard,x,4,z);
      put(new THREE.BoxGeometry(2.4,2.4,.4),melt,x,2.2,z+4.05,0,false);addCol(x,z,4.4,22);}
    /* cover: concrete barriers, crate stacks, drums, steel grating catwalks */
    const bar=new THREE.BoxGeometry(6,2.2,1.2);
    for(let i=0;i<34;i++){let x,z,k=0;do{x=(rnd()-.5)*190;z=-70+rnd()*165;k++;}while((Math.abs(x)<20&&z>-80&&z<112||Math.hypot(x-fx,z-fz)<36||Math.abs(z+18)<4||Math.abs(z-34)<4)&&k<30);
      const a=rnd()<.5?0:Math.PI/2;put(bar,barM,x,1.1,z,a);const hx=a?.6:3,hz=a?3:.6;addBox(x-hx,z-hz,x+hx,z+hz,2.2);}
    const crate=new THREE.BoxGeometry(2.4,2.4,2.4),drum=new THREE.CylinderGeometry(.6,.6,1.8,12);
    for(let i=0;i<16;i++){const x=(rnd()-.5)*180,z=-60+rnd()*150;if(Math.abs(x)<18||Math.hypot(x-fx,z-fz)<36||Math.abs(z+18)<5||Math.abs(z-34)<5)continue;
      const n=1+Math.floor(rnd()*3);for(let j=0;j<n;j++)put(crate,crateM,x+(j%2)*2.5,1.2+Math.floor(j/2)*2.4,z,rnd()*.3);addBox(x-1.3,z-1.3,x+3.8,z+1.3,2.4*Math.ceil(n/2));
      for(let j=0;j<3;j++)put(drum,rnd()<.5?drumR:drumB,x-2+j*.3,.9,z+2.2+j*1.3);}
    for(const sx of [-1,1]){const g=new THREE.BoxGeometry(4,.2,60);put(g,grate,sx*60,6,-40,0,false);for(const z of [-68,-40,-12])for(const d of [-1.6,1.6])put(new THREE.BoxGeometry(.3,6,.3),gm,sx*60+d,3,z);}
    /* lamp posts with light pools */
    const lampM=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.7,.4).multiplyScalar(5)}),pools=[];
    for(const x of [-80,-40,40,80])for(const z of [-40,10,60,96]){put(new THREE.CylinderGeometry(.2,.28,12,8),gm,x,6,z);put(new THREE.BoxGeometry(1.6,.3,.7),lampM,x,12,z);addCol(x,z,.4,12);
      const g=new THREE.PlaneGeometry(24,24);g.rotateX(-Math.PI/2);g.translate(x,.07,z);pools.push(g);}
    const p=new THREE.Mesh(THREE.mergeGeometries(pools),new THREE.MeshBasicMaterial({map:poolTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.65,.35).multiplyScalar(.6)}));
    p.renderOrder=2;p.userData.keep=1;p.frustumCulled=false;S.add(p);
    const glow=[];for(const z of [-18,34])for(const sx of [-1,1]){const g=new THREE.PlaneGeometry(82,14);g.rotateX(-Math.PI/2);g.translate(sx*56,.08,z);glow.push(g);}
    const gp=new THREE.Mesh(THREE.mergeGeometries(glow),new THREE.MeshBasicMaterial({map:poolTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:new THREE.Color(1,.35,.08).multiplyScalar(.5)}));
    gp.renderOrder=2;gp.userData.keep=1;gp.frustumCulled=false;S.add(gp);
  },
  tick(dt){const F=MAPS.foundry;F.t=(F.t||0)+dt;if(F.melt)F.melt.color.setRGB(1,.32,.06).multiplyScalar(1.3+Math.sin(F.t*1.7)*.2);
    if(F.stacks&&Math.random()<dt*6){const s=F.stacks[(Math.random()*F.stacks.length)|0];part({x:s[0]+(Math.random()-.5)*2,y:23,z:s[1]+(Math.random()-.5)*2,vx:1.5,vy:3.5,vz:.5,life:4,s0:4,s1:11,a:.45,col:[.16,.13,.12]});
      if(Math.random()<.4)part({x:s[0],y:22.5,z:s[1],vx:0,vy:4,vz:0,life:.6,s0:3,s1:1,a:1.2,col:[1,.45,.12],glow:true});}}};

/* ---- 04d_props.js ---- */
/* ===================== detail pass 3: set dressing. Small things you walk through (the mech steps over them), so paths and
   path-finding stay exactly the same: pebbles, logs, stumps, debris, pallets, cones, drums, puddles that mirror the sky, cracks and oil stains.
   Each kind is one instanced mesh, so a whole map's clutter costs about 10-16 draw calls. ===================== */
function rockGeo(r,seed){const g=new THREE.DodecahedronGeometry(r,1),p=g.attributes.position,rnd=mulberry(seed);
  for(let i=0;i<p.count;i++){const k=.78+rnd()*.4;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.7,p.getZ(i)*k);}g.computeVertexNormals();return g;}
/* place n copies where fn(rnd) says (returns [x,z] or null), avoiding walls, trunks and the spawn */
function scatter(geo,mat,n,fn,o={}){const rnd=mulberry(o.seed||17),im=new THREE.InstancedMesh(geo,mat,n);let k=0;
  for(let t=0;t<n*6&&k<n;t++){const q=fn(rnd);if(!q)continue;const [x,z]=q;if(treeAt(x,z,.5)||Math.hypot(x-SPAWN.x,z-SPAWN.z)<(o.clear||8))continue;
    const s=(o.s0||1)+rnd()*((o.s1||1)-(o.s0||1)),y=hgt(x,z)+(o.y||0)*s;
    _m4.compose(_w.set(x,y,z),_q.setFromEuler(new THREE.Euler(o.tilt?(rnd()-.5)*o.tilt:0,rnd()*TAU,o.tilt?(rnd()-.5)*o.tilt:0)),_v.set(s,s*(o.sy||1),s));im.setMatrixAt(k++,_m4);}
  im.count=k;im.castShadow=o.shadow!==false;im.receiveShadow=true;S.add(im);return im;}
const inPlay=(rnd,m)=>{const e=PLAY-(m||6);return [(rnd()-.5)*2*e,(rnd()-.5)*2*e];};
const inBounds=(rnd,m)=>{const B=BND(),k=m||4;return [B.x0+k+rnd()*(B.x1-B.x0-2*k),B.z0+k+rnd()*(B.z1-B.z0-2*k)];};
/* flat decals scattered on the ground (cracks, oil, leaves) */
function groundDecals(texName,n,fn,size,o={}){const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const m=new THREE.MeshStandardMaterial({map:tex(texName,{clamp:true}),transparent:true,depthWrite:false,roughness:o.r||.9,metalness:0,color:o.col||0xffffff,opacity:o.a||1,
    polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const im=scatter(g,m,n,fn,{s0:size[0],s1:size[1],y:0,shadow:false,seed:o.seed||23,clear:2});im.position.y=.04;im.renderOrder=1;return im;}
/* puddles: a soft blob mask on a dark glossy surface that picks up the sky reflections */
let PUDDLE_TEX=null;
function puddleTex(){if(PUDDLE_TEX)return PUDDLE_TEX;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const rnd=mulberry(5);g.fillStyle='#000';g.fillRect(0,0,256,256);g.filter='blur(10px)';g.fillStyle='#fff';
  for(let i=0;i<9;i++){g.beginPath();g.ellipse(128+(rnd()-.5)*110,128+(rnd()-.5)*110,30+rnd()*45,20+rnd()*30,rnd()*3,0,TAU);g.fill();}
  PUDDLE_TEX=new THREE.CanvasTexture(c);return PUDDLE_TEX;}
function puddles(n,fn,size,o={}){const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
  const m=new THREE.MeshStandardMaterial({color:o.col||0x0c1014,roughness:.06,metalness:.2,envMap:ENV,envMapIntensity:o.k||1.3,alphaMap:puddleTex(),transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const im=scatter(g,m,n,fn,{s0:size[0],s1:size[1],shadow:false,seed:o.seed||31,clear:3});im.position.y=.05;im.renderOrder=1;return im;}
/* ---------------- per map ---------------- */
MAPS.woods.dress=function(){
  const rock=tmat('83-mossy-boulder-rock',{r:.95,m:0}),bark=new THREE.MeshStandardMaterial({color:0x4a3c30,roughness:.95,normalMap:nmap('83-mossy-boulder-rock'),normalScale:new THREE.Vector2(1.4,1.4)});
  scatter(rockGeo(.35,3),rock,900,r=>inPlay(r),{s0:.5,s1:1.6,y:.1,seed:41,shadow:false});                     // pebbles and stones (no shadow: 130,000 triangles drawn again for a shadow you can't see)
  const log=new THREE.CylinderGeometry(.42,.48,1,10);log.rotateZ(Math.PI/2);
  scatter(log,bark,90,r=>{const q=inPlay(r);return clearD(q[0],q[1])>4&&trailD(q[0],q[1])>5?q:null;},{s0:4,s1:8,sy:.12,y:.05,seed:43,n2:1,shadow:false});   // fallen logs
  scatter(new THREE.CylinderGeometry(.5,.65,1,10),bark,150,r=>inPlay(r),{s0:.8,s1:1.3,y:.5,sy:.7,seed:47,shadow:false});          // stumps
  groundDecals('40-scorch-mark',120,r=>inPlay(r),[2,4.5],{col:0x3a3020,a:.55,seed:49});                                   // dark leaf litter patches
};
MAPS.field.dress=function(){
  const rock=tmat('83-mossy-boulder-rock',{r:.95,m:0,col:0xb8b0a0}),wood=tmat('16-wooden-crate'),gm=tmat('24-gunmetal'),drum=tmat('18-red-drum-label',{r:.5,m:.4});
  scatter(rockGeo(.4,7),rock,700,r=>inPlay(r),{s0:.4,s1:1.5,y:.1,seed:51,shadow:false});
  const F=MAPS.field.farm;
  scatter(new THREE.BoxGeometry(1.2,.16,1.2),wood,26,r=>[F.x+(r()-.5)*40,F.z+(r()-.5)*36],{s0:1,s1:1.2,y:.08,seed:53});            // pallets by the farm
  scatter(new THREE.CylinderGeometry(.45,.45,1.3,12),drum,18,r=>[F.x+(r()-.5)*44,F.z+(r()-.5)*40],{s0:1,s1:1,y:.65,seed:55});        // drums
  scatter(new THREE.BoxGeometry(.18,1.2,.18),wood,60,r=>{const q=inPlay(r);return trailD(q[0],q[1])<9&&trailD(q[0],q[1])>5?q:null;},{s0:.8,s1:1.2,y:.4,tilt:.5,seed:57});  // old leaning posts
  scatter(new THREE.BoxGeometry(.9,.25,.6),gm,70,r=>inPlay(r),{s0:.6,s1:1.4,y:.1,tilt:.4,seed:59});                                     // rusted scrap
  if(LOOKNOW&&LOOKNOW.rain)puddles(40,r=>{const q=inPlay(r);return trailD(q[0],q[1])<4?q:null;},[2,5]);
  else puddles(10,r=>{const q=inPlay(r);return trailD(q[0],q[1])<3?q:null;},[1.5,3],{k:1});
};
MAPS.docks.dress=function(){
  const D=MAPS.docks,lane=r=>{const x=D.lanesX[(r()*D.lanesX.length)|0]+(r()-.5)*9,z=D.bounds.z0+4+r()*(D.bounds.z1-D.bounds.z0-8);return [x,z];};
  const wet=LOOKNOW&&(LOOKNOW.rain||LOOKNOW.night);
  puddles(wet?170:110,r=>lane(r),[3,8],{k:wet?1.7:1.4});
  groundDecals('41-impact-cracks',170,r=>lane(r),[1.5,4.5],{col:0x6a6a6a,a:.8,seed:61});
  groundDecals('40-scorch-mark',110,r=>lane(r),[1.5,4],{col:0x151515,a:.7,seed:63});                                  // oil stains
  const wood=tmat('16-wooden-crate'),haz=tmat('26-hazard-trim',{r:.6}),drumR=tmat('18-red-drum-label',{r:.5,m:.4}),drumB=tmat('19-blue-drum-label',{r:.5,m:.4});
  const edge=r=>{const x=D.lanesX[(r()*D.lanesX.length)|0]+(r()<.5?-1:1)*(5.5+r()*1.2),z=D.bounds.z0+4+r()*(D.bounds.z1-D.bounds.z0-8);return [x,z];};
  scatter(new THREE.BoxGeometry(1.2,.16,1.2),wood,140,edge,{s0:1,s1:1,y:.08,seed:65});
  scatter(new THREE.BoxGeometry(1.2,.9,1.2),wood,70,edge,{s0:.9,s1:1.1,y:.45,seed:66});
  scatter(new THREE.ConeGeometry(.28,.8,10),haz,110,edge,{s0:1,s1:1,y:.4,seed:67});                                       // traffic cones
  scatter(new THREE.CylinderGeometry(.45,.45,1.3,12),drumR,70,edge,{s0:1,s1:1,y:.65,seed:68});
  scatter(new THREE.CylinderGeometry(.45,.45,1.3,12),drumB,70,edge,{s0:1,s1:1,y:.65,seed:69});
  scatter(new THREE.TorusGeometry(.5,.14,8,16).rotateX(Math.PI/2),tmat('57-rubber-and-cables'),60,edge,{s0:1,s1:1.3,y:.14,seed:70});   // coiled hoses
};
MAPS.foundry.dress=function(){
  const B=MAPS.foundry.bounds,yard=r=>{const q=inBounds(r,6);return Math.hypot(q[0]-FORGE_AT.x,q[1]-FORGE_AT.z)>30?q:null;};
  puddles(120,yard,[3,8],{col:0x080808,k:1.6});
  groundDecals('41-impact-cracks',160,yard,[1.5,4.5],{col:0x5a5a5a,a:.85,seed:71});
  groundDecals('40-scorch-mark',110,yard,[2,5],{col:0x0a0a0a,a:.8,seed:72});
  groundDecals('08-painted-hazard-floor',12,yard,[3,5],{col:0x9a9a9a,a:.9,seed:73});
  const gm=tmat('24-gunmetal'),rust=tmat('12-rusted-steel-plate'),haz=tmat('26-hazard-trim',{r:.6});
  scatter(new THREE.BoxGeometry(1,.4,.7),rust,200,yard,{s0:.5,s1:1.6,y:.15,tilt:.6,seed:74});                             // scrap plates
  scatter(new THREE.CylinderGeometry(.25,.25,3,10).rotateZ(Math.PI/2),gm,80,yard,{s0:.8,s1:1.4,y:.25,seed:75});          // loose pipes
  scatter(new THREE.ConeGeometry(.28,.8,10),haz,30,yard,{s0:1,s1:1,y:.4,seed:76});
};

/* ---- 05_mech_common.js ---- */
/* ===================== shared mech pieces from Ironhowl 3 (materials, part merging, leg IK) used by the FORGE machines.
   Ironhowl 4's player mech is the Wraith: 05_wraith.js. Below, Ironhowl 3's notes on Howler 07 (models/mech/howler07.glb, built in Blender: v2/src/ironhowl3/blender) =====================
   The model's empties are the joints: hips/thigh/knee/ankle (legs), torso, head, arm/gun/brl (guns), tier1..4 (barrel sets), muzzle, pod_*_mz, jet.
   Legs are dog-like with three parts: thigh (knee forward), shin back to the hock, then the long foot bone down to the clawed foot.
   Shading is baked into the vertex colours. */
const MT={};
function mechMats(){
  const k=(a,w)=>{a.vertexColors=true;return hookWorld(a,{wear:w});};
  MT.org=k(new THREE.MeshStandardMaterial({map:tex('22-howler-armour'),normalMap:nmap('22-howler-armour'),normalScale:new THREE.Vector2(nmapK('22-howler-armour'),nmapK('22-howler-armour')),roughness:.46,metalness:.35}),1);
  MT.grey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),normalMap:nmap('23-grey-armour'),normalScale:new THREE.Vector2(nmapK('23-grey-armour'),nmapK('23-grey-armour')),roughness:.5,metalness:.45}),1);
  MT.gun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),normalMap:nmap('24-gunmetal'),normalScale:new THREE.Vector2(nmapK('24-gunmetal'),nmapK('24-gunmetal')),color:0xb4bac4,roughness:.44,metalness:.72}));
  MT.steel=k(new THREE.MeshStandardMaterial({map:tex('25-brushed-steel'),normalMap:nmap('25-brushed-steel'),normalScale:new THREE.Vector2(.6,.6),roughness:.28,metalness:.92}));
  MT.trim=k(new THREE.MeshStandardMaterial({map:tex('26-hazard-trim'),roughness:.6,metalness:.2}),1);
  MT.dark=k(new THREE.MeshStandardMaterial({color:0x1a1c20,roughness:.68,metalness:.55}));
  MT.glass=k(new THREE.MeshStandardMaterial({color:0x0a0e14,roughness:.12,metalness:.6}));
  MT.glow=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.5,.12).multiplyScalar(2.6)});
  MT.eye=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.72,.3).multiplyScalar(3.2)});
  MT.decal=hookWorld(new THREE.MeshStandardMaterial({map:tex('28-howler-decals',{clamp:true,glb:true}),transparent:true,alphaTest:.3,roughness:.6,metalness:.1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));   /* no baked shading: it sits flat on the armour and would bake black */
  MT.flame=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.46,.16).multiplyScalar(1.25),transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
  MT.flame2=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.7,1).multiplyScalar(1.5),transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
}
const MECH_MAT={org:'org',grey:'grey',gun:'gun',steel:'steel',trim:'trim',dark:'dark',glass:'glass',eye:'eye',jetcore:'glow',decal:'decal'};
/* join the fixed pieces under each joint into one mesh per material (about 170 pieces become about 60) */
function mergeParts(root,keep){
  const holders=new Set();root.traverse(o=>{if(o.isMesh&&o.parent&&!(keep&&keep(o)))holders.add(o.parent);});
  for(const g of holders){const by=new Map();
    for(const m of g.children.slice()){if(!m.isMesh||(keep&&keep(m))||m.children.length)continue;m.updateMatrix();
      let geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
      for(const k of Object.keys(geo.attributes))if(!['position','normal','uv','color'].includes(k))geo.deleteAttribute(k);
      if(!geo.attributes.color){const c=new Float32Array(geo.attributes.position.count*4).fill(1);geo.setAttribute('color',new THREE.BufferAttribute(c,4));}
      if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
      const key=m.material;if(!by.has(key))by.set(key,{geos:[],cast:m.castShadow});by.get(key).geos.push(geo);g.remove(m);}
    for(const [mat,v] of by){const ok=v.geos.every(q=>q.attributes.color.itemSize===v.geos[0].attributes.color.itemSize);
      if(!ok)v.geos.forEach(q=>{if(q.attributes.color.itemSize===3){const a=q.attributes.color.array,b=new Float32Array(a.length/3*4);for(let i=0;i<a.length/3;i++){b[i*4]=a[i*3];b[i*4+1]=a[i*3+1];b[i*4+2]=a[i*3+2];b[i*4+3]=1;}q.setAttribute('color',new THREE.BufferAttribute(b,4));}});
      const mm=new THREE.Mesh(THREE.mergeGeometries(v.geos,false),mat);mm.castShadow=v.cast;mm.receiveShadow=true;g.add(mm);}
  }
}
const HIP=3.2,L1=1.05,L2=1.0,L3=.9,ANK=.36,PHI=.26,HIPDROP=.05;
/* 2-bone leg IK in the leg's side view: target (ty,tz) is the ankle relative to the hip. rev: knee bends backwards */
function legIK(L,ty,tz,footPitch,l1,l2,rev){
  l1=l1||L1;l2=l2||L2;let d=Math.hypot(ty,tz);d=clamp(d,.3,l1+l2-.002);
  const th=Math.atan2(-tz,-ty),al=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),ga=Math.acos(clamp((l1*l1+l2*l2-d*d)/(2*l1*l2),-1,1));
  const t1=rev?th-al:th+al,k=rev?Math.PI-ga:-(Math.PI-ga);
  L.thigh.rotation.x=t1;L.knee.rotation.x=k;L.ankle.rotation.x=-(t1+k)+(footPitch||0);
}
/* the mech's legs: the foot bone keeps a fixed forward lean (PHI), so place the hock behind and above the ankle, then solve hip->hock */
function legIK3(L,ty,tz,footPitch,phi){
  phi=phi==null?PHI:phi;const hy=ty+L3*Math.cos(phi),hz=tz+L3*Math.sin(phi);
  legIK(L,hy,hz,0,L1,L2,false);const a=L.thigh.rotation.x+L.knee.rotation.x;
  L.hock.rotation.x=phi-a;L.ankle.rotation.x=-phi+(footPitch||0);
}

/* ---- 05_wraith.js ---- */
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
function loadout(){let s={};try{s=(SAVE.get().loadout)||{};}catch(e){}const L=Object.assign({},LOAD_DEF,s);
  /* kit not yet opened by your pilot level (06m_pilot.js): arms fall back to the autocannon, the rest to empty */
  if(typeof kitOpen==='function')for(const k of SLOTS)if(L[k]&&!kitOpen(L[k]))L[k]=k.startsWith('fa')?'ac':null;return L;}
function hasKit(id){const L=loadout();return SLOTS.some(k=>L[k]===id);}
function kitStem(id,slot){const k=KIT[id];return k.stem||(slot&&slot.endsWith('_R')?k.R:k.L);}
/* files: combat model and its maps, or the full model and its print */
function kitFiles(dir,stem,full,orm){const b=IH4M+dir+'/'+stem;
  return full?{glb:b+'_full.glb',map:b+'_full_print.webp'}:{glb:b+'_combat.glb',map:b+'_combat_albedo.webp',nrm:b+'_combat_normal.webp',orm:IH4M+dir+'/'+(orm||stem+'_combat_orm')+'.webp'};}
const GLBC={},GLBP={},KMAT={};   /* GLBP[url]: told how far a model's download has got (0..1) */
function loadGLB(url,lm){if(!GLBC[url])GLBC[url]=new Promise((res,rej)=>new THREE.GLTFLoader(lm||LM).load(url,g=>res(g.scene),ev=>{const f=GLBP[url];if(f&&ev&&ev.total)f(ev.loaded/ev.total);},rej)).catch(e=>{delete GLBC[url];throw e;});   /* a failed load can be tried again */
  return GLBC[url].then(sc=>sc.clone(true));}
/* textures by file: the field, the bay, the brief and the book share one copy, and the ORM map (roughness + metalness) loads once */
const TEXC={};
function k4tex(url,lin){const key=url+(lin?'|lin':'');if(TEXC[key])return TEXC[key];const t=new THREE.TextureLoader(LM).load(url);t.flipY=false;t.colorSpace=lin?THREE.NoColorSpace:THREE.SRGBColorSpace;t.anisotropy=4;return TEXC[key]=t;}
function k4lin(url){return k4tex(url,true);}
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
function refitModel(W,L,full,world,lm){const gen=W.gen=(W.gen||0)+1;   /* a newer refit wins: pieces an older one loads late are dropped */
  for(const s in W.holds){const h=W.holds[s];if(h&&h.parent)h.parent.remove(h);}W.holds={};W.kit={};
  const jobs=SLOTS.filter(s=>s!=='drone'&&L[s]&&KIT[L[s]]).map(s=>{const id=L[s],k=KIT[id],stem=kitStem(id,s),f=kitFiles(k.dir,stem,full,k.orm);
    return loadGLB(f.glb,lm).then(sc=>{if(W.gen!==gen)return;dressModel(sc,kitMat(f,world));W.holds[s]=onMount(W.J[s],sc);W.kit[s]=id;});});
  return Promise.all(jobs).then(()=>{   /* the drone docks on the jet pack */
    if(W.gen===gen&&L.drone==='drone'&&W.holds.bk){const dock=W.holds.bk.getObjectByName('drone_dock');const k=KIT.drone,f=kitFiles(k.dir,k.stem,full);
      if(dock)return loadGLB(f.glb,lm).then(sc=>{if(W.gen!==gen)return;dressModel(sc,kitMat(f,world));W.holds.drone=onMount(dock,sc);W.kit.drone='drone';});}});}

/* ---------------- the Wraith in the field ---------------- */
function buildMech(){
  mechMats();   /* Ironhowl 3's materials: the FORGE machines still use them */
  const M={root:new THREE.Group(),ready:false,phase:0,lean:0,roll:0,tier:0,arms:[],pods:[],jets:[]};S.add(M.root);
  buildWraithModel(false,true).then(W=>{M.W=W;M.root.add(W.root);const J=W.J;
    M.hips=J.hips;M.torso=J.torso;M.head=J.head;M.hip0=J.hips.position.y;M.tor0=J.torso.position.y;
    W.root.updateMatrixWorld(true);M.legs=[-1,1].map(sd=>legSetup(J,sd<0?'L':'R',sd,M.hip0));
    M.jl=new THREE.PointLight(0xff9a40,0,14,1.8);M.jl.position.set(0,0,1.6);M.torso.add(M.jl);
    M.rest=[M.hips,M.torso,J.arm_L,J.arm_R].filter(Boolean).map(o=>[o,o.rotation.clone()]);   /* the standing pose, for placing muzzles */
    rigKit(M);M.ready=true;M.tier=0;setTier(M,GUN.tier||1);});
  return M;
}
/* after the bay changes the loadout */
function refitKit(M){if(!M||!M.W)return Promise.resolve();M.ready=false;
  const p=refitModel(M.W,loadout(),false,true),gen=M.W.gen,done=()=>{if(M.W.gen!==gen)return;rigKit(M);M.ready=true;const t=M.tier;M.tier=0;setTier(M,t||GUN.tier||1);};
  return p.then(done,e=>{console.warn('refit',e);done();});}   /* a piece that fails to load leaves its mount empty, never a frozen mech */
/* muzzles, missile tubes and jet nozzles from the fitted kit */
const JETG=[];   /* the jet flames' shapes, shared by every refit */
function rigKit(M){const W=M.W,_p=new THREE.Vector3();
  /* measure in the standing pose: a turned torso or raised arm would put the muzzle on the side of the weapon */
  const now=(M.rest||[]).map(([o,r])=>{const c=o.rotation.clone();o.rotation.copy(r);return [o,c];});W.root.updateMatrixWorld(true);
  M.arms=['fa_L','fa_R'].map((s,i)=>{const hold=W.holds[s],arm=W.J[i?'arm_R':'arm_L'];if(!hold)return {sh:arm,muzzle:arm,hold:null,kick:0,sd:i?1:-1};
    /* forward = the Wraith's front (-z) seen from the mount; the muzzle sits at the front face of the weapon's box */
    const q=new THREE.Quaternion();W.root.getWorldQuaternion(q);const wf=new THREE.Vector3(0,0,-1).applyQuaternion(q);
    hold.parent.getWorldQuaternion(q);const fwd=wf.applyQuaternion(q.invert()).normalize();
    const bb=localBox(hold),mz=new THREE.Object3D();hold.add(mz);bb.getCenter(_p);
    const ax=['x','y','z'].sort((a,b)=>Math.abs(fwd[b])-Math.abs(fwd[a]))[0];_p[ax]=fwd[ax]>0?bb.max[ax]:bb.min[ax];mz.position.copy(_p);
    return {sh:arm,muzzle:mz,hold,base:hold.position.clone(),fwd,kick:0,sd:i?1:-1,kind:W.kit[s]};});
  M.ac=M.arms.filter(a=>!a.kind||a.kind==='ac');   /* the autocannon arms, for the gun each frame */
  M.pods=[];for(let i=0;i<9;i++)for(const s of ['sh_R','sh_L']){const h=W.holds[s];if(h&&W.kit[s]==='mpod'){const t=h.getObjectByName('tube'+i);if(t)M.pods.push(t);}}   /* tubes in firing order, right and left pods taking turns */
  if(!M.pods.length)M.pods=[W.J.sh_R,W.J.sh_L];
  M.jets=[];const jp=W.holds.bk;if(!JETG.length)JETG.push(new THREE.CylinderGeometry(.22,.02,1,10,1,true),new THREE.CylinderGeometry(.12,.01,1,8,1,true));
  for(const s of ['R','L']){const n=jp&&jp.getObjectByName('exhaust_'+s);if(!n)continue;   /* the jet pack's nozzles point their +y along the thrust */
    const f1=new THREE.Mesh(JETG[0],MT.flame);f1.castShadow=false;n.add(f1);
    const f2=new THREE.Mesh(JETG[1],MT.flame2);f2.castShadow=false;n.add(f2);M.jets.push({n,f1,f2});}
  for(const [o,c] of now)o.rotation.copy(c);W.root.updateMatrixWorld(true);
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

/* ---- 06_player.js ---- */
/* ===================== the player: walking, jet hops, collisions ===================== */
const WALK=7.5,RAD=1.35;
/* jet hop: vh = sideways speed, vy = launch speed, hold = how long holding JET keeps pushing, refill = seconds per fuel cell */
const JET={vh:30,vy:11,grav:22,hold:.9,holdG:.35,refill:3.2,drain:.55};   /* tap: about 30 m, hold: about 55 m */
/* IH4 hover (JP-2 jet pack): keep holding JET after the hop's push, or press it again while falling, and the Wraith holds its
   height; the stick moves it at up to 9 m/s. 30 s of hover in a full tank; the tank refills on the ground in 12 s. */
const HOV={time:30,refill:12,speed:9};
let P=null;
function mkPlayer(){return {x:SPAWN.x,z:SPAWN.z,y:hgt(SPAWN.x,SPAWN.z),yaw:SPAWN.yaw,pitch:0,legYaw:SPAWN.yaw,vx:0,vz:0,vy:0,air:false,
  cells:2,fuel:2,hov:1,hovering:false,jetT:9,land:0,thrust:0,spd:0,groundT:9,ev:[],hops:0,dist:0,hull:100,hullMax:100,shield:60,shieldMax:60,regenT:0,dead:false};}
function updPlayer(c,dt){
  if(P.dead){P.thrust=0;return;}
  /* shield comes back after 3 s without a hit */
  if(P.regenT>0)P.regenT-=dt;else P.shield=Math.min(P.shieldMax,P.shield+(P.regenRate||22)*dt);
  P.yaw-=c.turn;P.pitch=clamp(P.pitch+c.pitch,-.85,.34);   /* turn: plus = to the right */
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
  let wx=fx*c.my+rx*c.mx,wz=fz*c.my+rz*c.mx;const ml=Math.hypot(wx,wz);
  /* jet hop */
  if(c.jetHit){
    if(!P.air&&P.fuel>=.98){const dx=ml>.2?wx/ml:fx,dz=ml>.2?wz/ml:fz;
      P.vx=dx*JET.vh;P.vz=dz*JET.vh;P.vy=JET.vy;P.air=true;P.fuel-=1;P.jetT=0;P.hops++;P.ev.push({t:'jet'});}
    else if(!P.air)P.ev.push({t:'nofuel'});
  }
  if(P.air){
    P.jetT+=dt;const hold=c.jet&&P.jetT<JET.hold&&P.fuel>.02;
    if(hold)P.fuel=Math.max(0,P.fuel-JET.drain*dt);
    const hov=c.jet&&!hold&&P.jetT>.3&&P.hov>0&&kitHas('jetpack');
    if(hov&&!P.hovering)P.ev.push({t:'hover'});P.hovering=hov;
    if(hov){P.hov=Math.max(0,P.hov-dt/(HOV.time*(UP.hoverK||1)));P.vy+=(Math.sin(G.t*2.2)*.25-P.vy)*damp(3.5,dt);
      const k=damp(1.8,dt);P.vx+=(wx*HOV.speed-P.vx)*k;P.vz+=(wz*HOV.speed-P.vz)*k;
      if(P.hov<=0){P.ev.push({t:'hoverout'});}}
    else{P.vy-=JET.grav*(hold?JET.holdG:1)*dt;
    /* a little steering in the air */
    P.vx+=wx*5*dt;P.vz+=wz*5*dt;const hv=Math.hypot(P.vx,P.vz);if(hv>JET.vh*1.05){P.vx*=JET.vh*1.05/hv;P.vz*=JET.vh*1.05/hv;}}
    P.thrust+=((P.jetT<.28?1:hold?.75:hov?.6:0)-P.thrust)*damp(14,dt);
    P.y+=P.vy*dt;
  }else{
    const tx=wx*WALK,tz=wz*WALK,k=damp(Math.hypot(P.vx,P.vz)>WALK*1.1?2.6:ml>.05?3.4:5.5,dt);
    P.vx+=(tx-P.vx)*k;P.vz+=(tz-P.vz)*k;P.thrust+=(0-P.thrust)*damp(10,dt);P.groundT+=dt;
    if(P.groundT>.6){P.fuel=Math.min(P.cells,P.fuel+dt/JET.refill);P.hov=Math.min(1,P.hov+dt/HOV.refill);}P.hovering=false;
  }
  /* move, then push out of tree trunks and keep inside the map */
  let nx=P.x+P.vx*dt,nz=P.z+P.vz*dt;
  const r=collide(nx,nz,RAD);if(r[2]&&(!P.air||P.y<hgt(r[0],r[1])+4)){nx=r[0];nz=r[1];}
  const B=BND();if(nx<B.x0||nx>B.x1){nx=clamp(nx,B.x0,B.x1);P.vx*=.2;}if(nz<B.z0||nz>B.z1){nz=clamp(nz,B.z0,B.z1);P.vz*=.2;}
  P.dist+=Math.hypot(nx-P.x,nz-P.z);P.x=nx;P.z=nz;
  const g=hgt(P.x,P.z);
  if(P.air&&P.y<g&&P.vy>=0&&!P.hovering)P.y=g;   /* rising up a slope: ride over it, never into it */
  if(P.air){if(P.y<=g&&(P.vy<0||P.hovering)){const k=clamp(-P.vy/16,0,1.3);P.y=g;P.air=false;P.vy=0;P.groundT=0;P.land=Math.max(P.land,.18+k*.32);P.ev.push({t:'land',k});
    /* stomp landing (jets upgrade 3): hurts machines under you */
    if(UP.stomp&&k>.35)for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<7){hurtEnemy(e,60*k*(1-d/9),e.x,e.y+1,e.z);e.kx+=(e.x-P.x)/(d||1)*12;e.kz+=(e.z-P.z)/(d||1)*12;}}}}
  else P.y=g;
  P.land=Math.max(0,P.land-dt*1.6);
  /* legs: face the way you walk (backwards when walking backwards), shuffle round when turning on the spot */
  const hs=Math.hypot(P.vx,P.vz);let tgt=P.legYaw,turnStep=0;
  if(hs>.6){const my=Math.atan2(-P.vx,-P.vz);tgt=Math.abs(angD(my,P.yaw))>1.95?my+Math.PI:my;}
  else if(Math.abs(angD(P.yaw,P.legYaw))>.55){tgt=P.yaw;turnStep=2.4;}
  const dl=angD(tgt,P.legYaw),mx=(P.air?2:5.5)*dt;P.legYaw+=clamp(dl,-mx,mx);
  const lf=-Math.sin(P.legYaw),lz=-Math.cos(P.legYaw);
  P.spd=P.vx*lf+P.vz*lz;if(Math.abs(P.spd)<turnStep&&!P.air&&Math.abs(dl)>.05)P.spd=turnStep*Math.sign(P.spd||1);
}

/* ---- 06b_weapons.js ---- */
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
const NOARM=[null],_sc=new THREE.Vector3(),_v=new THREE.Vector3(),_w=new THREE.Vector3(),_m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_up=new THREE.Vector3(0,1,0),_z=new THREE.Vector3(0,0,1);
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
  const pod=M.ready?M.pods[i%M.pods.length]:null;if(pod)pod.getWorldPosition(_w);else _w.set(P.x,P.y+5,P.z);
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
  /* IH4: only the arms that carry an autocannon fire gun rounds (the Lance and the Arc are in 06k_kit.js); one autocannon arm fires at 60 % of the pair's rate */
  const AC=M.ready?M.ac:NOARM,firing=c.fire&&!GUN.over&&!P.dead&&AC.length>0;
  kitArms(c,dt);
  if(firing&&GUN.cd<=0){
    const t=GUN.tier,A=AC[GUN.side%AC.length];GUN.cd+=1/(GUN.rate[t]*(AC.length<2?.6:1));if(GUN.cd<0)GUN.cd=0;GUN.side=(GUN.side+1)%AC.length;
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
    if(M.ready&&AC.length&&Math.random()<dt*14){const A=AC[Math.random()*AC.length|0];A.muzzle.getWorldPosition(_w);part({x:_w.x,y:_w.y,z:_w.z,vx:(Math.random()-.5),vy:1.5+Math.random(),vz:(Math.random()-.5),life:1.2,s0:.4,s1:1.6,a:.35,col:[.85,.85,.88],drag:1});}}
  MFL.intensity=GUN.flash*90;
  /* vent: dump all heat with a steam blast that shoves close enemies back */
  /* IH4 AUTO-VENT (pilot level 6): vents by itself at 92 % heat */
  if((c.vent||assistOn('vent')&&GUN.heat>=92&&!GUN.over)&&GUN.ventCd<=0&&!P.dead){GUN.ventCd=GUN.ventCool||8;GUN.heat=0;GUN.over=false;sVent();CAMS.shake=Math.max(CAMS.shake,.35);
    for(let i=0;i<10;i++){const a=Math.random()*TAU;part({x:P.x+Math.cos(a)*1.5,y:P.y+2+Math.random()*2,z:P.z+Math.sin(a)*1.5,vx:Math.cos(a)*3,vy:2+Math.random()*2,vz:Math.sin(a)*3,life:1.6,s0:2,s1:6,a:.8,col:[1,1,1],img:4,drag:1.5,grav:-.6});}
    for(let i=0;i<26;i++){const a=Math.random()*TAU,s=4+Math.random()*7;part({x:P.x+Math.cos(a)*1.2,y:P.y+1.5+Math.random()*2,z:P.z+Math.sin(a)*1.2,vx:Math.cos(a)*s,vy:.5+Math.random()*2,vz:Math.sin(a)*s,life:1.4+Math.random(),s0:1,s1:4.2,a:.4,col:[.92,.93,.95],drag:2.2,grav:-.4});}
    for(const e of EN){if(e.dead)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz)||1;if(d<10){hurtEnemy(e,15,e.x,e.y+1,e.z);e.kx+=dx/d*16*(1-d/12);e.kz+=dz/d*16*(1-d/12);}}}
  /* missiles: tap to fire a salvo at the enemies nearest the crosshair */
  MSL.cd-=dt;updLock(dt);updWarn(dt);
  if(c.msl&&!P.dead){
    if(MSL.ammo<=0||MSL.cd>0){if(MSL.ammo<=0){sClick();HUD.msg('NO MISSILES',1);}}
    else{MSL.cd=.7;
      /* IH4: locked machines first (06k_kit.js); a missile at a locked machine turns hard, at one not yet locked gently */
      const cand=lockCands();
      const n=Math.min(MSL.salvo,MSL.ammo);for(let i=0;i<n;i++){const tg=cand.length?cand[i%cand.length]:null,pod=M.ready?M.pods[(MSL.tube=(MSL.tube||0)+1)%M.pods.length]:null;
        if(pod)pod.getWorldPosition(_w);else _w.set(P.x,P.y+4.4,P.z);
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
        MISS.push({x:_w.x,y:_w.y,z:_w.z,vx:fx*14+(i%2?3:-3),vy:9,vz:fz*14,t:0,tg,life:4.5,ax:AIM.x,ay:AIM.y,az:AIM.z,delay:i*.09,turn:tg&&tg.lk>=1?4.2:1.7});}
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
      const k=Math.min(1,dt*(m.turn||4.2));let vx=m.vx/sp,vy=m.vy/sp,vz=m.vz/sp;const cl=Math.hypot(m.vx,m.vy,m.vz)||1;vx=m.vx/cl;vy=m.vy/cl;vz=m.vz/cl;
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
    _m4.compose(_w.set(b.x-_v.x*1.8,b.y-_v.y*1.8,b.z-_v.z*1.8),_q,_sc.set(1,1,3.6));BM.setMatrixAt(n++,_m4);}
  BM.count=n;BM.instanceMatrix.needsUpdate=true;BM.visible=n>0;
  n=0;for(const b of EBOLTS){if(n>=220)break;const l=Math.hypot(b.vx,b.vy,b.vz);_v.set(b.vx/l,b.vy/l,b.vz/l);_q.setFromUnitVectors(_z,_v);_m4.compose(_w.set(b.x,b.y,b.z),_q,_sc.setScalar(b.s||1));EBM.setMatrixAt(n++,_m4);}
  EBM.count=n;EBM.instanceMatrix.needsUpdate=true;EBM.visible=n>0;
  n=0;for(const m of MISS){if(n>=40)break;if(m.t<m.delay)continue;const l=Math.hypot(m.vx,m.vy,m.vz)||1;_v.set(m.vx/l,m.vy/l,m.vz/l);_q.setFromUnitVectors(_z,_v);_m4.compose(_w.set(m.x,m.y,m.z),_q,_sc.set(1,1,1));MSM.setMatrixAt(n++,_m4);}
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

/* ---- 06c_enemies.js ---- */
/* ===================== FORGE machines, path-finding, waves, pickups, damage and score ===================== */
const EDEF={
  skitter:{hp:30,r:1.3,cy:1.25,speed:9.5,score:50,drop:.12,file:'skitter',sc:1.4,scrap:5},
  hound:{hp:95,r:1.7,cy:1.95,speed:8.2,score:150,drop:.4,file:'hound',sc:1.15,scrap:15},
  gunner:{hp:230,r:1.4,cy:2.7,speed:4.6,score:400,drop:1,file:'gunner',sc:1.05,scrap:35}};
const EN=[],EMAT={},ETPL={};
let ENEMY_READY=false;
function loadEnemies(){
  const k=(a,w)=>{a.vertexColors=true;return hookWorld(a,{wear:w});};
  EMAT.egrey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),normalMap:nmap('23-grey-armour'),normalScale:new THREE.Vector2(nmapK('23-grey-armour'),nmapK('23-grey-armour')),color:0x9c8884,roughness:.5,metalness:.45}),1);
  EMAT.egun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),normalMap:nmap('24-gunmetal'),normalScale:new THREE.Vector2(nmapK('24-gunmetal'),nmapK('24-gunmetal')),color:0x6c7078,roughness:.45,metalness:.7}));
  EMAT.edark=k(new THREE.MeshStandardMaterial({color:0x121316,roughness:.7,metalness:.4}));
  EMAT.esteel=MT.steel;
  EMAT.ered=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.12,.05).multiplyScalar(2.2)});
  EMAT.emblem=hookWorld(new THREE.MeshStandardMaterial({map:tex('29-enemy-emblem',{clamp:true,glb:true}),transparent:true,alphaTest:.35,roughness:.55,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  /* Ironhowl 4: machines with an m4 entry are the new FORGE models from the repo's models/ folder (printed and baked, one atlas each) */
  const L=new THREE.GLTFLoader(LM),jobs=Object.keys(EDEF).map(id=>EDEF[id].m4?f4load(id):new Promise(ok=>L.load('models/mech/'+EDEF[id].file+'.glb',g=>{
    g.scene.traverse(o=>{if(o.isMesh){o.material=EMAT[o.material.name]||EMAT.egun;o.castShadow=o.material!==EMAT.emblem;o.receiveShadow=true;}});
    mergeParts(g.scene);ETPL[id]=g.scene;ok();},undefined,()=>ok())));
  return Promise.all(jobs).then(()=>{ENEMY_READY=true;});
}
/* ---- path-finding: a flow field on a 2 m grid, rebuilt when the player moves to another cell ---- */
const NAV={c:2,n:0,o:0,block:null,dist:null,pc:-1,t:0};
function navInit(){const ext=PLAY+10;NAV.o=-ext;NAV.n=Math.ceil(ext*2/NAV.c);const n=NAV.n;NAV.block=new Uint8Array(n*n);NAV.dist=new Float32Array(n*n);
  const seen=new Set();
  for(const a of VEG.cols.values())for(const c of a){if(seen.has(c))continue;seen.add(c);
    if(c.b){const i0=Math.floor((c.x0-1.2-NAV.o)/NAV.c),i1=Math.floor((c.x1+1.2-NAV.o)/NAV.c),j0=Math.floor((c.z0-1.2-NAV.o)/NAV.c),j1=Math.floor((c.z1+1.2-NAV.o)/NAV.c);
      for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)if(i>=0&&j>=0&&i<n&&j<n)NAV.block[j*n+i]=1;continue;}
    const r=c.r+1.1,i0=Math.floor((c.x-r-NAV.o)/NAV.c),i1=Math.floor((c.x+r-NAV.o)/NAV.c),j0=Math.floor((c.z-r-NAV.o)/NAV.c),j1=Math.floor((c.z+r-NAV.o)/NAV.c);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){if(i<0||j<0||i>=n||j>=n)continue;const cx=NAV.o+(i+.5)*NAV.c,cz=NAV.o+(j+.5)*NAV.c;if(Math.hypot(cx-c.x,cz-c.z)<r)NAV.block[j*n+i]=1;}}}
const navCell=(x,z)=>{const i=Math.floor((x-NAV.o)/NAV.c),j=Math.floor((z-NAV.o)/NAV.c);return i<0||j<0||i>=NAV.n||j>=NAV.n?-1:j*NAV.n+i;};
function navBuild(){const n=NAV.n,D=NAV.dist;D.fill(1e9);const s=navCell(P.x,P.z);if(s<0)return;NAV.pc=s;
  /* Dijkstra with a bucket queue is overkill here: a two-pass chamfer sweep (8 neighbours) is fast and good enough */
  D[s]=0;const B=NAV.block,d1=1,d2=1.414;
  for(let it=0;it<3;it++){
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i;if(B[k])continue;let v=D[k];
      if(i>0&&D[k-1]+d1<v)v=D[k-1]+d1;if(j>0){if(D[k-n]+d1<v)v=D[k-n]+d1;if(i>0&&D[k-n-1]+d2<v)v=D[k-n-1]+d2;if(i<n-1&&D[k-n+1]+d2<v)v=D[k-n+1]+d2;}D[k]=v;}
    for(let j=n-1;j>=0;j--)for(let i=n-1;i>=0;i--){const k=j*n+i;if(B[k])continue;let v=D[k];
      if(i<n-1&&D[k+1]+d1<v)v=D[k+1]+d1;if(j<n-1){if(D[k+n]+d1<v)v=D[k+n]+d1;if(i<n-1&&D[k+n+1]+d2<v)v=D[k+n+1]+d2;if(i>0&&D[k+n-1]+d2<v)v=D[k+n-1]+d2;}D[k]=v;}}
}
/* direction toward the player through the woods from (x,z); falls back to straight at the player */
function navDir(x,z){const k=navCell(x,z),n=NAV.n,D=NAV.dist;let bx=P.x-x,bz=P.z-z;
  if(k>=0&&D[k]<1e8){let best=D[k],bi=-1,bj=-1;const i=k%n,j=(k/n)|0;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=n||jj>=n)continue;const v=D[jj*n+ii];if(v<best){best=v;bi=ii;bj=jj;}}
    if(bi>=0&&D[k]>2){bx=NAV.o+(bi+.5)*NAV.c-x;bz=NAV.o+(bj+.5)*NAV.c-z;}}
  const l=Math.hypot(bx,bz)||1;return [bx/l,bz/l];}
/* can the enemy see the player (no trunk in between)? */
function los(x,z){const dx=P.x-x,dz=P.z-z,d=Math.hypot(dx,dz),st=Math.ceil(d/3);for(let i=1;i<st;i++){const t=i/st;if(treeAt(x+dx*t,z+dz*t,hgt(x+dx*t,z+dz*t)+2.5))return false;}return true;}
/* ---- spawning ---- */
function spawnEnemy(id,x,z){const d=EDEF[id],tp=ETPL[id];if(!tp)return null;
  const o=tp.clone(true);const N=n=>o.getObjectByName(n);
  const e={id,key:id,d,o,x,z,y:hgt(x,z),yaw:Math.atan2(-(P.x-x),-(P.z-z)),hp:d.hp*G.hpK*DIFF.hp*DK.hp,dead:false,spawnT:1.3,st:'move',t:0,cd:1+Math.random()*1.5,
    kx:0,kz:0,flash:0,phase:Math.random()*10,strafe:Math.random()<.5?1:-1,strT:2+Math.random()*2,vx:0,vz:0};
  if(d.init)d.init(e,N);
  else if(id==='skitter'){e.body=N('body');e.legs=[0,1,2,3].map(i=>N('leg'+i));}
  else if(id==='hound'){e.body=N('body');e.head=N('head');e.legs=['FL','FR','BL','BR'].map(s=>({up:N('leg'+s),kn:N('knee'+s)}));}
  else{e.hips=N('hips');e.torso=N('torso');e.armR=N('armR');e.armL=N('armL');e.mzR=N('mzR');e.mzL=N('mzL');
    e.legs=[-1,1].map(sd=>{const s=sd<0?'L':'R';return {thigh:N('thigh_'+s),knee:N('knee_'+s),ankle:N('ankle_'+s),sd};});e.gp=0;}
  /* each enemy gets its own copy of the armour material so it can flash when hit */
  /* IH4: materials come from a pool per machine type (a pooled one is already dressed), so the type's shader stays compiled between waves */
  const base=d.amat||EMAT.egrey,pool=MPOOL.get(id);let fresh=false;e.mat=pool&&pool.pop();
  if(e.mat)e.mat.emissive.setRGB(0,0,0);else{fresh=true;e.mat=base.clone();e.mat.onBeforeCompile=base.onBeforeCompile;e.mat.customProgramCacheKey=base.customProgramCacheKey;}
  o.traverse(m=>{if(m.isMesh&&m.material===base)m.material=e.mat;});if(d.dress&&fresh)d.dress(e);
  if(!Q.has('noskin'))e.skel=skinify(o,id);   /* speed pass: one skinned mesh per material instead of one mesh per part */
  o.scale.setScalar(d.sc||1);o.position.set(x,e.y,z);o.visible=false;S.add(o);EN.push(e);
  return e;}
/* waves arrive in front of the player, 55-80 m ahead, with a red beacon first */
const WAVES=[{skitter:4},{skitter:6,hound:1},{hound:2,skitter:4},{gunner:1,skitter:4},{gunner:2,hound:2},{gunner:2,hound:2,skitter:6}];
const BEACONS=[];
function spawnSpot(){const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  for(let tries=0;tries<40;tries++){const a=(Math.random()-.5)*1.2,d=55+Math.random()*25,ca=Math.cos(a),sa=Math.sin(a);
    const B=BND(),dx=fx*ca-fz*sa,dz=fx*sa+fz*ca,x=clamp(P.x+dx*d,B.x0+4,B.x1-4),z=clamp(P.z+dz*d,B.z0+4,B.z1-4);
    if(Math.hypot(x-P.x,z-P.z)<35)continue;const k=navCell(x,z);if(k<0||NAV.block[k])continue;return [x,z];}
  const B=BND();return [clamp(P.x-Math.sin(P.yaw)*60,B.x0+4,B.x1-4),clamp(P.z-Math.cos(P.yaw)*60,B.z0+4,B.z1-4)];}
function startWave(){
  const w=WAVES[G.wave%WAVES.length];G.hpK=1+Math.floor(G.wave/WAVES.length)*.3;if(G.wave>0)addXP(100+50*G.wave,'wave');G.wave++;
  HUD.banner('WAVE '+G.wave);briefMaybe(w,'WAVE '+G.wave);   /* IH4: an intel brief when the wave brings a machine not yet briefed (06l_brief.js) */
  for(const id in w){const [cx,cz]=spawnSpot();BEACONS.push({x:cx,z:cz,t:1.3});
    for(let i=0;i<w[id];i++){const a=Math.random()*TAU,r=Math.random()*(id==='skitter'?6:4)+(i?2:0);let x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      const cl=collide(x,z,EDEF[id].r);spawnEnemy(id,cl[0],cl[1]);}}
}
/* ---- damage ---- */
function hurtEnemy(e,dmg,x,y,z){if(e.dead)return;if(e.d.armor)dmg*=e.d.armor(e,x,z);e.hp-=dmg;e.flash=1;if(e.hp<=0)killEnemy(e);}
function killEnemy(e){e.dead=true;enemyFree(e);
  boom(e.x,e.y+e.d.cy,e.z,e.d.boom||(e.id==='skitter'?.7:e.id==='hound'?1.1:1.5));
  const now=G.t;G.combo=now-G.lastKill<3?G.combo+1:1;G.lastKill=now;const mult=Math.min(3,1+.25*(G.combo-1));
  addScore(Math.round(e.d.score*mult*(G.hpK||1)));G.kills++;addScrap(e.d.scrap||10);pilotKill(e.key||e.id,e.d.score);
  if(Math.random()<e.d.drop)dropPickup(e.x,e.z,Math.random()<(e.d.chip||(e.id==='gunner'?.55:0))?'chip':null);
}
function hurtPlayer(dmg,fx,fz){if(P.dead||G.mode!=='play'&&G.mode!=='demo')return;if(G.mode==='demo'){shieldFlash();return;}dmg*=DIFF.dmg*DK.dmg;P.regenT=P.regenDelay||3;
  const s=Math.min(P.shield,dmg);P.shield-=s;dmg-=s;if(s>0){sShield();shieldFlash();HUD.hit(fx,fz,'s');}
  if(dmg>0){P.hull-=dmg;sHurt();HUD.hit(fx,fz,'h');CAMS.shake=Math.max(CAMS.shake,.3+dmg*.02);}
  if(P.hull<=0){P.hull=0;playerDown();}}
function addScore(n){if(G.mode==='demo')return;G.score+=n;ARC.score(G.score);}
/* ---- pickups: chip (gun tier), repair, shield, missiles, fuel ---- */
const PK=[],PKDEF={chip:{col:[1,.85,.2],name:'GUN TIER'},repair:{col:[.35,1,.45],name:'REPAIR'},shield:{col:[.4,.7,1],name:'SHIELD'},
  missile:{col:[1,.5,.2],name:'MISSILES'},fuel:{col:[.92,.95,1],name:'JET FUEL'}};
let PKG=null,PKB=null;
function dropPickup(x,z,kind){
  if(!kind){const r=Math.random();kind=r<.34?'chip':r<.58?'repair':r<.76?'missile':r<.9?'fuel':'shield';}
  if(kind==='chip'&&GUN.tier>=4)kind='missile';
  if(!PKG){PKG=new THREE.OctahedronGeometry(.55,0);PKB=new THREE.CylinderGeometry(.08,.08,14,6,1,true);PKB.translate(0,7,0);}
  const c=new THREE.Color(...PKDEF[kind].col),gem=new THREE.Mesh(PKG,new THREE.MeshBasicMaterial({color:c.clone().multiplyScalar(2.4)}));
  const beam=new THREE.Mesh(PKB,new THREE.MeshBasicMaterial({color:c.clone().multiplyScalar(.9),transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));
  const g=new THREE.Group();g.add(gem,beam);const cl=collide(x,z,.8);g.position.set(cl[0],hgt(cl[0],cl[1]),cl[1]);S.add(g);
  PK.push({kind,g,gem,beam,x:cl[0],z:cl[1],t:0,life:28});}
function updPickups(dt){for(let i=PK.length-1;i>=0;i--){const p=PK[i];p.t+=dt;p.gem.rotation.y+=dt*2.4;p.gem.position.y=1.4+Math.sin(p.t*3)*.25;
  p.g.visible=p.life-p.t>5||Math.sin(p.t*18)>0;
  if(!P.dead&&Math.hypot(P.x-p.x,P.z-p.z)<3.4){collect(p.kind);S.remove(p.g);PK.splice(i,1);continue;}
  if(p.t>p.life){S.remove(p.g);PK.splice(i,1);}}}
function collect(k){sPickup();
  if(k==='chip'){GUN.tier=Math.min(4,GUN.tier+1);HUD.msg('GUN TIER '+['','I','II','III','IV'][GUN.tier],1.6);}
  else if(k==='repair'){P.hull=Math.min(P.hullMax,P.hull+UP.repair);HUD.msg('REPAIR +'+UP.repair,1.2);}
  else if(k==='shield'){P.shield=P.shieldMax;HUD.msg('SHIELD FULL',1.2);}
  else if(k==='missile'){MSL.ammo=Math.min(MSL.max,MSL.ammo+6);HUD.msg('MISSILES +6',1.2);}
  else {P.fuel=P.cells;HUD.msg('JET FUEL FULL',1.2);}
  addScore(25);}
/* ---- enemy brains ---- */
function updEnemies(dt){
  /* the path map: rebuilt when you move to a new cell (at most 4 times a second) or every 0.5 s, and only while a machine is alive to use it */
  NAV.t-=dt;let walk=false;for(const e of EN)if(!e.dead){walk=true;break;}
  if(walk&&(NAV.t<=0||NAV.t<.25&&navCell(P.x,P.z)!==NAV.pc)){navBuild();NAV.t=.5;}
  for(let i=BEACONS.length-1;i>=0;i--){const b=BEACONS[i];b.t-=dt;if(Math.random()<dt*30)part({x:b.x+(Math.random()-.5)*2,y:hgt(b.x,b.z)+.3,z:b.z+(Math.random()-.5)*2,vx:0,vy:8+Math.random()*6,vz:0,life:.5,s0:.9,s1:.3,a:1.4,col:[1,.2,.08],glow:true});if(b.t<=0)BEACONS.splice(i,1);}
  let alive=0;
  for(const e of EN){if(e.dead)continue;alive++;
    if(e.spawnT>0){e.spawnT-=dt;if(e.spawnT<=0){e.o.visible=true;dustPuff(e.x,e.z,8,e.d.r*.8);}continue;}
    e.t+=dt;e.cd-=dt*DK.rate;e.flash=Math.max(0,e.flash-dt*7);e.mat.emissive.setRGB(e.flash*1.4,e.flash*.5,e.flash*.3);
    const dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz)||1,face=Math.atan2(-dx,-dz);let mvx=0,mvz=0,sp=e.d.speed,want=face;
    const tg=truckGoal(e,dist);
    if(tg){mvx=tg[0];mvz=tg[1];sp=tg[2];if(sp)want=Math.atan2(-mvx,-mvz);}
    else if(e.d.brain){const r=e.d.brain(e,dt,dist,dx,dz,face);mvx=r[0];mvz=r[1];sp=r[2];want=r[3];}
    else if(e.id==='lancer'){const r=lancerBrain(e,dt,dist,dx,dz);mvx=r[0];mvz=r[1];sp=r[2];want=face;}
    else if(e.id==='skitter'){
      if(e.st==='hop'){/* IH4: after a zap it springs back a few metres, then comes again (gives you a moment to shoot it) */
        mvx=-dx/dist;mvz=-dz/dist;sp=e.d.speed*.85;want=face;if(e.t>.5){e.st='move';e.t=0;}}
      else if(dist>e.d.r+RAD+.6){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);
        const s=Math.sin(e.t*3+e.phase)*.5;mvx+=-nd[1]*s;mvz+=nd[0]*s;}
      else if(e.cd<=0&&!P.dead&&P.y-hgt(P.x,P.z)<3){e.cd=1.2;e.st='hop';e.t=0;hurtPlayer(e.d.zap||4,e.x,e.z);sZap();sparks(lerp(e.x,P.x,.6),e.y+1.2,lerp(e.z,P.z,.6),6,[.6,.85,1]);}
    }else if(e.id==='hound'){
      if(e.st==='move'){if(dist<6.5+e.d.r){/* IH4: too close to charge, so back off to one side facing you, then come again (it used to cling) */
          mvx=-dx/dist-dz/dist*e.strafe*.8;mvz=-dz/dist+dx/dist*e.strafe*.8;want=face;}
        else{const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];want=Math.atan2(-mvx,-mvz);}
        if(dist<20+e.d.r&&dist>6+e.d.r&&e.cd<=0&&los(e.x,e.z)){e.st='aim';e.t=0;}}
      else if(e.st==='aim'){sp=0;want=face;if(e.t>.75){e.st='charge';e.t=0;e.cx=dx/dist;e.cz=dz/dist;sHowl();}}
      else if(e.st==='charge'){mvx=e.cx;mvz=e.cz;sp=26;want=Math.atan2(-mvx,-mvz);
        if(!P.dead&&dist<e.d.r+RAD+.4&&P.y-hgt(P.x,P.z)<1.6&&!e.hitDone){e.hitDone=true;hurtPlayer(e.d.bite||18,e.x,e.z);P.vx+=e.cx*9;P.vz+=e.cz*9;}
        if(e.t>1.1){e.st='rest';e.t=0;e.hitDone=false;}}
      else{sp=1.5;mvx=dx/dist;mvz=dz/dist;if(e.t>1.3){e.st='move';e.cd=1.2+Math.random();}}
    }else{/* gunner: hold 24-42 m, strafe, shoot bursts when it can see you */
      const seen=los(e.x,e.z);e.strT-=dt;if(e.strT<=0){e.strafe*=-1;e.strT=2+Math.random()*2.5;}
      if(dist>42||!seen){const nd=navDir(e.x,e.z);mvx=nd[0];mvz=nd[1];}
      else if(dist<24){mvx=-dx/dist;mvz=-dz/dist;}
      else{mvx=-dz/dist*e.strafe;mvz=dx/dist*e.strafe;sp*=.7;}
      want=face;
      if(seen&&dist<55&&e.cd<=0&&!P.dead){e.burst=e.d.burst||3;e.cd=2.4+Math.random();e.bt=0;}
      if(e.burst>0){e.bt-=dt;if(e.bt<=0){e.bt=.18;e.burst--;const mz=e.burst%2?e.mzR:e.mzL;mz.getWorldPosition(_w);
        const lead=dist/30*.6,tx=P.x+P.vx*lead,ty=P.y+3.2,tz=P.z+P.vz*lead;let ax=tx-_w.x,ay=ty-_w.y,az=tz-_w.z;const l=Math.hypot(ax,ay,az)||1;
        EBOLTS.push({x:_w.x,y:_w.y,z:_w.z,vx:ax/l*30,vy:ay/l*30,vz:az/l*30,life:2.4,dmg:e.d.bolt||8});sEShot();part({x:_w.x,y:_w.y,z:_w.z,vx:0,vy:0,vz:0,life:.08,s0:1.2,s1:.5,a:2,col:[1,.3,.1],glow:true});}}
    }
    /* move with separation from other machines, trunk collisions and knockback */
    for(const o of EN){if(o===e||o.dead||o.spawnT>0)continue;const ox=e.x-o.x,oz=e.z-o.z,rr=e.d.r+o.d.r,d2=ox*ox+oz*oz;if(d2<rr*rr&&d2>1e-4){const d=Math.sqrt(d2);mvx+=ox/d*(rr-d)/rr*1.5;mvz+=oz/d*(rr-d)/rr*1.5;}}
    if(dist<e.d.r+RAD&&!(e.st==='charge')){mvx-=dx/dist;mvz-=dz/dist;}
    e.vx+=(mvx*sp-e.vx)*damp(6,dt);e.vz+=(mvz*sp-e.vz)*damp(6,dt);
    let nx=e.x+(e.vx+e.kx)*dt,nz=e.z+(e.vz+e.kz)*dt;e.kx*=Math.exp(-dt*4);e.kz*=Math.exp(-dt*4);
    const c=e.d.fly?[nx,nz]:collide(nx,nz,e.d.r),B=BND();e.x=clamp(c[0],B.x0,B.x1);e.z=clamp(c[1],B.z0,B.z1);e.y=hgt(e.x,e.z)+(e.d.fly?e.alt:0);
    {const tr=e.d.turn||(e.st==='aim'?6:4);e.yaw+=clamp(angD(want,e.yaw),-dt*tr,dt*tr);}
    poseEnemy(e,dt,Math.hypot(e.vx,e.vz));
  }
  for(let i=EN.length-1;i>=0;i--)if(EN[i].dead)EN.splice(i,1);
  if(G.mode==='play'&&!P.dead&&!MISSION){if(alive===0&&BEACONS.length===0){G.breakT-=dt;if(G.breakT<=0){startWave();G.breakT=4;}}}
}
function poseEnemy(e,dt,sp){
  e.o.position.set(e.x,e.y,e.z);e.o.rotation.y=e.yaw;e.phase+=dt*(1.2+sp*(e.id==='skitter'?.9:e.id==='hound'?.42:.5));const ph=e.phase;
  if(e.d.pose){e.d.pose(e,dt,sp);return;}
  if(e.id==='skitter'){e.body.position.y=.95+Math.abs(Math.sin(ph*2))*.08;e.legs.forEach((L,i)=>{const s=(i===0||i===3)?1:-1;L.rotation.y=Math.sin(ph*2)*.35*s*Math.min(1,sp/3);L.rotation.x=Math.max(0,Math.cos(ph*2)*s)*.25*Math.min(1,sp/3);});}
  else if(e.id==='hound'){const run=Math.min(1,sp/6),aim=e.st==='aim'?1:0;e.body.position.y=1.75-aim*.35+Math.sin(ph*2)*.08*run;e.body.rotation.x=aim*.12;
    e.legs.forEach((L,i)=>{const o=i<2?0:Math.PI*.9,s=Math.sin(ph*2+o+(i%2)*.4);L.up.rotation.x=s*.65*run-aim*.3;L.kn.rotation.x=(i<2?-.35:.35)+Math.cos(ph*2+o)*.4*run;});
    EMAT.ered.color.setRGB(1,.12,.05).multiplyScalar(2.2);}
  else{const ln=e.id==='lancer',HY=ln?3.0:1.9,run=Math.min(1,sp/4);e.gp+=dt*sp/(ln?2.2:1.6);e.hips.position.y=HY-Math.abs(Math.sin(e.gp*TAU))*.07*run;e.torso.position.y=e.hips.position.y;
    e.legs.forEach(L=>{let u=(e.gp+(L.sd>0?.5:0))%1;let tz=0,lift=0;const S_=1.2*run;if(u<.5)tz=lerp(-S_/2,S_/2,u/.5);else{const s=(u-.5)/.5;tz=lerp(S_/2,-S_/2,s);lift=Math.sin(Math.PI*s)*.35*run;}
      if(ln)legIK(L,-(2.95-.2-lift),tz*1.4,0,1.55,1.55,true);   /* the Lancer's knees bend backward */
      else legIK(L,-(1.85-.25-lift),tz,0,1,1,false);   /* gunner knees bend forward */});
    e.armR.rotation.x=e.armL.rotation.x=Math.atan2(P.y+(ln?3.2:2.6)-(e.y+(ln?3.55:2.85)),Math.hypot(P.x-e.x,P.z-e.z))*.9;}
}

/* speed pass: merge a machine's parts into one skinned mesh per material. Each joint node becomes a bone, so the animation code is unchanged,
   and a machine costs about 4-6 draw calls instead of about 20 (twice that with shadows). */
/* IH4: the merged meshes of each machine type are made once and shared by every copy (each copy gets its own skeleton);
   indexed parts stay indexed (a third of the vertices). Materials go back to a pool when a machine is removed. */
const SKC=new Map(),MPOOL=new Map();
function enemyFree(e){S.remove(e.o);if(e.beam)S.remove(e.beam);if(e.skel){e.skel.dispose();e.skel=null;}
  if(e.mat&&!e.matFree){e.matFree=true;const k=e.key||e.id;if(!MPOOL.has(k))MPOOL.set(k,[]);const pl=MPOOL.get(k);if(pl.length<24)pl.push(e.mat);else e.mat.dispose();}}
function skinify(root,key){root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),bones=[],bi=new Map(),groups=new Map();
  root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||!o.visible)return;const p=o.parent;if(!bi.has(p)){bi.set(p,bones.length);bones.push(p);}
    const a=o.geometry.attributes,key=o.material.uuid+(a.color?'c':'')+(a.uv?'u':'');if(!groups.has(key))groups.set(key,{m:o.material,list:[],cast:o.castShadow});groups.get(key).list.push(o);});
  if(bones.length<2)return null;const made=[],M_=new THREE.Matrix4(),G_=[...groups.values()];
  const ck=key?key+'|'+bones.length+'|'+G_.map(g=>g.list.length).join(','):null,cached=ck&&SKC.get(ck),store=[];   /* same parts, same bones: same meshes */
  for(let gi=0;gi<G_.length;gi++){const {m,list,cast}=G_[gi];let merged;
    if(cached)merged=cached[gi];
    else{const idx=list.every(o=>o.geometry.index);
    const gs=list.map(o=>{const g=idx?o.geometry.clone():o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();for(const n of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(n))g.deleteAttribute(n);
      g.applyMatrix4(M_.multiplyMatrices(inv,o.matrixWorld));const c=g.attributes.position.count,si=new Uint16Array(c*4),sw=new Float32Array(c*4),b=bi.get(o.parent);
      for(let i=0;i<c;i++){si[i*4]=b;sw[i*4]=1;}g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));return g;});
    merged=gs.length>1?THREE.mergeGeometries(gs,false):gs[0];}
    store.push(merged);if(!merged)continue;
    const sm=new THREE.SkinnedMesh(merged,m);sm.castShadow=cast;sm.receiveShadow=true;root.add(sm);made.push(sm);for(const o of list)o.parent.remove(o);}
  if(ck&&!cached)SKC.set(ck,store);
  root.updateMatrixWorld(true);const sk=new THREE.Skeleton(bones);for(const sm of made)sm.bind(sk,sm.matrixWorld);return sk;}

/* ---- 06d_missions.js ---- */
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
/* ===== Ironhowl 4, chapter 1: THE SALVAGE RUSH (session 5). 2176: FORGE's old 2126 war zones are full of wrecks worth a
   fortune, and dig crews cut cores out of them. The wrecks start waking, and a voice on the radio (UNKNOWN) claims them. Who is
   behind it stays open: the chapter ends with a lit foundry, new machines being built, and a log that names no one.
   Places and spots are Ironhowl 3's (tested there); the machines are Ironhowl 4's FORGE set and its three bosses. ===== */
const CHAPTER='CHAPTER 1 · THE SALVAGE RUSH';
const MISSIONS=[
  {id:1,name:'DIG SITE',map:'field',start:[0,115,0],
   brief:['2176. FORGE’s old war zones are full of 2126 wrecks, and the wrecks are worth a fortune.','Dig Crew 4 is cutting cores out of the farm fields. Keep them safe.'],
   steps:[{t:'reach',label:'MEET ROOK AT THE BARN',at:[47,30],r:14,truck:1,radio:[['ROOK','Wraith, this is Rook. Crew 4 is by the barn. Walk over and say hello.'],['ROOK','Left thumb moves, right thumb aims. JET hops; hold it to hover.']]},
          {t:'hold',label:'GUARD THE DIG',at:[45,40],r:30,time:60,every:15,waves:[{skitter:4},{skitter:5},{skitter:4,hound:1},{skitter:6}],cp:1,
           radio:[['DIG CREW','Rook... something just twitched in the wreck pile.'],['ROOK','Old 2126 drones. Dead fifty years. They should not be moving.']]},
          {t:'destroy',label:'KNOCK OUT THE RELAY MASTS',masts:[0,1,2],wave:{skitter:4,hound:1},cp:1,
           radio:[['ROOK','They are taking orders through the farm masts. Somebody is talking to them.'],['UNKNOWN','Crew 4. This field is claimed. Leave it.']]}]},
  {id:2,name:'HARBOR NINE',map:'docks',look:NIGHT_DOCKS,start:[9,88,0],
   brief:['Harbor 9, midnight. The dig crews ship their cores out from here.','Someone planted spawner pods in the container stacks overnight. Find all four.'],
   steps:[{t:'reach',label:'GET INTO THE YARD',at:[9,28],r:10,wave:{skitter:5},radio:[['ROOK','Stay in the lanes. The stacks are too tall to hop.']]},
          {t:'destroy',label:'DESTROY THE SPAWNER PODS',spawners:[[-59,4],[43,-20],[-25,-62],[77,46]],wave:{skitter:4,hound:1},cp:1,
           radio:[['ROOK','Pods print Skitters until they are destroyed. The marker shows the nearest one.'],['UNKNOWN','Every crate in this harbor is mine.']]},
          {t:'reach',label:'GET TO THE MIDDLE CRANE',at:[9,-84],r:12,wave:{gunner:1,hound:2},cp:1,radio:[['ROOK','Pods are down. Get to the crane, I am lifting you out.']]}]},
  {id:3,name:'PINE WAKE',map:'woods',start:[0,112,0],
   brief:['Crew 7 went quiet in the pine woods, next to a field of 2126 wrecks.','Find them, guard Rook while she gets them out, and watch for the pack.'],
   steps:[{t:'reach',label:'FIND CREW 7',at:[38,-18],r:16,wreck:1,wave:{skitter:4,hound:1},radio:[['ROOK','Their beacon is east of the trail. Watch the trees.'],['ROOK','Hounds crouch, then charge in a straight line. Step aside or hop.']]},
          {t:'hold',label:'GUARD ROOK',at:[38,-18],r:24,time:60,every:15,waves:[{hound:2,skitter:3},{skitter:6},{gunner:1,hound:1,skitter:3},{hound:3}],cp:1,
           radio:[['ROOK','Found them, all alive. One minute to load up. Keep them off me.'],['UNKNOWN','You dig in my yards, Rook. I see you.']]},
          {t:'clear',label:'BRING DOWN THE ALPHA HOUND',at:[26,-6],wave:{ahound:1,hound:2},cp:1,
           radio:[['ROOK','Big one coming out of the trees. Rust red.'],['ROOK','That is not a 2126 model. Somebody built it. Recently.']]},
          {t:'reach',label:'REACH THE NORTH RIDGE',at:[-19,-118],r:16,radio:[['ROOK','Crew 7 is clear. Meet me on the north ridge.']]}]},
  {id:4,name:'CREEK ROAD',map:'woods',mix:'creek',look:FOG_CREEK,start:[-14,-104,Math.PI],
   brief:['Fog along the creek. Rook is driving Crew 7’s cores out through the woods.','Escort her truck to the south road. If it is destroyed, the mission fails.'],
   steps:[{t:'escort',label:'ESCORT ROOK',hp:700,route:[[-22.8,-118],[-28.8,-96],[3.2,-73.6],[32,-44.8],[25.6,-6.4],[-9.6,19.2],[-35.2,51.2],[-19.2,89.6],[-8.9,112]],
           waves:[{skitter:5},{hound:2,skitter:3},{gunner:1,skitter:4},{brood:1},{gunner:2,hound:1}],every:18,cp:1,
           radio:[['ROOK','I only drive while you are close. Stay within 35 metres.'],['ROOK','Some of them go for the truck. Kill those first.'],['UNKNOWN','Those cores belong to me.']]}]},
  {id:5,name:'STORM RELAYS',map:'field',look:STORM_FIELD,start:[0,115,0],
   brief:['A storm over the fields. The voice is using three relays to reach its machines.','Take all three: stand in each ring until it fills. Then Rook can trace the signal.'],
   steps:[{t:'capture',label:'TAKE THE RELAYS',points:[[-55,40],[50,-10],[-30,-70]],r:13,time:25,every:20,cp:1,
           waves:[{gunner:1,skitter:3},{hound:2,skitter:2},{gunner:2},{hound:2,gunner:1},{skitter:6}],
           radio:[['ROOK','Stand in each ring until it fills. Lightning hits them too.'],['UNKNOWN','You cannot trace me, Wraith.']]},
          {t:'clear',label:'BRING DOWN GUNNER PRIME',at:[50,-10],wave:{gprime:1,gunner:1},cp:1,
           radio:[['ROOK','Signal traced: it comes from Foundry 4. And something huge just woke on the east road.'],['UNKNOWN','Meet my newest.']]}]},
  {id:6,name:'FOUNDRY FOUR',map:'foundry',tag:'CHAPTER END',start:[0,100,0],
   brief:['The signal leads to Foundry 4: FORGE’s old heart, cold since 2126.','Its furnaces are lit again. Hold the yard while Rook pulls the factory log.'],
   steps:[{t:'reach',label:'ENTER THE FOUNDRY YARD',at:[0,42],r:18,wave:{skitter:4,hound:2},cp:1,radio:[['ROOK','The furnaces are hot. Somebody has been building here.']]},
          {t:'hold',label:'HOLD THE YARD',at:[0,42],r:30,time:90,every:15,waves:[{skitter:6},{hound:3},{gunner:2,skitter:3},{brood:1},{gunner:1,hound:2},{skitter:6,hound:1}],cp:1,
           radio:[['ROOK','Ninety seconds to pull the log. Hold the yard.'],['UNKNOWN','You are standing in my factory.']]},
          {t:'clear',label:'BREAK OUT',at:[0,42],wave:{gprime:1,ahound:1},cp:1,radio:[['ROOK','Got the log. Two big ones at the gate!']]},
          {t:'reach',label:'GET BACK TO THE GATE',at:[0,100],r:14,radio:[['ROOK','The log names no one. Just orders for more machines, signed with a mark I have never seen.'],['ROOK','Get out, Wraith. Whoever this is, they are only getting started.']]}]},
];
const MID=parseInt(Q.get('mission')||'0',10),EMAP=(Q.get('endless')||'').toLowerCase(),MISSION=EMAP&&endlessBoss(EMAP)?endlessDef(EMAP):MISSIONS.find(m=>m.id===MID)||null;
/* difficulty climbs across the campaign: enemy damage and toughness per mission (mission 1 is gentle) */
const DIFF=MISSION?{dmg:[.8,.88,.95,1,1.06,1.12][MISSION.id-1]||1,hp:[.85,.9,.95,1,1.05,1.1][MISSION.id-1]||1}:{dmg:1,hp:1};   /* the chapter gets a little harder each mission; the EASY / MEDIUM / HARD setting multiplies on top (06n_story.js) */
const MS={step:-1,t:0,waveT:0,wi:0,hold:0,repairs:3,cp:null,kills0:0,time:0,done:false,objs:[],truck:null,zone:null,built:{},limitT:0,wpos:null,escort:null};
const SAVE={get(){try{return JSON.parse(store.get('save','{}'))||{};}catch(e){return {};}},put(o){store.set('save',JSON.stringify(o));}};
function unlocked(){return Math.max(1,SAVE.get().unlocked||1);}
/* ---- destructible objectives: radio masts (built by the field map), gate control boxes (made here) ---- */
const TARGETS=[];
function addTarget(o){o.hp=o.hpMax;o.dead=false;TARGETS.push(o);return o;}
function hitTargets(x0,y0,z0,x1,y1,z1){for(const t of TARGETS){if(t.dead)continue;for(const s of t.spheres){if(segSphere(x0,y0,z0,x1,y1,z1,s[0],s[1],s[2],s[3])>=0)return t;}}return null;}
function hurtTarget(t,d){if(t.dead)return;if(t.immune&&t.immune()){if(Math.random()<.3)sparks(t.x,t.y+3,t.z,3,[.8,.9,1]);return;}t.hp-=d;t.flash=1;if(t.hp<=0){t.dead=true;boom(t.x,t.y+3,t.z,1.8);setTimeout(()=>boom(t.x+1,t.y+6,t.z,1.2),250);addScore(300);addScrap(40);if(t.spawn!=null)pilotKill('spod',300);if(t.die)t.die();}}
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
function updRadio(dt){radioT-=dt;if(radioT<=0){const el=$('radio');if(RADIO.length){const [who,txt]=RADIO.shift();const foe=who==='FORGE'||who==='UNKNOWN';el.innerHTML='<b class="'+(foe?'fg':'rk')+'">'+who+'</b> '+txt;el.style.opacity=1;radioT=3.8;if(foe)sEShot();else sClick();}else if(el.style.opacity!=='0'){el.style.opacity=0;}}}
/* ---- running a mission ---- */
function spawnGroup(def,cx,cz,ring){const B=BND(),d=ring||[12,26];for(const id in def){let x=cx,z=cz,bx=null,bz=0,bd=-1;
    /* a clear spot more than 30 m from you; failing that, the clear spot furthest from you; failing that, the group's centre */
    for(let k=0;k<30;k++){const a=Math.random()*TAU,r=d[0]+Math.random()*(d[1]-d[0]);x=clamp(cx+Math.cos(a)*r,B.x0+4,B.x1-4);z=clamp(cz+Math.sin(a)*r,B.z0+4,B.z1-4);
      const c=navCell(x,z);if(c<0||NAV.block[c])continue;const pd=Math.hypot(x-P.x,z-P.z);if(pd>30){bx=x;bz=z;break;}if(pd>bd){bd=pd;bx=x;bz=z;}}
    if(bx!==null){x=bx;z=bz;}else{x=cx;z=cz;}
    BEACONS.push({x,z,t:1.3});for(let i=0;i<def[id];i++){const a=Math.random()*TAU,r=Math.random()*5+(i?2:0),c=collide(x+Math.cos(a)*r,z+Math.sin(a)*r,EDEF[id].r);spawnEnemy(id,c[0],c[1]);}}}
/* the marker points at the nearest thing still standing (masts, pods, lights, consoles); on a clear step, at the nearest straggler once they are all far away */
function nearLive(list){let b=null,bd=1e18;for(const t of list){if(t.dead)continue;const d=(t.x-P.x)**2+(t.z-P.z)**2;if(d<bd){bd=d;b=t;}}return b;}
function stepPos(s){if(MS.wpos)return MS.wpos;if(s.spawners||s.lights||s.masts||s.consoles){const t=nearLive(MS.objs);if(t)return t;return s.consoles?{x:s.consoles[0][0],z:s.consoles[0][1]}:null;}
  if(s.t==='clear'&&MS.strag&&!MS.strag.dead)return MS.strag;if(s.at)return s._at||(s._at={x:s.at[0],z:s.at[1]});return null;}
function beginStep(i){
  /* IH4: the story scene between two fights plays before its step begins */
  {const st=!MISSION.endless&&typeof STORY_TEXT!=='undefined'&&STORY_TEXT['m'+MISSION.id];if(st&&st.mid&&st.mid.at===i&&storyPlay('m'+MISSION.id+'.mid',()=>beginStep(i)))return;}
  MS.step=i;MS.t=0;MS.wi=0;MS.waveT=4;MS.hold=0;MS.objs=[];MS.strag=null;const s=MISSION.steps[i];if(!s)return finishMission(true);
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
  if(s.t==='destroy'){let left=0;for(const t of MS.objs)if(!t.dead)left++;txt+=' '+(MS.objs.length-left)+'/'+MS.objs.length;ok=left===0;}
  else if(s.t==='reach'){ok=Math.hypot(P.x-s.at[0],P.z-s.at[1])<s.r;}
  else if(s.t==='escort'){const r=escortStep(s,dt);txt=r.txt;ok=r.ok;MS.wpos=r.pos;
    /* IH4: a mid scene marked 'half' plays when the truck is halfway along its road */
    {const st=typeof STORY_TEXT!=='undefined'&&STORY_TEXT['m'+MISSION.id],E=MS.escort;if(st&&st.mid&&st.mid.at==='half'&&E&&E.ri>=E.route.length/2)storyPlay('m'+MISSION.id+'.mid');}}
  else if(s.t==='endless'){const r=endlessStep(s,dt);txt=r.txt;ok=false;MS.wpos=r.pos;}
  else if(s.t==='capture'){const r=captureStep(s,dt);txt=r.txt;ok=r.ok;MS.wpos=r.pos;}
  else if(s.t==='boss'){const r=BOSS_DEF[MISSION.boss].step(s,dt);txt=r.txt;ok=r.ok;MS.wpos=r.pos;}
  else if(s.t==='clear'){let n=0,b=null,bd=1e18;for(const e of EN){if(e.dead)continue;n++;const d=(e.x-P.x)**2+(e.z-P.z)**2;if(d<bd){bd=d;b=e;}}
    ok=MS.t>3&&n===0&&BEACONS.length===0;MS.strag=MS.t>3&&b&&bd>45*45?b:null;}
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
function finishMission(won){if(MISSION.endless)return endlessOver();if(MS.done)return;
  if(won&&storyPlay('m'+MISSION.id+'.close',()=>finishMission(true)))return;   /* IH4: the closing scene, then the results */MS.done=true;G.mode='results';
  const time=MS.time|0,bonus=won?2000+Math.max(0,600-time)*5+MS.repairs*400:0;if(won){addScore(bonus);addScrap(150+MS.repairs*25);addXP(bonus/2,'mission');}const got=bankScrap();
  const sv=SAVE.get();sv.best=sv.best||{};if(won){sv.unlocked=Math.max(sv.unlocked||1,MISSION.id+1);}sv.best[MISSION.id]=Math.max(sv.best[MISSION.id]||0,G.score);SAVE.put(sv);
  const tickets=Math.min(80,Math.floor(G.score/400)+(won?10:0));ARC.over(G.score,tickets);
  $('rtitle').textContent=won?(MISSION.tag==='CHAPTER END'?'CHAPTER 1 COMPLETE':'MISSION COMPLETE'):'MISSION FAILED';$('rtitle').className='logo'+(won?'':' bad');
  $('rstats').innerHTML=[['MISSION',MISSION.id+' · '+MISSION.name],['SCORE',G.score.toLocaleString('en-US')],['TIME',Math.floor(time/60)+':'+String(time%60).padStart(2,'0')],['KILLS',G.kills],['REPAIRS LEFT',MS.repairs],['SCRAP',got+' (TOTAL '+scrap()+')'],['TICKETS',tickets]].concat(pilotRows()).map(r=>'<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
  $('rnext').style.display=won&&MISSIONS.find(m=>m.id===MISSION.id+1)?'':'none';$('results').style.display='flex';jetLoop(0);
}
/* falling in a mission: repair at the last checkpoint (3 repairs per mission), then the mission is lost */
function missionDown(){if(MS.repairs<=0){MS.failT=2.2;return false;}return true;}   /* counted in game time (tick), so it also works when timers are slowed */
function repairAtCheckpoint(){MS.repairs--;const cp=MS.cp||{step:0,x:MISSION.start[0],z:MISSION.start[1],yaw:MISSION.start[2],tier:GUN.base};
  clearFight();P=mkPlayer();applyUpgrades();P.x=cp.x;P.z=cp.z;P.y=hgt(cp.x,cp.z);P.yaw=P.legYaw=cp.yaw;CAMS.ready=false;if(M)M.root.visible=true;
  P.hull=P.hullMax;P.shield=P.shieldMax;P.cells=P.cells;GUN.tier=Math.max(GUN.base,(cp.tier||1)-1);GUN.heat=0;GUN.over=false;$('down').style.display='none';G.mode='play';
  for(const t of MS.objs)if(!t.dead){t.hp=t.hpMax;}beginStep(cp.step);HUD.msg('REPAIRED · '+MS.repairs+' LEFT',2);}
function startMission(){MS.scrap=0;MS.built={};MS.escort=null;MS.wpos=null;MS.done=false;MS.repairs=3;MS.cp=null;MS.time=0;RADIO.length=0;P.x=MISSION.start[0];P.z=MISSION.start[1];P.y=hgt(P.x,P.z);P.yaw=P.legYaw=MISSION.start[2];CAMS.ready=false;beginStep(0);
  /* IH4: the intel brief for the whole mission: every machine in its steps, with how many (and its spawner pods) */
  if(!MISSION.endless){const c={};for(const s of MISSION.steps){for(const w of [s.wave].concat(s.waves||[]))if(w)for(const id in w)c[id]=(c[id]||0)+w[id];if(s.spawners)c.spod=(c.spod||0)+s.spawners.length;}briefMaybe(c,'MISSION '+MISSION.id,true);}}
/* mission list on the title screen */
function missionMenu(){const box=$('mlist'),u=unlocked(),best=SAVE.get().best||{};$('mlsub').textContent=CHAPTER;
  box.querySelector('.cards').innerHTML=MISSIONS.map(m=>{const lock=m.id>u;return '<button class="mcard'+(lock?' lock':'')+'" data-id="'+m.id+'"'+(lock?' disabled':'')+'><b>'+m.id+' · '+m.name+'</b><span>'+
    (lock?'LOCKED':MAPS[m.map].name+(m.tag||m.look&&m.look.tag?' · '+(m.tag||m.look.tag):'')+(best[m.id]?' · BEST '+best[m.id].toLocaleString('en-US'):''))+'</span></button>';}).join('');
  box.querySelectorAll('.mcard').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.set('mission',b.dataset.id);q.delete('map');location.search=q.toString();}));
  box.style.display='flex';}

/* ---- 06e_upgrades.js ---- */
/* ===================== hangar: scrap from wrecks buys upgrades (6 tracks, 5 levels each) =====================
   Scrap is earned in missions (kills, objectives, a bonus for finishing) and kept in hd-ironhowl3-save.scrap.
   Upgrades are applied when a run starts (applyUpgrades) and work in missions and in the sandbox. */
const UPG=[
  {id:'gun',name:'GUN',fx:['START AT TIER II','START AT TIER III','START AT TIER IV','+15% DAMAGE','+30% DAMAGE']},
  {id:'cool',name:'COOLING',fx:['-12% HEAT PER SHOT','-24% HEAT, FASTER COOLING','-36% HEAT, VENT 6 S','-48% HEAT, FASTER COOLING','-60% HEAT, VENT 4 S']},
  {id:'shield',name:'SHIELD',fx:['SHIELD 80','SHIELD 100, FASTER RECHARGE','SHIELD 120','SHIELD 140, RECHARGE AFTER 2 S','SHIELD 160']},
  {id:'msl',name:'MISSILES',fx:['SALVO OF 3, +4 AMMO','SALVO OF 4, +8 AMMO','SALVO OF 5, +12 AMMO','SALVO OF 6, +16 AMMO','SALVO OF 8, +20 AMMO']},
  {id:'jets',name:'JETS',fx:['3 FUEL CELLS','FASTER REFILL','STOMP LANDING (HURTS MACHINES BELOW)','4 FUEL CELLS','SALVO RECHARGES IN 8 S']},
  {id:'hull',name:'HULL',fx:['HULL 120','HULL 140, REPAIRS +45','HULL 160','HULL 180, REPAIRS +55','HULL 200']}];
const UPG_COST=[150,300,500,800,1200];
function upgLv(id){const u=(SAVE.get().upg)||{};return Math.min(5,u[id]||0);}
function scrap(){return SAVE.get().scrap||0;}
function addScrap(n){if(!MISSION)return;MS.scrap=(MS.scrap||0)+n*(MISSION.endless?.5:1);}
function bankScrap(){if(!MISSION||!MS.scrap)return 0;const sv=SAVE.get();sv.scrap=(sv.scrap||0)+MS.scrap;SAVE.put(sv);const n=MS.scrap;MS.scrap=0;return n;}
function buyUpg(id){const lv=upgLv(id);if(lv>=5)return false;const c=UPG_COST[lv],sv=SAVE.get();if((sv.scrap||0)<c)return false;sv.scrap-=c;sv.upg=sv.upg||{};sv.upg[id]=lv+1;SAVE.put(sv);return true;}
const UP={dmgK:1,stomp:false,repair:35};
function applyUpgrades(){
  const g=upgLv('gun'),c=upgLv('cool'),s=upgLv('shield'),m=upgLv('msl'),j=upgLv('jets'),h=upgLv('hull');
  GUN.base=1+Math.min(3,g);UP.dmgK=1+Math.max(0,g-3)*.15;
  HEAT.shot=2.3*(1-.12*c);HEAT.cool=30*(1+[0,0,.15,.15,.3,.3][c]);GUN.ventCool=[8,8,8,6,6,4][c];
  P.shieldMax=[60,80,100,120,140,160][s];P.shield=P.shieldMax;P.regenDelay=s>=4?2:3;P.regenRate=s>=2?30:22;
  MSL.salvo=[2,3,4,5,6,8][m];MSL.max=24+[0,4,8,12,16,20][m];MSL.ammo=12+[0,4,8,12,16,20][m];
  P.cells=j>=4?4:j>=1?3:2;P.fuel=P.cells;JET.refill=j>=2?2.4:3.2;UP.stomp=j>=3;SALVO.cool=j>=5?8:12;
  P.hullMax=[100,120,140,160,180,200][h];P.hull=P.hullMax;UP.repair=h>=4?55:h>=2?45:35;
  GUN.tier=GUN.base;
  if(!hasKit('mpod')){MSL.ammo=0;MSL.max=0;}   /* Ironhowl 4: missiles come from the MP-9 pod */
  UP.dmgK0=UP.dmgK;applyAssists();   /* Ironhowl 4: the AI assists from pilot levels (06m_pilot.js) */
}
function hangar(){
  const box=$('hangar');
  const draw=()=>{$('hscrap').textContent='SCRAP '+scrap().toLocaleString('en-US');
    $('hrows').innerHTML=UPG.map(u=>{const lv=upgLv(u.id),max=lv>=5,c=UPG_COST[lv]||0,can=!max&&scrap()>=c;
      return '<div class="hrow"><div class="hn"><b>'+u.name+'</b><span class="pips">'+'●'.repeat(lv)+'○'.repeat(5-lv)+'</span><span class="fx">'+(max?'MAXED':'NEXT: '+u.fx[lv])+'</span></div>'+
        '<button data-id="'+u.id+'"'+(can?'':' disabled')+'>'+(max?'DONE':c+' SCRAP')+'</button></div>';}).join('');
    box.querySelectorAll('.hrow button').forEach(b=>b.onclick=e=>{e.stopPropagation();if(buyUpg(b.dataset.id)){sPickup();draw();}});};
  draw();box.style.display='flex';
}

/* ---- 06f_more.js ---- */
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
  const base=add(POD_GEO.base,gm,0,.4,0),shell=add(POD_GEO.shell,arm,0,.8,0),ring=add(POD_GEO.ring,glow,0,.9,0);const eye=add(POD_GEO.eye,glow,0,3.1,0);
  const fins=[0,1,2,3].map(i=>{const a=i/4*TAU+.4;return add(POD_GEO.fin,gm,Math.sin(a)*2.3,1.4,Math.cos(a)*2.3,a);});
  S.add(g);addBox(x-2.6,z-2.6,x+2.6,z+2.6,3);
  const t=addTarget({x,z,y,hpMax:320,spheres:[[x,y+1.8,z,2.6],[x,y+4.3,z,1.7]],obj:g,spawn:2+Math.random()*3,eye,glow,
    die(){glow.color.setRGB(.12,.02,.01);shell.scale.y=.45;eye.visible=false;
      if(t.pod){t.pod.position.y=-.8;t.pod.rotation.z=.16;t.podMat.color.setScalar(.3);t.podMat.onBeforeCompile=SPOD.mat.onBeforeCompile;t.podMat.customProgramCacheKey=SPOD.mat.customProgramCacheKey||(()=>'');t.podMat.needsUpdate=true;}}});
  /* Ironhowl 4: the FORGE spawner pod model replaces these shapes once it has loaded (06j_forge.js) */
  if(typeof spodDress==='function')spodDress(t,g,x,z,[base,shell,ring,...fins]);
  return t;}
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
  E.hp-=bite*dt;if(bite&&(E.hitT-=dt)<=0){E.hitT=4;radio([['ROOK',['They’re on my truck!','Get them off me, Wraith!','I’m taking hits here!'][(Math.random()*3)|0]]]);}
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

/* ---- 06g_set7.js ---- */
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
      if(c.prog>=1){c.done=true;c.ring.material.color.setRGB(.3,.8,1);c.lm.color.setRGB(.3,.8,1).multiplyScalar(3);sPickup();HUD.msg('RELAY TAKEN',2);radio([['ROOK',['One relay’s ours.','Two down. One to go!','That’s all three. Tracing now.'][n]]]);n++;}}}
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

/* ---- 06h_endless.js ---- */
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
  /* IH4: each heavy wave also brings one of the FORGE bosses, in turn: wave 5 Alpha Hound, 15 Gunner Prime, 25 Brood Skitter, 35 Alpha Hound ... */
  if(n%5===0)add(['ahound','gprime','brood'][((n/5|0)-1)/2%3|0],1);
  if(n%5===0){add('gunner',2+(n/10|0));add('hound',2);if(n>=11)add('bulwark',1+(n/20|0));if(n>=13)add('tank',1+(n/25|0));else add('gunner',1);return w;}
  const pool=EN_ORDER.filter(t=>n>=t[1]),tot=pool.reduce((a,t)=>a+t[2],0),count=Math.min(24,3+n);
  for(let i=0;i<count;i++){let r=Math.random()*tot;for(const t of pool){r-=t[2];if(r<=0){add(t[0],1);break;}}}
  return w;}
function endlessBegin(){MS.repairs=0;Object.assign(EW,{wave:0,state:'break',t:6,boss:false,queue:[],qt:0});DIFF.dmg=.9;DIFF.hp=1;G.hpK=1;
  radio([['ROOK','Endless. They keep coming, and every wave is a little worse.'],['ROOK','Supplies drop between waves. Every tenth wave, something big.']]);}
function startEWave(){const n=++EW.wave;G.hpK=Math.min(2.2,1+.035*(n-1));DIFF.dmg=Math.min(1.6,.9+.025*(n-1));
  if(n>1)addXP(100+50*(n-1),'wave');const w=endlessWave(n),list=[];briefMaybe(w,'WAVE '+n);for(const id in w)for(let i=0;i<w[id];i++)list.push(id);list.sort(()=>Math.random()-.5);
  EW.queue=[];EW.qn=list.length;for(let i=0;i<list.length;i+=6){const g={};for(const id of list.slice(i,i+6))g[id]=(g[id]||0)+1;EW.queue.push(g);}EW.qt=0;EW.state='fight';
  if(n%10===0&&MISSION.boss){if(BOSS.o&&BOSS.kind!=='forge')S.remove(BOSS.o);if(!(MISSION.boss==='forge'&&BOSS.o&&!BOSS.dead)){BOSS_DEF[MISSION.boss].make(...MISSION.bossAt);}
    BOSS.idle=false;EW.boss=true;radio([['FORGE',['SOMETHING LARGER IS COMING.','MEET MY BEST WORK.','YOU WILL NOT SURVIVE THIS ONE.'][(n/10-1)%3]]]);}
  HUD.banner(n%10===0?'WAVE '+n+' · BOSS':n%5===0?'WAVE '+n+' · HEAVY':'WAVE '+n);sClick();
  if(n>1&&n%4===1)radio([[Math.random()<.5?'ROOK':'FORGE',ENDLESS_LINES[Math.random()<.5?0:1][(Math.random()*6)|0]]]);}
const ENDLESS_LINES=[['Still standing. Good.','They are getting tougher, Wraith. So are you.','Keep moving. Do not let them box you in.','Watch the edges. They like to flank.','Use the breaks. Grab the crates.','Another wave. Deep breath.'],
  ['YOUR RESISTANCE IS NOTED.','I HAVE MORE MACHINES THAN YOU HAVE TIME.','EVERY WAVE IS AN EXPERIMENT. YOU ARE THE SUBJECT.','RECALCULATING.','YOU CANNOT DO THIS FOREVER.','THE FACTORY NEVER SLEEPS.']];
function aliveN(){let n=0;for(const e of EN)if(!e.dead)n++;return n;}
function endlessStep(s,dt){const alive=aliveN();
  if(EW.state==='break'){EW.t-=dt;if(EW.t<=0)startEWave();return {txt:'WAVE '+(EW.wave+1)+' IN '+Math.max(1,Math.ceil(EW.t)),ok:false,pos:null};}
  let bossPos=null;if(EW.boss&&BOSS.o){const r=BOSS_DEF[MISSION.boss].step(s,dt);bossPos=r.pos;if(BOSS.dead&&BOSS.deadT>2.5){EW.boss=false;addScore(3000);}}
  if(EW.queue.length&&(EW.qt-=dt)<=0){EW.qt=7;const g=EW.queue.shift(),q=spawnSpot();for(const id in g)EW.qn-=g[id];spawnGroup(g,q[0],q[1],[0,10]);}
  const left=alive+(EW.queue.length?EW.qn:0);   /* machines still to come are counted as the groups leave the queue */
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
    ['KILLS',G.kills],['TIME',Math.floor(time/60)+':'+String(time%60).padStart(2,'0')],['SCRAP',got+' (TOTAL '+scrap()+')'],['TICKETS',tickets]].concat(pilotRows()).map(r=>'<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
  $('rnext').style.display='none';$('results').style.display='flex';jetLoop(0);}
function endlessMenu(){const box=$('elist'),E=SAVE.get().endless||{};
  box.querySelector('.cards').innerHTML=['field','woods','docks','foundry'].map(m=>{const b=E[m];return '<button class="mcard" data-map="'+m+'"><b>'+MAPS[m].name+'</b><span>'+
    (b?'BEST WAVE '+b.wave+' · '+b.score.toLocaleString('en-US'):'NOT PLAYED YET')+'</span></button>';}).join('');
  box.querySelectorAll('.mcard').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.delete('mission');q.delete('map');q.set('endless',b.dataset.map);location.search=q.toString();}));
  box.style.display='flex';}
/* ---- extra radio: checkpoints, low hull, overheating, combos, and FORGE getting angrier through the campaign ---- */
const RX={hullT:0,heatT:0,comboT:0,forgeT:40,lastCombo:0,wasOver:false};
const FORGE_POOL=[['This land was claimed before you were built.','Your crews dig. My machines wake.','Turn around, Wraith.','Every wreck out here answers to me.'],   /* IH4: the voice (UNKNOWN), by mission 1-2, 3-4, 5-6 */
  ['You are very good. That is a problem for you.','Your truck is slow, Rook.','I build faster than you break.','My yards. My cores. My machines.'],
  ['You are walking into my house.','The foundry never really went cold.','I have a new model for every one you break.','Keep coming. I am watching how you fight.']];
function updRadioX(dt){if(G.mode!=='play'||!MISSION||MS.done||P.dead)return;
  RX.hullT-=dt;RX.heatT-=dt;RX.comboT-=dt;RX.forgeT-=dt;
  if(P.hull/P.hullMax<.3&&RX.hullT<=0){RX.hullT=25;radio([['ROOK',['Hull under a third. Find a green repair.','You are leaking oil. Back off and recover.','Shield first, Wraith. Break line of sight.'][(Math.random()*3)|0]]]);}
  if(GUN.over&&!RX.wasOver&&RX.heatT<=0){RX.heatT=30;radio([['ROOK','Gun is cooking. Hit VENT.']]);}RX.wasOver=GUN.over;
  if(G.combo>=5&&RX.lastCombo<5&&RX.comboT<=0){RX.comboT=20;radio([['ROOK',['Five in a row!','That is a streak.','Look at you go.'][(Math.random()*3)|0]]]);}RX.lastCombo=G.combo;
  if(RX.forgeT<=0&&!MISSION.endless){RX.forgeT=45+Math.random()*30;if(Math.random()<.55){const tier=MISSION.id<=2?0:MISSION.id<=4?1:2;radio([['UNKNOWN',FORGE_POOL[tier][(Math.random()*4)|0]]]);}}}
/* ---- attract demo: walks the route, and when machines show up it turns, shoots, hops over charges and fires the salvo. It cannot die. ---- */
const DM={spawnT:6,viewT:9,orbT:30,orbit:0,aimT:0,view:'far'};
function demoFight(c,dt){
  DM.spawnT-=dt;if(DM.spawnT<=0){DM.spawnT=12;if(aliveN()<4){const q=spawnSpot();spawnGroup(Math.random()<.6?{skitter:3}:{hound:1,skitter:2},q[0],q[1],[0,8]);}}
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

/* ---- 06i_bay.js ---- */
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

/* ---- 06j_forge.js ---- */
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
function f4load(id){const d=EDEF[id],[dir,stem]=d.m4,f=kitFiles(dir,stem,false);d.amat=kitMat(f,true);if(id==='skitter')spodModel().catch(()=>{});   /* the pod model loads with the machines, not when the first pod appears */
  
  return loadGLB(f.glb).then(sc=>{dressModel(sc,d.amat);ETPL[id]=sc;sc.updateMatrixWorld(true);
    const J={};sc.traverse(o=>{if(o.name)J[o.name]=J[o.name]||o;});
    if(dir==='fgunner'&&!F4.gunner){const hw=new THREE.Vector3().setFromMatrixPosition(J.hips.matrixWorld).y;F4.gunner={hip0:J.hips.position.y,hipW:hw,tor0:J.torso.position.y,armY:new THREE.Vector3().setFromMatrixPosition(J.arm_R.matrixWorld).y,
      legs:[-1,1].map(sd=>legSetup(J,sd<0?'L':'R',sd,hw))};}
  }).catch(e=>console.error('FORGE model',id,e));}
/* the spawner pod model, for mission pods and the Brood Skitter */
let SPOD=null;
function spodModel(){if(!SPOD){const f=kitFiles('spod','spod',false);SPOD={mat:kitMat(f,true),p:loadGLB(f.glb).then(flattenModel)};
    SPOD.p.catch(err=>{console.warn('spawner pod model',err);SPOD=null;});}   /* a failed load is tried again next time */
  return SPOD.p.then(sc=>dressModel(sc.clone(true),SPOD.mat));}   /* a copy for each pod */
/* a static model's parts merged into one mesh (the pod: 8 meshes, 16 draws with shadows, become 1 and 2) */
function flattenModel(sc){sc.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(sc.matrixWorld).invert(),M_=new THREE.Matrix4(),ms=[];sc.traverse(o=>{if(o.isMesh)ms.push(o);});
  if(ms.length<2)return sc;const idx=ms.every(o=>o.geometry.index);
  const gs=ms.map(o=>{const g=idx?o.geometry.clone():o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();for(const n of Object.keys(g.attributes))if(!['position','normal','uv'].includes(n))g.deleteAttribute(n);g.applyMatrix4(M_.multiplyMatrices(inv,o.matrixWorld));return g;});
  const merged=THREE.mergeGeometries(gs,false);if(!merged)return sc;gs.forEach(g=>g.dispose());
  const root=new THREE.Group(),mesh=new THREE.Mesh(merged,ms[0].material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return root;}
/* the mission spawner pods (06f_more.js) wear the model: x2.2 (5.7 m tall), turned to face the player's start, red seams glowing */
function spodDress(t,g,x,z,parts){spodModel().catch(()=>null).then(p=>{if(!p)return;   /* no model: the old pod shapes stay */
  const m=SPOD.mat.clone();m.onBeforeCompile=sh=>{SPOD.mat.onBeforeCompile&&SPOD.mat.onBeforeCompile(sh);
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
function broodPod(e){spodModel().then(p=>{if(e.dead)return;p.scale.setScalar(.8/e.d.sc);p.position.set(0,.84,.12);e.o.add(p);}).catch(()=>{});}
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

/* ---- 06k_kit.js ---- */
/* ===================== Ironhowl 4: the kit's own behaviours (session 3) =====================
   Each forearm fires its own weapon when you hold FIRE:
     AC-4 autocannon  Ironhowl 3's gun (06b_weapons.js): heat, VENT, tiers. One autocannon arm fires at 60 % of the pair's rate.
     LN-1 Lance       charges while FIRE is held (1.2 s) and fires by itself when full; let go early (past a quarter) for a weaker
                      shot. A rail shot: instant, 260 m, goes through up to 3 machines (100 %, 80 %, 60 % of 120 damage).
     AR-1 Arc         4 zaps a second at the machine nearest the crosshair within 35 m; each zap jumps on to the nearest machine
                      within 12 m of the last, up to 4 machines, 14 damage each.
   WT-1 Watcher (shoulder): radar (220 m), red marks on up to 8 machines, missile lock 40 % faster, a yellow warning at the screen
     edge for shots and Hound charges coming from outside your view.
   DR-1 assist drone: leaves the jet pack when machines come within 70 m and flies beside you; small gun (5 a shot, 3 a second,
     60 m); between fights it repairs the hull (2 a second); its own 40 shield, and when that breaks it goes home to recharge.
   JP-2 jet pack: keep holding JET after a hop and you hover (06_player.js): 30 s of hover per full tank, refilled on the ground. */
const LANCE={charge:1.2,dmg:120,range:260,pierce:3,fall:[1,.8,.6],cool:.35};
const ARCW={range:35,hop:12,jumps:4,dmg:14,rate:4,cone:.95};
const WATCH={radar:220,marks:8,lockK:.6};   /* lockK: lock time multiplier (40 % faster) */
const LOCK={time:.6,cone:.6,range:180};
const DRN={gun:5,rate:3,range:60,repair:2,shield:40,wake:70,recharge:4};
const KX={beams:[],bm:null,col:new THREE.Color(),m4:new THREE.Matrix4(),q:new THREE.Quaternion(),s:new THREE.Vector3(),p:new THREE.Vector3(),z:new THREE.Vector3(0,0,1),d:new THREE.Vector3()};
const _ka=new THREE.Vector3(),_kb=new THREE.Vector3();
function kitKind(i){const A=M&&M.ready&&M.arms[i];return A&&A.kind||'ac';}
function kitHas(id){if(!M||!M.W)return false;const K=M.W.kit;for(const k in K)if(K[k]===id)return true;return false;}

/* ---- beams: one instanced mesh of glowing cylinders for the rail shots, the lightning and the drone's repair beam ---- */
function kitFxInit(){if(KX.bm)return;const g=new THREE.CylinderGeometry(1,1,1,6,1,true);g.rotateX(Math.PI/2);
  const m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  KX.bm=new THREE.InstancedMesh(g,m,400);KX.bm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);KX.bm.setColorAt(0,KX.col.setRGB(0,0,0));
  KX.bm.count=0;KX.bm.frustumCulled=false;KX.bm.renderOrder=4;S.add(KX.bm);}
function beam(a,b,r,col,life){KX.beams.push({a:[a.x,a.y,a.z],b:[b.x,b.y,b.z],r,col,life,t:0});}
/* a jagged line from a to b: n pieces, each corner pushed sideways by up to j metres */
function bolt(a,b,r,col,life,j){const n=Math.max(3,Math.min(10,Math.round(a.distanceTo(b)/2.2)));let p=a.clone();
  for(let i=1;i<=n;i++){const q=i===n?b.clone():a.clone().lerp(b,i/n).add(new THREE.Vector3((Math.random()-.5)*2*j,(Math.random()-.5)*2*j,(Math.random()-.5)*2*j));
    beam(p,q,r,col,life);p=q;}}
function updBeams(dt){if(!KX.bm)kitFxInit();const L=KX.beams;let n=0;
  for(let i=L.length-1;i>=0;i--){const B=L[i];B.t+=dt;if(B.t>=B.life){L.splice(i,1);continue;}}
  for(const B of L){if(n>=400)break;const f=1-B.t/B.life,a=B.a,b=B.b;KX.d.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=KX.d.length();if(len<1e-3)continue;
    KX.p.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);KX.q.setFromUnitVectors(KX.z,KX.d.multiplyScalar(1/len));const r=B.r*(.4+.6*f);KX.s.set(r,r,len);
    KX.m4.compose(KX.p,KX.q,KX.s);KX.bm.setMatrixAt(n,KX.m4);KX.bm.setColorAt(n,KX.col.setRGB(B.col[0]*f,B.col[1]*f,B.col[2]*f));n++;}
  KX.bm.count=n;KX.bm.instanceMatrix.needsUpdate=true;if(KX.bm.instanceColor)KX.bm.instanceColor.needsUpdate=true;}
function sRail(k){nz('highpass',5200,700,.5,.42*k+.12,1.4);thump(110,34,.35,.5*k+.15,0,0);tone('sawtooth',1400,90,.32,.07);}
function sCharge(){tone('sine',180,1100,LANCE.charge,.05);}
function sArc(){nz('bandpass',4200,1500,.09,.11,3);tone('square',1900,700,.06,.025);}
let HOVS=0;function updHoverFx(dt){if(!P.hovering)return;HOVS-=dt;if(HOVS<=0){HOVS=.38;nz('bandpass',420,760,.45,.1,.8);}}
function sWarn(){tone('square',1320,1320,.07,.05);setTimeout(()=>tone('square',1320,1320,.07,.05),110);}

/* ---- the forearms: called from updGun every frame ---- */
function kitArms(c,dt){if(!M||!M.ready)return;const hold=c.fire&&!P.dead;let lances=0;
  M.arms.forEach((A,i)=>{if(A.kind==='ln')lanceArm(A,hold,dt,lances++);else if(A.kind==='ar')arcArm(A,hold,dt,i);});}
function lanceArm(A,hold,dt,k){A.cd=Math.max(0,(A.cd||0)-dt);if(A.ch==null)A.ch=0;
  if(hold&&A.cd<=0){if(!A.chg){A.chg=true;A.ch=k?-.125:0;if(!k)sCharge();}A.ch=Math.min(1,A.ch+dt/LANCE.charge*(UP.chargeK||1));if(A.ch>=1)railShot(A,1);}
  else if(!hold&&A.chg){A.chg=false;if(A.ch>=.25)railShot(A,A.ch);A.ch=0;}
  else if(!hold)A.ch=0;
  /* the charge: a glow at the muzzle that grows, and sparks drawn into it */
  if(!A.glow){const si=A.sd>0?1:0;if(!KX.lg){KX.lg=new THREE.SphereGeometry(1,12,8);KX.lm=[0,1].map(()=>new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.8,1).multiplyScalar(4),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));}
    A.glow=new THREE.Mesh(KX.lg,KX.lm[si]);   /* one shape and one material per side, kept across refits */
    A.glow.renderOrder=5;A.muzzle.add(A.glow);}
  const ch=Math.max(0,A.ch||0);A.glow.visible=ch>0;if(ch>0){const s=.08+ch*.32+(ch>=.99?Math.random()*.06:0);A.glow.scale.setScalar(s/Math.max(1e-3,A.muzzle.getWorldScale(_kb).x));A.glow.material.opacity=.5+ch*.5;
    if(Math.random()<dt*40*ch){A.muzzle.getWorldPosition(_ka);const a=Math.random()*TAU,b=Math.random()*TAU,r=1.2;
      part({x:_ka.x+Math.cos(a)*r,y:_ka.y+Math.sin(b)*r,z:_ka.z+Math.sin(a)*r,vx:-Math.cos(a)*r*5,vy:-Math.sin(b)*r*5,vz:-Math.sin(a)*r*5,life:.2,s0:.25,s1:.05,a:1.5,col:[.55,.8,1],glow:true});}}}
function railShot(A,k){A.muzzle.getWorldPosition(_ka);const s=_ka.clone();
  const d=new THREE.Vector3(AIM.x-s.x,AIM.y-s.y,AIM.z-s.z);if(d.lengthSq()<1)d.set(-Math.sin(P.yaw),0,-Math.cos(P.yaw));d.normalize();
  /* where it stops: the ground or a tree trunk (2 m steps, then 0.25 m) */
  let len=LANCE.range;for(let t=2;t<=LANCE.range;t+=2){const x=s.x+d.x*t,y=s.y+d.y*t,z=s.z+d.z*t;if(y<hgt(x,z)||treeAt(x,z,y)){let u=t-2;while(u<t){u+=.25;const x2=s.x+d.x*u,y2=s.y+d.y*u,z2=s.z+d.z*u;if(y2<hgt(x2,z2)||treeAt(x2,z2,y2))break;}len=u;break;}}
  const e1=s.clone().addScaledVector(d,len);
  const hits=[];for(const e of EN){if(e.dead||e.spawnT>0)continue;const t=segSphere(s.x,s.y,s.z,e1.x,e1.y,e1.z,e.x,e.y+e.d.cy,e.z,e.d.r*1.1);if(t>=0)hits.push([t,e]);}
  hits.sort((a,b)=>a[0]-b[0]);const dmg=LANCE.dmg*k*UP.dmgK*(UP.railK||1);
  hits.slice(0,LANCE.pierce+(UP.pierce||0)).forEach(([t,e],i)=>{const hx=s.x+(e1.x-s.x)*t,hy=s.y+(e1.y-s.y)*t,hz=s.z+(e1.z-s.z)*t;
    hurtEnemy(e,dmg*(LANCE.fall[i]||.6),hx,hy,hz);e.kx+=d.x*6*k;e.kz+=d.z*6*k;sparks(hx,hy,hz,10,[.6,.85,1]);});
  const tg=hitTargets(s.x,s.y,s.z,e1.x,e1.y,e1.z);if(tg)hurtTarget(tg,dmg);
  if(hits.length)GUN.hitT=.2;
  /* the beam: a white core in a blue sleeve, a flash at the muzzle and where it lands */
  beam(s,e1,.09+.07*k,[2.2,2.4,2.6],.22+.12*k);beam(s,e1,.3+.2*k,[.25,.55,1.3],.3+.15*k);
  for(let i=0;i<3;i++)part({x:s.x+d.x*i*.6,y:s.y+d.y*i*.6,z:s.z+d.z*i*.6,vx:0,vy:0,vz:0,life:.1,s0:1.8-i*.4,s1:.6,a:2,col:[.7,.9,1],glow:true});
  if(len<LANCE.range-1){sparks(e1.x,e1.y+.1,e1.z,8,[.6,.85,1]);part({x:e1.x,y:e1.y+.3,z:e1.z,vx:0,vy:1,vz:0,life:.9,s0:1,s1:3,a:.35,col:DUST,drag:1.5});}
  A.kick=1.6;CAMS.shake=Math.max(CAMS.shake,.18+.15*k);MFL.position.copy(s);GUN.flash=1;sRail(k);A.ch=0;A.chg=false;A.cd=LANCE.cool;}
function arcArm(A,hold,dt,i){if(A.cd==null)A.cd=i?.5/ARCW.rate:0;A.cd-=dt;if(!hold){A.cd=Math.max(A.cd,i?.5/ARCW.rate:0);return;}
  if(A.cd>0)return;A.cd+=1/ARCW.rate;if(A.cd<0)A.cd=0;arcZap(A);}
function arcZap(A){A.muzzle.getWorldPosition(_ka);const s=_ka.clone(),fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  const ok=e=>!e.dead&&e.spawnT<=0;
  /* first: the machine under the crosshair if it is close enough, otherwise the one nearest the crosshair line in front of you */
  let first=AIM.e&&ok(AIM.e)&&Math.hypot(AIM.e.x-P.x,AIM.e.z-P.z)<ARCW.range+AIM.e.d.r?AIM.e:null;
  if(!first){let best=1e9;for(const e of EN){if(!ok(e))continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>ARCW.range+e.d.r)continue;
    const ang=Math.acos(clamp((dx*fx+dz*fz)/(d||1),-1,1));if(ang>ARCW.cone)continue;const sc=ang+d/80;if(sc<best){best=sc;first=e;}}}
  const col=[.35,.6,1.9],pts=[s];
  if(!first){/* nothing to hit: a short crackle toward the crosshair, or the nearest spawner pod or target */
    let tg=null,bd=ARCW.range;for(const t of TARGETS){if(t.dead)continue;const q=t.spheres[0],d=Math.hypot(q[0]-P.x,q[2]-P.z)-q[3];if(d<bd){const ang=Math.acos(clamp(((q[0]-P.x)*fx+(q[2]-P.z)*fz)/(Math.hypot(q[0]-P.x,q[2]-P.z)||1),-1,1));if(ang<ARCW.cone){bd=d;tg=t;}}}
    if(tg){const q=tg.spheres[0],p=new THREE.Vector3(q[0],q[1],q[2]);bolt(s,p,.07,col,.11,.7);hurtTarget(tg,ARCW.dmg*UP.dmgK);sparks(p.x,p.y,p.z,4,[.6,.85,1]);}
    else{const p=new THREE.Vector3(AIM.x,AIM.y,AIM.z).sub(s);p.setLength(Math.min(9,p.length()));p.add(s);bolt(s,p,.05,col,.08,.6);}
    sArc();return;}
  const hit=[first];let cur=first;
  while(hit.length<ARCW.jumps+(UP.jumps||0)){let nx=null,bd=ARCW.hop;for(const e of EN){if(!ok(e)||hit.includes(e))continue;const d=Math.hypot(e.x-cur.x,e.z-cur.z)-e.d.r-cur.d.r;if(d<bd){bd=d;nx=e;}}
    if(!nx)break;hit.push(nx);cur=nx;}
  let p=s;for(const e of hit){const q=new THREE.Vector3(e.x+(Math.random()-.5)*e.d.r*.6,e.y+e.d.cy*(.6+Math.random()*.6),e.z+(Math.random()-.5)*e.d.r*.6);
    bolt(p,q,.07,col,.11,Math.min(1.4,.08*p.distanceTo(q)+.3));bolt(p,q,.025,[1.6,1.8,2.2],.08,.3);
    hurtEnemy(e,ARCW.dmg*UP.dmgK,q.x,q.y,q.z);sparks(q.x,q.y,q.z,4,[.6,.85,1]);p=q;}
  part({x:s.x,y:s.y,z:s.z,vx:0,vy:0,vz:0,life:.08,s0:1.3,s1:.5,a:1.8,col:[.6,.8,1],glow:true});A.kick=.4;GUN.hitT=.12;sArc();}

/* ---- missile lock (MP-9): a machine near the crosshair for 0.6 s is locked (0.36 s with the Watcher); missiles at locked
   machines turn hard, missiles at others turn gently, and with nothing in front they fly at the crosshair ---- */
function updLock(dt){const T=LOCK.time*(kitHas('watcher')?WATCH.lockK:1)*(UP.lockK||1),pod=MSL.ammo>0&&kitHas('mpod');cam.getWorldDirection(_kb);
  for(const e of EN){if(e.dead||e.spawnT>0){e.lk=0;continue;}const ex=e.x-cam.position.x,ey=e.y+e.d.cy-cam.position.y,ez=e.z-cam.position.z,d=Math.hypot(ex,ey,ez);
    const a=Math.acos(clamp((ex*_kb.x+ey*_kb.y+ez*_kb.z)/(d||1),-1,1));e.lka=a;const inC=pod&&a<LOCK.cone&&d<LOCK.range;
    const was=(e.lk||0)>=1;e.lk=inC?Math.min(1,(e.lk||0)+dt/T):Math.max(0,(e.lk||0)-dt*2);if(!was&&e.lk>=1)tone('sine',1500,1700,.05,.03);}}
function lockCands(){return EN.filter(e=>!e.dead&&e.spawnT<=0&&e.lka<LOCK.cone&&Math.hypot(e.x-P.x,e.z-P.z)<LOCK.range).sort((a,b)=>((b.lk>=1)-(a.lk>=1))||(a.lka-b.lka));}

/* ---- the Watcher's warnings: a yellow arc at the screen edge before a shot or a charge reaches you ---- */
let WARN_T=0;
function updWarn(dt){WARN_T-=dt;if(!kitHas('watcher')||P.dead)return;const cx=P.x,cy=P.y+3,cz=P.z;
  for(const b of EBOLTS){if(b.warned)continue;const rx=cx-b.x,ry=cy-b.y,rz=cz-b.z,v2=b.vx*b.vx+b.vy*b.vy+b.vz*b.vz||1,t=(rx*b.vx+ry*b.vy+rz*b.vz)/v2;
    if(t<0||t>1.1)continue;const mx=b.x+b.vx*t-cx,my=b.y+b.vy*t-cy,mz=b.z+b.vz*t-cz;if(mx*mx+my*my+mz*mz>16)continue;
    b.warned=true;if(Math.abs(angD(Math.atan2(-(b.x-P.x),-(b.z-P.z)),P.yaw))<.6)continue;   /* only shots from outside your view */
    HUD.warn(b.x-b.vx*.2,b.z-b.vz*.2);if(WARN_T<=0){WARN_T=.5;sWarn();}}
  for(const e of EN){if(e.dead)continue;if(e.st==='aim'&&e.id==='hound'){if(!e.warned){e.warned=true;if(Math.abs(angD(Math.atan2(-(e.x-P.x),-(e.z-P.z)),P.yaw))<.6)continue;HUD.warn(e.x,e.z);if(WARN_T<=0){WARN_T=.5;sWarn();}}}else if(e.st!=='charge')e.warned=false;}}

/* ---- the assist drone ---- */
const DR={st:'dock',hold:null,P:null,sh:DRN.shield,cd:0,tg:null,t:0,pos:new THREE.Vector3(),fix:0,rep:0,pt:{}};
const _kw=new THREE.Vector3(),_kq=new THREE.Quaternion(),_ke=new THREE.Euler();
function droneDockNow(){const h=DR.hold;if(!h)return;const dock=M&&M.W&&M.W.holds.bk&&M.W.holds.bk.getObjectByName('drone_dock');
  if(dock&&h.parent!==dock){dock.add(h);}h.position.set(0,0,0);h.quaternion.identity();h.scale.set(1,1,1);DR.st='dock';DR.fix=0;}
function updDrone(dt){const h=M&&M.ready&&M.W&&M.W.holds.drone;
  if(h!==DR.hold||DR.P!==P){if(DR.hold&&DR.hold!==h&&DR.hold.parent)DR.hold.parent.remove(DR.hold);DR.hold=h||null;DR.P=P;DR.sh=DRN.shield;droneDockNow();
    DR.pt=h?{gun:h.getObjectByName('gun'),muzzle:h.getObjectByName('muzzle')||h,repair:h.getObjectByName('repair')||h,fans:['fan_L','fan_R'].map(n=>h.getObjectByName(n))}:{};}
  if(!h)return;const dock=M.W.holds.bk&&M.W.holds.bk.getObjectByName('drone_dock');if(!dock)return;
  const live=(G.mode==='play'&&!G.paused)||G.mode==='demo';if(!live){if(G.mode!=='play'&&DR.st!=='dock')droneDockNow();return;}
  if(P.dead){if(DR.st!=='dock')droneDockNow();return;}
  DR.t+=dt;DR.cd-=dt;
  /* it wakes for a machine inside 70 m, and stays out until none is inside 80 m (no flying out and back at the edge) */
  const wr=DR.st==='dock'?DRN.wake:DRN.wake+10;let near=false;for(const e of EN)if(!e.dead&&e.spawnT<=0&&(e.x-P.x)**2+(e.z-P.z)**2<wr*wr){near=true;break;}
  const fix=!near&&P.hull<P.hullMax;
  if(DR.st==='dock'||DR.st==='home')DR.sh=Math.min(DRN.shield,DR.sh+DRN.recharge*dt);   /* the shield recharges on the way home too */
  if(DR.st==='dock'){
    if((near||fix)&&DR.sh>=DRN.shield*.5){h.updateMatrixWorld(true);S.attach(h);DR.st='fly';DR.pos.copy(h.position);sJet();}
    return;}
  /* where it wants to be: beside your right shoulder, a little ahead; when repairing it circles you slowly */
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw),want=_kw;
  const goHome=DR.st==='home'||(!near&&!fix);
  if(goHome){dock.getWorldPosition(want);}
  else if(fix){const a=DR.t*.6;want.set(P.x+Math.cos(a)*4.2,P.y+5.2+Math.sin(DR.t*1.7)*.3,P.z+Math.sin(a)*4.2);}
  else want.set(P.x+rx*2.7-fx*.4,P.y+7.8+Math.sin(DR.t*2.1)*.3,P.z+rz*2.7-fz*.4);   /* above your right shoulder: on screen on a phone too */
  if(goHome){   /* home: fly straight at the jet pack at least 30 m/s (faster than you can go), and dock once close */
    const d=h.position.distanceTo(want);if(d<1.5){droneDockNow();return;}
    h.position.addScaledVector(_kb.subVectors(want,h.position),Math.min(d,Math.max(d*damp(4.5,dt),30*dt))/d);}
  else h.position.lerp(want,damp(3,dt));
  /* face the target (or the way you face), lean into the flight */
  let tg=null;if(near&&!goHome){tg=AIM.e&&!AIM.e.dead&&Math.hypot(AIM.e.x-h.position.x,AIM.e.z-h.position.z)<DRN.range?AIM.e:null;
    if(!tg){let bd=DRN.range;for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-h.position.x,e.z-h.position.z);if(d<bd){bd=d;tg=e;}}}}
  DR.tg=tg;const yaw=tg?Math.atan2(-(tg.x-h.position.x),-(tg.z-h.position.z)):goHome?P.yaw:P.yaw;
  const q=_kq;if(goHome)dock.getWorldQuaternion(q);else q.setFromEuler(_ke.set(0,yaw,0));h.quaternion.slerp(q,damp(6,dt));
  const gun=DR.pt.gun;
  if(tg){DR.pt.muzzle.getWorldPosition(_ka);const ty=tg.y+tg.d.cy,d=Math.hypot(tg.x-_ka.x,tg.z-_ka.z);
    if(gun)gun.rotation.x=clamp(Math.atan2(ty-_ka.y,d),-1,.4);
    if(DR.cd<=0){DR.cd=1/DRN.rate;let ax=tg.x-_ka.x,ay=ty-_ka.y,az=tg.z-_ka.z;const l=Math.hypot(ax,ay,az)||1;ax/=l;ay/=l;az/=l;
      BOLTS.push({x:_ka.x,y:_ka.y,z:_ka.z,vx:ax*BOLT.speed,vy:ay*BOLT.speed,vz:az*BOLT.speed,life:(DRN.range+10)/BOLT.speed,dmg:DRN.gun*UP.dmgK*(UP.droneK||1)});
      part({x:_ka.x+ax*.2,y:_ka.y+ay*.2,z:_ka.z+az*.2,vx:0,vy:0,vz:0,life:.06,s0:.7,s1:.3,a:2,col:[1,.75,.4],glow:true});nz('bandpass',2600,900,.05,.08,1);}}
  else if(gun)gun.rotation.x*=1-damp(4,dt);
  /* repairs: a green beam to your hull */
  if(fix&&!goHome&&h.position.distanceTo(want)<2.5){P.hull=Math.min(P.hullMax,P.hull+DRN.repair*(UP.repairK||1)*dt);DR.pt.repair.getWorldPosition(_ka);
    _kb.set(P.x+(Math.random()-.5)*1.5,P.y+3+Math.random()*1.5,P.z+(Math.random()-.5)*1.5);beam(_ka,_kb,.05,[.3,1.6,.55],.07);
    if(Math.random()<dt*14)part({x:_kb.x,y:_kb.y,z:_kb.z,vx:0,vy:1,vz:0,life:.5,s0:.4,s1:.1,a:1.4,col:[.4,1,.5],glow:true});
    DR.rep+=dt;if(DR.rep>2.5){DR.rep=0;HUD.msg('DRONE REPAIRING',1);}}
  /* FIELD REPAIR (pilot level 8): it also mends the hull during a fight, 1 a second */
  if(near&&!goHome&&assistOn('repair')&&P.hull<P.hullMax){P.hull=Math.min(P.hullMax,P.hull+dt);if(Math.random()<dt*3){DR.pt.repair.getWorldPosition(_ka);_kb.set(P.x,P.y+3.5,P.z);beam(_ka,_kb,.04,[.3,1.4,.5],.08);}}
  /* its shield: enemy shots that pass close hit the drone instead */
  if(DR.st==='fly')for(let i=EBOLTS.length-1;i>=0;i--){const b=EBOLTS[i],dx=b.x-h.position.x,dy=b.y-h.position.y,dz=b.z-h.position.z;if(dx*dx+dy*dy+dz*dz<1.1){
    DR.sh-=b.dmg;EBOLTS.splice(i,1);sparks(b.x,b.y,b.z,5,[.5,.8,1]);if(DR.sh<=0){DR.sh=0;DR.st='home';HUD.msg('DRONE SHIELD DOWN · RETURNING',1.4);sShield();}}}

  /* fans: a little tilt into the direction of flight */
  DR.pt.fans.forEach((f,i)=>{if(f)f.rotation.x=Math.sin(DR.t*9+i)*.04-(goHome?0:.12);});}

/* ---- the Watcher's HUD: radar, marks, the lock brackets; the Lance's charge bar ---- */
const KH={marks:[],rt:0};
function kitHud(dt){if(!P||!M||!M.ready)return;const W=kitHas('watcher'),hasM=kitHas('mpod');
  /* lance charge bar under the crosshair, only while charging */
  let ch=0;for(const A of M.arms)if(A.kind==='ln')ch=Math.max(ch,A.ch||0);
  HUD.set('lch','cls',ch>0?(ch>=.99?'on full':'on'):'');HUD.set('lchb','width',Math.round(ch*100)+'%');
  /* the heat bar belongs to the autocannon */
  let ac=false;for(const A of M.arms)if(A.kind==='ac'||!A.kind)ac=true;HUD.set('heat','visibility',ac?'':'hidden');
  /* radar (Watcher) */
  const rd=$('radar');HUD.set('radar','display',W&&G.mode==='play'?'block':'none');
  if(W&&G.mode==='play'&&(KH.rt-=dt)<=0){   /* the radar redraws 10 times a second, whatever the frame rate */KH.rt=.1;const cv=rd,g=cv.getContext('2d'),w=cv.width,r=w/2-3,k=r/WATCH.radar;g.clearRect(0,0,w,w);
    g.fillStyle='rgba(8,14,18,.55)';g.beginPath();g.arc(w/2,w/2,r,0,TAU);g.fill();g.strokeStyle='rgba(124,240,255,.35)';g.lineWidth=1;
    for(const f of [1,.5]){g.beginPath();g.arc(w/2,w/2,r*f,0,TAU);g.stroke();}
    const sw=(G.t*1.6)%TAU;g.fillStyle='rgba(124,240,255,.10)';g.beginPath();g.moveTo(w/2,w/2);g.arc(w/2,w/2,r,sw-.5,sw);g.fill();
    const c=Math.cos(P.yaw),s=Math.sin(P.yaw),pt=(x,z)=>{const dx=x-P.x,dz=z-P.z,u=dx*c-dz*s,v=dx*s+dz*c;return [w/2+u*k,w/2+v*k,Math.hypot(dx,dz)];};
    if(MISSION&&!MS.done){const st=MISSION.steps[MS.step],p=st&&stepPos(st);if(p){let [x,y,d]=pt(p.x,p.z);if(d>WATCH.radar){x=w/2+(x-w/2)*WATCH.radar/d;y=w/2+(y-w/2)*WATCH.radar/d;}g.fillStyle='#7cf0ff';g.fillRect(x-2.5,y-2.5,5,5);}}
    for(const t of TARGETS){if(t.dead)continue;const [x,y,d]=pt(t.x,t.z);if(d>WATCH.radar)continue;g.fillStyle='#ff9a3a';g.fillRect(x-3,y-3,6,6);}
    for(const e of EN){if(e.dead||e.spawnT>0)continue;const [x,y,d]=pt(e.x,e.z);if(d>WATCH.radar)continue;const z=e.d.boss?3.6:e.id==='skitter'?1.6:2.4;
      g.fillStyle=e.d.boss?'#ffd76a':'#ff4a3a';g.beginPath();g.arc(x,y,z,0,TAU);g.fill();}
    g.fillStyle='#fff';g.beginPath();g.moveTo(w/2,w/2-5);g.lineTo(w/2+3.5,w/2+4);g.lineTo(w/2-3.5,w/2+4);g.closePath();g.fill();}
  /* marks: the Watcher marks up to 8 machines on screen (bosses and gunners first); without it only the missile lock shows */
  let list=[];if(G.mode==='play'){for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);
    if(W?d<WATCH.radar:hasM&&(e.lk||0)>.02)list.push([e,(e.d.boss?0:e.id==='gunner'?1e3:2e3)+d]);}}
  list.sort((a,b)=>a[1]-b[1]);list=list.slice(0,W?WATCH.marks:4);
  while(KH.marks.length<8){const el=document.createElement('div');el.className='mk';el.innerHTML='<i></i>';document.body.appendChild(el);KH.marks.push(el);}
  KH.marks.forEach((el,i)=>{const it=list[i];if(!it){sty(el,'display','none');return;}const e=it[0],sc=e.d.sc||1;
    _ka.set(e.x,e.y+e.d.cy+e.d.r*.9+.6,e.z).project(cam);if(_ka.z>1||Math.abs(_ka.x)>1.05||Math.abs(_ka.y)>1.05){sty(el,'display','none');return;}
    sty(el,'display','block');sty(el,'transform','translate('+((_ka.x*.5+.5)*innerWidth).toFixed(0)+'px,'+((-_ka.y*.5+.5)*innerHeight).toFixed(0)+'px)');
    const lk=e.lk||0,cls='mk'+(e.d.boss?' boss':'')+(lk>=1?' lock':lk>.02?' locking':'')+(DR.tg===e?' dr':'');if(el.className!==cls)el.className=cls;
    const lv=lk.toFixed(2);if(el._lk!==lv){el._lk=lv;el.style.setProperty('--lk',lv);}});}
if(DEV){const I=window.__ih4||(window.__ih4={});Object.assign(I,{DR,LANCE,ARCW,KX,kitHas,kill:e=>hurtEnemy(e,1e6,e.x,e.y,e.z),openBook,briefMaybe,ev:s=>eval(s)});   /* ev: tests reach any of the game's own names (dev only) */
  Object.defineProperties(I,{M:{get:()=>M},AIM:{get:()=>AIM},PL:{get:()=>PL}});}   /* getters: M is made later */

/* ---- 06l_brief.js ---- */
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
function stageClear(){if(!STG.obj)return;const u=STG.obj.userData;STG.grp.remove(STG.obj);if(u.full)STG.obj.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
  if(u.ownMat)u.ownMat.dispose();STG.obj=null;}   /* its own copy of the material goes too (the textures stay: they are shared) */
/* full detail is for the bay, the brief and the book: when play starts (or a brief ends), those models and their prints leave memory */
function freeFull(){if(BAY.loading)return;
  if(BAY.W&&BAY.full&&!BAY.open){BAY.scene.remove(BAY.W.root);BAY.W.root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});BAY.W=null;}
  if(STG.obj&&STG.obj.userData.full&&!BAY.open)stageClear();
  for(const u in GLBC)if(/_full\.glb$/.test(u)){GLBC[u].then(sc=>sc.traverse(o=>{if(o.isMesh)o.geometry.dispose();}),()=>{});delete GLBC[u];}
  for(const k in KMAT)if(/_full_print/.test(k)){KMAT[k].dispose();delete KMAT[k];}
  for(const k in TEXC)if(/_full_print/.test(k)){TEXC[k].dispose();delete TEXC[k];}}
function stagePut(o,full){stageClear();const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3());
  const k=4.2/Math.max(s.y,s.x*.78,s.z*.78,.01);o.scale.multiplyScalar(k);o.position.y-=b.min.y*k;o.userData.full=full;STG.obj=o;STG.grp.add(o);BAY.shDirty=true;
  BAY.want={x:0,y:s.y*k*.5,z:0,d:11.5};}
/* build a model for the stage: a machine (EDEF id or the spawner pod) or a kit piece; dark = a shape not yet known */
function stageModel(id,full,dark){
  const f=stageFiles(id,full);let p;
  if(f)p=loadGLB(f.glb,full?BLM:undefined).then(sc=>{const mat=dark?darkMat():kitMat(f,false).clone();dressModel(sc,mat);stageDress(id,sc,mat,dark);sc.userData.ownMat=dark?null:mat;return sc;});
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
  const wantFull=QL!=='low'&&!window.IH4_LIGHT&&!dark&&!!stageFiles(id,true);   /* Ironhowl 3 models have no full version */
  stageModel(id,false,dark).then(o=>{if(seq!==STG.seq)return;stagePut(o,false);BAY.yaw=.6;BAY.pitch=.12;BAY.auto=true;
    if(wantFull){STG.pct=0;const url=stageFiles(id,true).glb;   /* the percentage follows the download's bytes (the loading manager only counts whole files) */
      GLBP[url]=k=>{if(seq!==STG.seq)return;const n=Math.min(99,Math.round(k*100));if(n!==STG.pct){STG.pct=n;briefSub();}};
      stageModel(id,true,false).then(F=>{delete GLBP[url];if(seq!==STG.seq){F.traverse(q=>{if(q.isMesh)q.geometry.dispose();});return;}stagePut(F,true);STG.pct=-1;briefSub();})
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
function briefDone(){viewClose();closeBay();freeFull();if(!touchy&&G.mode==='play')lockMouse();if(BRF.after)HUD.banner(BRF.after);   /* the banner it covered */if(BRF.done){const f=BRF.done;BRF.done=null;f();}}
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

/* ---- 06m_pilot.js ---- */
/* ===================== Ironhowl 4: pilot levels (session 4) =====================
   XP comes from every machine you destroy (its score, without the combo), every wave you clear (100 + 50 a wave) and every
   mission you finish (half its bonus), in every mode. 10 levels. Levels 2-5 open kit for the modification bay, levels 6-10
   bring AI assists (on by themselves once earned). Saved in hd-ironhowl4-save: xp, beaten (machines destroyed, for the
   armory book), unlockAll (the bay's TEST: UNLOCK ALL switch, for trying everything before you've earned it). */
const PILOT={lv:[0,2000,5000,9000,14000,20000,27000,35000,44000,54000],   /* XP at the start of levels 1..10 */
  kit:{ac:1,mpod:1,jetpack:1,ln:2,watcher:3,ar:4,drone:5},
  assists:[{lv:6,id:'vent',name:'AUTO-VENT',fx:'The autocannon vents by itself just before it overheats.'},
    {lv:7,id:'lock',name:'LOCK ASSIST',fx:'Missile lock 25% faster.'},
    {lv:8,id:'repair',name:'FIELD REPAIR',fx:'The drone also repairs during fights (1 hull a second), and 3 a second after.'},
    {lv:9,id:'hover',name:'HOVER RESERVE',fx:'Hover tank 45 s.'},
    {lv:10,id:'ace',name:'ACE',fx:'Every weapon +10% damage.'}]};
const PL={xp:0,lv:1,all:false,run:0,ups:[]};
function pilotRefresh(){const sv=SAVE.get();PL.xp=sv.xp||0;PL.all=!!sv.unlockAll;PL.lv=pilotLv(PL.xp);}
function pilotLv(x){let l=1;for(let i=1;i<PILOT.lv.length;i++)if(x>=PILOT.lv[i])l=i+1;return l;}
function kitOpen(id){return !id||PL.all||PL.lv>=(PILOT.kit[id]||1);}
function assistOn(id){const a=PILOT.assists.find(q=>q.id===id);return !!a&&(PL.all||PL.lv>=a.lv);}
/* what a level opens, in words */
function levelGives(l){const k=Object.keys(PILOT.kit).filter(id=>PILOT.kit[id]===l).map(id=>KIT_INFO[id].name.split(' ').slice(1).join(' '));
  const a=PILOT.assists.filter(q=>q.lv===l).map(q=>q.name);return k.concat(a);}
function addXP(n,why,sv){if((G.mode!=='play'&&!(G.mode==='results'&&why==='mission'))||!(n>0))return;   /* the mission bonus comes as the results open */
  n=Math.round(n*DK.xp);   /* HARD: +25 % (06n_difficulty.js) */
  const own=!sv;sv=sv||SAVE.get();const was=pilotLv(sv.xp||0);sv.xp=(sv.xp||0)+n;if(own)SAVE.put(sv);   /* a kill passes its save in: one read and one write */
  PL.run+=n;PL.xp=sv.xp;PL.lv=pilotLv(PL.xp);
  if(PL.lv>was){let g=[],kit=false;for(let l=was+1;l<=PL.lv;l++){PL.ups.push(l);g=g.concat(levelGives(l));if(Object.keys(PILOT.kit).some(id=>PILOT.kit[id]===l))kit=true;}   /* two levels at once: name what both opened */
    HUD.banner('PILOT LEVEL '+PL.lv);HUD.msg(g.length?g.join(' + ')+(kit?' UNLOCKED · FIT IT IN THE MOD BAY':' ONLINE'):'LEVEL UP',3.2);
    tone('triangle',520,1040,.35,.07);setTimeout(()=>tone('triangle',780,1560,.4,.07),160);applyAssists();}}
/* a machine destroyed: XP, and its card for the armory book */
function pilotKill(key,score){if(G.mode!=='play')return;const sv=SAVE.get();sv.beaten=sv.beaten||{};sv.beaten[key]=(+sv.beaten[key]||0)+1;addXP(score,'kill',sv);SAVE.put(sv);}
function pilotRunStart(){PL.run=0;PL.ups=[];RUNSEEN=new Set();pilotRefresh();
  /* a level reached last run may have opened kit that the default loadout carries: fit it now */
  if(M&&M.W&&M.ready){const L=loadout();if(SLOTS.some(s=>(M.W.kit[s]||null)!==(L[s]||null)))refitKit(M);}}
/* the AI assists that work through numbers (the others are checked where they act) */
function applyAssists(){UP.lockK=assistOn('lock')?.75:1;UP.repairK=assistOn('repair')?1.5:1;UP.hoverK=assistOn('hover')?1.5:1;UP.dmgK=(UP.dmgK0||1)*(assistOn('ace')?1.1:1);}
/* the line under the title, and the results */
function pilotLine(){const l=PL.lv,nx=PILOT.lv[l],k=nx?(PL.xp-PILOT.lv[l-1])/(nx-PILOT.lv[l-1]):1;
  return '<b>PILOT LV '+l+'</b><span>'+(nx?(nx-PL.xp).toLocaleString('en-US')+' XP TO LV '+(l+1)+(levelGives(l+1).length?' · '+levelGives(l+1).join(' + '):''):'TOP LEVEL')+'</span><i><em style="width:'+(k*100).toFixed(1)+'%"></em></i>';}
function pilotRows(){const r=[['DIFFICULTY',DK.name],['XP',(PL.run>0?'+':'')+PL.run.toLocaleString('en-US')+' · PILOT LV '+PL.lv]];
  if(PL.ups.length)r.push(['UNLOCKED',PL.ups.map(l=>levelGives(l).join(' + ')||('LV '+l)).join(' · ')]);return r;}
function titlePilot(){const el=$('tpilot');if(el)el.innerHTML=pilotLine();}
pilotRefresh();

/* ---- 06n_difficulty.js ---- */
/* ===================== Ironhowl 4: EASY / MEDIUM / HARD (session 5) =====================
   Chosen on the title screen (three small buttons under the pilot line), saved in hd-ironhowl4-save as diff, and used by
   every mode. It multiplies on top of the mission's own ramp (06d_missions.js DIFF) and Endless's:
     EASY    machines hit for 55 %, have 75 % of their health, attack 20 % less often.
     MEDIUM  as designed.
     HARD    machines hit for 140 %, have 130 % of their health, attack 20 % more often; XP +25 %. */
const DIFFS={easy:{name:'EASY',dmg:.55,hp:.75,rate:.8,xp:1},medium:{name:'MEDIUM',dmg:1,hp:1,rate:1,xp:1},hard:{name:'HARD',dmg:1.4,hp:1.3,rate:1.2,xp:1.25}};
let DK=DIFFS.medium;
function diffLoad(){const d=SAVE.get().diff;DK=DIFFS[d]||DIFFS.medium;}
function diffSet(id){const sv=SAVE.get();sv.diff=id;SAVE.put(sv);diffLoad();diffUI();sClick();}
function diffUI(){const box=$('tdiff');if(!box)return;const cur=SAVE.get().diff||'medium';
  box.innerHTML=Object.keys(DIFFS).map(k=>'<button data-d="'+k+'"'+(k===cur?' class="sel"':'')+'>'+DIFFS[k].name+'</button>').join('');
  box.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();diffSet(b.dataset.d);});}
diffLoad();

/* ---- 06o_story.js ---- */
/* ===== IH4: story scenes — a still picture with a few lines of text over it, between the fights (8 Nov) =====
   Christopher: "the thing that feels off is the story in between combat … it can be like text and images".
   STORY[mission id] = {open, mid, close}: open plays before the intel brief, mid before step `at` begins (between two
   fights), close after the last step, before the results. Each scene is panels [{img, ph, lines:[[who, text], …]}]:
   img → art/story/<img>.webp (Christopher's ChatGPT pictures); until that file exists, ph → art/story/ph_<ph>.webp,
   a picture of the place taken in the game. who '' = narration. The game is stopped while a scene shows: nothing is
   drawn behind it, and no input reaches the fight. Tap, click, Space or Enter goes on; SKIP (or Esc) ends the scene. */
const STY={open:false,sc:null,key:'',pi:0,li:0,shown:0,full:'',done:null,seen:new Set(),lay:0,t:0};
const STORY_WHO={ROOK:'#ffb347',UNKNOWN:'#ff4d4d'};   /* speaker colours; anyone else is pale grey, narration has no name */
/* STORY_TEXT is filled in by the writers (06p_story_text.js); this file only plays it */
function storyScene(key){const [m,part]=key.split('.'),s=(typeof STORY_TEXT!=='undefined')&&STORY_TEXT[m];return s&&s[part]||null;}
function storySrc(pn,cb){const a='art/story/'+pn.img+'.webp',b='art/story/ph_'+(pn.ph||'field')+'.webp';
  if(window.IH4_URL){cb(IH4_URL(a)||IH4_URL(b)||b);return;}   /* one-file game: its pictures are inside it */
  const im=new Image();im.onload=()=>cb(a);im.onerror=()=>cb(b);im.src=a;}
/* open a scene if this run hasn't shown it; returns true if it opened (then `then` runs when it closes) */
function storyPlay(key,then){const sc=storyScene(key);if(!sc||!sc.panels||!sc.panels.length||STY.seen.has(key))return false;
  STY.seen.add(key);STY.sc=sc;STY.key=key;STY.pi=0;STY.li=0;STY.done=then||null;STY.open=true;jetLoop(0);
  if(document.pointerLockElement)document.exitPointerLock();
  $('stcap').textContent=sc.cap||(MISSION&&!MISSION.endless?(CHAPTER.split(' · ')[0]+' · '+MISSION.name):'');
  $('story').classList.add('on');storyPanel();return true;}
function storyPanel(){const pn=STY.sc.panels[STY.pi],ly=['sta','stb'];
  storySrc(pn,u=>{if(!STY.open)return;const nx=$(ly[1-STY.lay]),cu=$(ly[STY.lay]);nx.style.backgroundImage='url("'+u+'")';
    nx.classList.remove('kb');void nx.offsetWidth;nx.classList.add('kb','on');cu.classList.remove('on');STY.lay=1-STY.lay;});
  if(STY.pi>0)sClick();STY.li=0;storyLine();}
function storyLine(){const ln=STY.sc.panels[STY.pi].lines[STY.li]||['',''];const who=ln[0]||'';
  const w=$('stwho');w.textContent=who;w.style.display=who?'':'none';w.style.color=STORY_WHO[who]||'#c9d1d9';
  $('stline').classList.toggle('nar',!who);STY.full=ln[1]||'';STY.shown=0;STY.t=0;$('stline').textContent='';$('stnext').classList.remove('on');}
/* the line types itself out, about 55 letters a second */
function storyFrame(dt){if(!STY.open||STY.shown>=STY.full.length)return;const a=Math.floor(STY.shown);STY.shown=Math.min(STY.full.length,STY.shown+dt*55);const b=Math.floor(STY.shown);
  if(b!==a)$('stline').textContent=STY.full.slice(0,b);if(STY.shown>=STY.full.length)$('stnext').classList.add('on');}
function storyNext(){if(!STY.open)return;
  if(STY.shown<STY.full.length){STY.shown=STY.full.length;$('stline').textContent=STY.full;$('stnext').classList.add('on');return;}   /* first tap finishes the line */
  const pn=STY.sc.panels[STY.pi];if(++STY.li<pn.lines.length){storyLine();return;}
  if(++STY.pi<STY.sc.panels.length){storyPanel();return;}storyClose();}
function storyClose(){if(!STY.open)return;STY.open=false;$('story').classList.remove('on');
  /* nothing pressed during the scene reaches the fight */
  KEYS.clear();HIT.clear();TS.ldx=TS.ldy=0;TS.look=-1;TS.id=-1;TS.ax=TS.ay=0;TS.fire=false;TS.fireId=-1;TS.jet=false;MOUSE.dx=MOUSE.dy=0;MOUSE.l=false;if(HUD.stick)HUD.stick(false);
  const f=STY.done;STY.done=null;if(f)f();if(!touchy&&G.mode==='play'&&!BAY.open&&!STY.open)lockMouse();}
(function storyInit(){const el=$('story');
  /* on click (the last event of a tap), so the tap that ends a scene can't fall through to the brief opening under it */
  el.addEventListener('click',e=>{if(e.target.id==='stskip')return;e.preventDefault();storyNext();});
  $('stskip').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();sClick();storyClose();});})();

/* ---- 06p_story_text.js ---- */
/* ===== IH4: the story's words, chapter 1 — from the writers' room (story bible "Always Do", 8 Nov 2026) =====
   Made by game/tools/story_build.py from the scene file; edit the scene file and rebuild rather than this one.
   Each mission: brief (its card on the title screen), radio (the lines during play, by step), and three scenes,
   open / mid / close, played by 06o_story.js. Pictures: art/story/<img>.webp; until one exists, ph_<ph>.webp. */
const STORY_TEXT={
 "m1": {
  "brief": [
   "The Calloway farm. Crew 4 is digging FORGE’s old wrecks out of their own wheat.",
   "Meet Rook at the barn, then guard the dig. The Wraith is the only mech Crew 4 has."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Wraith, this is Rook. I’m parked by the barn. Walk on over."
    ],
    [
     "ROOK",
     "Left thumb walks, right thumb aims. Tap JET to hop, hold it to hover."
    ]
   ],
   "1": [
    [
     "DIG CREW",
     "Rook! Something just twitched in the wreck pile."
    ],
    [
     "ROOK",
     "Scrap doesn’t twitch. Wraith, get in the ring and hold."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Three masts. The marker shows the nearest. Keep firing till it falls."
    ],
    [
     "UNKNOWN",
     "Take your people home, Crew 4."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m1_open",
     "ph": "field",
     "lines": [
      [
       "",
       "2176. For fifty years FORGE’s war zones were fenced off. Now the fence is down, and the rush is on."
      ],
      [
       "",
       "Every dead machine out there holds a core of red glass, still warm. One core heats a farmhouse all winter."
      ],
      [
       "BESS",
       "Live ones bite. Dunk them in brine till they hiss and go grey. Then they’re safe."
      ],
      [
       "PIP",
       "Red eye, run! Grey eye, done!"
      ]
     ]
    },
    {
     "img": "m1_open2",
     "ph": "field",
     "lines": [
      [
       "PIP",
       "Wolves are done, Jo! Same wolves Howl had when he broke FORGE. Now it looks like a real war mech."
      ],
      [
       "JO",
       "It’s a survey mech, Pip. Right, Gran?"
      ],
      [
       "BESS",
       "Not today. The co-op’s sending a handler out. Calls herself Rook."
      ],
      [
       "PIP",
       "Bet she’s never seen wolves like these."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m1_mid",
     "ph": "field",
     "lines": [
      [
       "ROOK",
       "Look at the wrecks. Every eye’s turned to the masts on the ridge. Somebody’s talking to them."
      ],
      [
       "UNKNOWN",
       "Crew 4. This field is claimed. Leave it."
      ],
      [
       "BESS",
       "Claimed? My dad was born in that field."
      ],
      [
       "ROOK",
       "Wraith. Knock those masts flat."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m1_close",
     "ph": "field",
     "lines": [
      [
       "ROOK",
       "Masts are down. Not bad shooting, Wraith."
      ],
      [
       "JO",
       "I’m a spotter, Rook. I find things. I don’t usually blow them up."
      ],
      [
       "ROOK",
       "Then find me whoever was talking through them. Bring it home, Wraith."
      ],
      [
       "JO",
       "Bring what home? I’m standing in my own yard."
      ],
      [
       "ROOK",
       "…Never mind. Old habit."
      ]
     ]
    }
   ]
  }
 },
 "m2": {
  "brief": [
   "Harbor 9 at midnight: the boom town where every dig crew sells its cores.",
   "Somebody planted spawner pods in the container stacks overnight. Find all four."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Stick to the lanes. Those stacks are too tall to hop, even for you."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Pods print Skitters till you break them. The marker shows the nearest."
    ],
    [
     "UNKNOWN",
     "Those crates came off claimed ground."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Gunner on the quay! Get under the middle crane. I’m lifting you out."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m2_open",
     "ph": "docks_night",
     "lines": [
      [
       "BESS",
       "Our crates sail on the morning boat. That’s a new barn roof, right there."
      ],
      [
       "PIP",
       "A Gunner core’s worth three hundred! What’s “LIVE: ASK AT VANE” mean?"
      ],
      [
       "BESS",
       "A red core nobody quenched. Selling those is against the law. Silas Vane pays triple anyway."
      ],
      [
       "ROOK",
       "Man in the white coat. If he calls you friend, count your fingers."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m2_mid",
     "ph": "docks_night",
     "lines": [
      [
       "JO",
       "Rook. All four pods were hidden in farm crates. Ours. Crew 2’s. Crew 6’s."
      ],
      [
       "ROOK",
       "And Vane’s?"
      ],
      [
       "JO",
       "Right across the lane. Not one pod. Not a scratch."
      ],
      [
       "BESS",
       "Scare the farm crews off, then buy our fields cheap. That’s Vane all over."
      ],
      [
       "ROOK",
       "Maybe. Vane’s a crook, but he’s a careful one."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m2_close",
     "ph": "docks_night",
     "lines": [
      [
       "VANE",
       "Lovely lift, Rook. Shame about all those farm crates, friend."
      ],
      [
       "VANE",
       "When Crew 4 gets tired of digging, I’ll buy that field. Fair price."
      ],
      [
       "BESS",
       "Fair like the place across the creek? Your diggers flattened that house in a day."
      ],
      [
       "VANE",
       "Old houses come down, Mrs. Calloway. Goodnight, friends."
      ],
      [
       "ROOK",
       "Silas. You’re standing under my hook."
      ]
     ]
    }
   ]
  }
 },
 "m3": {
  "brief": [
   "Crew 7 has gone quiet in the pine woods, out by a field of 2126 wrecks.",
   "Find them, guard Rook while she loads them up, and watch the trees for the pack."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Their beacon’s east of the trail. Watch the trees."
    ],
    [
     "ROOK",
     "Hounds crouch, then charge dead straight. Sidestep or hop."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Found them. All three alive, and grumpy. Give me one minute to load up."
    ],
    [
     "ROOK",
     "Keep them off my truck, Wraith. Stay in the ring."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Eyes up. Rust-red one coming out of the trees, twice the size."
    ],
    [
     "ROOK",
     "Clear its pack first, then keep moving. It charges harder."
    ]
   ],
   "3": [
    [
     "ROOK",
     "Crew 7’s clear. Meet me up on the north ridge."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m3_open",
     "ph": "woods",
     "lines": [
      [
       "",
       "The pine woods burned in the war. Now they stand taller than a Gunner, and the wrecks wear moss."
      ],
      [
       "ROOK",
       "No word from Crew 7 since sunup. A dad and two kids, digging by the old wreck field."
      ],
      [
       "JO",
       "Shouldn’t you wait back at the road?"
      ],
      [
       "ROOK",
       "In 2126 I sat in a bunker and listened. I’m done sitting."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m3_mid",
     "ph": "woods",
     "lines": [
      [
       "UNKNOWN",
       "Get your crew out of my yards, Birdie."
      ],
      [
       "",
       "Rook doesn’t answer. For a long moment, she doesn’t move."
      ],
      [
       "JO",
       "Rook? Who’s Birdie?"
      ],
      [
       "ROOK",
       "Nobody’s called me that in fifty years."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m3_close",
     "ph": "woods",
     "lines": [
      [
       "JO",
       "Rook, about Birdie…"
      ],
      [
       "ROOK",
       "Look at these welds instead. Bright. Clean. This thing was built this year."
      ],
      [
       "JO",
       "FORGE is dead. So who’s building new ones?"
      ],
      [
       "PIP",
       "Did you get the big one? I’m calling it Biscuit!"
      ],
      [
       "ROOK",
       "We are not calling it Biscuit."
      ],
      [
       "PIP",
       "Too late."
      ]
     ]
    }
   ]
  }
 },
 "m4": {
  "brief": [
   "Night fog on the creek road. Rook is driving Crew 7 and their cores out of the woods.",
   "Escort her truck to the south road. If the truck is destroyed, the mission fails."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "I only roll while you’re close, Wraith. Stay within 35 metres."
    ],
    [
     "ROOK",
     "Some of them go for my truck. Kill those first."
    ],
    [
     "UNKNOWN",
     "Leave the cores on the road and walk home."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m4_open",
     "ph": "woods_fog",
     "lines": [
      [
       "CREW 7",
       "Miss Rook? What’s the pilot’s real name?"
      ],
      [
       "ROOK",
       "Wraith."
      ],
      [
       "JO",
       "It’s Jo."
      ],
      [
       "ROOK",
       "Copy, Wraith."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m4_mid",
     "ph": "woods_fog",
     "lines": [
      [
       "CREW 7",
       "Who’s the man in the photo? His mech’s got wolves on it. Like yours."
      ],
      [
       "ROOK",
       "Howl. My pilot. He never came out of Foundry 4."
      ],
      [
       "JO",
       "My kid brother copied our wolves off an old poster of him."
      ],
      [
       "ROOK",
       "Pip got the ears wrong."
      ]
     ]
    }
   ],
   "at": "half"
  },
  "close": {
   "panels": [
    {
     "img": "m4_close",
     "ph": "woods_fog",
     "lines": [
      [
       "ROOK",
       "You stayed close. Most don’t."
      ],
      [
       "JO",
       "That’s four fights now. Nobody’s been hurt. Not once."
      ],
      [
       "ROOK",
       "I noticed. They chase folks off, they take the cores, and they let everyone walk."
      ],
      [
       "ROOK",
       "FORGE never let anyone walk."
      ]
     ]
    }
   ]
  }
 },
 "m5": {
  "brief": [
   "A storm over the farm fields. The voice reaches its machines through three relays.",
   "Take all three relays: hold each ring until it’s full. Then Rook can trace the signal."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Stand in each ring till it fills. Never mind the lightning. It only hits them."
    ],
    [
     "UNKNOWN",
     "Copy, Wraith. Trace all you like. Then go home."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Something huge on the east road. Bone white. Use cover between bursts."
    ],
    [
     "UNKNOWN",
     "Meet my newest."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m5_open",
     "ph": "field_storm",
     "lines": [
      [
       "",
       "A storm rolls over farm country. Three more crews have packed up and left this week."
      ],
      [
       "BESS",
       "Crew 2 sold their claim to Vane this morning. For next to nothing."
      ],
      [
       "ROOK",
       "Then we find the voice before anyone else sells. It talks through relays. Relays can be traced."
      ],
      [
       "JO",
       "So I stand in the lightning while you sit in the truck."
      ],
      [
       "ROOK",
       "I’m seventy-four, Wraith. Everything on me is out of warranty. I get the truck."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m5_mid",
     "ph": "field_storm",
     "lines": [
      [
       "ROOK",
       "Got it. The signal runs straight back to one place. Foundry 4."
      ],
      [
       "JO",
       "Where Howl broke FORGE? That place has been cold since the war."
      ],
      [
       "ROOK",
       "Not any more."
      ]
     ]
    }
   ],
   "at": 1
  },
  "close": {
   "panels": [
    {
     "img": "m5_close",
     "ph": "field_storm",
     "lines": [
      [
       "PIP",
       "That’s three big ones down! I’m calling this one Marshmallow."
      ],
      [
       "ROOK",
       "We are still not doing names."
      ],
      [
       "ROOK",
       "Get some sleep, all of you. Tomorrow we drive to Foundry 4."
      ],
      [
       "BESS",
       "Rook. You don’t have to be the one who goes."
      ],
      [
       "ROOK",
       "Fifty years I’ve stayed away from that gate, Bess. That’s long enough."
      ]
     ]
    }
   ]
  }
 },
 "m6": {
  "brief": [
   "The signal leads to Foundry 4: FORGE’s old heart, fenced off and cold since 2126.",
   "Its furnaces are lit again. Hold the yard while Rook pulls the factory log."
  ],
  "radio": {
   "0": [
    [
     "ROOK",
     "Furnaces are hot. Somebody’s been building in here."
    ]
   ],
   "1": [
    [
     "ROOK",
     "Ninety seconds to pull the log. Hold the yard, Wraith."
    ],
    [
     "UNKNOWN",
     "Turn around. There’s nothing left in here for you."
    ]
   ],
   "2": [
    [
     "ROOK",
     "Two big ones at the gate. Fine, Pip. Biscuit and Marshmallow."
    ]
   ],
   "3": [
    [
     "ROOK",
     "Gate’s clear! Bring it home, Wraith. I’m right behind you."
    ],
    [
     "ROOK",
     "Don’t you dare stop for me."
    ]
   ]
  },
  "open": {
   "panels": [
    {
     "img": "m6_open",
     "ph": "foundry",
     "lines": [
      [
       "",
       "A plaque by the gate: UNITS 01–07 · 2126 · THEY HELD THE LINE."
      ],
      [
       "ROOK",
       "Seven pilots. I learned every one of their names."
      ],
      [
       "JO",
       "Is that why I’m Wraith?"
      ],
      [
       "ROOK",
       "Eyes front, Wraith. Let’s go knock."
      ]
     ]
    }
   ]
  },
  "mid": {
   "panels": [
    {
     "img": "m6_mid",
     "ph": "foundry",
     "lines": [
      [
       "ROOK",
       "Got the log. Wraith… look down. By your left foot."
      ],
      [
       "",
       "A hollow in the slag, the shape of a fallen mech. It’s empty. Drag marks lead off into the dark."
      ],
      [
       "ROOK",
       "Howl’s mech went down right here. I said go, and he went."
      ],
      [
       "ROOK",
       "We left him lying here. Somebody moved him."
      ]
     ]
    }
   ],
   "at": 2
  },
  "close": {
   "panels": [
    {
     "img": "m6_close",
     "ph": "foundry",
     "lines": [
      [
       "ROOK",
       "The log names no one. Just orders. Hounds, Gunners, things I’ve never seen."
      ],
      [
       "ROOK",
       "Every order’s signed with the same mark. A seven, lying on its side."
      ],
      [
       "JO",
       "A cattle brand?"
      ],
      [
       "ROOK",
       "Not one I know."
      ]
     ]
    },
    {
     "img": "m6_close2",
     "ph": "foundry",
     "lines": [
      [
       "JO",
       "Look at the eye. The crack’s been stitched with new cable."
      ],
      [
       "ROOK",
       "I heard that eye break."
      ],
      [
       "",
       "It flickers red. One more line crawls across Rook’s screen, older than the rest. No mark."
      ],
      [
       "",
       "THE FIELDS BELONG TO THE FACTORY."
      ]
     ]
    }
   ]
  }
 }
};
/* the mission cards and radio lines come from here too, so all of the chapter's words live in one place */
for(const m of MISSIONS){const t=STORY_TEXT['m'+m.id];if(!t)continue;if(t.brief)m.brief=t.brief;
  if(t.radio)for(const k in t.radio)if(m.steps[k])m.steps[k].radio=t.radio[k];}

/* ---- 07_fx.js ---- */
/* ===================== particles: one system, smoke blends normally, glow adds light (premultiplied alpha) ===================== */
const PFX={max:900,list:[],mesh:null};
function buildFX(){
  const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();
  g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
  const n=PFX.max;PFX.iP=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);PFX.iS=new THREE.InstancedBufferAttribute(new Float32Array(n*4),4);PFX.iC=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);
  for(const a of [PFX.iP,PFX.iS,PFX.iC])a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iP',PFX.iP);g.setAttribute('iS',PFX.iS);g.setAttribute('iC',PFX.iC);g.instanceCount=0;
  const m=new THREE.ShaderMaterial({uniforms:{tSmoke:{value:tex('37-smoke-puff',{clamp:true})},tFx:{value:tex('fx-atlas',{clamp:true})}},transparent:true,depthWrite:false,
    blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
    vertexShader:`attribute vec3 iP;attribute vec4 iS;attribute vec3 iC;varying vec2 vUv;varying vec4 vS;varying vec3 vC;
      void main(){vUv=uv;vS=iS;vC=iC;float c=cos(iS.y),s=sin(iS.y);vec2 q=vec2(c*position.x-s*position.y,s*position.x+c*position.y)*iS.x;
        vec4 mv=viewMatrix*vec4(iP,1.);mv.xy+=q;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D tSmoke,tFx;varying vec2 vUv;varying vec4 vS;varying vec3 vC;
      void main(){if(vS.w<.5){float t=texture2D(tSmoke,vUv).r;float a=smoothstep(.04,.6,t)*vS.z;gl_FragColor=vec4(vC*(.6+.5*t)*a,a);}
        else if(vS.w<1.5){float r=length(vUv-.5)*2.;float gl=pow(max(0.,1.-r),2.2);gl_FragColor=vec4(vC*gl*vS.z,0.);}
        else{float t=vS.w-2.;vec2 tu=vec2((mod(t,4.)+vUv.x)*.25,1.-(floor(t/4.)+1.-vUv.y)*.5);vec3 c=texture2D(tFx,tu).rgb;
          float edge=smoothstep(.5,.42,max(abs(vUv.x-.5),abs(vUv.y-.5)));c*=edge;   /* art tiles: 0-1 explosions, 2 muzzle flash, 3 sparks add light; 4 steam blends */
          if(t>3.5){float a=smoothstep(.04,.6,dot(c,vec3(.33)))*vS.z;gl_FragColor=vec4(vC*c*a,a);}else gl_FragColor=vec4(c*vC*vS.z,0.);}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  PFX.mesh=new THREE.Mesh(g,m);PFX.mesh.frustumCulled=false;PFX.mesh.renderOrder=5;S.add(PFX.mesh);
}
/* o: {x,y,z, vx,vy,vz, life, s0,s1 (size start/end), a (alpha), col [r,g,b], glow (bool), drag, grav, vr} */
function part(o){o.t=0;o.rot=Math.random()*TAU;o.vr=o.vr==null?(Math.random()-.5)*1.2:o.vr;const L=PFX.list;
  if(L.length>=PFX.max)L[(PFX.ri=((PFX.ri|0)+1)%PFX.max)]=o;else L.push(o);}   /* full: this one takes an old one's place (no shifting the whole list) */
const DUST=[.5,.43,.33],SMOKE=[.55,.55,.57];
function dustPuff(x,z,n,k){const y=hgt(x,z)+.2;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=(1.5+Math.random()*2.5)*k;
  part({x:x+Math.cos(a)*.6,y,z:z+Math.sin(a)*.6,vx:Math.cos(a)*s,vy:.4+Math.random()*.9*k,vz:Math.sin(a)*s,life:1.1+Math.random()*.9,s0:.9*k,s1:3.2*k,a:.38,col:DUST,drag:2.2,grav:-.1});}}
function updFX(dt){
  const L=PFX.list;let n=0;const P_=PFX.iP.array,S_=PFX.iS.array,C_=PFX.iC.array;
  let w=0;for(let i=0;i<L.length;i++){const p=L[i];p.t+=dt;if(p.t>=p.life)continue;L[w++]=p;   /* one pass: finished ones drop out as the list closes up */
    const dr=Math.exp(-(p.drag||0)*dt);p.vx*=dr;p.vy*=dr;p.vz*=dr;p.vy-=(p.grav||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=p.vr*dt;
    const f=p.t/p.life,s=lerp(p.s0,p.s1,Math.sqrt(f)),a=p.a*(p.glow?(1-f):Math.min(1,f*6)*(1-f)*(1-f));
    P_[n*3]=p.x;P_[n*3+1]=p.y;P_[n*3+2]=p.z;S_[n*4]=s;S_[n*4+1]=p.rot;S_[n*4+2]=a;S_[n*4+3]=p.img!=null?2+p.img:p.glow?1:0;C_[n*3]=p.col[0];C_[n*3+1]=p.col[1];C_[n*3+2]=p.col[2];n++;}
  L.length=w;PFX.mesh.geometry.instanceCount=n;
  if(n)for(const A of [PFX.iP,PFX.iS,PFX.iC]){A.clearUpdateRanges();A.addUpdateRange(0,n*A.itemSize);A.needsUpdate=true;}   /* send only the part in use */
}
/* ===================== sound (all made on the fly, nothing to download) ===================== */
const AU={c:null,out:null,nb:null,jet:null,jetF:null,wind:null};
function audioInit(){
  if(AU.c){if(AU.c.state==='suspended')AU.c.resume();return;}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=AU.c=new C();
  AU.out=c.createGain();const comp=c.createDynamicsCompressor();AU.out.connect(comp);comp.connect(c.destination);setVolume();
  const nb=AU.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);let b=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b=b*.97+w*.03;d[i]=w*.6+b*3;}
  const loop=(freq,type)=>{const s=c.createBufferSource();s.buffer=nb;s.loop=true;const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AU.out);s.start();return {f,g};};
  const j=loop(600,'lowpass');AU.jet=j.g;AU.jetF=j.f;const w=loop(380,'lowpass');AU.wind=w.g;w.g.gain.value=.05;
}
function setVolume(){if(AU.out)AU.out.gain.value=(!SET.sound||ARC.muted||G.paused)?0:.75;}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0005,t+a+dec);}
function thump(f0,f1,dur,vol,nf,nv){const c=AU.c;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  o.connect(g);g.connect(AU.out);env(g,t,.008,vol,dur);o.start(t);o.stop(t+dur+.05);
  if(nv){const s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=nf;const h=c.createGain();s.connect(f);f.connect(h);h.connect(AU.out);env(h,t,.005,nv,dur*.7);s.start(t,Math.random());s.stop(t+dur);}}
function sStep(k){thump(78,36,.22,.42*k,420,.22*k);}
function sLand(k){thump(70,26,.5,.8*k+.2,700,.5*k+.15);}
function sJet(){const c=AU.c;if(!c)return;const t=c.currentTime,s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=.8;
  f.frequency.setValueAtTime(380,t);f.frequency.exponentialRampToValueAtTime(1900,t+.35);const g=c.createGain();s.connect(f);f.connect(g);g.connect(AU.out);env(g,t,.02,.55,.6);s.start(t,Math.random());s.stop(t+.8);thump(90,40,.35,.35,0,0);}
function sClick(){const c=AU.c;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=180;o.connect(g);g.connect(AU.out);env(g,t,.003,.08,.08);o.start(t);o.stop(t+.12);}
function sBird(){const c=AU.c;if(!c)return;let t=c.currentTime+.05;const f0=2400+Math.random()*1600,n=2+(Math.random()*3|0);
  for(let i=0;i<n;i++){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*1.35,t+.07);o.connect(g);g.connect(AU.out);env(g,t,.01,.035,.09);o.start(t);o.stop(t+.14);t+=.11+Math.random()*.06;}}
function jetLoop(th){if(!AU.jet)return;const t=AU.c.currentTime;AU.jet.gain.setTargetAtTime(th*.5,t,.05);AU.jetF.frequency.setTargetAtTime(350+th*1700,t,.05);}
/* combat sounds */
function nz(type,f0,f1,dur,vol,q){const c=AU.c;if(!c)return;const t=c.currentTime,s=c.createBufferSource();s.buffer=AU.nb;const f=c.createBiquadFilter();f.type=type;f.Q.value=q||1;
  f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=c.createGain();s.connect(f);f.connect(g);g.connect(AU.out);env(g,t,.004,vol,dur);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
function tone(type,f0,f1,dur,vol){const c=AU.c;if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);o.connect(g);g.connect(AU.out);env(g,t,.004,vol,dur);o.start(t);o.stop(t+dur+.05);}
function sGun(t){nz('bandpass',1800+t*200,500,.09,.32,.9);thump(150,60,.08,.28,0,0);}
function sOver(){tone('square',880,440,.25,.08);setTimeout(()=>tone('square',880,440,.25,.08),280);}
function sVent(){nz('highpass',2500,900,1.1,.5,.7);thump(60,40,.3,.3,0,0);}
function sMissile(){nz('bandpass',600,2400,.5,.4,1.2);}
function sBoom(k){thump(80,24,.6+k*.3,.55+k*.3,900,.55*k+.2);}
function sShield(){tone('sine',1400,700,.12,.12);}
function sHurt(){nz('lowpass',900,200,.25,.45,1);thump(90,40,.2,.3,0,0);}
function sPickup(){tone('triangle',660,1320,.18,.14);setTimeout(()=>tone('triangle',990,1980,.16,.1),90);}
function sZap(){nz('bandpass',3000,1200,.12,.18,4);}
function sHowl(){tone('sawtooth',220,520,.45,.09);}
function sEShot(){nz('bandpass',900,300,.14,.22,1.5);tone('square',300,120,.12,.05);}

/* ---- 08_camera.js ---- */
/* ===================== follow cameras =====================
   close: just behind and above the head, so it feels like first person.
   far:   one mech height higher and further back, still looking along the mech over its neck (not down at the field). */
/* side: the camera sits a little to the right so the crosshair is never hidden behind the mech */
/* Ironhowl 4: the Wraith is taller than Howler 07 and its shoulder kit sits up to 7 m, so both views are higher and further back */
const VIEWS={close:{back:6.4,up:8.7,look:26,lookY:6.2,fov:64,side:1.5,pos:10},
             far:{back:15.5,up:12,look:24,lookY:6.6,fov:58,side:3,pos:6}};
const CAMS={x:0,y:0,z:0,ty:0,shake:0,fovK:0,blend:1,ready:false};
function camFov(base){/* portrait: open the view up so there is enough to see at the sides */const a=cam.aspect;return a>=1?base:Math.min(90,base+(1-a)*28);}
let CAMX=null;   /* test/showcase camera: {a (angle around the mech), d (distance), h (height), ly (look height)} */
function updCam(dt,p,view){
  if(CAMX){const a=p.yaw+(CAMX.a||0);if(CAMX.pos)cam.position.set(CAMX.pos[0],CAMX.pos[1],CAMX.pos[2]);else cam.position.set(p.x-Math.sin(a)*CAMX.d,p.y+CAMX.h,p.z-Math.cos(a)*CAMX.d);if(CAMX.at)cam.lookAt(CAMX.at[0],CAMX.at[1],CAMX.at[2]);else cam.lookAt(p.x,p.y+(CAMX.ly||3),p.z);if(cam.fov!==50){cam.fov=50;cam.updateProjectionMatrix();}SKY.position.copy(cam.position);return;}
  const V=VIEWS[view],fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw),sd=V.side*(cam.aspect<1?.45:1)+Math.max(0,-p.pitch-.2)*3;
  /* the body height follows the mech with a little lag in the air, so jet hops feel big */
  const by=p.y;CAMS.ty+=(by-CAMS.ty)*damp(p.air?(view==='close'?7:3.2):9,dt);if(!CAMS.ready){CAMS.ty=by;}
  /* portrait screens are narrow: step back a little so the mech does not fill them */
  const pt=Math.max(0,1-cam.aspect),back=V.back+pt*(view==='close'?2.2:3),up=V.up+pt*(view==='close'?.7:1.2);
  /* looking steeply down: slide the camera further right so you can see past the mech to your own feet */
  const down=Math.max(0,-p.pitch-.2);
  const pit=p.pitch;let tx=p.x-fx*back+rx*sd,tz=p.z-fz*back+rz*sd,ty=CAMS.ty+up-pit*(view==='close'?1.2:2.2);
  /* if a container or building sits between the mech and the camera, pull the camera in front of it */
  {const hx=p.x,hy=p.y+5,hz=p.z;for(let t=.15;t<=1.001;t+=.05){const x=lerp(hx,tx,t),y=lerp(hy,ty,t),z=lerp(hz,tz,t);if(boxAt(x,z,y+.6)){const k=Math.max(.1,t-.08);tx=lerp(hx,tx,k);ty=lerp(hy,ty,k)+(1-k)*1.5;tz=lerp(hz,tz,k);break;}}}
  if(!CAMS.ready){CAMS.x=tx;CAMS.y=ty;CAMS.z=tz;CAMS.ready=true;}
  const k=damp(V.pos,dt);CAMS.x+=(tx-CAMS.x)*k;CAMS.z+=(tz-CAMS.z)*k;CAMS.y+=(ty-CAMS.y)*k;
  const gy=hgt(CAMS.x,CAMS.z)+1.6;if(CAMS.y<gy)CAMS.y=gy;
  CAMS.shake=Math.max(0,CAMS.shake-dt*2.2);const sh=CAMS.shake*CAMS.shake*.35;
  cam.position.set(CAMS.x+(Math.random()-.5)*sh,CAMS.y+(Math.random()-.5)*sh,CAMS.z+(Math.random()-.5)*sh);
  const ly=CAMS.ty+V.lookY+Math.tan(pit)*V.look;
  cam.lookAt(p.x+fx*V.look+rx*sd,ly,p.z+fz*V.look+rz*sd);
  CAMS.fovK+=((p.air&&p.jetT<.5?1:0)-CAMS.fovK)*damp(4,dt);
  const f=camFov(V.fov)+CAMS.fovK*5;if(Math.abs(cam.fov-f)>.01){cam.fov=f;cam.updateProjectionMatrix();}
  SKY.position.copy(cam.position);
}

/* ---- 09_hud.js ---- */
/* ===================== HUD: kept small. Top left: shield, hull, jets, gun tier, missiles. Top middle: score. Crosshair with heat. ===================== */
const ROMAN=['','I','II','III','IV'];
/* a style write only when the value changes (the browser re-checks the page's layout after each write) */
function sty(el,k,v){const c=el._st||(el._st={});if(c[k]!==v){c[k]=v;el.style[k]=v;}}
const HUD={_c:{},
  load(p){const b=$('ldbar');if(b)b.style.width=Math.round(p*100)+'%';},
  stick(on,x,y,dx,dy){const s=$('stick');if(!on){s.style.display='none';return;}s.style.display='block';s.style.left=x+'px';s.style.top=y+'px';$('knob').style.transform='translate('+dx+'px,'+dy+'px)';},
  set(id,prop,v){const k=id+prop;if(this._c[k]===v)return;this._c[k]=v;const el=$(id);if(prop==='text')el.textContent=v;else if(prop==='cls')el.className=v;else el.style[prop]=v;},
  fuel(p){const el=$('fuel');if(!el)return;if(el.children.length!==p.cells){el.innerHTML='';for(let i=0;i<p.cells;i++){const c=document.createElement('i');c.appendChild(document.createElement('b'));el.appendChild(c);}}
    for(let i=0;i<p.cells;i++){const f=Math.round(clamp(p.fuel-i,0,1)*50)/50,c=el.children[i];if(c._f!==f){c._f=f;c.firstChild.style.width=(f*100)+'%';c.className=f>=1?'full':'';}}},
  flashFuel(){const el=$('fuel');el.classList.remove('no');void el.offsetWidth;el.classList.add('no');},
  view(v){$('bview').textContent=v==='close'?'CAM NEAR':'CAM FAR';},   /* it said CLOSE, which read like a close button */
  hint(t,sec){const h=$('hint');h.textContent=t;h.style.opacity=t?1:0;clearTimeout(HUD._ht);if(t&&sec)HUD._ht=setTimeout(()=>h.style.opacity=0,sec*1000);},
  msg(t,sec){const h=$('msg');h.textContent=t;h.style.opacity=1;clearTimeout(HUD._mt);HUD._mt=setTimeout(()=>h.style.opacity=0,(sec||1.2)*1000);},
  banner(t){const h=$('banner');h.textContent=t;h.classList.remove('go');void h.offsetWidth;h.classList.add('go');},
  /* a red (hull) or blue (shield) arc at the screen edge pointing to whoever hit you */
  hit(fx,fz,kind){const a=Math.atan2(fx-P.x,fz-P.z),rel=angD(a,P.yaw+Math.PI);const d=$('dmg'+(HUD._di=(HUD._di+1||0)%4));
    d.className='dmg '+kind;d.style.transform='rotate('+(-rel)+'rad)';d.style.opacity=1;clearTimeout(d._t);d._t=setTimeout(()=>d.style.opacity=0,450);
    if(kind==='h'){const v=$('vig');v.style.opacity=.55;clearTimeout(v._t);v._t=setTimeout(()=>v.style.opacity=0,180);}},
  /* a yellow arc at the screen edge (Watcher): something is about to hit you from there */
  warn(fx,fz){const a=Math.atan2(fx-P.x,fz-P.z),rel=angD(a,P.yaw+Math.PI);const d=$('dmg'+(HUD._di=(HUD._di+1||0)%4));
    if(DEV)window.__wc=(window.__wc||0)+1;d.className='dmg w';d.style.transform='rotate('+(-rel)+'rad)';d.style.opacity=1;clearTimeout(d._t);d._t=setTimeout(()=>d.style.opacity=0,700);},
  frame(dt){
    if(!P)return;
    this.set('bshield','width',(P.shield/P.shieldMax*100).toFixed(0)+'%');this.set('bhull','width',(P.hull/P.hullMax*100).toFixed(0)+'%');
    this.set('bhull','cls',P.hull<30?'low':'');
    {let ac=!(M&&M.ready),ln=false,ar=false;if(M&&M.ready)for(const A of M.arms){const k=A.kind||'ac';if(k==='ac')ac=true;else if(k==='ln')ln=true;else if(k==='ar')ar=true;}
     this.set('gtier','text',(ac?'GUN '+ROMAN[GUN.tier]:'')+(ln?(ac?' · ':'')+'LANCE':'')+(ar?(ac||ln?' · ':'')+'ARC':''));}
    this.set('hov','cls',P.hovering?'on act':P.hov<.999?'on':'');this.set('hovb','width',(P.hov*100).toFixed(0)+'%');
    kitHud(dt||1/60);this.set('mslc','text','MSL '+MSL.ammo);this.set('bmsl','text','MSL '+MSL.ammo);
    this.set('score','text',G.score.toLocaleString('en-US'));if(!MISSION)this.set('obj','text','');const cm=G.t-G.lastKill<3&&G.combo>1;this.set('combo','text',cm?'x'+Math.min(3,1+.25*(G.combo-1)).toFixed(2).replace(/\.?0+$/,''):'');
    this.set('heatb','width',GUN.heat.toFixed(0)+'%');this.set('heat','cls',GUN.over?'over':GUN.heat>70?'warm':'');
    this.set('cross','cls',GUN.hitT>0?'hit':AIM.e?'on':'');
    this.set('bvent','cls','tb'+(GUN.ventCd>0?' cool':GUN.over?' hot':''));
    const sr=SALVO.cd<=0;this.set('bsalvo','cls','tb'+(sr?'':' cool'));this.set('bsalvo','text',sr?'SALVO':String(Math.ceil(SALVO.cd)));
    this.set('salvoc','text',sr?'SALVO Q':'SALVO '+Math.ceil(SALVO.cd));this.set('salvoc','cls',sr?'rdy':'');
    /* arrows at the screen edge for machines you cannot see within 60 m */
    let k=0;const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
    for(const e of EN){if(k>=6)break;if(e.dead||e.spawnT>0)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>60)continue;
      const rel=angD(Math.atan2(-dx,-dz),P.yaw);if(Math.abs(rel)<.75)continue;const el=$('ea'+k++);sty(el,'display','block');sty(el,'transform','rotate('+(-rel).toFixed(2)+'rad)');sty(el,'opacity',d<25?'1':'.6');}
    for(;k<6;k++)sty($('ea'+k),'display','none');
    /* mission waypoint: a marker over the objective, pinned to the screen edge when it is off screen, with the distance */
    const wp=$('wp');if(MISSION&&!MS.done&&G.mode==='play'){const s=MISSION.steps[MS.step],p=s&&stepPos(s);
      if(p){const v=V3(p.x,hgt(p.x,p.z)+(s.masts?14:5),p.z).project(cam);let sx=(v.x*.5+.5)*innerWidth,sy=(-v.y*.5+.5)*innerHeight;const behind=v.z>1;
        if(behind){sx=innerWidth-sx;sy=innerHeight-sy;}const m=46,off=behind||sx<m||sx>innerWidth-m||sy<m+40||sy>innerHeight-m;
        if(off){const cx=innerWidth/2,cy=innerHeight/2;let dx=sx-cx,dy=sy-cy;if(behind&&Math.abs(dy)<1)dy=1;const k2=Math.min((cx-m)/Math.abs(dx||1e-3),(cy-m-20)/Math.abs(dy||1e-3));sx=cx+dx*k2;sy=cy+dy*k2;}
        sty(wp,'display','block');sty(wp,'transform','translate('+sx.toFixed(0)+'px,'+sy.toFixed(0)+'px)');this.set('wpd','text',Math.round(Math.hypot(p.x-P.x,p.z-P.z))+' m');this.set('wp','cls',off?'off':'');}
      else sty(wp,'display','none');}else sty(wp,'display','none');
  },
  menu(){const m=$('menu');$('mview').textContent='CAMERA: '+(SET.view==='close'?'NEAR':'FAR');
    $('mqual').textContent='QUALITY: '+(SET.quality==='auto'?'AUTO ('+QL.toUpperCase()+')':SET.quality.toUpperCase());
    $('msound').textContent='SOUND: '+(SET.sound?'ON':'OFF');$('msens').textContent='LOOK SPEED: '+SET.sens.toFixed(1)+'x';$('msens').style.display=touchy?'':'none';
    $('mexit').style.display=EMBED?'':'none';m.style.display=G.paused?'flex':'none';},
  dev(){if(!DEV)return;const i=R.info.render;$('dev').textContent=Math.round(1/Math.max(1e-3,G.fdt))+' fps  '+QL+' x'+DYN.toFixed(2)+'  calls '+i.calls+'  tris '+(i.triangles/1000|0)+'k  veg '+VEGN.inst+'  en '+EN.length;}
};
function setupHud(){
  if(touchy)document.body.classList.add('touch');
  const hold=(id,on,off)=>{const b=$(id);b.addEventListener('touchstart',e=>{e.preventDefault();on(e);b.classList.add('on');},{passive:false});
    const up=e=>{off&&off(e);b.classList.remove('on');};b.addEventListener('touchend',up);b.addEventListener('touchcancel',up);};
  hold('bjet',()=>{TS.jet=true;TS.jetHit=true;},()=>{TS.jet=false;});
  hold('bfire',e=>{const t=e.changedTouches[0];TS.fire=true;TS.fireId=t.identifier;TS.fx=t.clientX;TS.fy=t.clientY;},()=>{TS.fire=false;TS.fireId=-1;});
  hold('bmsl',()=>{TS.msl=true;});hold('bvent',()=>{TS.vent=true;});hold('bsalvo',()=>{TS.salvo=true;});
  $('bview').onclick=e=>{e.stopPropagation();cycleView();};
  $('bpause').onclick=e=>{e.stopPropagation();if(G.mode==='play')setPause(!G.paused);};
  $('mresume').onclick=()=>setPause(false);
  $('mview').onclick=()=>{cycleView();HUD.menu();};
  $('mqual').onclick=()=>{const o=['auto','low','med','high'];SET.quality=o[(o.indexOf(SET.quality)+1)%o.length];store.set('quality',SET.quality);
    setQuality(SET.quality==='auto'?(touchy?'med':'high'):SET.quality);HUD.menu();};
  $('msound').onclick=()=>{SET.sound=!SET.sound;store.set('sound',SET.sound?1:0);HUD.menu();};
  $('msens').onclick=()=>{const o=[.6,.8,1,1.3,1.7];SET.sens=o[(o.indexOf(SET.sens)+1)%o.length]||1;store.set('sens',SET.sens);HUD.menu();};
  $('mexit').onclick=()=>ARC.exit();
  $('down').addEventListener('click',()=>{if(G.mode==='down'&&G.downT<=0){if(MISSION)repairAtCheckpoint();else startPlay();}});
  HUD.view(SET.view);
}

/* ---- 10_main.js ---- */
/* ===================== game flow ===================== */
let NIGHT_ON=false;
const G={mode:'load',paused:false,t:0,fdt:1/60,birdT:6,perf:{t:0,n:0,s:0},demoI:1,demoHop:4,score:0,kills:0,combo:0,lastKill:-9,wave:0,hpK:1,breakT:3,downT:0};
let M=null,CTLX=null;
function setQuality(q){QL=q;QC=QUAL[q];DYN=1;resize();setShadow();postSetup();S.fog.far=Math.min(QC.fog,LOOKNOW&&LOOKNOW.fogFar||1e9);S.fog.near=S.fog.far*.22;}
function cycleView(){SET.view=SET.view==='close'?'far':'close';store.set('view',SET.view);HUD.view(SET.view);}
function setPause(b){G.paused=b;HUD.menu();setVolume();if(!b&&!touchy&&G.mode==='play')lockMouse();if(b)jetLoop(0);}
function clearFight(){for(const e of EN)enemyFree(e);bossClearMarks();EN.length=0;BOLTS.length=EBOLTS.length=MISS.length=BEACONS.length=0;for(const p of PK)S.remove(p.g);PK.length=0;}
function resetRun(){P=mkPlayer();CAMS.ready=false;clearFight();Object.assign(GUN,{tier:GUN.base,heat:0,over:false,cd:0,ventCd:0});MSL.ammo=12;SALVO.cd=0;SALVO.left=0;
  Object.assign(G,{score:0,kills:0,combo:0,lastKill:-9,wave:0,hpK:1,breakT:3});if(M)M.root.visible=true;$('down').style.display='none';}
function playerDown(){if(P.dead)return;P.dead=true;P.thrust=0;boom(P.x,P.y+2.5,P.z,2);boom(P.x+1,P.y+3.5,P.z-1,1.2);if(M)M.root.visible=false;
  G.mode='down';G.downT=2.4;
  if(MISSION){const can=missionDown();$('dscore').textContent=can?'REPAIRS LEFT '+MS.repairs:'NO REPAIRS LEFT';$('dgo').textContent=can?'TAP TO REPAIR AT THE CHECKPOINT':'';if(!can)G.downT=99;return;}
  $('dgo').textContent='TAP TO GO AGAIN';const best=+store.get('best',0);if(G.score>best)store.set('best',G.score);
  $('dscore').textContent='SCORE '+G.score.toLocaleString('en-US')+'  ·  WAVE '+G.wave+'  ·  BEST '+Math.max(best,G.score).toLocaleString('en-US')+'  ·  +'+PL.run.toLocaleString('en-US')+' XP · PILOT LV '+PL.lv;
  ARC.over(G.score,Math.min(60,Math.floor(G.score/400)+G.wave));}
function fpsLabel(){$('mfps').textContent='FRAME RATE: '+(SET.fps?'ON':'OFF');$('fps').style.display=SET.fps?'block':'none';}
function startPlay(){$('attract').style.display='none';CAMX=null;audioInit();resetRun();freeFull();pilotRunStart();applyUpgrades();G.mode='play';G.paused=false;$('title').style.display='none';$('mlist').style.display='none';HUD.menu();ARC.begin();STY.seen.clear();if(MISSION){if(MISSION.endless||!storyPlay('m'+MISSION.id+'.open',startMission))startMission();}   /* IH4: the mission's opening scene, then the brief */
  else briefMaybe(WAVES[0],'WAVE 1');   /* IH4: the intel brief before the sandbox's first wave */
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
  HUD.fuel(P);HUD.frame(dt);
}
/* auto quality: if frames are slow, lower the render scale, then the quality level */
function autoQ(dt){if(SET.quality!=='auto'||G.mode!=='play'||G.paused)return;const pf=G.perf;pf.t+=dt;pf.n++;
  if(pf.t>=1.8){const avg=pf.t/pf.n;pf.t=0;pf.n=0;
    if(avg>1/44){if(DYN>.66){DYN*=.88;resize();}
      /* Medium to Low turns shadows off, which rebuilds every shader (a hitch): wait for a moment with no machines alive */
      else if(QL==='high')setQuality('med');else if(QL==='med'){let fight=false;for(const e of EN)if(!e.dead){fight=true;break;}if(!fight)setQuality('low');}}
    else if(avg<1/57&&DYN<1){DYN=Math.min(1,DYN*1.06);resize();}}}
let last=performance.now();
function frame(now){
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;G.fdt+=(raw-G.fdt)*.1;
  if(STY.open){storyFrame(dt);requestAnimationFrame(frame);return;}   /* IH4: a story scene covers the screen: the game waits */
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
  info(){const i=R.info.render;return {geo:R.info.memory.geometries,tex:R.info.memory.textures,prog:R.info.programs?R.info.programs.length:-1,calls:i.calls,tris:i.triangles,veg:VEGN.inst,ql:QL,mode:G.mode,x:+P.x.toFixed(1),z:+P.z.toFixed(1),air:P.air,fuel:+P.fuel.toFixed(2),hull:+P.hull.toFixed(0),shield:+P.shield.toFixed(0),tier:GUN.tier,heat:+GUN.heat.toFixed(0),over:GUN.over,msl:MSL.ammo,score:G.score,kills:G.kills,wave:G.wave,enemies:EN.filter(e=>!e.dead).length,bolts:BOLTS.length,ebolts:EBOLTS.length};}};
/* title screen: mission briefing when a mission is loaded, otherwise the sandbox map buttons and the mission list */
function setupTitle(){
  if(MISSION){$('maps').style.display='none';$('bmis').style.display='none';$('bend').style.display='none';$('tsub').textContent=MISSION.endless?'ENDLESS · '+MAPS[MISSION.map].name:'MISSION '+MISSION.id+' · '+MISSION.name;
    $('tbrief').innerHTML=MISSION.brief.map(l=>'<div>'+l+'</div>').join('')+'<div class="objs">'+MISSION.steps.filter((s,i,a)=>a.findIndex(q=>q.label===s.label)===i).map(s=>'· '+s.label).join('<br>')+'</div>';
    $('tgo').textContent='TAP TO DEPLOY';$('bmenu').style.display='';}
  $('bmis').onclick=e=>{e.stopPropagation();missionMenu();};
  $('bend').onclick=e=>{e.stopPropagation();endlessMenu();};$('elback').onclick=e=>{e.stopPropagation();$('elist').style.display='none';};
  $('mfps').onclick=e=>{e.stopPropagation();SET.fps=!SET.fps;store.set('fps',SET.fps?1:0);fpsLabel();};fpsLabel();
  $('bmenu').onclick=e=>{e.stopPropagation();const q=new URLSearchParams(location.search);q.delete('mission');q.delete('endless');location.search=q.toString();};
  $('mlback').onclick=e=>{e.stopPropagation();$('mlist').style.display='none';};
  $('rnext').onclick=()=>{const q=new URLSearchParams(location.search);q.set('mission',MISSION.id+1);location.search=q.toString();};
  $('rretry').onclick=()=>location.reload();
  $('bhang').onclick=e=>{e.stopPropagation();openBay();};$('bbook').onclick=e=>{e.stopPropagation();openBook();};titlePilot();diffUI();$('rhang').onclick=e=>{e.stopPropagation();openBay();};$('hback').onclick=e=>{e.stopPropagation();$('hangar').style.display='none';};
  $('rmenu').onclick=()=>{const q=new URLSearchParams(location.search);q.delete('mission');q.delete('endless');location.search=q.toString();};   /* IH4: MENU leaves Endless too */
}
boot();
document.querySelectorAll('#maps button').forEach(b=>b.classList.toggle('sel',b.dataset.map===MAPID));

})();
