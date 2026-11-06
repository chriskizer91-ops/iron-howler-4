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
    for(const lod of ['near','far']){const L=lod==='near'?sn:sf;
      for(const p of a.parts[lod]){const arr=p.im.instanceMatrix.array,fa=p.fade.array;
        for(let k=0;k<L.length;k++){const i=L[k];arr.set(p.big.subarray(i*16,i*16+16),k*16);fa[k]=lod==='near'&&isT?a.inst[i].f:0;}
        p.im.count=L.length;p.im.visible=L.length>0;p.im.instanceMatrix.needsUpdate=true;p.fade.needsUpdate=true;
        const tt=L.length*(p.geo.index?p.geo.index.count:p.geo.attributes.position.count)/3;tris+=tt;inst+=L.length;if(DEV){const k=a.kind+'.'+lod;VEGN.by[k]=(VEGN.by[k]||0)+tt;}}}
  }
  VEGN.tris=tris|0;VEGN.inst=inst;
}
