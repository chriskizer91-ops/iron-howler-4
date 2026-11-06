/* ===================== the player: walking, jet hops, collisions ===================== */
const WALK=7.5,RAD=1.35;
/* jet hop: vh = sideways speed, vy = launch speed, hold = how long holding JET keeps pushing, refill = seconds per fuel cell */
const JET={vh:30,vy:11,grav:22,hold:.9,holdG:.35,refill:3.2,drain:.55};   /* tap: about 30 m, hold: about 55 m */
let P=null;
function mkPlayer(){return {x:SPAWN.x,z:SPAWN.z,y:hgt(SPAWN.x,SPAWN.z),yaw:SPAWN.yaw,pitch:0,legYaw:SPAWN.yaw,vx:0,vz:0,vy:0,air:false,
  cells:2,fuel:2,jetT:9,land:0,thrust:0,spd:0,groundT:9,ev:[],hops:0,dist:0,hull:100,hullMax:100,shield:60,shieldMax:60,regenT:0,dead:false};}
function updPlayer(c,dt){
  if(P.dead){P.thrust=0;return;}
  /* shield comes back after 3 s without a hit */
  if(P.regenT>0)P.regenT-=dt;else P.shield=Math.min(P.shieldMax,P.shield+(P.regenRate||22)*dt);
  P.yaw-=c.turn;P.pitch=clamp(P.pitch+c.pitch,-.85,.34);   /* turn: plus = to the right */
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
  let wx=fx*c.my+rx*c.mx,wz=fz*c.my+rz*c.mx;const ml=Math.hypot(wx,wz);
  /* jet hop */
  if(c.jetHit){
    if(!P.air&&P.fuel>=.98){const dx=ml>.2?wx/ml:fx,dz=ml>.2?wz/ml:fz;
      P.vx=dx*JET.vh;P.vz=dz*JET.vh;P.vy=JET.vy;P.air=true;P.fuel-=1;P.jetT=0;P.hops++;P.ev.push({t:'jet'});}
    else if(!P.air)P.ev.push({t:'nofuel'});
  }
  if(P.air){
    P.jetT+=dt;const hold=c.jet&&P.jetT<JET.hold&&P.fuel>.02;
    if(hold)P.fuel=Math.max(0,P.fuel-JET.drain*dt);
    P.vy-=JET.grav*(hold?JET.holdG:1)*dt;
    /* a little steering in the air */
    P.vx+=wx*5*dt;P.vz+=wz*5*dt;const hv=Math.hypot(P.vx,P.vz);if(hv>JET.vh*1.05){P.vx*=JET.vh*1.05/hv;P.vz*=JET.vh*1.05/hv;}
    P.thrust+=((P.jetT<.28?1:hold?.75:0)-P.thrust)*damp(14,dt);
    P.y+=P.vy*dt;
  }else{
    const tx=wx*WALK,tz=wz*WALK,k=damp(Math.hypot(P.vx,P.vz)>WALK*1.1?2.6:ml>.05?3.4:5.5,dt);
    P.vx+=(tx-P.vx)*k;P.vz+=(tz-P.vz)*k;P.thrust+=(0-P.thrust)*damp(10,dt);P.groundT+=dt;
    if(P.groundT>.6)P.fuel=Math.min(P.cells,P.fuel+dt/JET.refill);
  }
  /* move, then push out of tree trunks and keep inside the map */
  let nx=P.x+P.vx*dt,nz=P.z+P.vz*dt;
  const r=collide(nx,nz,RAD);if(r[2]&&(!P.air||P.y<hgt(r[0],r[1])+4)){nx=r[0];nz=r[1];}
  const B=BND();if(nx<B.x0||nx>B.x1){nx=clamp(nx,B.x0,B.x1);P.vx*=.2;}if(nz<B.z0||nz>B.z1){nz=clamp(nz,B.z0,B.z1);P.vz*=.2;}
  P.dist+=Math.hypot(nx-P.x,nz-P.z);P.x=nx;P.z=nz;
  const g=hgt(P.x,P.z);
  if(P.air){if(P.y<=g&&P.vy<0){const k=clamp(-P.vy/16,0,1.3);P.y=g;P.air=false;P.vy=0;P.groundT=0;P.land=Math.max(P.land,.18+k*.32);P.ev.push({t:'land',k});
    /* stomp landing (jets upgrade 3): hurts machines under you */
    if(UP.stomp&&k>.35)for(const e of EN){if(e.dead||e.spawnT>0)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<7){hurtEnemy(e,60*k*(1-d/9),e.x,e.y+1,e.z);e.kx+=(e.x-P.x)/(d||1)*12;e.kz+=(e.z-P.z)/(d||1)*12;}}}}
  else P.y=g;
  P.land=Math.max(0,P.land-dt*1.6);
  /* legs: face the way you walk (backwards when walking backwards), shuffle round when turning on the spot */
  const hs=Math.hypot(P.vx,P.vz);let tgt=P.legYaw,turnStep=0;
  if(hs>.6){const my=Math.atan2(-P.vx,-P.vz);tgt=Math.abs(angD(my,P.yaw))>1.95?my+Math.PI:my;}
  else if(Math.abs(angD(P.yaw,P.legYaw))>.55){tgt=P.yaw;turnStep=2.4;}
  const dl=angD(tgt,P.legYaw),mx=(P.air?2:5.5)*dt;P.legYaw+=clamp(dl,-mx,mx);
  const lf=-Math.sin(P.legYaw),lz=-Math.cos(P.legYaw);
  P.spd=P.vx*lf+P.vz*lz;if(Math.abs(P.spd)<turnStep&&!P.air&&Math.abs(dl)>.05)P.spd=turnStep*Math.sign(P.spd||1);
}
