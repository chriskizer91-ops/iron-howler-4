/* ===================== controls =====================
   readCtl(dt) gives one frame of intent:
   mx,my  move (-1..1, my = forward), turn/pitch (radians this frame), jet (held), jetHit (pressed this frame), view/pause (pressed). */
const KEYS=new Set(),HIT=new Set();
const MOUSE={dx:0,dy:0,locked:false,l:false,rHit:false};
addEventListener('mousedown',e=>{if(!MOUSE.locked)return;if(e.button===0)MOUSE.l=true;if(e.button===2)MOUSE.rHit=true;});
addEventListener('mouseup',e=>{if(e.button===0)MOUSE.l=false;});
addEventListener('contextmenu',e=>e.preventDefault());
const TS={id:-1,ox:0,oy:0,ax:0,ay:0,look:-1,lx:0,ly:0,ldx:0,ldy:0,jet:false,jetHit:false,fire:false,fireId:-1,msl:false,vent:false,salvo:false};
let PAD_PREV={};
addEventListener('keydown',e=>{if(e.repeat)return;KEYS.add(e.code);HIT.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>KEYS.delete(e.code));
addEventListener('blur',()=>{KEYS.clear();TS.id=-1;TS.look=-1;TS.jet=false;TS.fire=false;TS.fireId=-1;MOUSE.l=false;});
addEventListener('mousemove',e=>{if(MOUSE.locked){MOUSE.dx+=e.movementX||0;MOUSE.dy+=e.movementY||0;}});
document.addEventListener('pointerlockchange',()=>{MOUSE.locked=document.pointerLockElement===cv;if(!MOUSE.locked&&G.mode==='play'&&!G.paused&&!touchy)setPause(true);});
function lockMouse(){if(touchy||EMBED&&!document.hasFocus())return;try{const p=cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
const STICK_R=58;
function touchStart(e){let field=false;
  for(const t of e.changedTouches){
    if(t.target.closest&&t.target.closest('button'))continue;field=true;
    if(t.clientX<innerWidth*.45&&TS.id<0){TS.id=t.identifier;TS.ox=t.clientX;TS.oy=t.clientY;TS.ax=TS.ay=0;HUD.stick(true,TS.ox,TS.oy,0,0);}
    else if(TS.look<0){TS.look=t.identifier;TS.lx=t.clientX;TS.ly=t.clientY;}
  }
  /* only block the browser's tap handling for touches on the game itself: blocking it on buttons stopped VIEW, pause and the menu from working */
  if(G.mode==='play'&&field)e.preventDefault();
}
function touchMove(e){
  for(const t of e.changedTouches){
    if(t.identifier===TS.id){let dx=t.clientX-TS.ox,dy=t.clientY-TS.oy;const d=Math.hypot(dx,dy);
      if(d>STICK_R){/* the stick base follows the thumb so it never runs out of room */TS.ox+=dx/d*(d-STICK_R);TS.oy+=dy/d*(d-STICK_R);dx=t.clientX-TS.ox;dy=t.clientY-TS.oy;}
      TS.ax=dx/STICK_R;TS.ay=dy/STICK_R;HUD.stick(true,TS.ox,TS.oy,dx,dy);}
    else if(t.identifier===TS.look||t.identifier===TS.fireId){TS.ldx+=t.clientX-TS.lx;TS.ldy+=t.clientY-TS.ly;TS.lx=t.clientX;TS.ly=t.clientY;}
  }
  if(G.mode==='play')e.preventDefault();
}
function touchEnd(e){for(const t of e.changedTouches){if(t.identifier===TS.id){TS.id=-1;TS.ax=TS.ay=0;HUD.stick(false);}if(t.identifier===TS.look)TS.look=-1;}}
addEventListener('touchstart',touchStart,{passive:false});
addEventListener('touchmove',touchMove,{passive:false});
addEventListener('touchend',touchEnd);addEventListener('touchcancel',touchEnd);
function readCtl(dt){
  const o={mx:0,my:0,turn:0,pitch:0,jet:false,jetHit:false,view:false,pause:false,fire:false,msl:false,vent:false,salvo:false};
  const k=c=>KEYS.has(c);
  o.mx=(k('KeyD')?1:0)-(k('KeyA')?1:0);o.my=(k('KeyW')||k('ArrowUp')?1:0)-(k('KeyS')||k('ArrowDown')?1:0);
  o.turn+=((k('ArrowRight')?1:0)-(k('ArrowLeft')?1:0))*2.4*dt;
  if(MOUSE.locked){o.turn+=MOUSE.dx*.0026;o.pitch-=MOUSE.dy*.002;}
  MOUSE.dx=MOUSE.dy=0;
  o.jet=k('Space');o.jetHit=HIT.has('Space');o.fire=MOUSE.l||k('KeyF');o.msl=MOUSE.rHit||HIT.has('KeyG');o.vent=HIT.has('KeyR');o.salvo=HIT.has('KeyQ')||HIT.has('KeyE');MOUSE.rHit=false;o.view=HIT.has('KeyV');o.pause=HIT.has('KeyP')||HIT.has('Escape');
  /* touch */
  if(TS.id>=0){const m=Math.min(1,Math.hypot(TS.ax,TS.ay)),a=Math.atan2(TS.ay,TS.ax),dz=m<.12?0:(m-.12)/.88;o.mx+=Math.cos(a)*dz;o.my-=Math.sin(a)*dz;}
  if(TS.ldx||TS.ldy){o.turn+=TS.ldx*.0062*SET.sens;o.pitch-=TS.ldy*.004*SET.sens;TS.ldx=TS.ldy=0;}
  if(TS.jet)o.jet=true;if(TS.jetHit){o.jetHit=true;TS.jetHit=false;}
  if(TS.fire)o.fire=true;if(TS.msl){o.msl=true;TS.msl=false;}if(TS.vent){o.vent=true;TS.vent=false;}if(TS.salvo){o.salvo=true;TS.salvo=false;}
  /* gamepad */
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(const p of pads){if(!p||!p.connected)continue;const ax=i=>Math.abs(p.axes[i]||0)>.16?p.axes[i]:0,b=i=>p.buttons[i]&&p.buttons[i].pressed;
    o.mx+=ax(0);o.my-=ax(1);o.turn+=ax(2)*2.8*dt;o.pitch-=ax(3)*1.6*dt;
    if(b(0)||b(4))o.jet=true;const pr=PAD_PREV;if((b(0)||b(4))&&!pr.j)o.jetHit=true;if(b(3)&&!pr.v)o.view=true;if(b(9)&&!pr.s)o.pause=true;
    if(b(7)||b(5))o.fire=true;if(b(6)&&!pr.m)o.msl=true;if(b(1)&&!pr.x)o.vent=true;if(b(2)&&!pr.q)o.salvo=true;
    PAD_PREV={j:b(0)||b(4),v:b(3),s:b(9),m:b(6),x:b(1),q:b(2)};break;}
  const l=Math.hypot(o.mx,o.my);if(l>1){o.mx/=l;o.my/=l;}
  HIT.clear();
  return o;
}
