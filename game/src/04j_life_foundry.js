/* ===================== living places: the foundry (Foundry 4) =====================  session 7, built with Fable 5.2
   What moves here (everything new is on or beyond the blast walls, or flat on the ground; nothing has a collider):
     MOLTEN CHANNELS  the two channels flow toward the middle of the yard: bright metal with dark crust plates riding on it.
                      The furnace mouths burn with the same fire. The channels now run all the way to spouts in the side walls.
     LADLES           four ladles ride overhead rails just outside the walls (east, west, two at the back). Each carries a glowing
                      load to a pouring point on the wall top, tips, and pours a bright stream with a shower of sparks.
                      A pour at a side wall sends a bright surge down that channel.
     EMBERS           sparks of ember drift up across the whole yard (around the camera, drawn in one go)
     STEAM            pipes high on the walls burst with steam every few seconds
     WELDING          blue-white welding flicker and falling sparks high on the hall roof and a rail tower
     HEAT             glow on the ground in front of every furnace mouth and on the walls behind the furnaces and the pours
     NEON             the FOUNDRY 4 sign stutters now and then
   What reacts to the fight:
     the first shot or explosion switches on the ALARM: amber beacons turn on the wall tops (a short horn sounds); they go
     quiet again after 18 seconds without firing. Explosions make the lamps near them stutter, and jolt the neon. */
const FNL={alarm:0,hold:0},PY_=17.5;   /* PY_ = height of the ladles' trunnions */
lifeOn('foundry',{
build(L){const F=MAPS.foundry,low=QL==='low',B=F.bounds,X=B.x1+3,Z0=B.z0-3,rnd=mulberry(4104),M4=new THREE.Matrix4();
  FNL.alarm=0;FNL.hold=0;FNL.uT={value:0};FNL.o=new THREE.Object3D();FNL.o2=new THREE.Object3D();
  /* ---------- MOLTEN: the flat pulsing colour becomes flowing metal (channels) and fire (anything above the ground) ---------- */
  FNL.surge=new THREE.Vector4(-100,-100,-100,-100);
  if(F.melt){const m=F.melt;m.onBeforeCompile=sh=>{sh.uniforms.uLT=FNL.uT;sh.uniforms.uSurge={value:FNL.surge};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vWP;uniform float uLT;uniform vec4 uSurge;
        float lvH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float lvN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(lvH(i),lvH(i+vec2(1.,0.)),f.x),mix(lvH(i+vec2(0.,1.)),lvH(i+vec2(1.,1.)),f.x),f.y);}`)
        .replace('#include <map_fragment>',`#include <map_fragment>
        {float pulse=diffuse.r/1.3;vec3 c;
         if(vWP.y<1.){float al=abs(vWP.x);vec2 p=vec2((al+uLT*2.6)*.2,vWP.z*.8);   /* the pattern slides toward the middle of the yard */
           float n=lvN(p)*.62+lvN(p*2.7+vec2(uLT*.2,7.))*.38,crust=smoothstep(.5,.64,n),vein=1.-smoothstep(0.,.15,abs(n-.47));
           c=mix(vec3(.95,.25,.03),vec3(.09,.014,.004),crust)+vec3(.9,.55,.18)*vein*(1.-crust*.7);
           float fr=vWP.z<8.?(vWP.x>0.?uSurge.x:uSurge.y):(vWP.x>0.?uSurge.z:uSurge.w);   /* a fresh pour runs down the channel */
           float sg=(al>fr?exp(-(al-fr)*.045):exp(-(fr-al)*.5))*step(0.,fr);c=mix(c,vec3(2.6,1.4,.4),sg*.85);}
         else{float n=lvN(vec2(vWP.x*1.3+vWP.z*1.3,vWP.y*1.6-uLT*3.))*.6+lvN(vec2(vWP.x*3.+vWP.z*3.,vWP.y*3.-uLT*5.))*.4;c=mix(vec3(1.5,.36,.05),vec3(3.,1.7,.5),smoothstep(.3,.8,n));}
         diffuseColor.rgb=c*pulse;}`);};
    m.customProgramCacheKey=()=>'fnlava';m.needsUpdate=true;}
  /* ---------- the ladle rigs: where they run, which way they pour ---------- */
  const RIGS=[{ax:'z',f:X+1.6,a:-18,b:34,ry:0,ch:[0,2]},{ax:'z',f:-X-1.6,a:34,b:-18,ry:Math.PI,ch:[3,1]},
    {ax:'x',f:Z0-1.6,a:50,b:95,ry:Math.PI/2,ch:[-1,-1]},{ax:'x',f:Z0-1.6,a:-95,b:-50,ry:Math.PI/2,ch:[-1,-1]}];
  const dark=[],hot=[],bx=(list,w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);list.push(g);};
  const quads=[],quad=(vertical,along,cx,cy,cz,w,h,col)=>{   /* a soft glow patch: flat on the ground, or standing on a wall face ('x' = the wall runs along x) */
    const g=new THREE.PlaneGeometry(w,h);if(!vertical)g.rotateX(-Math.PI/2);else if(along==='z')g.rotateY(Math.PI/2);g.translate(cx,cy,cz);quads.push({g,col,k:1});return quads[quads.length-1];};
  FNL.rigs=RIGS.map((r,i)=>{const inx=-Math.cos(r.ry),inz=Math.sin(r.ry),at=u=>r.ax==='z'?[r.f,u]:[u,r.f],len=Math.abs(r.b-r.a)+12,mid=(r.a+r.b)/2,out=1.2;
    /* rail, its towers, and a catch box (tundish) on the wall top under each pouring point */
    if(r.ax==='z'){bx(dark,1.2,1.4,len,r.f,23.7,mid);for(const u of [mid-len/2+1,mid,mid+len/2-1])bx(dark,1.6,24.4,1.6,r.f-inx*out,12.2,u);}
    else{bx(dark,len,1.4,1.2,mid,23.7,r.f);for(const u of [mid-len/2+1,mid,mid+len/2-1])bx(dark,1.6,24.4,1.6,u,12.2,r.f-inz*out);}
    r.pts=[r.a,r.b].map((u,j)=>{const [px,pz]=at(u),tx=px+inx*2.3,tz=pz+inz*2.3;
      bx(dark,3.4,1.7,3.4,tx,9.8,tz);bx(hot,2.7,.2,2.7,tx,10.66,tz);
      const wx=px+inx*2.95,wz=pz+inz*2.95;   /* just inside the wall face */
      return {x:tx,z:tz,q:quad(true,r.ax==='z'?'z':'x',wx,4.6,wz,20,9.2,[1,.42,.1]),pour:0};});
    r.inx=inx;r.inz=inz;r.at=at;r.u=lerp(r.a,r.b,rnd());r.v=0;r.e=i%2;r.ph=0;r.t=i*1.7;r.tip=0;r.pt=0;return r;});
  /* the channels reach the side walls now: trough, metal and a spout in the wall (flat, like the old channel: nothing to bump into) */
  for(const z of [-18,34])for(const sx of [-1,1]){bx(dark,13.9,.35,3.2,sx*102.9,.12,z);bx(hot,13.9,.1,2.2,sx*102.9,.3,z);bx(dark,1.4,3.2,3.4,sx*109.15,1.6,z);bx(hot,.3,1.5,1.9,sx*108.4,1.25,z);}
  /* steam pipes on the walls */
  FNL.vents=[[X-1.9,7.2,-45,-1,0],[-X+1.9,7.2,-45,1,0],[X-1.9,7.2,64,-1,0],[-X+1.9,7.2,64,1,0],[76,7.2,Z0+1.9,0,1],[-76,7.2,Z0+1.9,0,1]].map(v=>{
    bx(dark,v[3]?1.6:1,1,v[3]?1:1.6,v[0]-v[3]*.3,v[1],v[2]-v[4]*.3);return {x:v[0]+v[3]*.6,y:v[1],z:v[2]+v[4]*.6,dx:v[3],dz:v[4],t:0};});
  FNL.ventNext=2;
  const gm=tmat('24-gunmetal');
  const st=new THREE.Mesh(THREE.mergeGeometries(dark),gm);st.receiveShadow=true;S.add(st);
  if(F.melt){const hm=new THREE.Mesh(THREE.mergeGeometries(hot),F.melt);S.add(hm);}
  /* carriages and buckets (two instanced draws), their glowing loads and the pouring streams (two more) */
  const cgs=[new THREE.BoxGeometry(2.6,1.2,5.2),new THREE.BoxGeometry(.3,4.7,.3).translate(0,-2.9,2.3),new THREE.BoxGeometry(.3,4.7,.3).translate(0,-2.9,-2.3),new THREE.BoxGeometry(.5,.5,5).translate(0,-.8,0)];
  const n=RIGS.length,mk=(g,m)=>{const im=new THREE.InstancedMesh(g,m,n);im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.frustumCulled=false;S.add(im);return im;};
  FNL.car=mk(THREE.mergeGeometries(cgs),gm);
  FNL.buck=mk(THREE.mergeGeometries([new THREE.CylinderGeometry(1.9,1.45,3.4,14,1,true),new THREE.CircleGeometry(1.45,14).rotateX(Math.PI/2).translate(0,-1.7,0),new THREE.TorusGeometry(1.9,.16,6,14).rotateX(Math.PI/2).translate(0,1.7,0)]),gm);
  const molten=new THREE.MeshBasicMaterial({color:new THREE.Color(2.7,1.1,.24),side:THREE.DoubleSide});
  FNL.disc=mk(new THREE.CircleGeometry(1.8,14).rotateX(-Math.PI/2),molten);FNL.stream=mk(new THREE.CylinderGeometry(.36,.5,1,8,1,true).translate(0,-.5,0),molten);
  /* ---------- lights: ladle loads, pours, welding, stack tops, alarm beacons ---------- */
  const GL=lifeGlow(48);FNL.glow=GL;
  for(const r of FNL.rigs){r.gL=GL.add(0,0,0,2.4,[3,1.2,.25],.9);r.gP=GL.add(0,0,0,7.5,[3,1.3,.3],0);}
  FNL.welds=[[27,26.5,Z0-.8],[-27,26.5,Z0-.8],[X+2.8,24.6,40]].map((p,i)=>({x:p[0],y:p[1],z:p[2],on:0,t:1+i*2.3,g:GL.add(p[0],p[1],p[2],2.2,[1.7,2.3,3.4],0),acc:0}));
  FNL.tops=(F.stacks||[]).map(s=>GL.add(s[0],23.4,s[1],3.6,[3,1,.2],.6));
  const bpos=[];for(const z of [-62,6,72])for(const sx of [-1,1])bpos.push([sx*X,9.9,z]);for(const x of [-100,-62,62,100])bpos.push([x,9.9,Z0]);for(const x of [-80,-42,42,80])bpos.push([x,9.9,B.z1+3]);
  for(const sx of [-1,1])bpos.push([sx*15.5,13.1,B.z1+3]);
  FNL.beacons=bpos.map((p,i)=>({x:p[0],y:p[1]+.5,z:p[2],ph:i*2.4,g:GL.add(p[0],p[1]+.5,p[2],1.5,[3,1.7,.25],0)}));
  /* the beacons' turning beams: two upright sheets of light per beacon, spun in the vertex shader (one draw) */
  {const base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
    const a=new Float32Array(bpos.length*8);FNL.beacons.forEach((b,i)=>{a.set([b.x,b.y,b.z,b.ph],i*8);a.set([b.x,b.y,b.z,b.ph+Math.PI],i*8+4);});
    g.setAttribute('iB',new THREE.InstancedBufferAttribute(a,4));g.instanceCount=bpos.length*2;FNL.uAlarm={value:0};
    const m=new THREE.ShaderMaterial({uniforms:{uT:FNL.uT,uA:FNL.uAlarm},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      vertexShader:`attribute vec4 iB;uniform float uT,uA;varying vec2 vUv;
        void main(){vUv=uv;float a=uT*4.6+iB.w,x=uv.x*9.;vec3 p=iB.xyz+vec3(cos(a)*x,position.y*(1.+x*.3),sin(a)*x);gl_Position=uA>.01?projectionMatrix*viewMatrix*vec4(p,1.):vec4(2.,2.,2.,1.);}`,
      fragmentShader:`uniform float uA;varying vec2 vUv;
        void main(){float v=1.-abs(vUv.y*2.-1.);gl_FragColor=vec4(vec3(2.4,1.25,.2)*pow(1.-vUv.x,1.6)*v*v*uA*.6,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    const bm=new THREE.Mesh(g,m);bm.frustumCulled=false;bm.renderOrder=4;S.add(bm);}
  /* ---------- heat glow: ground in front of the furnace mouths, walls behind the furnaces (the pours' patches are in `quads` already) ---------- */
  FNL.mouths=(F.stacks||[]).map(s=>quad(false,'',s[0],.09,s[1]+9,15,15,[1,.4,.1]));
  FNL.wallHeat=[quad(true,'z',X-1.35,4.6,10,34,9.2,[1,.3,.06]),quad(true,'z',-X+1.35,4.6,10,34,9.2,[1,.3,.06]),quad(true,'x',70,4.6,Z0+1.35,34,9.2,[1,.3,.06]),quad(true,'x',-70,4.6,Z0+1.35,34,9.2,[1,.3,.06])];
  {const g=THREE.mergeGeometries(quads.map(q=>q.g)),col=new THREE.BufferAttribute(new Float32Array(quads.length*12),3);col.setUsage(THREE.DynamicDrawUsage);g.setAttribute('color',col);
    const qm=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:poolTex(),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    qm.renderOrder=2;qm.frustumCulled=false;S.add(qm);FNL.quads=quads;FNL.qcol=col;}
  /* ---------- EMBERS: a box of drifting sparks that follows the camera; all the motion is in the shader ---------- */
  {const N=low?130:320,base=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
    const a=new Float32Array(N*4);for(let i=0;i<a.length;i++)a[i]=rnd();g.setAttribute('aS',new THREE.InstancedBufferAttribute(a,4));g.instanceCount=N;FNL.uCam={value:new THREE.Vector3()};
    const m=new THREE.ShaderMaterial({uniforms:{uT:FNL.uT,uCam:FNL.uCam},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:`attribute vec4 aS;uniform float uT;uniform vec3 uCam;varying vec2 vUv;varying vec3 vC;
        void main(){vUv=uv;vec3 B=vec3(110.,36.,110.),p=aS.xyz*B;float r=aS.w;
          p.y=mod(p.y+uT*(1.1+r*1.7),B.y);float life=p.y/B.y;p.y+=.5;
          p.x+=uT*1.2+sin(uT*.7+r*40.)*1.6;p.z+=uT*.45+cos(uT*.53+r*23.)*1.6;p.xz=mod(p.xz-uCam.xz+B.xz*.5,B.xz)-B.xz*.5+uCam.xz;
          float fl=.55+.45*sin(uT*(4.+r*9.)+r*60.),a=smoothstep(0.,.05,life)*pow(1.-life,1.4)*(1.-smoothstep(38.,55.,length(p.xz-uCam.xz)));
          vC=mix(vec3(3.2,1.5,.35),vec3(2.2,.45,.06),life)*a*fl;
          vec4 mv=viewMatrix*vec4(p,1.);vC*=smoothstep(2.5,7.,-mv.z);float s=max(.13+.2*r,-mv.z*.004);mv.xy+=position.xy*s*2.;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec2 vUv;varying vec3 vC;
        void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(vC*pow(max(0.,1.-r),1.8),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    const em=new THREE.Mesh(g,m);em.frustumCulled=false;em.renderOrder=4;S.add(em);}
  /* ---------- lamps that stutter, the neon ---------- */
  const lamps=[];for(const x of [-80,-40,40,80])for(const z of [-40,10,60,96])lamps.push({x,z});
  FNL.rig=F.lampM?lifeLampRig(F.lampM,F.poolMesh,lamps):null;if(FNL.rig)FNL.rig.faulty=6;
  FNL.neon=lifeNeon(F.neon,2.2);FNL.ready=true;
},
tick(dt,t){if(!FNL.ready)return;const GL=FNL.glow,o=FNL.o,o2=FNL.o2;FNL.uT.value=t;FNL.uCam.value.copy(cam.position);
  /* the alarm: on while there is shooting, off after a quiet spell */
  if(FNL.hold>0)FNL.hold-=dt;FNL.alarm+=((FNL.hold>0?1:0)-FNL.alarm)*damp(3,dt);FNL.uAlarm.value=FNL.alarm;
  for(const b of FNL.beacons){const a=t*4.6+b.ph,dx=cam.position.x-b.x,dz=cam.position.z-b.z,l=Math.hypot(dx,dz)||1,d=(Math.cos(a)*dx+Math.sin(a)*dz)/l;
    GL.bright(b.g,FNL.alarm*(.3+2.4*Math.pow(Math.max(0,d),8)));}
  /* ladles */
  const S4=FNL.surge,sv=[S4.x,S4.y,S4.z,S4.w];
  FNL.rigs.forEach((r,i)=>{const tgt=r.e?r.b:r.a,pt=r.pts[r.e];let pour=0;
    switch(r.ph){
      case 0:{const d=tgt-r.u,want=clamp(d*1.1,-4.6,4.6);r.v+=clamp(want-r.v,-2.2*dt,2.2*dt);r.u+=r.v*dt;if(Math.abs(d)<.05&&Math.abs(r.v)<.1){r.u=tgt;r.v=0;r.ph=1;r.t=.8;}break;}
      case 1:if((r.t-=dt)<=0)r.ph=2;break;
      case 2:r.tip=Math.min(1.12,r.tip+dt*.8);if(r.tip>=1.12){r.ph=3;r.t=3.4;r.pt=0;const c=r.ch[r.e];if(c>=0)sv[c]=110;
          const d=Math.hypot(pt.x-P.x,pt.z-P.z);if(d<80&&G.mode==='play')nz('bandpass',700,260,2.6,.14*(1-d/80),.8);}break;
      case 3:pour=1;r.pt+=dt;if((r.t-=dt)<=0){r.ph=4;r.t=.35;}break;
      case 4:pour=Math.max(0,r.t/.35);r.t-=dt;r.tip=Math.max(0,r.tip-dt*.7);if(r.tip<=0){r.ph=5;r.t=1.2+Math.random()*2;}break;
      case 5:if((r.t-=dt)<=0){r.e=1-r.e;r.ph=0;}break;}
    const [px,pz]=r.at(r.u);
    o.position.set(px,22.4,pz);o.rotation.set(0,r.ry,0);o.scale.set(1,1,1);o.updateMatrix();FNL.car.setMatrixAt(i,o.matrix);
    o.position.y=PY_;o.rotation.set(0,r.ry,r.tip,'YXZ');o.updateMatrix();FNL.buck.setMatrixAt(i,o.matrix);
    o2.position.set(0,1.42,0);o2.updateMatrix();o2.matrix.premultiply(o.matrix);FNL.disc.setMatrixAt(i,o2.matrix);
    const ca=Math.cos(r.tip),sa=Math.sin(r.tip),li=1.9*ca+1.7*sa,ly=PY_-1.9*sa+1.7*ca,lx=px+r.inx*li,lz=pz+r.inz*li;
    GL.pos(r.gL,px+r.inx*li*.5,PY_+1.9-r.tip*1.2,pz+r.inz*li*.5);
    /* the stream: grows down from the lip, thins out when the ladle rights itself */
    const len=pour>0?Math.min(ly-10.7,(r.ph===3?r.pt:1)*16):0,wd=pour*(1+.12*Math.sin(t*31+i));
    o.position.set(lx+r.inx*.1,ly,lz+r.inz*.1);o.rotation.set(0,0,0);o.scale.set(Math.max(wd,.001),Math.max(len,.001),Math.max(wd,.001));o.updateMatrix();FNL.stream.setMatrixAt(i,o.matrix);
    const hit=pour>0&&len>=ly-10.75?pour:0;pt.pour+=(hit-pt.pour)*damp(hit?9:2.2,dt);r.pts[1-r.e].pour*=Math.exp(-dt*2.2);
    GL.pos(r.gP,pt.x,11.2,pt.z);GL.bright(r.gP,pt.pour*(.75+.35*Math.sin(t*27+i*3)));
    if(hit>0){r.acc=(r.acc||0)+dt*(QL==='low'?10:22);while(r.acc>1){r.acc--;const a=Math.random()*TAU,s=1.5+Math.random()*3.5;
        part({x:pt.x,y:10.9,z:pt.z,vx:Math.cos(a)*s+r.inx*2,vy:5+Math.random()*7,vz:Math.sin(a)*s+r.inz*2,life:.9+Math.random()*.7,s0:.7,s1:.16,a:2,col:[1,.62,.22],glow:true,drag:.4,grav:13});
        if(Math.random()<.16)part({x:pt.x,y:11,z:pt.z,vx:1.2,vy:3,vz:.4,life:3,s0:3,s1:9,a:.32,col:[.5,.3,.22]});}}
    for(const q of r.pts)q.q.k=q.pour*(.8+.2*Math.sin(t*19+i));});
  for(let c=0;c<4;c++)if(sv[c]>=0){sv[c]-=dt*9;if(sv[c]<0)sv[c]=-100;}S4.set(sv[0],sv[1],sv[2],sv[3]);
  for(const im of [FNL.car,FNL.buck,FNL.disc,FNL.stream])im.instanceMatrix.needsUpdate=true;
  /* heat glow patches */
  FNL.mouths.forEach((q,i)=>{q.k=.5+.14*Math.sin(t*6.3+i*2)+.1*Math.sin(t*14.1+i*5);});FNL.wallHeat.forEach((q,i)=>{q.k=.34+.07*Math.sin(t*3.1+i*1.9)+.04*Math.sin(t*9.7+i);});
  {const a=FNL.qcol.array;FNL.quads.forEach((q,i)=>{for(let j=0;j<4;j++){const b=(i*4+j)*3;a[b]=q.col[0]*q.k;a[b+1]=q.col[1]*q.k;a[b+2]=q.col[2]*q.k;}});FNL.qcol.needsUpdate=true;}
  FNL.tops.forEach((g,i)=>GL.bright(g,.5+.2*Math.sin(t*5.1+i*1.7)+.15*Math.sin(t*12.3+i*4.1)));
  /* steam bursts */
  if((FNL.ventNext-=dt)<=0){FNL.ventNext=2.5+Math.random()*3.5;const v=FNL.vents[Math.random()*FNL.vents.length|0];v.t=1;
    const d=Math.hypot(v.x-P.x,v.z-P.z);if(d<70&&G.mode==='play')nz('highpass',2500,900,1,.24*(1-d/70),.7);}   /* the vent hiss, quieter with distance */
  for(const v of FNL.vents)if(v.t>0){v.t-=dt;v.acc=(v.acc||0)+dt*(QL==='low'?8:15);while(v.acc>1){v.acc--;const s=6+Math.random()*4;
      part({x:v.x,y:v.y,z:v.z,vx:v.dx*s+(Math.random()-.5)*1.5,vy:1.5+Math.random()*2,vz:v.dz*s+(Math.random()-.5)*1.5,life:1.9,s0:1.3,s1:7,a:.75,col:[1,.93,.86],img:4,drag:1.5,grav:-.9});}}
  /* welding */
  for(const w of FNL.welds){w.t-=dt;if(w.t<=0){w.on=w.on?0:1;w.t=w.on?1.2+Math.random()*2.2:2.5+Math.random()*5;}
    GL.bright(w.g,w.on?(Math.random()<.2?.2:.8+Math.random()*1.6):0);
    if(w.on){w.acc+=dt*(QL==='low'?8:16);while(w.acc>1){w.acc--;const a=Math.random()*TAU,s=1+Math.random()*2.6;
        part({x:w.x,y:w.y,z:w.z,vx:Math.cos(a)*s,vy:Math.random()*3.5,vz:Math.sin(a)*s+.8,life:.8+Math.random()*.6,s0:.42,s1:.1,a:2,col:[1,.78,.4],glow:true,drag:.5,grav:11});}}}
  GL.flush();if(FNL.rig)FNL.rig.tick(dt);FNL.neon.tick(dt,t);
},
noise(x,z,k,kind){if(!FNL.ready||kind==='step')return;
  if(FNL.hold<=0&&FNL.alarm<.05&&G.mode==='play')for(let i=0;i<3;i++)setTimeout(()=>tone('sawtooth',185,176,.42,.05),i*620);   /* the yard horn */
  FNL.hold=18;
  if(kind==='boom'){if(FNL.rig)FNL.rig.kick(x,z,k);if(Math.hypot(x-FORGE_AT.x,z+99)<75)FNL.neon.kick(k);}}
});
