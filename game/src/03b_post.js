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
