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
function part(o){if(PFX.list.length>=PFX.max)PFX.list.shift();o.t=0;o.rot=Math.random()*TAU;o.vr=o.vr==null?(Math.random()-.5)*1.2:o.vr;PFX.list.push(o);}
const DUST=[.5,.43,.33],SMOKE=[.55,.55,.57];
function dustPuff(x,z,n,k){const y=hgt(x,z)+.2;for(let i=0;i<n;i++){const a=Math.random()*TAU,s=(1.5+Math.random()*2.5)*k;
  part({x:x+Math.cos(a)*.6,y,z:z+Math.sin(a)*.6,vx:Math.cos(a)*s,vy:.4+Math.random()*.9*k,vz:Math.sin(a)*s,life:1.1+Math.random()*.9,s0:.9*k,s1:3.2*k,a:.38,col:DUST,drag:2.2,grav:-.1});}}
function updFX(dt){
  const L=PFX.list;let n=0;const P_=PFX.iP.array,S_=PFX.iS.array,C_=PFX.iC.array;
  for(let i=L.length-1;i>=0;i--){const p=L[i];p.t+=dt;if(p.t>=p.life){L.splice(i,1);continue;}}
  for(const p of L){const dr=Math.exp(-(p.drag||0)*dt);p.vx*=dr;p.vy*=dr;p.vz*=dr;p.vy-=(p.grav||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=p.vr*dt;
    const f=p.t/p.life,s=lerp(p.s0,p.s1,Math.sqrt(f)),a=p.a*(p.glow?(1-f):Math.min(1,f*6)*(1-f)*(1-f));
    P_[n*3]=p.x;P_[n*3+1]=p.y;P_[n*3+2]=p.z;S_[n*4]=s;S_[n*4+1]=p.rot;S_[n*4+2]=a;S_[n*4+3]=p.img!=null?2+p.img:p.glow?1:0;C_[n*3]=p.col[0];C_[n*3+1]=p.col[1];C_[n*3+2]=p.col[2];n++;}
  PFX.mesh.geometry.instanceCount=n;PFX.iP.needsUpdate=PFX.iS.needsUpdate=PFX.iC.needsUpdate=true;
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
