/* ===================== living places: the docks (Harbor 9) =====================  session 7, built with Fable 5.2
   What moves here (all of it outside the play area or well above head height, nothing has a collider):
     WATER    the harbour heaves in slow swells (the surface really moves) and small ripples slide the sunset / moonlight across it;
              a pale line of foam works along the quay wall and the ship's side
     SHIP     the moored ship rises, falls and rolls a little; it carries containers on deck, a funnel that smokes, mast and deck lights
     CRANES   each crane's trolley runs out along the boom, lowers its spreader on cables, lifts a container off the ship, carries it
              ashore and sets it on the crane's own landing platform (15 m up, between its legs); later it carries it back.
              A work light rides on every trolley, a slow warning light blinks on every crane top
     BUOYS    green and yellow buoys bob out on the water, each with a flashing light
     PENNANTS a pennant on every lamp post streams and snaps in the wind
     NEON     the HARBOR 9 sign stutters now and then
   What reacts to the fight:
     an explosion makes the lamps near it stutter (lamp head and, at night, its pool of light), jolts the neon if it is close,
     and sets the crane loads swinging on their cables.
   The small helpers at the top (lifeGlow, lifeLampRig, lifeNeon) are shared with the foundry (04j_life_foundry.js). */

/* ---- lifeGlow: a handful of soft round lights (one draw). set() once, then bright()/pos() as often as you like, flush() each frame ---- */
function lifeGlow(n){
  const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
  const iP=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3),iS=new THREE.InstancedBufferAttribute(new Float32Array(n*2),2),iC=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);
  iP.setUsage(THREE.DynamicDrawUsage);iS.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iP',iP);g.setAttribute('iS',iS);g.setAttribute('iC',iC);g.instanceCount=0;
  const m=new THREE.ShaderMaterial({uniforms:{uFog:{value:new THREE.Vector2(S.fog.near,S.fog.far)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 iP;attribute vec2 iS;attribute vec3 iC;uniform vec2 uFog;varying vec2 vUv;varying vec3 vC;
      void main(){vUv=uv;vec4 mv=viewMatrix*vec4(iP,1.);float d=-mv.z,s=max(iS.x,d*.011);   /* far lights never shrink below a few pixels */
        vC=iC*iS.y*(1.-.5*smoothstep(uFog.x,uFog.y,d));mv.z+=min(1.2,d*.4);mv.xy+=position.xy*s*2.;gl_Position=iS.y>0.?projectionMatrix*mv:vec4(2.,2.,2.,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec3 vC;
      void main(){float r=length(vUv-.5)*2.;float gl=pow(max(0.,1.-r),2.6)*.55+pow(max(0.,1.-r*2.6),2.)*1.6;gl_FragColor=vec4(vC*gl,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=4;S.add(mesh);
  const G_={mesh,n:0,dP:false,
    add(x,y,z,size,col,b){const i=G_.n++;if(i>=n)return n-1;iP.array.set([x,y,z],i*3);iC.array.set(col,i*3);iS.array[i*2]=size;iS.array[i*2+1]=b==null?1:b;g.instanceCount=G_.n;iP.needsUpdate=iC.needsUpdate=true;return i;},
    pos(i,x,y,z){const a=iP.array;a[i*3]=x;a[i*3+1]=y;a[i*3+2]=z;G_.dP=true;},
    bright(i,b){iS.array[i*2+1]=b;},size(i,s){iS.array[i*2]=s;},
    flush(){iS.needsUpdate=true;if(G_.dP){iP.needsUpdate=true;G_.dP=false;}}};
  return G_;}

/* ---- lifeLampRig: lets single lamps of a map flicker. The lamp heads are one merged mesh (and the light pools another), so each lamp
   gets its own brightness through a vertex colour; only the flickering lamp's few vertices are sent again. ---- */
function lifeLampRig(lampM,poolMesh,lamps){
  const head=S.children.find(o=>o.isMesh&&o.material===lampM);if(!head)return null;
  const mk=mesh=>{const g=mesh.geometry,p=g.attributes.position,n=p.count,col=new Float32Array(n*3).fill(1),own=new Int16Array(n),span=lamps.map(()=>[n,0]);
    for(let i=0;i<n;i++){let b=0,bd=1e9;const x=p.getX(i),z=p.getZ(i);for(let j=0;j<lamps.length;j++){const d=(x-lamps[j].x)**2+(z-lamps[j].z)**2;if(d<bd){bd=d;b=j;}}
      own[i]=b;span[b][0]=Math.min(span[b][0],i);span[b][1]=Math.max(span[b][1],i+1);}
    const a=new THREE.BufferAttribute(col,3);a.setUsage(THREE.DynamicDrawUsage);g.setAttribute('color',a);mesh.material.vertexColors=true;mesh.material.needsUpdate=true;return {a,col,own,span};};
  const parts=[mk(head)];if(poolMesh)parts.push(mk(poolMesh));
  for(const l of lamps){l.f=0;l.q=0;l.v=1;l.pv=1;}
  const put_=(j,v)=>{for(const q of parts){const s=q.span[j];if(s[1]<=s[0])continue;for(let i=s[0];i<s[1];i++)if(q.own[i]===j){q.col[i*3]=q.col[i*3+1]=q.col[i*3+2]=v;}
    q.a.addUpdateRange(s[0]*3,(s[1]-s[0])*3);q.a.needsUpdate=true;}};
  const R_={lamps,faulty:-1,next:4,
    kick(x,z,k){const r=24+30*k;for(const l of lamps){const d=Math.hypot(l.x-x,l.z-z);if(d<r)l.f=Math.max(l.f,.3+(.4+.9*k)*(1-d/r));}},
    tick(dt){for(const q of parts)q.a.clearUpdateRanges();
      if(R_.faulty>=0&&(R_.next-=dt)<=0){R_.next=5+Math.random()*7;lamps[R_.faulty].f=.5+Math.random()*.9;}   /* one tired lamp buzzes on its own */
      for(let j=0;j<lamps.length;j++){const l=lamps[j];if(l.f>0){l.f-=dt;if((l.q-=dt)<=0){l.q=.04+Math.random()*.1;l.v=Math.random()<.65?.04+Math.random()*.16:.65+Math.random()*.35;}if(l.f<=0)l.v=1;}
        if(l.v!==l.pv){put_(j,l.v);l.pv=l.v;}}}};
  return R_;}

/* ---- lifeNeon: a neon sign that hums, stutters by itself now and then, and can be jolted ---- */
function lifeNeon(mesh,base){if(!mesh)return {tick(){},kick(){}};
  const N={f:0,q:0,v:1,next:5+Math.random()*6,kick(k){N.f=Math.max(N.f,.25+k*.5);},
    tick(dt,t){if((N.next-=dt)<=0){N.next=6+Math.random()*9;N.f=.3+Math.random()*.5;}
      if(N.f>0){N.f-=dt;if((N.q-=dt)<=0){N.q=.03+Math.random()*.09;N.v=Math.random()<.45?.12:1;}if(N.f<=0)N.v=1;}
      mesh.material.color.setScalar(base*N.v*(1+.05*Math.sin(t*23)));}};return N;}

/* the wind the shared builder sets (direction x,z, steady, gust); a light breeze toward +x if it is not there */
function lifeWind(){const w=U.uWind&&U.uWind.value;return w?{x:w.x,z:w.y,k:w.z+w.w*.5}:{x:.94,z:.34,k:.3};}

const DKL={};   /* the docks' moving parts (also handy for tests) */
lifeOn('docks',{
build(L){const D=MAPS.docks,low=QL==='low',night=!!L.night,rnd=mulberry(907),Qz=-100,UT=U.uTime;DKL.night=night;
  const corr=tmat('10-corrugated-metal',{rep:[3,1],r:.65,m:.35});   /* one painted-steel material for every container and crane part added here */
  const selfLit=(m,k,key)=>{const ob=m.onBeforeCompile;m.onBeforeCompile=sh=>{if(ob)ob(sh);   /* a little of its own colour as light: reads as floodlit at night */
    sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*'+k.toFixed(3)+';');};m.customProgramCacheKey=()=>key;return m;};
  if(night)selfLit(corr,.2,'dkcorr');
  /* ---------- WATER: a finer sheet (dense at the quay, coarse far out) that heaves in the vertex shader ---------- */
  if(D.water){const old=D.water,nx=low?44:88,nz=low?28:48,pos=[],uv=[],idx=[];
    for(let j=0;j<=nz;j++){const z=-99-321*Math.pow(j/nz,1.5);for(let i=0;i<=nx;i++){const x=-350+700*i/nx;pos.push(x,-2.6,z);uv.push(i/nx,(z+420)/320);}}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;idx.push(a,b,c,b,d,c);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const m=old.material;if(!night)m.color.set(0x5d6f8e);   /* lead: cooler water under the warm sunset light */
    m.onBeforeCompile=sh=>{sh.uniforms.uWT=UT;sh.uniforms.uSheen={value:night?new THREE.Vector4(.07,.12,.26,2.2):new THREE.Vector4(.36,.2,.44,.5)};   /* lead: a violet sheen like the sunset sky (the orange one read as sand) */
      sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
        uniform float uWT;varying vec3 vWP;
        vec3 dkWave(vec2 p){vec2 k1=vec2(.05,.155),k2=vec2(-.14,.2),k3=vec2(.12,.3);float a1=dot(p,k1)-uWT*.8,a2=dot(p,k2)-uWT*1.2,a3=dot(p,k3)-uWT*1.7;
          return vec3(.3*sin(a1)+.15*sin(a2)+.07*sin(a3),.3*cos(a1)*k1+.15*cos(a2)*k2+.07*cos(a3)*k3);}`)
        .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec3 dkw=dkWave(position.xz);objectNormal=normalize(vec3(-dkw.y,1.,-dkw.z));')
        .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=dkw.x;vWP=transformed;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uWT;uniform vec4 uSheen;varying vec3 vWP;vec3 dkGl=vec3(0.);')
        .replace('#include <map_fragment>',`#include <map_fragment>
        {float e=max(1.-smoothstep(.2,2.8,abs(vWP.z+101.4)),(1.-smoothstep(.2,2.6,abs(vWP.z+112.8)))*step(-80.,vWP.x)*step(vWP.x,110.));   /* foam along the quay wall and the hull */
         float fn=sin(vWP.x*.9+uWT*1.3)*sin(vWP.x*.37-uWT*.8+vWP.z*2.)*.5+.5;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.8,.86,.88),e*(.2+.6*fn));}`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        {vec2 p=vWP.xz,g=vec2(0.);float k=1./(1.+length(vViewPosition)*.02);   /* ripples: they carry the moving highlights */
         vec2 r1=vec2(1.1,.6),r2=vec2(-.7,1.6),r3=vec2(2.3,-1.1),r4=vec2(.35,.9);
         g+=cos(dot(p,r1)+uWT*2.1)*r1*.05+cos(dot(p,r2)-uWT*2.6)*r2*.04+cos(dot(p,r3)+uWT*3.3)*r3*.02+cos(dot(p,r4)-uWT*1.2)*r4*.14;
         vec3 wn=(vec4(normal,0.)*viewMatrix).xyz;wn=normalize(wn+vec3(-g.x,0.,-g.y)*k);normal=normalize((viewMatrix*vec4(wn,0.)).xyz);
         vec3 V=normalize(vViewPosition);dkGl=uSheen.rgb*pow(1.-max(dot(normal,V),0.),3.);   /* sky sheen at grazing angles, and a wide glitter path under the sun or moon */
         #if NUM_DIR_LIGHTS > 0
           dkGl+=directionalLights[0].color*pow(max(dot(reflect(-V,normal),directionalLights[0].direction),0.),60.)*uSheen.w;
         #endif
        }`).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=dkGl;');};
    m.customProgramCacheKey=()=>'dkwater';m.needsUpdate=true;
    const w=new THREE.Mesh(g,m);w.receiveShadow=true;w.frustumCulled=false;S.add(w);S.remove(old);old.geometry.dispose();DKL.water=w;}
  /* ---------- SHIP: hull and deckhouse hang in one group that rides the swell; containers on deck, a funnel, masts ---------- */
  const ship=new THREE.Group();ship.position.set(15,-2.6,Qz-24);S.add(ship);DKL.ship=ship;
  if(D.shipParts){const [hullM,houseM]=D.shipParts,hg=hullM.geometry;S.remove(hullM);S.remove(houseM);
    hg.clearGroups();hg.addGroup(0,12,0);hg.addGroup(12,6,2);hg.addGroup(18,6,3);hg.addGroup(24,12,4);   /* same faces, fewer draws */
    hullM.position.set(0,2.6,0);ship.add(hullM);
    houseM.scale.x=.75;houseM.position.set(-86,19.1,0);ship.add(houseM);   /* the deckhouse moves aft a little so the first crane has a clear hold to work */
    const bits=[],bx=(w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);bits.push(g);};
    const fun=new THREE.CylinderGeometry(2.3,2.8,9,14);fun.translate(-89,31.1,0);bits.push(fun);
    bx(4,1.2,25,-79,27.2,0);bx(.5,10,.5,-80,31.6,0);bx(5,.4,.4,-80,34.6,0);bx(.5,12,.5,92,17.6,0);bx(.4,.4,6,92,21.6,0);
    const top=new THREE.Mesh(THREE.mergeGeometries(bits),hullM.material[0]);top.castShadow=false;ship.add(top);}
  /* deck cargo: bays every 13.6 m (so each crane stands over one), 7 rows across, up to 4 high */
  const PAL=[[.82,.2,.14],[.16,.34,.72],[.2,.55,.45],[.85,.62,.16],[.75,.76,.78],[.5,.24,.16],[.9,.45,.12]];
  const cg=new THREE.BoxGeometry(12.2,2.6,2.44),cargo=[],CR=[-59,9,77],slotZ=7.8;
  for(let k=0;k<12;k++)for(let r=0;r<7;r++){const work=k%5===0&&r===6,n=work?2:r===6?1+(rnd()*2|0):1+(rnd()*4|0);
    for(let j=0;j<n;j++)cargo.push([-74+k*13.6,12.9+j*2.6,(r-3)*2.6,PAL[rnd()*PAL.length|0]]);}
  const cim=new THREE.InstancedMesh(cg,corr,cargo.length),M4=new THREE.Matrix4(),col=new THREE.Color();
  cargo.forEach((c,i)=>{M4.makeTranslation(c[0],c[1],c[2]);cim.setMatrixAt(i,M4);cim.setColorAt(i,col.setRGB(c[3][0],c[3][1],c[3][2]));});cim.receiveShadow=true;ship.add(cim);
  /* ---------- CRANES: trolley, spreader, four cables and one container each, plus the landing platform (one instanced draw) ---------- */
  const NI=8*CR.length,dyn=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),corr,NI);dyn.instanceMatrix.setUsage(THREE.DynamicDrawUsage);dyn.frustumCulled=false;S.add(dyn);DKL.dyn=dyn;
  DKL.cr=CR.map((cx,i)=>{const c={cx,i,z:-94.5,vz:0,h:28.5,sw:0,swv:0,has:false,loc:'ship',ph:0,t:2+i*5.5,col:PAL[(i*2+1)%PAL.length],slot:new THREE.Vector3(cx-15,12.9+5.2,slotZ)};
    const cc=[[.16,.17,.2],[.95,.72,.1],[.05,.05,.06],[.05,.05,.06],[.05,.05,.06],[.05,.05,.06],c.col,[.3,.31,.34]];
    cc.forEach((q,j)=>dyn.setColorAt(i*8+j,col.setRGB(q[0],q[1],q[2])));
    M4.compose(V3(cx,15,-94.5),new THREE.Quaternion(),V3(13.2,.5,7.2));dyn.setMatrixAt(i*8+7,M4);return c;});
  /* ---------- LIGHTS: crane tops, trolley work lights, ship lights, buoy lights ---------- */
  const GL=lifeGlow(40),k=night?1:.75;DKL.glow=GL;
  for(const c of DKL.cr){c.gTop=GL.add(c.cx,41,-94.5,2.4,[3,.5,.2]);c.gEnd=GL.add(c.cx,37,-74.5,1.5,[2.4,1.5,.4],.8*k);
    c.gTr=GL.add(c.cx,31.4,c.z,2.2,[2.6,2.3,1.7],k);c.gSp=GL.add(c.cx,c.h,c.z,1.3,[2.6,1.6,.3],k);}
  DKL.shipLights=[[-80,37,0,1.8,[2.4,2.4,2.2]],[-79,27.4,11,1.6,[2.6,2.1,1.3]],[-79,27.4,-11,1.6,[2.6,2.1,1.3]],[92,24,0,1.5,[2.4,2.4,2.2]],[-89,36,0,1.2,[2.6,1.5,.4]]]
    .map(q=>({p:new THREE.Vector3(q[0],q[1],q[2]),i:GL.add(0,0,0,q[3],q[4],k)}));
  /* ---------- BUOYS ---------- */
  if(!low){const bg=THREE.mergeGeometries([new THREE.CylinderGeometry(1.25,1.25,1,12).translate(0,.25,0),new THREE.CylinderGeometry(.2,.8,3.4,6).translate(0,2.4,0),new THREE.SphereGeometry(.36,8,6).translate(0,4.2,0)]);
    const spots=[[-150,-124],[-116,-150],[-186,-116],[-136,-112],[150,-121],[128,-150],[186,-138]];
    const bm=new THREE.InstancedMesh(bg,hookWorld(new THREE.MeshStandardMaterial({roughness:.6,metalness:.1})),spots.length);bm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);bm.frustumCulled=false;S.add(bm);
    DKL.buoyMesh=bm;DKL.buoys=spots.map((q,i)=>{const green=i%2===0;bm.setColorAt(i,col.setRGB(...(green?[.1,.5,.28]:[.9,.68,.1])));
      return {x:q[0],z:q[1],ph:rnd()*TAU,g:GL.add(q[0],2,q[1],1.5,green?[.4,3,1.1]:[3,2.2,.4]),per:green?3:4.2};});}
  /* ---------- PENNANTS: one on every lamp post, streaming downwind ---------- */
  const lamps=[];for(const x of D.lanesX)for(const z of [-88,-20,52,84])lamps.push({x:x+3.6,z});
  {const pg=new THREE.PlaneGeometry(2.8,1.15,9,1);pg.translate(1.4,0,0);const w=lifeWind(),ang=Math.atan2(-w.z,w.x),list=low?lamps.filter((l,i)=>i%2===0):lamps;
    const pm=new THREE.MeshLambertMaterial({side:THREE.DoubleSide});DKL.flap={value:0};
    pm.onBeforeCompile=sh=>{sh.uniforms.uFlap=DKL.flap;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uFlap;')
        .replace('#include <begin_vertex>',`#include <begin_vertex>
        {float u=position.x/2.8,ph=instanceMatrix[3].x*.7+instanceMatrix[3].z*.4;transformed.y*=1.-.6*u;   /* tapers to the tip */
         transformed.z+=(sin(u*7.-uFlap*8.+ph)*.3+sin(u*3.2-uFlap*3.1+ph*2.)*.26)*u;transformed.y+=sin(u*5.-uFlap*6.3+ph)*.1*u-u*u*.45;}`)
        ;sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*'+(night?'.25':'.12')+';');};
    const pim=new THREE.InstancedMesh(pg,pm,list.length),q=new THREE.Quaternion().setFromAxisAngle(V3(0,1,0),ang),PC=night?[[.9,.4,.07],[.07,.5,.58],[.85,.68,.1]]:[[.5,.17,.02],[.02,.2,.26],[.42,.3,.03]]   /* the low sun is strong: darker cloth keeps its colour */;
    list.forEach((l,i)=>{M4.compose(V3(l.x+w.x*.25,10.9,l.z+w.z*.25),q,V3(.62,.62,.62))   /* lead: 62% size, they crowded the chase camera beside a lamp */;pim.setMatrixAt(i,M4);pim.setColorAt(i,col.setRGB(...PC[i%3]));});
    pim.frustumCulled=false;S.add(pim);DKL.pennants=pim;}
  /* ---------- lamps that stutter, the neon ---------- */
  DKL.rig=D.lampM?lifeLampRig(D.lampM,D.poolMesh,lamps):null;if(DKL.rig)DKL.rig.faulty=14;
  DKL.neon=lifeNeon(D.neon,2);DKL.smoke=0;DKL.o=new THREE.Object3D();DKL.v=new THREE.Vector3();
},
tick(dt,t){const ship=DKL.ship;if(!ship)return;const o=DKL.o,v=DKL.v,dyn=DKL.dyn,GL=DKL.glow,w=lifeWind();
  /* the ship rides the swell */
  ship.position.y=-2.6+.24*Math.sin(t*.52)+.09*Math.sin(t*.87+1);ship.rotation.x=.016*Math.sin(t*.43+.6)+.004*Math.sin(t*1.1);ship.rotation.z=.0013*Math.sin(t*.33);ship.updateMatrixWorld(true);
  for(const l of DKL.shipLights){v.copy(l.p).applyMatrix4(ship.matrixWorld);GL.pos(l.i,v.x,v.y,v.z);}
  /* funnel smoke, drifting downwind */
  if((DKL.smoke-=dt)<=0){DKL.smoke=QL==='low'?.3:.16;v.set(-89,36,0).applyMatrix4(ship.matrixWorld);const s=1.6+w.k*3;
    part({x:v.x+(Math.random()-.5),y:v.y,z:v.z+(Math.random()-.5),vx:w.x*s,vy:2.6,vz:w.z*s,life:5.5,s0:2.6,s1:11,a:DKL.night?.3:.42,col:DKL.night?[.2,.2,.24]:[.3,.24,.26],drag:.12,grav:-.12});}
  /* cranes */
  for(const c of DKL.cr){const b=c.i*8;v.copy(c.slot).applyMatrix4(ship.matrixWorld);const sy=v.y+1.525,sz=v.z,sx=v.x;
    const HI=28.5,zP=-94.5,yP=18.075,toShip=c.loc==='ship'?!c.has:c.has;   /* which end this half of the trip heads for */
    let zt=c.z,ht=HI;
    switch(c.ph){
      case 0:if((c.t-=dt)<=0)c.ph=1;zt=-104;break;                                                    /* waiting, hook up */
      case 1:zt=toShip?sz:zP;if(Math.abs(c.z-zt)<.05&&Math.abs(c.vz)<.1&&Math.abs(c.sw)<.02)c.ph=2;break;   /* run to the pick-up */
      case 2:zt=toShip?sz:zP;ht=toShip?sy:yP;if(Math.abs(c.h-ht)<.06){c.ph=3;c.t=.9;}break;              /* lower the spreader */
      case 3:zt=toShip?sz:zP;ht=toShip?sy:yP;if((c.t-=dt)<=0){c.has=true;c.ph=4;}break;                    /* lock on */
      case 4:zt=c.z;if(Math.abs(c.h-HI)<.06)c.ph=5;break;                                              /* hoist */
      case 5:zt=toShip?sz:zP;if(Math.abs(c.z-zt)<.05&&Math.abs(c.vz)<.1&&Math.abs(c.sw)<.02)c.ph=6;break;   /* carry it across */
      case 6:zt=toShip?sz:zP;ht=toShip?sy:yP;if(Math.abs(c.h-ht)<.06){c.ph=7;c.t=.9;}break;              /* set it down */
      case 7:zt=toShip?sz:zP;ht=toShip?sy:yP;if((c.t-=dt)<=0){c.loc=toShip?'ship':'plat';c.has=false;c.ph=8;}break;
      case 8:zt=c.z;if(Math.abs(c.h-HI)<.06){c.ph=0;c.t=3+Math.random()*7;}break;}
    /* trolley: gentle starts and stops (they set the load swinging a little) */
    const dz=zt-c.z,want=clamp(dz*1.2,-3.6,3.6),pv=c.vz;c.vz+=clamp(want-c.vz,-1.6*dt,1.6*dt);c.z+=c.vz*dt;
    c.h+=clamp(ht-c.h,-2.6*dt,2.6*dt);
    const Lc=Math.max(3,31.8-c.h),acc=dt>0?(c.vz-pv)/dt:0;c.swv+=(-9.8/Lc*Math.sin(c.sw)-acc/Lc*.8-c.swv*1.1)*dt;c.sw=clamp(c.sw+c.swv*dt,-.3,.3);
    const near=c.ph===2||c.ph===3||c.ph===6||c.ph===7?clamp((c.h-ht)/5,0,1):1,sw=c.sw*near,oz=Math.sin(sw)*Lc,oy=(1-Math.cos(sw))*Lc;
    const put=(j,x,y,z,sx_,sy_,sz_,rx)=>{o.position.set(x,y,z);o.scale.set(sx_,sy_,sz_);o.rotation.set(rx||0,0,0);o.updateMatrix();dyn.setMatrixAt(b+j,o.matrix);};
    put(0,c.cx,32.6,c.z,4.6,1.6,5.2);put(1,c.cx,c.h+oy,c.z+oz,12.5,.45,2.6,-sw);
    for(let j=0;j<4;j++){const ex=j<2?-5:5,ez=j%2?-.95:.95,ty=31.8,by=c.h+oy+.2,len=Math.hypot(ty-by,oz);put(2+j,c.cx+ex,(ty+by)/2,c.z+ez+oz/2,.2,len,.2,-Math.atan2(oz,ty-by));}
    if(c.has)put(6,c.cx,c.h+oy-1.525*Math.cos(sw),c.z+oz+1.525*Math.sin(sw),12.2,2.6,2.44,-sw);
    else if(c.loc==='ship'){o.position.set(sx,sy-1.525,sz);o.scale.set(12.2,2.6,2.44);o.quaternion.copy(ship.quaternion);o.updateMatrix();dyn.setMatrixAt(b+6,o.matrix);}
    else put(6,c.cx,16.55,zP,12.2,2.6,2.44);
    GL.pos(c.gTr,c.cx,31.3,c.z);GL.pos(c.gSp,c.cx,c.h+oy+.6,c.z+oz);
    GL.bright(c.gTop,.15+.85*Math.pow(Math.max(0,Math.sin(t*1.3+c.i*2.1)),6));}
  dyn.instanceMatrix.needsUpdate=true;
  /* buoys */
  if(DKL.buoys){const bm=DKL.buoyMesh;DKL.buoys.forEach((q,i)=>{const y=-2.75+.3*Math.sin(t*.8+q.ph)+.12*Math.sin(t*1.9+q.ph*2),rx=.16*Math.sin(t*1.1+q.ph),rz=.14*Math.sin(t*.9+q.ph*1.7);
      o.position.set(q.x,y,q.z);o.scale.set(1,1,1);o.rotation.set(rx,0,rz);o.updateMatrix();bm.setMatrixAt(i,o.matrix);v.set(0,4.5,0).applyMatrix4(o.matrix);GL.pos(q.g,v.x,v.y,v.z);
      GL.bright(q.g,((t+q.ph)%q.per)<.7?1.2:.06);});bm.instanceMatrix.needsUpdate=true;}
  GL.flush();
  DKL.flap.value+=dt*(.55+w.k*1.1);
  if(DKL.rig)DKL.rig.tick(dt);DKL.neon.tick(dt,t);
},
noise(x,z,k,kind){if(kind!=='boom'||!DKL.cr)return;
  if(DKL.rig)DKL.rig.kick(x,z,k);if(Math.hypot(x,z-98)<70)DKL.neon.kick(k);
  for(const c of DKL.cr){const d=Math.hypot(x-c.cx,z-c.z);if(d<90)c.swv+=(z>c.z?-1:1)*k*.2*(1-d/90);}}
});
