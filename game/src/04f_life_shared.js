/* ===================== life every outdoor place shares (session 7): wind, trample, birds =====================
   WIND     plants lean and shiver in the vertex shader (the shader itself is in 03_render.js: WIND_GLSL, windVertex). Here we only set
            how hard it blows for the look in use, and let the gusts roll.
   TRAMPLE  up to 8 "pressers" (the Wraith's body and feet, the nearest machines, the latest blast) are handed to the same shader,
            which bends grass and bushes away from them. Setting those 8 vectors is all it costs.
   BIRDS    one small flock per place in daylight: crows on the field, small birds in the woods, gulls on the docks, none at the foundry.
            All of them are ONE instanced mesh (one draw call); the wings flap in its shader. Fight noise makes them burst up and wheel
            away high; they drift back when it has been quiet for a while. */

/* ---------------- wind ---------------- */
const WIND={base:.12,gust:.5,speed:1.9,t:0};   /* base = steady lean, gust = extra in a gust, speed = how fast the gusts roll */
function windSetup(L){
  if(L.storm)Object.assign(WIND,{base:.34,gust:.85,speed:4});            // storm: strong and gusty
  else if(L.fogFar&&L.fogFar<120)Object.assign(WIND,{base:.015,gust:.07,speed:.6});   // fog: almost still
  else if(L.rain)Object.assign(WIND,{base:.2,gust:.6,speed:2.6});          // rain: a stiff breeze
  else if(L.night)Object.assign(WIND,{base:.06,gust:.3,speed:1.4});        // night: a light air
  U.uWind.value.set(.94,.34,WIND.base,WIND.gust);                           // it blows the way the rain slants (toward +x)
  U.uCrop.value=MAPID==='field'?.3+WIND.gust*.9:0;                         // pale gust bands on the meadow and the wheat (field only)
}
function windTick(dt,t){
  U.uWindT.value+=dt*WIND.speed;
  /* a storm surges: every few seconds the whole field is laid over harder, then lets go */
  if(LOOKNOW&&LOOKNOW.storm){const s=.5+.5*Math.sin(t*.9)*Math.sin(t*.37+1);U.uWind.value.z=WIND.base*(.7+.6*s);U.uWind.value.w=WIND.gust*(.8+.3*s);}
}

/* ---------------- trample ---------------- */
const TRAMP={boom:null,v:new THREE.Vector3()};
function trampTick(dt){
  const T=U.uTramp.value;let n=0;
  if(M&&M.ready&&!P.dead){
    const up=P.y-hgt(P.x,P.z);
    /* the body parts the grass as it wades through; hovering, the jets blow a wider ring flat instead */
    if(up<2)T[n++].set(P.x,P.z,2.6,.6);else if(P.thrust>.05&&up<14)T[n++].set(P.x,P.z,5.5,.75*P.thrust*(1-up/14));
    for(const L of M.legs){L.ankle.getWorldPosition(TRAMP.v);if(TRAMP.v.y-hgt(TRAMP.v.x,TRAMP.v.z)<1.6)T[n++].set(TRAMP.v.x,TRAMP.v.z,1.7,1);}
  }
  /* the latest blast lays the grass flat in a ring that springs back */
  const B=TRAMP.boom;if(B){B.t+=dt;const u=B.t/B.life;if(u>=1)TRAMP.boom=null;else T[n++].set(B.x,B.z,B.r*smooth(0,.12,u)+.01,Math.min(1,B.k)*(1-u)*(1-u));}
  /* the nearest machines to the camera (only those close enough to stand among plants you can see) */
  const lim=QC.grass+8,cx=cam.position.x,cz=cam.position.z;
  for(const e of EN){if(n>=8)break;if(e.dead||e.spawnT>0)continue;const dx=e.x-cx,dz=e.z-cz;if(dx*dx+dz*dz>lim*lim||e.y-hgt(e.x,e.z)>2.5)continue;
    T[n++].set(e.x,e.z,(e.d&&e.d.r||1.5)*1.5+.8,.9);}
  for(;n<8;n++)T[n].w=0;
}

/* ---------------- birds ---------------- */
const BIRDS={n:0,list:[],kind:null,geo:null,pos:null,anim:null,perches:[],trees:[],flocks:[],quiet:99,callT:0,chk:0};
/* each kind: how many, size (half a wingspan, in metres; larger than life so they read on a phone), cruise speed, colour, wingtip colour,
   wing beats a second, share of the time spent gliding */
const BIRD_KIND={
  crow:{n:22,size:1.05,sp:9,col:[.035,.035,.045],tip:[.02,.02,.03],beat:3.2,glide:.25},
  small:{n:16,size:.95,sp:12,col:[.075,.055,.04],tip:[.03,.025,.02],beat:8,glide:.45},
  gull:{n:20,size:1.2,sp:10,col:[.92,.92,.95],tip:[.12,.12,.14],beat:2.4,glide:.7}};
function birdGeo(){
  /* one bird, nose toward +z, half a wingspan = 1. aW = how far out along the wing a point is (0 body .. 1 tip): the shader lifts it to flap. */
  const P_=[],W_=[],tri=(a,b,c)=>{for(const v of [a,b,c]){P_.push(v[0],v[1],v[2]);W_.push(v[3]||0);}};
  const nose=[0,0,.5],tail=[0,.02,-.42],top=[0,.13,.05],bot=[0,-.11,.05],l=[-.11,0,.05],r=[.11,0,.05];
  for(const [a,b] of [[l,top],[top,r],[r,bot],[bot,l]]){tri(nose,a,b);tri(tail,b,a);}
  tri([0,.02,-.3],[-.16,.02,-.62],[.16,.02,-.62]);                                            // tail fan
  for(const s of [-1,1]){const a=[s*.08,.02,.3,0],b=[s*.08,.02,-.12,0],c=[s*.55,.02,.3,.55],d=[s*.5,.02,-.14,.5],e=[s,.02,-.2,1];
    tri(a,c,b);tri(b,c,d);tri(c,e,d);}                                                        // wing: inner panel, then a swept tip
  const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P_,3));g.setAttribute('aW',new THREE.Float32BufferAttribute(W_,1));return g;
}
function birdsBuild(L){
  const kind=MAPID==='field'?'crow':MAPID==='woods'?'small':MAPID==='docks'?'gull':null;if(!kind||L.night)return;   // no birds at night or at the foundry
  const K=BIRD_KIND[kind];let n=K.n*(L.storm?.4:L.fogFar&&L.fogFar<120?.5:L.rain?.6:1)*(QL==='low'?.5:1);n=Math.max(4,Math.round(n));
  Object.assign(BIRDS,{n,kind,K,list:[],quiet:99});
  const g=BIRDS.geo=birdGeo();g.instanceCount=n;
  BIRDS.pos=new THREE.InstancedBufferAttribute(new Float32Array(n*4),4);BIRDS.anim=new THREE.InstancedBufferAttribute(new Float32Array(n*4),4);
  BIRDS.pos.setUsage(THREE.DynamicDrawUsage);BIRDS.anim.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aPos',BIRDS.pos);g.setAttribute('aAnim',BIRDS.anim);
  const sky=new THREE.Color(L.sky).multiplyScalar(kind==='gull'?1:0).addScalar(kind==='gull'?0:1);   // gulls take the colour of the sky's light; dark birds stay dark
  const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,
    uniforms:Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog),{uCol:{value:new THREE.Vector3(K.col[0]*sky.r,K.col[1]*sky.g,K.col[2]*sky.b)},uTip:{value:new THREE.Vector3(...K.tip)}}),
    /* aPos = where the bird is + which way it heads; aAnim = wing beat phase, how hard it flaps (below 0 = perched, wings folded), bank, size */
    vertexShader:`attribute vec4 aPos,aAnim;attribute float aW;varying float vW;
      varying float vDepth;
      void main(){vec3 p=position;float sit=step(aAnim.y,-.5),amp=max(aAnim.y,0.);
        float fl=sin(aAnim.x)*amp,tipl=sin(aAnim.x-.9)*amp;                      /* the tip follows the wing root a little late, like a real wing beat */
        p.y+=aW*(.16+fl*.62)+aW*aW*tipl*.3;p.x*=1.-aW*.3*abs(fl);                  /* flap; wings held in a shallow V when gliding */
        if(sit>.5){p.x*=mix(2.3,.2,step(.01,aW));p.y=position.y*2.7-aW*.05;p.z=p.z*.8-aW*.1;float c=cos(-.4),s=sin(-.4);p.yz=vec2(p.y*c-p.z*s,p.y*s+p.z*c);p.y+=.2;}   /* perched: wings folded, body tipped upright */
        float cb=cos(aAnim.z),sb=sin(aAnim.z);p.xy=vec2(p.x*cb-p.y*sb,p.x*sb+p.y*cb);   /* bank into the turn */
        float ch=cos(aPos.w),sh=sin(aPos.w);p.xz=vec2(p.x*ch+p.z*sh,-p.x*sh+p.z*ch);    /* head the way it flies */
        vW=aW;vec4 mvPosition=viewMatrix*vec4(p*aAnim.w+aPos.xyz,1.);gl_Position=projectionMatrix*mvPosition;vDepth=-mvPosition.z;
      }`,
    /* only a little fog on them: the sky behind a bird has no fog, so a fully fogged bird would turn into a pale fleck */
    fragmentShader:`uniform vec3 uCol,uTip,fogColor;uniform float fogNear,fogFar;varying float vW,vDepth;
      void main(){vec3 c=mix(uCol,uTip,smoothstep(.62,.9,vW));gl_FragColor=vec4(mix(c,fogColor,smoothstep(fogNear,fogFar,vDepth)*.4),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  BIRDS.mesh=new THREE.Mesh(g,m);BIRDS.mesh.frustumCulled=false;S.add(BIRDS.mesh);
  /* --- where they like to be --- */
  const pc=BIRDS.perches=[],F=MAPS.field.farm;
  if(kind==='crow'){const y=hgt(F.x,F.z);
    for(let i=0;i<8;i++)pc.push({x:F.x-10.5+i*3,y:y+15,z:F.z});                                 // the barn's roof ridge
    for(let i=0;i<4;i++)pc.push({x:F.x-32+i*4,y:y+10,z:F.z+4});pc.push({x:F.x+16,y:y+19.5,z:F.z+10});   // the farmhouse ridge, the silo
    (MAPS.field.mastObjs||[]).forEach(m=>pc.push({x:m.x,y:m.y+26.9,z:m.z,mast:m}));              // the relay masts (not once one has been shot down)
    /* fence posts: the same walk along the track as the fence builder in 04b_maps.js, taking every third post */
    for(let i=2;i<TRAIL.length-1;i+=2){const a=TRAIL[i],b=TRAIL[i+1],Ln=Math.hypot(b[0]-a[0],b[1]-a[1]),ang=Math.atan2(b[0]-a[0],b[1]-a[1]);
      for(const sd of [-1,1])for(let t=0;t<Ln;t+=12){const x=a[0]+(b[0]-a[0])*t/Ln+Math.cos(ang)*5.2*sd,z=a[1]+(b[1]-a[1])*t/Ln-Math.sin(ang)*5.2*sd;pc.push({x,y:hgt(x,z)+1.5,z});}}
  }else if(kind==='gull'){const D=MAPS.docks;
    for(const x of D.lanesX)for(const z of [-88,-20,52,84])pc.push({x:x+3.6+(Math.random()-.5),y:13.15,z});   // lamp posts
    for(const cx of [-59,9,77])for(const dz of [-3,0,3])pc.push({x:cx+(dz?0:2),y:40.25,z:-94.5+dz});             // crane cabins
  }else{for(const a of VEG.list)if(a.kind==='tree'&&!/snag/.test(a.id))for(const s of a.inst)if(Math.abs(s.x)<PLAY+10&&Math.abs(s.z)<PLAY+10)BIRDS.trees.push(s);}
  /* --- the flocks: a flock wheels around a centre; 'follow' flocks keep to the part of the map the Wraith is in --- */
  const fx=-Math.sin(SPAWN.yaw),fz=-Math.cos(SPAWN.yaw);
  const FL=BIRDS.flocks=kind==='crow'?[{x:SPAWN.x+fx*42,z:SPAWN.z+fz*42,follow:1,alt:[13,24],r:[10,26]}]:
    kind==='gull'?[{x:SPAWN.x+fx*40,z:SPAWN.z+fz*40,follow:1,alt:[17,28],r:[12,26]},{x:9,z:-128,alt:[22,40],r:[20,44]}]:[{x:SPAWN.x,z:SPAWN.z,follow:1,alt:[18,26],r:[14,30]}];
  for(let i=0;i<n;i++){
    const percher=kind==='small'||(kind==='crow'?i%5<2:i%10<3),fl=FL[kind==='gull'&&!percher&&i%2?1:0];
    const b={i,percher,fl,st:'fly',x:fl.x+(Math.random()-.5)*30,z:fl.z+(Math.random()-.5)*30,y:0,vx:0,vy:0,vz:0,hd:Math.random()*TAU,bank:0,ph:Math.random()*TAU,amp:1,
      r:lerp(fl.r[0],fl.r[1],Math.random()),alt:lerp(fl.alt[0],fl.alt[1],Math.random()),dir:i%3?1:-1,fear:0,scare:0,burst:0,sitT:0,perch:null,sz:K.size*(.85+Math.random()*.3),w:Math.random()*TAU};
    b.y=birdFloor(b.x,b.z)+b.alt;BIRDS.list.push(b);
    if(percher){const p=birdPerch(b,true);if(p){b.perch=p;p.b=b;b.x=p.x;b.y=p.y;b.z=p.z;b.st='perch';b.sitT=kind==='small'?1+Math.random()*6:10+Math.random()*40;}}
  }
  birdsWrite();
}
function birdFloor(x,z){return MAPID==='docks'?0:hgt(clamp(x,-WORLD,WORLD),clamp(z,-WORLD,WORLD));}
/* pick a free perch that is in the Wraith's part of the map, but not right beside it */
function birdPerch(b,first){
  const px=P&&P.x!==undefined?P.x:SPAWN.x,pz=P&&P.z!==undefined?P.z:SPAWN.z,yaw=P&&P.yaw!==undefined?P.yaw:SPAWN.yaw;
  if(BIRDS.kind==='small'){const T=BIRDS.trees;if(!T.length)return null;
    /* a spot in the crown of a tree a little ahead of the Wraith */
    const ax=px-Math.sin(yaw)*28,az=pz-Math.cos(yaw)*28;let best=null,bd=1e9;
    for(let k=0;k<24;k++){const s=T[Math.random()*T.length|0],d=Math.hypot(s.x-ax,s.z-az),dp=Math.hypot(s.x-px,s.z-pz);if(dp<9)continue;if(d<24){best=s;break;}if(d<bd){bd=d;best=s;}}
    if(!best)return null;const a=Math.random()*TAU,r=best.cr*(.5+Math.random()*.4);return {x:best.x+Math.cos(a)*r,y:best.y+best.h*(.5+Math.random()*.4),z:best.z+Math.sin(a)*r};}
  let best=null,bs=1e9;
  for(const p of BIRDS.perches){if(p.b||p.mast&&p.mast.fall)continue;const d=Math.hypot(p.x-px,p.z-pz);if(d<24)continue;const sc=d*(.6+Math.random()*.8);if(sc<bs){bs=sc;best=p;}}
  return best;
}
/* something loud happened at x,z: every bird within reach bursts up and away from it */
function birdsScare(x,z,reach,secs){
  let n=0;
  for(const b of BIRDS.list){const dx=b.x-x,dz=b.z-z,d=Math.hypot(dx,dz);if(d>reach)continue;
    if(b.scare<=0||b.st==='perch'){n++;const k=1/Math.max(d,1),a=(Math.random()-.5)*1.6,c=Math.cos(a),s=Math.sin(a),ax=(dx*c-dz*s)*k,az=(dx*s+dz*c)*k,sp=BIRDS.K.sp;
      b.vx=ax*sp*1.5;b.vz=az*sp*1.5;b.vy=5+Math.random()*5;b.burst=1.6+Math.random()*1.2;b.ax=ax;b.az=az;
      if(b.perch){b.perch.b=null;b.perch=null;}b.st='fly';b.sitT=0;}
    b.scare=Math.max(b.scare,secs*(.8+Math.random()*.5));}
  if(n)BIRDS.quiet=0;
  if(n>=3&&BIRDS.callT<=0&&G.mode==='play'){BIRDS.callT=2.5;const v=clamp(1.3-Math.hypot(x-P.x,z-P.z)/90,.25,1);for(let i=0;i<3;i++)setTimeout(()=>birdCall(v,true),90+i*230+Math.random()*90);}
  return n;
}
function birdsTick(dt,t){
  if(!BIRDS.mesh)return;const K=BIRDS.K,small=BIRDS.kind==='small';
  BIRDS.quiet+=dt;BIRDS.callT-=dt;
  /* 'follow' flocks drift after the Wraith, lazily, so there are birds wherever you are without them ever jumping */
  for(const f of BIRDS.flocks)if(f.follow){const gx=P.x-Math.sin(P.yaw)*38,gz=P.z-Math.cos(P.yaw)*38,dx=gx-f.x,dz=gz-f.z,d=Math.hypot(dx,dz);
    if(d>(small?12:24)){const s=Math.min(d,(small?9:7)*dt)/d;f.x+=dx*s;f.z+=dz*s;}}
  /* a few times a second: perched birds take off if the Wraith or a machine walks up to them */
  BIRDS.chk-=dt;if(BIRDS.chk<0){BIRDS.chk=.3;const R=small?7:13;
    for(const b of BIRDS.list){if(b.st!=='perch')continue;let who=Math.hypot(b.x-P.x,b.z-P.z)<R&&b.y-P.y<16?P:null;
      if(!who)for(const e of EN)if(!e.dead&&Math.hypot(b.x-e.x,b.z-e.z)<R*.8){who=e;break;}
      if(who)birdsScare(who.x,who.z,R+4,5);else if(b.perch.mast&&b.perch.mast.fall)birdsScare(b.x+1,b.z,6,5);}}
  for(const b of BIRDS.list){
    if(b.st==='perch'){b.amp=-1;b.sitT-=dt;
      /* now and then a perched bird hops to another perch on its own */
      if(b.sitT<0){const p=birdPerch(b);if(p){b.perch.b=null;b.perch=p;p.b=b;b.st='land';b.vy=3;}else b.sitT=5;}
      continue;}
    if(b.scare>0)b.scare-=dt;b.fear+=((b.scare>0?1:0)-b.fear)*damp(b.scare>0?4:.5,dt);
    let tx,ty,tz,sp=K.sp*(1+b.fear*.5),turn=small?5:1.7;
    if(b.burst>0){b.burst-=dt;tx=b.x+b.ax*40;tz=b.z+b.az*40;ty=b.y+16;sp=K.sp*1.7;turn=3;}
    else if(b.st==='land'&&b.fear<.3){const p=b.perch;tx=p.x;ty=p.y;tz=p.z;const dx=tx-b.x,dy=ty-b.y,dz=tz-b.z,d=Math.hypot(dx,dy,dz);
      if(p.mast&&p.mast.fall){p.b=null;b.perch=null;b.st='fly';}
      else if(d<.9+sp*dt){b.x=tx;b.y=ty;b.z=tz;b.vx=b.vy=b.vz=0;b.st='perch';b.bank=0;b.sitT=small?1+Math.random()*3.5:14+Math.random()*45;b.hd=Math.random()*TAU;continue;}
      sp=Math.min(sp,2.5+d*1.4);turn=small?7:3.5;if(d>6)ty+=Math.min(d*.45,small?8:6);}   // come in a little high, slow down at the end
    else{/* wheel around the flock's centre; a frightened bird wheels much wider and higher */
      if(b.st==='land'){b.perch.b=null;b.perch=null;b.st='fly';}
      const f=b.fl,cx=f.x,cz=f.z,R=b.r+b.fear*(small?26:58),a=Math.atan2(b.z-cz,b.x-cx)+b.dir*(.55+10/R);
      tx=cx+Math.cos(a)*R;tz=cz+Math.sin(a)*R;ty=birdFloor(cx,cz)+b.alt+b.fear*(small?10:24)+Math.sin(t*.35+b.w)*3;
      /* quiet again: perchers go back to a perch */
      if(b.percher&&b.fear<.25&&b.scare<=0&&(b.sitT-=dt)<0){const p=birdPerch(b);if(p){b.perch=p;p.b=b;b.st='land';}else b.sitT=3;}}
    const dx=tx-b.x,dy=ty-b.y,dz=tz-b.z,d=Math.hypot(dx,dy,dz)||1,k=damp(turn,dt);
    b.vx+=(dx/d*sp-b.vx)*k;b.vy+=(clamp(dy/d*sp,-sp*.5,sp*.6)-b.vy)*k;b.vz+=(dz/d*sp-b.vz)*k;
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;const fl=birdFloor(b.x,b.z)+1.2;if(b.y<fl){b.y=fl;b.vy=Math.max(b.vy,2);}
    const hd=Math.atan2(b.vx,b.vz);let dh=hd-b.hd;dh=Math.atan2(Math.sin(dh),Math.cos(dh));b.hd=hd;
    b.bank+=(clamp(-dh/Math.max(dt,.004)*.55,-1,1)-b.bank)*damp(4,dt);
    /* flap hard when climbing or frightened; otherwise beat for a while, then glide for a while */
    const work=b.burst>0||b.vy>1.5||b.st==='land'?1:Math.sin(t*(small?3.1:.7)+b.w*3)>K.glide*2-1?(.75+b.fear*.25):.06;
    b.amp+=(work-b.amp)*damp(6,dt);b.ph+=dt*TAU*K.beat*(b.burst>0?1.5:1)*(.5+.5*Math.max(b.amp,0));
  }
  birdsWrite();
}
/* hand the flock to the shader: 8 numbers a bird (about 1 KB a frame for the whole flock) */
function birdsWrite(){const A=BIRDS.pos.array,B=BIRDS.anim.array;
  for(const b of BIRDS.list){const o=b.i*4;A[o]=b.x;A[o+1]=b.y;A[o+2]=b.z;A[o+3]=b.hd;B[o]=b.ph;B[o+1]=b.amp;B[o+2]=b.bank;B[o+3]=b.sz;}
  BIRDS.pos.needsUpdate=true;BIRDS.anim.needsUpdate=true;}
/* ---- bird voices. birdSong() replaces the old random chirp in 10_main.js: you only hear birds when calm birds are near. ---- */
function birdVoice(f0,f1,f2,dur,vol,type){const c=AU.c;if(!c)return;const t=c.currentTime+.02,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f1,t+dur*.35);o.frequency.linearRampToValueAtTime(f2,t+dur);
  f.type='bandpass';f.frequency.value=(f0+f1)*.9;f.Q.value=1.2;o.connect(f);f.connect(g);g.connect(AU.out);env(g,t,.02,vol,dur);o.start(t);o.stop(t+dur+.1);}
function birdCall(vol,alarm){const k=BIRDS.kind,j=.9+Math.random()*.2;
  if(k==='crow')birdVoice(560*j,470*j,380*j,alarm?.2:.3,.16*vol,'sawtooth');                         // caw
  else if(k==='gull')birdVoice(900*j,1500*j,1050*j,alarm?.3:.5,.07*vol,'triangle');                  // a gull's cry
  else if(alarm)birdVoice(3600*j,4400*j,3000*j,.09,.07*vol,'sine');else sBird();}                    // a sharp tick of alarm, or the old song
function birdSong(){
  if(!BIRDS.mesh||BIRDS.quiet<6)return;                                    // no birds here, or they have just been frightened: silence
  let near=0,dmin=1e9;for(const b of BIRDS.list){if(b.fear>.3)continue;const d=Math.hypot(b.x-P.x,b.z-P.z);if(d<85){near++;dmin=Math.min(dmin,d);}}
  if(near<2)return;const v=clamp(1.25-dmin/85,.3,1);
  birdCall(v,false);if(BIRDS.kind!=='small'&&Math.random()<.6)setTimeout(()=>birdCall(v*.8,false),380+Math.random()*200);
}
/* ---------------- register with the life hooks: every map gets these ---------------- */
lifeOn('*',{
  build(L){windSetup(L);birdsBuild(L);},
  tick(dt,t){windTick(dt,t);trampTick(dt);birdsTick(dt,t);},
  noise(x,z,k,kind){
    if(kind==='boom'){const d=Math.hypot(x-cam.position.x,z-cam.position.z);
      if(d<70&&(!TRAMP.boom||k>=TRAMP.boom.k*(1-TRAMP.boom.t/TRAMP.boom.life)))TRAMP.boom={x,z,k,r:3.5+5*k,t:0,life:1.2+k*.5};}
    if(!BIRDS.mesh||kind==='step')return;
    if(kind==='boom')birdsScare(x,z,35+40*k,9+k*4);else birdsScare(x,z,kind==='shot'?40:30,8);
  }});
