/* ===================== shared mech pieces from Ironhowl 3 (materials, part merging, leg IK) used by the FORGE machines.
   Ironhowl 4's player mech is the Wraith: 05_wraith.js. Below, Ironhowl 3's notes on Howler 07 (models/mech/howler07.glb, built in Blender: v2/src/ironhowl3/blender) =====================
   The model's empties are the joints: hips/thigh/knee/ankle (legs), torso, head, arm/gun/brl (guns), tier1..4 (barrel sets), muzzle, pod_*_mz, jet.
   Legs are dog-like with three parts: thigh (knee forward), shin back to the hock, then the long foot bone down to the clawed foot.
   Shading is baked into the vertex colours. */
const MT={};
function mechMats(){
  const k=(a,w)=>{a.vertexColors=true;return hookWorld(a,{wear:w});};
  MT.org=k(new THREE.MeshStandardMaterial({map:tex('22-howler-armour'),normalMap:nmap('22-howler-armour'),normalScale:new THREE.Vector2(nmapK('22-howler-armour'),nmapK('22-howler-armour')),roughness:.46,metalness:.35}),1);
  MT.grey=k(new THREE.MeshStandardMaterial({map:tex('23-grey-armour'),normalMap:nmap('23-grey-armour'),normalScale:new THREE.Vector2(nmapK('23-grey-armour'),nmapK('23-grey-armour')),roughness:.5,metalness:.45}),1);
  MT.gun=k(new THREE.MeshStandardMaterial({map:tex('24-gunmetal'),normalMap:nmap('24-gunmetal'),normalScale:new THREE.Vector2(nmapK('24-gunmetal'),nmapK('24-gunmetal')),color:0xb4bac4,roughness:.44,metalness:.72}));
  MT.steel=k(new THREE.MeshStandardMaterial({map:tex('25-brushed-steel'),normalMap:nmap('25-brushed-steel'),normalScale:new THREE.Vector2(.6,.6),roughness:.28,metalness:.92}));
  MT.trim=k(new THREE.MeshStandardMaterial({map:tex('26-hazard-trim'),roughness:.6,metalness:.2}),1);
  MT.dark=k(new THREE.MeshStandardMaterial({color:0x1a1c20,roughness:.68,metalness:.55}));
  MT.glass=k(new THREE.MeshStandardMaterial({color:0x0a0e14,roughness:.12,metalness:.6}));
  MT.glow=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.5,.12).multiplyScalar(2.6)});
  MT.eye=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.72,.3).multiplyScalar(3.2)});
  MT.decal=hookWorld(new THREE.MeshStandardMaterial({map:tex('28-howler-decals',{clamp:true,glb:true}),transparent:true,alphaTest:.3,roughness:.6,metalness:.1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));   /* no baked shading: it sits flat on the armour and would bake black */
  MT.flame=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.46,.16).multiplyScalar(1.25),transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false});
  MT.flame2=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.7,1).multiplyScalar(1.5),transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
}
const MECH_MAT={org:'org',grey:'grey',gun:'gun',steel:'steel',trim:'trim',dark:'dark',glass:'glass',eye:'eye',jetcore:'glow',decal:'decal'};
/* join the fixed pieces under each joint into one mesh per material (about 170 pieces become about 60) */
function mergeParts(root,keep){
  const holders=new Set();root.traverse(o=>{if(o.isMesh&&o.parent&&!(keep&&keep(o)))holders.add(o.parent);});
  for(const g of holders){const by=new Map();
    for(const m of g.children.slice()){if(!m.isMesh||(keep&&keep(m))||m.children.length)continue;m.updateMatrix();
      let geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);
      for(const k of Object.keys(geo.attributes))if(!['position','normal','uv','color'].includes(k))geo.deleteAttribute(k);
      if(!geo.attributes.color){const c=new Float32Array(geo.attributes.position.count*4).fill(1);geo.setAttribute('color',new THREE.BufferAttribute(c,4));}
      if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
      const key=m.material;if(!by.has(key))by.set(key,{geos:[],cast:m.castShadow});by.get(key).geos.push(geo);g.remove(m);}
    for(const [mat,v] of by){const ok=v.geos.every(q=>q.attributes.color.itemSize===v.geos[0].attributes.color.itemSize);
      if(!ok)v.geos.forEach(q=>{if(q.attributes.color.itemSize===3){const a=q.attributes.color.array,b=new Float32Array(a.length/3*4);for(let i=0;i<a.length/3;i++){b[i*4]=a[i*3];b[i*4+1]=a[i*3+1];b[i*4+2]=a[i*3+2];b[i*4+3]=1;}q.setAttribute('color',new THREE.BufferAttribute(b,4));}});
      const mm=new THREE.Mesh(THREE.mergeGeometries(v.geos,false),mat);mm.castShadow=v.cast;mm.receiveShadow=true;g.add(mm);}
  }
}
const HIP=3.2,L1=1.05,L2=1.0,L3=.9,ANK=.36,PHI=.26,HIPDROP=.05;
/* 2-bone leg IK in the leg's side view: target (ty,tz) is the ankle relative to the hip. rev: knee bends backwards */
function legIK(L,ty,tz,footPitch,l1,l2,rev){
  l1=l1||L1;l2=l2||L2;let d=Math.hypot(ty,tz);d=clamp(d,.3,l1+l2-.002);
  const th=Math.atan2(-tz,-ty),al=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),ga=Math.acos(clamp((l1*l1+l2*l2-d*d)/(2*l1*l2),-1,1));
  const t1=rev?th-al:th+al,k=rev?Math.PI-ga:-(Math.PI-ga);
  L.thigh.rotation.x=t1;L.knee.rotation.x=k;L.ankle.rotation.x=-(t1+k)+(footPitch||0);
}
/* the mech's legs: the foot bone keeps a fixed forward lean (PHI), so place the hock behind and above the ankle, then solve hip->hock */
function legIK3(L,ty,tz,footPitch,phi){
  phi=phi==null?PHI:phi;const hy=ty+L3*Math.cos(phi),hz=tz+L3*Math.sin(phi);
  legIK(L,hy,hz,0,L1,L2,false);const a=L.thigh.rotation.x+L.knee.rotation.x;
  L.hock.rotation.x=phi-a;L.ankle.rotation.x=-phi+(footPitch||0);
}
