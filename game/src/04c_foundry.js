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
