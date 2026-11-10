/* ===================== living places: the FIELD (session 7, the "outdoor" builder) =====================
   What moves here:
     - a farm windpump whose wheel turns and whose tail swings with the wind (fast and jittery in the storm)
     - the three radio masts' red lamps pulse slowly, like aviation lights, with a soft halo high up
     - seed fluff drifting on the breeze by day; leaves and chaff racing past in the storm
     - smoke from the farmhouse chimney, a barn door leaf swinging on its hinges
     - hay bales near a big explosion catch fire, burn, char black and smoulder
     - in the storm: puddles along the track with rain rings that flash with the lightning
   Cost: 7 draw calls by day, 8 in the storm, under 2k triangles, about 0.1 KB uploaded per frame (the glow points).
   Everything is animated in shaders or by turning a few whole objects. */

/* the wind outdoors blows the way the cloud shadows travel (see uCloudOff in 10_main.js): toward -x and a little -z */
const OUTWIND={x:-.916,z:-.4};

/* ---- motes: a cloud of points that stays around the camera and is moved entirely in its shader (nothing uploaded per frame).
   Each point keeps its place in the world and wraps round when the camera leaves it behind, like the rain.
   o: n, box [x,y,z] metres, lift (box centre above the camera), vel [x,y,z] m/s, sway metres, size metres, col/col2 (THREE.Color), a (opacity),
      kind 0 soft fluff · 1 tumbling leaf · 2 firefly (adds light, blinks), add (additive) ---- */
function lifeMotes(o){
  const n=o.n,pos=new Float32Array(n*3),sd=new Float32Array(n*4),rnd=mulberry(o.seed||5);
  for(let i=0;i<n;i++){pos[i*3]=rnd();pos[i*3+1]=rnd();pos[i*3+2]=rnd();sd[i*4]=rnd();sd[i*4+1]=rnd();sd[i*4+2]=rnd();sd[i*4+3]=rnd();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aSeed',new THREE.BufferAttribute(sd,4));
  const u={uTime:U.uTime,uCam:{value:cam.position},uBox:{value:new THREE.Vector3(...o.box)},uLift:{value:o.lift||0},uVel:{value:new THREE.Vector3(...o.vel)},uSway:{value:o.sway==null?1:o.sway},
    uSize:{value:o.size},uPx:{value:300},uCol:{value:o.col},uCol2:{value:o.col2||o.col},uA:{value:o.a==null?1:o.a},uFogC:{value:S.fog.color},uFog:{value:new THREE.Vector2(30,160)},uGust:{value:0}};
  const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:o.kind===2||o.add?THREE.AdditiveBlending:THREE.NormalBlending,defines:{KIND:o.kind||0,MAXPX:(o.max||46).toFixed(1)},
    vertexShader:`attribute vec4 aSeed;uniform float uTime,uLift,uSway,uSize,uPx,uGust;uniform vec3 uCam,uBox,uVel;uniform vec2 uFog;varying vec4 vS;varying float vF,vFog;
      void main(){vS=aSeed;float t=uTime;
        vec3 p=position*uBox+uVel*t*(.65+.7*aSeed.x);
        p.x+=sin(t*(.5+aSeed.y)+aSeed.z*6.283)*uSway;p.z+=cos(t*(.4+aSeed.w)+aSeed.x*6.283)*uSway;p.y+=sin(t*(.7+aSeed.z*.8)+aSeed.w*6.283)*uSway*.45;
        vec3 c=uCam+vec3(0.,uLift,0.);p=mod(p-c,uBox)-.5*uBox+c;
        vec3 e=abs(p-c)/(.5*uBox);float edge=max(e.x,max(e.y,e.z));
        vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float d=-mv.z;
        vF=smoothstep(1.,.8,edge)*smoothstep(2.,5.,d);vFog=smoothstep(uFog.x,uFog.y,d);
        gl_PointSize=clamp(uSize*(.6+.8*aSeed.y)*uPx/max(d,.5),1.5,MAXPX);}`,
    fragmentShader:`uniform float uTime,uA;uniform vec3 uCol,uCol2,uFogC;varying vec4 vS;varying float vF,vFog;
      void main(){vec2 q=gl_PointCoord*2.-1.;vec3 c=mix(uCol,uCol2,vS.z);float a;
        #if KIND==1
          float an=vS.w*6.283+uTime*(1.5+vS.x*3.),cs=cos(an),sn=sin(an);q=vec2(cs*q.x-sn*q.y,sn*q.x+cs*q.y);
          float fl=.3+.7*abs(sin(uTime*(2.+vS.y*4.)+vS.z*6.283));q.y/=fl*.55;a=smoothstep(1.,.75,length(q));c*=.7+.5*fl;
        #elif KIND==2
          float r=length(q);a=pow(max(0.,1.-r),2.)*pow(max(0.,sin(uTime*(.5+vS.x*.9)+vS.w*6.283)),3.);
        #else
          float r=length(q);a=smoothstep(1.,.15,r);
        #endif
        a*=uA*vF;if(a<.01)discard;
        #if KIND==2
          gl_FragColor=vec4(c*a*(1.-vFog),1.);
        #else
          gl_FragColor=vec4(mix(c,uFogC,vFog),a);
        #endif
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=4;pts.userData.keep=1;S.add(pts);
  pts.userData.upd=()=>{u.uPx.value=R.domElement.height/(2*Math.tan(cam.fov*Math.PI/360));u.uFog.value.set(S.fog.near,S.fog.far);};
  return pts;}

/* ---- glow points: a few soft lights in one draw call (lamp halos, fires). set(i,x,y,z,size,r,g,b) and flush() when something changed ---- */
function lifeGlows(n){
  const g=new THREE.BufferGeometry(),P_=new THREE.BufferAttribute(new Float32Array(n*3),3),C_=new THREE.BufferAttribute(new Float32Array(n*4),4);
  P_.setUsage(THREE.DynamicDrawUsage);C_.setUsage(THREE.DynamicDrawUsage);g.setAttribute('position',P_);g.setAttribute('aCol',C_);
  const u={uPx:{value:300}};
  const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec4 aCol;uniform float uPx;varying vec3 vC;void main(){vC=aCol.rgb;vec4 mv=viewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(aCol.a*uPx/max(-mv.z,1.),0.,120.);}`,
    fragmentShader:`varying vec3 vC;void main(){float r=length(gl_PointCoord*2.-1.);float a=pow(max(0.,1.-r),2.2);if(a<.004)discard;gl_FragColor=vec4(vC*a,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=4;pts.userData.keep=1;S.add(pts);
  return {pts,dirty:false,
    set(i,x,y,z,s,r,gg,b){P_.setXYZ(i,x,y,z);C_.setXYZW(i,r,gg,b,s);this.dirty=true;},
    flush(){u.uPx.value=R.domElement.height/(2*Math.tan(cam.fov*Math.PI/360));if(this.dirty){P_.needsUpdate=true;C_.needsUpdate=true;this.dirty=false;}}};}

/* a plain painted-metal / painted-wood material with per-vertex colours (no texture) */
function lifePaint(o={}){return hookWorld(new THREE.MeshStandardMaterial({vertexColors:true,roughness:o.r==null?.7:o.r,metalness:o.m||0,side:o.ds?THREE.DoubleSide:THREE.FrontSide}));}
function lifeTint(g,r,gg,b){const n=g.attributes.position.count,c=new Float32Array(n*3);for(let i=0;i<n;i++){c[i*3]=r;c[i*3+1]=gg;c[i*3+2]=b;}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;}
function lifeJoin(list){return THREE.mergeGeometries(list.map(g=>{const q=g.index?g.toNonIndexed():g;for(const k of Object.keys(q.attributes))if(!['position','normal','uv','color'].includes(k))q.deleteAttribute(k);return q;}),false);}

const FLD={t:0,pump:null,head:null,wheel:null,spin:0,glow:null,motes:null,door:null,doorA:.6,doorV:0,bales:[],smokeT:0,pud:null,colT:0,gust:0};
lifeOn('field',{
  build(L){
    const n0_=S.children.length;   /* everything this file added (tests hide it to measure its cost) */
    const F=MAPS.field.farm,fy=hgt(F.x,F.z),storm=!!L.storm,low=QL==='low';
    FLD.storm=storm;FLD.wk=storm?3.2:1;   /* how hard the wind blows */
    /* ---------- windpump beside the farmhouse: a lattice tower, a many-bladed wheel with a gap in it (so the turning reads), a tail vane ---------- */
    {const px=F.x-17.4,pz=F.z+12.5,py=hgt(px,pz),H=13;
      const truss=MAPS.field.mastObjs&&MAPS.field.mastObjs[0]?MAPS.field.mastObjs[0].tower.children[0].material:lifePaint({m:.4});
      const tg=new THREE.CylinderGeometry(.3,1.5,H,4,1,true),uv=tg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.5,uv.getY(i)*.6);
      const tw=new THREE.Mesh(tg,truss);tw.position.set(px,py+H/2,pz);tw.rotation.y=Math.PI/4;tw.castShadow=true;tw.userData.keep=1;S.add(tw);
      const metal=lifePaint({m:.55,r:.45,ds:true}),parts=[];
      /* the wheel: 18 slots, 15 blades (3 missing in a row), two rims; it lies in the local XY plane and spins about Z */
      for(let i=0;i<18;i++){if(i>=7&&i<=9)continue;const a=i/18*TAU,b=new THREE.PlaneGeometry(.78,2.5,1,1);b.translate(0,2.05,0);
        const p=b.attributes.position;for(let j=0;j<p.count;j++){const y=p.getY(j),w=(y-.8)/2.5;p.setX(j,p.getX(j)*(.45+.75*w));}   /* blades widen toward the rim */
        b.rotateY(.5);b.rotateZ(a);const rust=i%5===2;lifeTint(b,rust?.5:.74,rust?.36:.76,rust?.28:.78);parts.push(b);}
      for(const [r,t] of [[3.25,.07],[1.5,.06]]){const rg=new THREE.TorusGeometry(r,t,5,28);lifeTint(rg,.5,.52,.55);parts.push(rg);}
      const hub=new THREE.CylinderGeometry(.35,.35,.5,10);hub.rotateX(Math.PI/2);lifeTint(hub,.35,.2,.16);parts.push(hub);
      const wheel=new THREE.Mesh(lifeJoin(parts),metal);wheel.position.set(0,0,-.75);wheel.castShadow=true;
      /* the head: a gearbox, a boom and a big tail vane pointing downwind (+z) */
      const hp=[],gb=new THREE.BoxGeometry(.6,.7,1.4);lifeTint(gb,.33,.2,.16);hp.push(gb);
      const bm=new THREE.BoxGeometry(.12,.12,3.6);bm.translate(0,0,2.4);lifeTint(bm,.4,.42,.45);hp.push(bm);
      const vane=new THREE.BoxGeometry(.06,1.7,2.3);vane.translate(0,0,4.4);lifeTint(vane,.62,.22,.16);hp.push(vane);
      const head=new THREE.Mesh(lifeJoin(hp),metal);head.castShadow=true;
      const grp=new THREE.Group();grp.position.set(px,py+H+.3,pz);grp.add(head,wheel);grp.userData.keep=1;S.add(grp);
      FLD.head=grp;FLD.wheel=wheel;FLD.yaw0=Math.atan2(OUTWIND.x,OUTWIND.z);grp.rotation.y=FLD.yaw0;}
    /* ---------- a chimney on the farmhouse and the dark mouth of the barn (one mesh), and one door leaf that swings ---------- */
    {const hx=F.x-26,hz=F.z+4,list=[];
      const ch=new THREE.BoxGeometry(1.2,3.4,1.2);ch.translate(hx-3,fy+9.5,hz+1.6);lifeTint(ch,.42,.24,.19);list.push(ch);
      const cap=new THREE.BoxGeometry(1.5,.25,1.5);cap.translate(hx-3,fy+11.3,hz+1.6);lifeTint(cap,.2,.19,.18);list.push(cap);
      const mouth=new THREE.BoxGeometry(3,6.9,.1);mouth.translate(F.x+1.5,fy+3.45,F.z-7.3);lifeTint(mouth,.025,.02,.018);list.push(mouth);
      const cm=new THREE.Mesh(lifeJoin(list),lifePaint({r:.95}));cm.castShadow=true;cm.receiveShadow=true;cm.userData.keep=1;S.add(cm);
      FLD.chim=[hx-3,fy+11.6,hz+1.6];
      const red=MAPS.field.mats?MAPS.field.mats.red:lifePaint();
      const dg=new THREE.BoxGeometry(3,6.9,.16);dg.translate(-1.5,0,0);if(!MAPS.field.mats)lifeTint(dg,.5,.14,.1);   /* hinged on its right edge (x = 0) */
      const door=new THREE.Mesh(dg,red);door.position.set(F.x+3,fy+3.45,F.z-7.42);door.castShadow=true;door.userData.keep=1;S.add(door);FLD.door=door;door.rotation.y=-FLD.doorA;}
    /* ---------- mast lamps: a soft halo each (one draw call), plus up to five bale fires ---------- */
    FLD.glow=lifeGlows(8);
    /* ---------- hay bales: remember where each one lies, give each a tint so it can char ---------- */
    {const im=MAPS.field.baleIM,m=new THREE.Matrix4(),p=new THREE.Vector3(),w=new THREE.Color(1,1,1);FLD.bales=[];
      if(im){for(let i=0;i<im.count;i++){im.getMatrixAt(i,m);p.setFromMatrixPosition(m);FLD.bales.push({i,x:p.x,y:p.y,z:p.z,t:-1,slot:-1});im.setColorAt(i,w);}
        im.instanceColor.needsUpdate=true;}}
    /* ---------- on the breeze: seed fluff by day, leaves and chaff tearing past in the storm ---------- */
    FLD.motes=storm
      ?lifeMotes({n:low?110:230,box:[46,11,46],lift:-.5,vel:[OUTWIND.x*15,-.6,OUTWIND.z*15],sway:1.3,size:.3,max:26,kind:1,col:new THREE.Color(.07,.06,.035),col2:new THREE.Color(.2,.17,.09),a:.95,seed:11})
      :lifeMotes({n:low?120:260,box:[44,13,44],lift:1,vel:[OUTWIND.x*1.5,.05,OUTWIND.z*1.5],sway:.8,size:.13,kind:0,col:new THREE.Color(1.5,1.45,1.3),col2:new THREE.Color(1.2,1.15,.95),a:.85,seed:11});
    /* ---------- storm puddles along the track, with rain rings ---------- */
    if(L.rain||storm){const rnd=mulberry(313),gs=[],want=low?12:26;let tries=0;
      while(gs.length<want&&tries++<600){const k=rnd()*(TRAIL.length-1),a=TRAIL[k|0],b=TRAIL[Math.min(TRAIL.length-1,(k|0)+1)],f=k%1,off=(rnd()-.5)*(rnd()<.7?5:22);
        const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,x=lerp(a[0],b[0],f)+dz/l*off,z=lerp(a[1],b[1],f)-dx/l*off,sx=1.6+rnd()*2.6,sz=1.2+rnd()*2;
        const hs=[hgt(x,z),hgt(x+sx,z),hgt(x-sx,z),hgt(x,z+sz),hgt(x,z-sz)],lo=Math.min(...hs),hi=Math.max(...hs);if(hi-lo>.22)continue;
        const g=new THREE.PlaneGeometry(2,2);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<4;i++)uv.setXY(i,uv.getX(i)*2-1,uv.getY(i)*2-1);
        const sd=new Float32Array(4).fill(rnd());g.setAttribute('aSeed',new THREE.BufferAttribute(sd,1));
        g.scale(sx,1,sz);g.rotateY(rnd()*TAU);g.translate(x,(lo+hi)/2+.07,z);gs.push(g);}
      if(gs.length){const u={uTime:U.uTime,uSky:{value:new THREE.Color(L.hor).multiplyScalar(1.5)},uFlash:{value:0},uFogC:{value:S.fog.color},uFog:{value:new THREE.Vector2(30,160)}};
        const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,
          vertexShader:`attribute float aSeed;varying vec2 vUv;varying vec3 vWP;varying float vSd,vD;void main(){vUv=uv;vSd=aSeed;vWP=(modelMatrix*vec4(position,1.)).xyz;vec4 mv=viewMatrix*vec4(vWP,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}`,
          fragmentShader:`uniform float uTime,uFlash;uniform vec3 uSky,uFogC;uniform vec2 uFog;varying vec2 vUv;varying vec3 vWP;varying float vSd,vD;
            float ring(vec2 p,float sp){vec2 c=floor(p),f=fract(p)-.5;float h=fract(sin(dot(c,vec2(127.1,311.7)))*43758.5),t=fract(uTime*sp+h);
              vec2 o=(vec2(fract(h*17.3),fract(h*5.7))-.5)*.4;float d=length(f-o);return smoothstep(.075,0.,abs(d-t*.42))*(1.-t)*(1.-t);}
            void main(){float an=atan(vUv.y,vUv.x),r=length(vUv)*(1.+.16*sin(an*3.+vSd*40.)+.09*sin(an*5.+vSd*90.));
              float a=smoothstep(1.,.8,r);if(a<.01)discard;
              float rg=ring(vWP.xz*.5,.8)+ring(vWP.xz*.8+7.3,1.1);
              vec3 c=uSky*(.3+.3*smoothstep(.9,.2,r))+uSky*rg*1.5+vec3(.9,.95,1.1)*uFlash*(.6+rg);
              c=mix(c,uFogC,smoothstep(uFog.x,uFog.y,vD));gl_FragColor=vec4(c,a*.86);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`});
        const pm=new THREE.Mesh(THREE.mergeGeometries(gs,false),m);pm.renderOrder=2;pm.frustumCulled=false;pm.userData.keep=1;S.add(pm);FLD.pud=u;}}
    FLD.objs=S.children.slice(n0_);
  },
  tick(dt,t){
    const F=MAPS.field.farm,wk=FLD.wk,storm=FLD.storm;
    /* gusts: the wind breathes; in the storm it comes in shoves */
    const gust=.75+.35*Math.sin(t*.31)+.2*Math.sin(t*.83+1.3)+(storm?.35*Math.sin(t*2.1):0);FLD.gust=gust;
    /* windpump: wheel speed follows the gusts, the tail hunts about the wind direction */
    if(FLD.head){FLD.spin+=(gust*wk*1.5-FLD.spin)*damp(.8,dt);FLD.wheel.rotation.z-=FLD.spin*dt;
      FLD.head.rotation.y=FLD.yaw0+Math.sin(t*.23)*.3+Math.sin(t*.71)*.1*wk;}
    /* barn door leaf: a slow pendulum pushed by the gusts; it bangs on its stop in the storm */
    if(FLD.door){const push=(gust-.75)*wk*1.1+Math.sin(t*.9)*.25*wk;FLD.doorV+=((.75-FLD.doorA)*1.6+push)*dt;FLD.doorV*=Math.exp(-.5*dt);FLD.doorA+=FLD.doorV*dt;
      if(FLD.doorA<.08){FLD.doorA=.08;if(FLD.doorV<-.5&&Math.hypot(P.x-F.x,P.z-F.z)<45)thump(120,60,.12,.12,500,.1);FLD.doorV*=-.35;}if(FLD.doorA>1.9){FLD.doorA=1.9;FLD.doorV*=-.3;}
      FLD.door.rotation.y=-FLD.doorA;}
    /* chimney smoke, blown downwind (only when the farm is in range) */
    if(FLD.chim){const c=FLD.chim,dx=c[0]-cam.position.x,dz=c[2]-cam.position.z;FLD.smokeT-=dt;
      if(FLD.smokeT<=0&&dx*dx+dz*dz<170*170){FLD.smokeT=QL==='low'?.4:.2;const g=storm?.3:1.05;
        part({x:c[0],y:c[1],z:c[2],vx:OUTWIND.x*(1.2+gust)*wk*1.3,vy:storm?1.2:2.2,vz:OUTWIND.z*(1.2+gust)*wk*1.3,life:storm?3:4.2,s0:.9,s1:storm?4.5:3.6,a:storm?.5:.5,col:[g,g,g*1.03],drag:.12,grav:-.12});}}
    /* mast lamps: a slow pulse, each mast a beat behind the last; a felled mast stays dark */
    const ms=MAPS.field.mastObjs||[];
    for(let i=0;i<ms.length&&i<3;i++){const m=ms[i];if(m.fall){if(!m._off){m._off=1;FLD.glow.set(i,0,-999,0,0,0,0,0);}continue;}
      const b=Math.pow(Math.max(0,Math.sin(t*2.1-i*1.1)),3);m.lamp.material.color.setRGB(1,.1,.05).multiplyScalar(.5+6*b);
      FLD.glow.set(i,m.x,m.y+26.4,m.z,(storm?9:6)*(.5+.5*b),(storm?1.5:.9)*b,.13*b,.06*b);}
    /* burning bales: flames for a while, then they char and smoulder */
    let recol=false;
    for(const b of FLD.bales){if(b.t<0||b.t>75)continue;b.t+=dt;const near=Math.hypot(b.x-cam.position.x,b.z-cam.position.z)<110,burn=b.t<18,k=burn?Math.min(1,b.t*1.5)*smooth(18,12,b.t):0,lo=QL==='low'?.5:1;
      if(near){if(burn&&Math.random()<dt*12*k*lo)part({x:b.x+(Math.random()-.5)*1.5,y:b.y+.3+Math.random()*.8,z:b.z+(Math.random()-.5)*1.5,vx:OUTWIND.x*wk,vy:2.2+Math.random()*2,vz:OUTWIND.z*wk,life:.8,s0:storm?3:3.6,s1:.6,a:storm?1.3:2.4,col:[1,.45+Math.random()*.2,.1],glow:true});
        if(Math.random()<dt*(burn?4:1.2*smooth(75,40,b.t))*lo)part({x:b.x,y:b.y+1,z:b.z,vx:OUTWIND.x*1.6*wk,vy:burn?3:1.8,vz:OUTWIND.z*1.6*wk,life:burn?4.5:3.5,s0:1.4,s1:burn?6.5:3.5,a:burn?.65:.38,col:burn?[.13,.12,.11]:[.5,.5,.52],drag:.1,grav:-.1});
        if(burn&&Math.random()<dt*1.5*k)part({x:b.x,y:b.y+1,z:b.z,vx:OUTWIND.x*3+(Math.random()-.5)*2,vy:3+Math.random()*3,vz:OUTWIND.z*3+(Math.random()-.5)*2,life:1.6,s0:.22,s1:.08,a:1.6,col:[1,.55,.15],glow:true,grav:1});}
      if(b.slot>=0){if(burn){const fl=k*(.75+.25*Math.sin(t*11+b.i)*Math.sin(t*6.7));FLD.glow.set(3+b.slot,b.x,b.y+.9,b.z,13*fl,1.1*fl,.42*fl,.1*fl);}else{FLD.glow.set(3+b.slot,0,-999,0,0,0,0,0);b.slot=-1;}}
      if(b.t<14)recol=true;}
    if(recol&&(FLD.colT-=dt)<=0){FLD.colT=.25;const im=MAPS.field.baleIM,c=new THREE.Color();
      for(const b of FLD.bales)if(b.t>=0&&b.t<14.5){const f=smooth(0,13,b.t);c.setRGB(lerp(1,.1,f),lerp(1,.085,f),lerp(1,.075,f));im.setColorAt(b.i,c);}im.instanceColor.needsUpdate=true;}
    FLD.glow.flush();if(FLD.motes)FLD.motes.userData.upd();
    if(FLD.pud){FLD.pud.uFog.value.set(S.fog.near,S.fog.far);FLD.pud.uFlash.value=typeof WX!=='undefined'&&WX.flash?WX.flash:0;}
  },
  noise(x,z,k,kind){
    if(kind!=='boom'||k<.6)return;
    /* a big enough blast sets the nearest bales alight (five fires at once at most) */
    const R2=(4.5+4*k)*(4.5+4*k);
    for(const b of FLD.bales){if(b.t>=0)continue;const dx=b.x-x,dz=b.z-z;if(dx*dx+dz*dz>R2)continue;
      const used=FLD.bales.filter(q=>q.slot>=0).map(q=>q.slot);let s=-1;for(let i=0;i<5;i++)if(!used.includes(i)){s=i;break;}if(s<0)return;
      b.t=0;b.slot=s;}
  }});
