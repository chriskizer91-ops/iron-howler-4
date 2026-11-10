/* ===================== living places: the WOODS (session 7, the "outdoor" builder) =====================
   What moves here:
     - leaves drifting down around the camera all the time (fewer and duller in the fog)
     - by day: soft shafts of sunlight slanting into the clearings; they dim when a cloud shadow passes
     - low mist pooled in the hollows, drifting; much thicker in the mission 4 fog
     - fireflies in the fog
     - a small herd of deer grazing in a clearing: heads come up when you get close, and they bolt to another clearing
       when you come nearer or the shooting starts
     - an explosion among the trees shakes a burst of leaves out of the canopies around it
   Cost: 6 draw calls (deer count twice: once for their shadow), about 4k triangles, about 0.5 KB uploaded per frame while the deer are in range.
   Uses lifeMotes / lifeTint / OUTWIND from 04g_life_field.js. */
const WDS={deer:null,herd:null,mist:null,shafts:null,leaves:null,flies:null,burst:null,trees:[],scanT:0};

/* ---- deer: one instanced mesh; legs and neck are swung in the vertex shader from three numbers per deer (stride phase, how hard it runs, head down) ---- */
function deerGeo(){const L=[],tan=[.5,.34,.2],dark=[.27,.18,.12],cream=[.95,.9,.78];
  const bx=(w,h,d,x,y,z,col,kind,piv,rx)=>{let g=new THREE.BoxGeometry(w,h,d);if(rx)g.rotateX(rx);g.translate(x,y,z);g=g.toNonIndexed();lifeTint(g,col[0],col[1],col[2]);
    const n=g.attributes.position.count,k=new Float32Array(n).fill(kind||0),p=new Float32Array(n*3);if(piv)for(let i=0;i<n;i++){p[i*3]=piv[0];p[i*3+1]=piv[1];p[i*3+2]=piv[2];}
    g.setAttribute('aKind',new THREE.BufferAttribute(k,1));g.setAttribute('aPiv',new THREE.BufferAttribute(p,3));L.push(g);};
  bx(.58,.64,1.5,0,1.42,0,tan);bx(.5,.3,1.2,0,1.12,0,[.62,.47,.3]);                       /* body, paler belly */
  bx(.44,.44,.08,0,1.5,-.78,cream);bx(.16,.34,.1,0,1.6,-.84,cream);                          /* the white rump and tail: what you see when they run from you */
  let kd=1;for(const sz of [1,-1])for(const sx of [-1,1])bx(.15,1.12,.17,sx*.2,.56,sz*.58,dark,kd++,[0,1.12,sz*.58]);   /* legs 1-4, hinged at the top */
  const nv=[0,1.55,.62];bx(.27,.9,.32,0,1.95,.88,tan,5,nv,.62);bx(.26,.28,.54,0,2.36,1.24,tan,5,nv);bx(.2,.2,.14,0,2.31,1.55,dark,5,nv);   /* neck, head, nose */
  for(const sx of [-1,1])bx(.08,.24,.05,sx*.17,2.58,1.04,tan,5,nv);                         /* ears */
  return THREE.mergeGeometries(L,false);}
function buildDeer(L){
  const n=QL==='low'?4:6,g=deerGeo(),an=new THREE.InstancedBufferAttribute(new Float32Array(n*3),3);an.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aAnim',an);
  const mat=hookWorld(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0})),base=mat.onBeforeCompile;
  mat.onBeforeCompile=sh=>{base(sh);sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aPiv;attribute float aKind;attribute vec3 aAnim;')
    .replace('#include <begin_vertex>',`#include <begin_vertex>
      {float ang=0.;if(aKind>4.5)ang=aAnim.z*1.85+sin(aAnim.x)*.12*aAnim.y;
       else if(aKind>.5)ang=sin(aAnim.x+(aKind>2.5?3.1416:0.)+(mod(aKind,2.)<.5?.9:0.))*aAnim.y*.8;
       vec3 q=transformed-aPiv;float cs=cos(ang),sn=sin(ang);q.yz=vec2(q.y*cs-q.z*sn,q.y*sn+q.z*cs);transformed=aPiv+q;}`);};
  mat.customProgramCacheKey=()=>'deer';
  const im=new THREE.InstancedMesh(g,mat,n);im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;im.userData.keep=1;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);S.add(im);
  /* start in a clearing a little way off, by the trail if there is one, so you meet them early but not at once */
  let home=0,best=1e9;CLEAR.forEach((c,i)=>{const d=Math.hypot(c[0]-SPAWN.x,c[1]-SPAWN.z),sc=(d<48?400:d)+trailD(c[0],c[1])*1.2;if(sc<best){best=sc;home=i;}});
  const rnd=mulberry(61),D=[];
  for(let i=0;i<n;i++){const c=CLEAR[home],a=rnd()*TAU,r=Math.sqrt(rnd())*c[2]*.55;
    D.push({x:c[0]+Math.cos(a)*r,z:c[1]+Math.sin(a)*r,yaw:rnd()*TAU,s:i===n-1?.72:1.05+rnd()*.25,ph:rnd()*6,run:0,head:1,spd:0,tx:0,tz:0,go:false,wait:rnd()*6,delay:0,vmax:13+rnd()*3,k:rnd()});}
  WDS.deer={im,an,D,home,state:'graze',alertT:0,m:new THREE.Matrix4(),q:new THREE.Quaternion(),v:new THREE.Vector3(),sc:new THREE.Vector3(),up:new THREE.Vector3(0,1,0),thx:0,thz:0,calm:0};}
function deerBolt(fx,fz){const H=WDS.deer;if(!H)return;
  /* already running: only change course when the new danger is where they are heading */
  if(H.state==='run'&&(H.calm<1.5||Math.hypot(CLEAR[H.home][0]-fx,CLEAR[H.home][1]-fz)>45))return;
  let hx=0,hz=0;for(const d of H.D){hx+=d.x;hz+=d.z;}hx/=H.D.length;hz/=H.D.length;
  /* run to the clearing that is far from the danger and not too far from here, away from where the danger is */
  let to=H.home,best=-1e9;CLEAR.forEach((c,i)=>{if(i===H.home&&H.state!=='run')return;const dT=Math.hypot(c[0]-fx,c[1]-fz),dH=Math.hypot(c[0]-hx,c[1]-hz);
    const away=((c[0]-hx)*(hx-fx)+(c[1]-hz)*(hz-fz))/((dH||1)*(Math.hypot(hx-fx,hz-fz)||1)),sc=Math.min(dT,150)+away*45-dH*.25;if(sc>best){best=sc;to=i;}});
  const c=CLEAR[to];H.home=to;H.state='run';H.calm=0;
  for(const d of H.D){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*c[2]*.55;d.tx=c[0]+Math.cos(a)*r;d.tz=c[1]+Math.sin(a)*r;d.go=true;d.delay=Math.random()*.45;}}
function deerTick(dt,t){const H=WDS.deer;if(!H)return;const D=H.D;
  let hx=0,hz=0;for(const d of D){hx+=d.x;hz+=d.z;}hx/=D.length;hz/=D.length;
  const dP=G.mode==='title'||G.mode==='bay'?1e9:Math.hypot(P.x-hx,P.z-hz),dC=Math.hypot(cam.position.x-hx,cam.position.z-hz);
  H.calm+=dt;
  if(H.state!=='run'){if(dP<27)deerBolt(P.x,P.z);else if(dP<52){H.state='alert';H.alertT=3;H.thx=P.x;H.thz=P.z;}
    if((WDS.scanT-=dt)<=0){WDS.scanT=.4;for(const e of EN)if(!e.dead&&Math.hypot(e.x-hx,e.z-hz)<30){deerBolt(e.x,e.z);break;}}}
  if(H.state==='alert'&&(H.alertT-=dt)<=0)H.state='graze';
  const moving=H.state==='run';if(!moving&&dC>QC.far+30){H.im.visible=false;return;}H.im.visible=true;
  let arrived=0;
  for(let i=0;i<D.length;i++){const d=D[i];let want=0,head=0,turn=null;
    if(H.state==='run'){if(d.delay>0){d.delay-=dt;turn=Math.atan2(d.tx-d.x,d.tz-d.z);}else if(d.go){want=d.vmax;}else arrived++;}
    else if(H.state==='alert'){turn=Math.atan2(H.thx-d.x,H.thz-d.z);d.go=false;}
    else{/* grazing: stand head down, look up now and then, amble to a new spot */
      if(d.go)want=.9;else{head=Math.sin(t*.35+d.k*9)>.72?0:1;if((d.wait-=dt)<=0){const c=CLEAR[H.home],a=Math.random()*TAU,r=Math.sqrt(Math.random())*c[2]*.55;d.tx=c[0]+Math.cos(a)*r;d.tz=c[1]+Math.sin(a)*r;d.go=true;d.wait=5+Math.random()*10;}}}
    d.spd+=(want-d.spd)*damp(want>d.spd?3.5:5,dt);
    if(d.go&&d.spd>.05){const dx=d.tx-d.x,dz=d.tz-d.z,l=Math.hypot(dx,dz);if(l<(H.state==='run'?3:.6)){d.go=false;}else{turn=Math.atan2(dx,dz);
        d.x+=Math.sin(d.yaw)*d.spd*dt;d.z+=Math.cos(d.yaw)*d.spd*dt;if(H.state==='run'){const c=collide(d.x,d.z,.45);d.x=c[0];d.z=c[1];}}}
    if(turn!=null){let da=turn-d.yaw;da=Math.atan2(Math.sin(da),Math.cos(da));d.yaw+=da*damp(H.state==='run'?7:3,dt);}
    const rk=clamp(d.spd/11,0,1);d.run=d.spd<.05?0:Math.max(.28,rk);d.ph+=dt*(4+rk*9)*(d.spd>.05?1:0);d.head+=(head-d.head)*damp(head<d.head?9:2.2,dt);
    const y=hgt(d.x,d.z)+Math.abs(Math.sin(d.ph))*.4*rk*d.s-.04;
    H.q.setFromAxisAngle(H.up,d.yaw);H.m.compose(H.v.set(d.x,y,d.z),H.q,H.sc.set(d.s,d.s,d.s));H.im.setMatrixAt(i,H.m);H.an.setXYZ(i,d.ph,d.run,d.head);}
  if(H.state==='run'&&arrived===D.length)H.state='graze';
  H.im.instanceMatrix.needsUpdate=true;H.an.needsUpdate=true;}

/* ---- a burst of leaves shaken out of the trees: a ring of 360 points, each launched once and then flown in the shader ---- */
function buildLeafBurst(col,col2){const n=QL==='low'?160:360,g=new THREE.BufferGeometry(),mk=k=>{const a=new THREE.BufferAttribute(new Float32Array(n*k),k);a.setUsage(THREE.DynamicDrawUsage);return a;};
  const P_=mk(3),V_=mk(3),S_=mk(4);for(let i=0;i<n;i++)S_.setXYZW(i,Math.random(),Math.random(),Math.random(),-99);
  g.setAttribute('position',P_);g.setAttribute('aVel',V_);g.setAttribute('aSeed',S_);
  const u={uTime:U.uTime,uPx:{value:300},uCol:{value:col},uCol2:{value:col2},uFogC:{value:S.fog.color},uFog:{value:new THREE.Vector2(30,160)},uWind:{value:new THREE.Vector2(OUTWIND.x,OUTWIND.z)}};
  const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,
    vertexShader:`attribute vec3 aVel;attribute vec4 aSeed;uniform float uTime,uPx;uniform vec2 uFog,uWind;varying vec4 vS;varying float vF,vFog;
      void main(){vS=aSeed;float age=uTime-aSeed.w,life=4.5+aSeed.x*2.5;
        vec3 p=position+aVel*(1.-exp(-2.2*age))/2.2;p.y-=(1.1+aSeed.y*.9)*age;p.xz+=uWind*age*.9+vec2(sin(age*2.1+aSeed.z*6.283),cos(age*1.7+aSeed.x*6.283))*.5*min(age,1.);
        vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float d=-mv.z;
        vF=(age<0.||age>life)?0.:smoothstep(0.,.15,age)*smoothstep(life,life-1.2,age);vFog=smoothstep(uFog.x,uFog.y,d);
        gl_PointSize=vF<=0.?0.:clamp(.42*(.7+.7*aSeed.y)*uPx/max(d,.5),2.5,28.);if(vF<=0.)gl_Position=vec4(2.,2.,2.,1.);}`,
    fragmentShader:`uniform float uTime;uniform vec3 uCol,uCol2,uFogC;varying vec4 vS;varying float vF,vFog;
      void main(){vec2 q=gl_PointCoord*2.-1.;float an=vS.x*6.283+uTime*(2.+vS.y*4.),cs=cos(an),sn=sin(an);q=vec2(cs*q.x-sn*q.y,sn*q.x+cs*q.y);
        float fl=.3+.7*abs(sin(uTime*(3.+vS.z*4.)+vS.x*6.283));q.y/=fl*.55;float a=smoothstep(1.,.75,length(q))*vF;if(a<.02)discard;
        gl_FragColor=vec4(mix(mix(uCol,uCol2,vS.z)*(.7+.5*fl),uFogC,vFog),a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=4;pts.userData.keep=1;S.add(pts);
  WDS.burst={P_,V_,S_,u,n,at:0};}
function leafBurst(x,z,k){const B=WDS.burst;if(!B)return;
  /* the nearest few trees to the blast each drop a handful */
  const R2=(9+6*k)*(9+6*k),near=[];for(const s of WDS.trees){const dx=s.x-x,dz=s.z-z,d2=dx*dx+dz*dz;if(d2<R2)near.push([d2,s]);}
  if(!near.length)return;near.sort((a,b)=>a[0]-b[0]);const pick=near.slice(0,QL==='low'?3:6),per=Math.min(30,Math.round((14+12*k)*(QL==='low'?.6:1)));let lo=B.n,hi=0;
  for(const [,s] of pick)for(let j=0;j<per;j++){const i=B.at;B.at=(B.at+1)%B.n;lo=Math.min(lo,i);hi=Math.max(hi,i);
    const a=Math.random()*TAU,r=Math.sqrt(Math.random())*Math.max(1.5,s.cr*.8),ox=Math.cos(a)*r,oz=Math.sin(a)*r,dx=s.x-x,dz=s.z-z,l=Math.hypot(dx,dz)||1;
    B.P_.setXYZ(i,s.x+ox,s.y+s.h*(.5+Math.random()*.4),s.z+oz);B.V_.setXYZ(i,dx/l*4*k+ox*1.4,(Math.random()-.1)*4,dz/l*4*k+oz*1.4);B.S_.setW(i,G.t+Math.random()*.5);}
  for(const A of [B.P_,B.V_,B.S_]){A.clearUpdateRanges();if(hi-lo<B.n-1)A.addUpdateRange(lo*A.itemSize,(hi-lo+1)*A.itemSize);A.needsUpdate=true;}}

lifeOn('woods',{
  build(L){
    const n0_=S.children.length;   /* everything this file added (tests hide it to measure its cost) */
    const fog=!!L.fogFar,night=!!L.night,day=!fog&&!night&&!L.storm,low=QL==='low',rnd=mulberry(2024);
    /* ---------- leaves drifting down around the camera ---------- */
    const lc=fog?[new THREE.Color(.3,.25,.09),new THREE.Color(.34,.17,.06)]:[new THREE.Color(.95,.8,.2),new THREE.Color(.95,.48,.12)];
    WDS.leaves=lifeMotes({n:(fog?150:280)*(low?.5:1)|0,box:[40,16,40],lift:3,vel:[OUTWIND.x*.9,-1.25,OUTWIND.z*.9],sway:1.2,size:.28,max:22,kind:1,col:lc[0],col2:lc[1],a:.95,seed:7});
    buildLeafBurst(lc[0],lc[1]);
    for(const a of VEG.list)if(a.kind==='tree')for(const s of a.inst)if(Math.max(Math.abs(s.x),Math.abs(s.z))<PLAY+20)WDS.trees.push(s);
    /* ---------- fireflies in the fog (and at night) ---------- */
    if(fog||night)WDS.flies=lifeMotes({n:low?40:90,box:[44,6,44],lift:-2.2,vel:[.12,.02,.08],sway:1.8,size:.55,kind:2,col:new THREE.Color(1.6,2.2,.5),col2:new THREE.Color(2.2,2,.5),a:1,seed:3});
    /* ---------- shafts of sunlight in the clearings (day only): crossed soft sheets lying along the sun's direction ---------- */
    if(day){const pos=[],uv=[],sd=[],idx=[],w1=new THREE.Vector3().crossVectors(SUN,V3(0,1,0)).normalize(),w2=new THREE.Vector3().crossVectors(SUN,w1).normalize();let v=0;
      for(const c of CLEAR){const per=low?3:5;for(let i=0;i<per;i++){const a=rnd()*TAU,r=Math.sqrt(rnd())*c[2]*.8,x=c[0]+Math.cos(a)*r,z=c[1]+Math.sin(a)*r,y=hgt(x,z)-.5,len=24+rnd()*10,w=1.6+rnd()*2.4,s=rnd();
        for(const ax of [w1,w2]){for(const [su,sv] of [[-1,0],[1,0],[-1,1],[1,1]]){pos.push(x+ax.x*w*su+SUN.x*len*sv,y+ax.y*w*su+SUN.y*len*sv,z+ax.z*w*su+SUN.z*len*sv);uv.push(su*.5+.5,sv);sd.push(s);}
          idx.push(v,v+1,v+2,v+1,v+3,v+2);v+=4;}}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(sd,1));g.setIndex(idx);
      const u={uTime:U.uTime,uCol:{value:new THREE.Color(L.sunCol).multiplyScalar(.34)},tCloud:U.tCloud,uCloudOff:U.uCloudOff,uCloudScale:U.uCloudScale,uCloudAmt:U.uCloudAmt};
      const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
        vertexShader:`attribute float aSeed;varying vec2 vUv;varying float vSd,vD;varying vec3 vWP;void main(){vUv=uv;vSd=aSeed;vWP=position;vec4 mv=viewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}`,
        fragmentShader:`uniform float uTime,uCloudScale,uCloudAmt;uniform vec3 uCol;uniform sampler2D tCloud;uniform vec2 uCloudOff;varying vec2 vUv;varying float vSd,vD;varying vec3 vWP;
          void main(){float x=1.-abs(vUv.x*2.-1.);float a=x*x*smoothstep(0.,.3,vUv.y)*smoothstep(1.,.45,vUv.y);
            a*=.6+.4*sin(uTime*(.35+vSd*.5)+vSd*40.+vUv.x*5.);                                   /* slow shimmer, a little different across each shaft */
            vec2 cu=vWP.xz*uCloudScale+uCloudOff;float n=clamp((texture2D(tCloud,cu).r*.72+texture2D(tCloud,cu*2.3).r*.28-.2)/.36,0.,1.);
            a*=mix(1.,.12,smoothstep(.5,.78,n)*uCloudAmt);                                       /* a cloud shadow passing over dims the shaft */
            a*=smoothstep(3.,16.,vD)*smoothstep(150.,90.,vD);if(a<.004)discard;gl_FragColor=vec4(uCol*a,1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`});
      const sm=new THREE.Mesh(g,m);sm.frustumCulled=false;sm.renderOrder=3;sm.userData.keep=1;S.add(sm);WDS.shafts=sm;}
    /* ---------- mist pooled in the low ground: wide soft sheets that face the camera and drift ---------- */
    {const cand=[];for(let x=-PLAY+10;x<=PLAY-10;x+=9)for(let z=-PLAY+10;z<=PLAY-10;z+=9){const jx=x+(rnd()-.5)*6,jz=z+(rnd()-.5)*6,h0=hgt(jx,jz);let ring=0;
        for(let k=0;k<6;k++)ring+=hgt(jx+Math.cos(k/6*TAU)*16,jz+Math.sin(k/6*TAU)*16);cand.push([ring/6-h0+(rnd()-.5)*(fog?.9:.3),jx,jz,h0]);}
      cand.sort((a,b)=>b[0]-a[0]);const want=(fog?66:26)*(low?.5:1)|0,sites=cand.slice(0,want),n=sites.length;
      const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
      const iP=new Float32Array(n*3),iS=new Float32Array(n*3);sites.forEach((s,i)=>{const sz=(fog?20:16)+rnd()*10;iP[i*3]=s[1];iP[i*3+1]=s[3]+sz*.1;iP[i*3+2]=s[2];iS[i*3]=sz;iS[i*3+1]=rnd();iS[i*3+2]=.6+rnd()*.4;});
      g.setAttribute('iP',new THREE.InstancedBufferAttribute(iP,3));g.setAttribute('iS',new THREE.InstancedBufferAttribute(iS,3));g.instanceCount=n;
      const fc=new THREE.Color(L.fog).lerp(new THREE.Color(1,1,1),fog?.35:.55);
      const u={uTime:U.uTime,tSmoke:{value:PFX.mesh.material.uniforms.tSmoke.value},uCol:{value:fc},uA:{value:fog?.62:.3},uFar:{value:140},uWind:{value:new THREE.Vector2(OUTWIND.x,OUTWIND.z)}};
      const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,
        vertexShader:`attribute vec3 iP,iS;uniform float uTime;uniform vec2 uWind;varying vec2 vUv;varying float vA,vSd;
          void main(){vUv=uv;vSd=iS.y;float ph=uTime*.07*(.6+iS.y)+iS.y*6.283;vec3 c=iP;c.xz+=uWind*sin(ph)*5.+vec2(cos(ph*1.3),sin(ph*.9))*2.5;
            vec4 mv=viewMatrix*vec4(c,1.);float d=-mv.z;mv.xy+=position.xy*vec2(iS.x,iS.x*.34);gl_Position=projectionMatrix*mv;
            vA=iS.z*smoothstep(7.,24.,d)*(.8+.2*sin(uTime*.3+iS.y*20.));}`,
        fragmentShader:`uniform sampler2D tSmoke;uniform vec3 uCol;uniform float uA,uFar,uTime;varying vec2 vUv;varying float vA,vSd;
          void main(){float t=texture2D(tSmoke,vUv+vec2(sin(uTime*.05+vSd*9.)*.03,0.)).r;float a=smoothstep(.05,.7,t)*smoothstep(0.,.3,vUv.y)*smoothstep(1.,.6,vUv.y)*uA*vA;if(a<.004)discard;
            gl_FragColor=vec4(uCol,a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`});
      const mm=new THREE.Mesh(g,m);mm.frustumCulled=false;mm.renderOrder=3;mm.userData.keep=1;S.add(mm);WDS.mist=mm;}
    /* ---------- the deer ---------- */
    if(CLEAR.length>1)buildDeer(L);
    WDS.objs=S.children.slice(n0_);
  },
  tick(dt,t){
    if(WDS.leaves)WDS.leaves.userData.upd();if(WDS.flies)WDS.flies.userData.upd();
    if(WDS.burst){WDS.burst.u.uPx.value=R.domElement.height/(2*Math.tan(cam.fov*Math.PI/360));WDS.burst.u.uFog.value.set(S.fog.near,S.fog.far);}
    deerTick(dt,t);
  },
  noise(x,z,k,kind){
    const H=WDS.deer;
    if(H&&kind!=='step'){let hx=0,hz=0;for(const d of H.D){hx+=d.x;hz+=d.z;}hx/=H.D.length;hz/=H.D.length;
      const d=Math.hypot(x-hx,z-hz),r=kind==='boom'?55+25*k:kind==='shot'?75:45;if(d<r)deerBolt(x,z);}
    if(kind==='boom'&&k>=.5)leafBurst(x,z,Math.min(k,2));
  }});
