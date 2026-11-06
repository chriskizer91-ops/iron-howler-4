/* ===================== follow cameras =====================
   close: just behind and above the head, so it feels like first person.
   far:   one mech height higher and further back, still looking along the mech over its neck (not down at the field). */
/* side: the camera sits a little to the right so the crosshair is never hidden behind the mech */
/* Ironhowl 4: the Wraith is taller than Howler 07 and its shoulder kit sits up to 7 m, so both views are higher and further back */
const VIEWS={close:{back:6.4,up:8.7,look:26,lookY:6.2,fov:64,side:1.5,pos:10},
             far:{back:15.5,up:12,look:24,lookY:6.6,fov:58,side:3,pos:6}};
const CAMS={x:0,y:0,z:0,ty:0,shake:0,fovK:0,blend:1,ready:false};
function camFov(base){/* portrait: open the view up so there is enough to see at the sides */const a=cam.aspect;return a>=1?base:Math.min(90,base+(1-a)*28);}
let CAMX=null;   /* test/showcase camera: {a (angle around the mech), d (distance), h (height), ly (look height)} */
function updCam(dt,p,view){
  if(CAMX){const a=p.yaw+(CAMX.a||0);if(CAMX.pos)cam.position.set(CAMX.pos[0],CAMX.pos[1],CAMX.pos[2]);else cam.position.set(p.x-Math.sin(a)*CAMX.d,p.y+CAMX.h,p.z-Math.cos(a)*CAMX.d);if(CAMX.at)cam.lookAt(CAMX.at[0],CAMX.at[1],CAMX.at[2]);else cam.lookAt(p.x,p.y+(CAMX.ly||3),p.z);if(cam.fov!==50){cam.fov=50;cam.updateProjectionMatrix();}SKY.position.copy(cam.position);return;}
  const V=VIEWS[view],fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw),sd=V.side*(cam.aspect<1?.45:1)+Math.max(0,-p.pitch-.2)*3;
  /* the body height follows the mech with a little lag in the air, so jet hops feel big */
  const by=p.y;CAMS.ty+=(by-CAMS.ty)*damp(p.air?(view==='close'?7:3.2):9,dt);if(!CAMS.ready){CAMS.ty=by;}
  /* portrait screens are narrow: step back a little so the mech does not fill them */
  const pt=Math.max(0,1-cam.aspect),back=V.back+pt*(view==='close'?2.2:3),up=V.up+pt*(view==='close'?.7:1.2);
  /* looking steeply down: slide the camera further right so you can see past the mech to your own feet */
  const down=Math.max(0,-p.pitch-.2);
  const pit=p.pitch;let tx=p.x-fx*back+rx*sd,tz=p.z-fz*back+rz*sd,ty=CAMS.ty+up-pit*(view==='close'?1.2:2.2);
  /* if a container or building sits between the mech and the camera, pull the camera in front of it */
  {const hx=p.x,hy=p.y+5,hz=p.z;for(let t=.15;t<=1.001;t+=.05){const x=lerp(hx,tx,t),y=lerp(hy,ty,t),z=lerp(hz,tz,t);if(boxAt(x,z,y+.6)){const k=Math.max(.1,t-.08);tx=lerp(hx,tx,k);ty=lerp(hy,ty,k)+(1-k)*1.5;tz=lerp(hz,tz,k);break;}}}
  if(!CAMS.ready){CAMS.x=tx;CAMS.y=ty;CAMS.z=tz;CAMS.ready=true;}
  const k=damp(V.pos,dt);CAMS.x+=(tx-CAMS.x)*k;CAMS.z+=(tz-CAMS.z)*k;CAMS.y+=(ty-CAMS.y)*k;
  const gy=hgt(CAMS.x,CAMS.z)+1.6;if(CAMS.y<gy)CAMS.y=gy;
  CAMS.shake=Math.max(0,CAMS.shake-dt*2.2);const sh=CAMS.shake*CAMS.shake*.35;
  cam.position.set(CAMS.x+(Math.random()-.5)*sh,CAMS.y+(Math.random()-.5)*sh,CAMS.z+(Math.random()-.5)*sh);
  const ly=CAMS.ty+V.lookY+Math.tan(pit)*V.look;
  cam.lookAt(p.x+fx*V.look+rx*sd,ly,p.z+fz*V.look+rz*sd);
  CAMS.fovK+=((p.air&&p.jetT<.5?1:0)-CAMS.fovK)*damp(4,dt);
  const f=camFov(V.fov)+CAMS.fovK*5;if(Math.abs(cam.fov-f)>.01){cam.fov=f;cam.updateProjectionMatrix();}
  SKY.position.copy(cam.position);
}
