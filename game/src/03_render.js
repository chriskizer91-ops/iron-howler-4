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
