/* ===================== HUD: kept small. Top left: shield, hull, jets, gun tier, missiles. Top middle: score. Crosshair with heat. ===================== */
const ROMAN=['','I','II','III','IV'];
const HUD={_c:{},
  load(p){const b=$('ldbar');if(b)b.style.width=Math.round(p*100)+'%';},
  stick(on,x,y,dx,dy){const s=$('stick');if(!on){s.style.display='none';return;}s.style.display='block';s.style.left=x+'px';s.style.top=y+'px';$('knob').style.transform='translate('+dx+'px,'+dy+'px)';},
  set(id,prop,v){const k=id+prop;if(this._c[k]===v)return;this._c[k]=v;const el=$(id);if(prop==='text')el.textContent=v;else if(prop==='cls')el.className=v;else el.style[prop]=v;},
  fuel(p){const el=$('fuel');if(!el)return;if(el.children.length!==p.cells){el.innerHTML='';for(let i=0;i<p.cells;i++){const c=document.createElement('i');c.appendChild(document.createElement('b'));el.appendChild(c);}}
    for(let i=0;i<p.cells;i++){const f=Math.round(clamp(p.fuel-i,0,1)*50)/50,c=el.children[i];if(c._f!==f){c._f=f;c.firstChild.style.width=(f*100)+'%';c.className=f>=1?'full':'';}}},
  flashFuel(){const el=$('fuel');el.classList.remove('no');void el.offsetWidth;el.classList.add('no');},
  view(v){$('bview').textContent=v==='close'?'CAM NEAR':'CAM FAR';},   /* it said CLOSE, which read like a close button */
  hint(t,sec){const h=$('hint');h.textContent=t;h.style.opacity=t?1:0;clearTimeout(HUD._ht);if(t&&sec)HUD._ht=setTimeout(()=>h.style.opacity=0,sec*1000);},
  msg(t,sec){const h=$('msg');h.textContent=t;h.style.opacity=1;clearTimeout(HUD._mt);HUD._mt=setTimeout(()=>h.style.opacity=0,(sec||1.2)*1000);},
  banner(t){const h=$('banner');h.textContent=t;h.classList.remove('go');void h.offsetWidth;h.classList.add('go');},
  /* a red (hull) or blue (shield) arc at the screen edge pointing to whoever hit you */
  hit(fx,fz,kind){const a=Math.atan2(fx-P.x,fz-P.z),rel=angD(a,P.yaw+Math.PI);const d=$('dmg'+(HUD._di=(HUD._di+1||0)%4));
    d.className='dmg '+kind;d.style.transform='rotate('+(-rel)+'rad)';d.style.opacity=1;clearTimeout(d._t);d._t=setTimeout(()=>d.style.opacity=0,450);
    if(kind==='h'){const v=$('vig');v.style.opacity=.55;clearTimeout(v._t);v._t=setTimeout(()=>v.style.opacity=0,180);}},
  frame(){
    if(!P)return;
    this.set('bshield','width',(P.shield/P.shieldMax*100).toFixed(0)+'%');this.set('bhull','width',(P.hull/P.hullMax*100).toFixed(0)+'%');
    this.set('bhull','cls',P.hull<30?'low':'');
    this.set('gtier','text','GUN '+ROMAN[GUN.tier]);this.set('mslc','text','MSL '+MSL.ammo);this.set('bmsl','text','MSL '+MSL.ammo);
    this.set('score','text',G.score.toLocaleString('en-US'));if(!MISSION)this.set('obj','text','');const cm=G.t-G.lastKill<3&&G.combo>1;this.set('combo','text',cm?'x'+Math.min(3,1+.25*(G.combo-1)).toFixed(2).replace(/\.?0+$/,''):'');
    this.set('heatb','width',GUN.heat.toFixed(0)+'%');this.set('heat','cls',GUN.over?'over':GUN.heat>70?'warm':'');
    this.set('cross','cls',GUN.hitT>0?'hit':AIM.e?'on':'');
    this.set('bvent','cls','tb'+(GUN.ventCd>0?' cool':GUN.over?' hot':''));
    const sr=SALVO.cd<=0;this.set('bsalvo','cls','tb'+(sr?'':' cool'));this.set('bsalvo','text',sr?'SALVO':String(Math.ceil(SALVO.cd)));
    this.set('salvoc','text',sr?'SALVO Q':'SALVO '+Math.ceil(SALVO.cd));this.set('salvoc','cls',sr?'rdy':'');
    /* arrows at the screen edge for machines you cannot see within 60 m */
    let k=0;const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
    for(const e of EN){if(k>=6)break;if(e.dead||e.spawnT>0)continue;const dx=e.x-P.x,dz=e.z-P.z,d=Math.hypot(dx,dz);if(d>60)continue;
      const rel=angD(Math.atan2(-dx,-dz),P.yaw);if(Math.abs(rel)<.75)continue;const el=$('ea'+k++);el.style.display='block';el.style.transform='rotate('+(-rel)+'rad)';el.style.opacity=d<25?1:.6;}
    for(;k<6;k++){const el=$('ea'+k);if(el.style.display!=='none')el.style.display='none';}
    /* mission waypoint: a marker over the objective, pinned to the screen edge when it is off screen, with the distance */
    const wp=$('wp');if(MISSION&&!MS.done&&G.mode==='play'){const s=MISSION.steps[MS.step],p=s&&stepPos(s);
      if(p){const v=V3(p.x,hgt(p.x,p.z)+(s.masts?14:5),p.z).project(cam);let sx=(v.x*.5+.5)*innerWidth,sy=(-v.y*.5+.5)*innerHeight;const behind=v.z>1;
        if(behind){sx=innerWidth-sx;sy=innerHeight-sy;}const m=46,off=behind||sx<m||sx>innerWidth-m||sy<m+40||sy>innerHeight-m;
        if(off){const cx=innerWidth/2,cy=innerHeight/2;let dx=sx-cx,dy=sy-cy;if(behind&&Math.abs(dy)<1)dy=1;const k2=Math.min((cx-m)/Math.abs(dx||1e-3),(cy-m-20)/Math.abs(dy||1e-3));sx=cx+dx*k2;sy=cy+dy*k2;}
        wp.style.display='block';wp.style.transform='translate('+sx.toFixed(0)+'px,'+sy.toFixed(0)+'px)';this.set('wpd','text',Math.round(Math.hypot(p.x-P.x,p.z-P.z))+' m');this.set('wp','cls',off?'off':'');}
      else wp.style.display='none';}else if(wp.style.display!=='none')wp.style.display='none';
  },
  menu(){const m=$('menu');$('mview').textContent='CAMERA: '+(SET.view==='close'?'NEAR':'FAR');
    $('mqual').textContent='QUALITY: '+(SET.quality==='auto'?'AUTO ('+QL.toUpperCase()+')':SET.quality.toUpperCase());
    $('msound').textContent='SOUND: '+(SET.sound?'ON':'OFF');$('msens').textContent='LOOK SPEED: '+SET.sens.toFixed(1)+'x';$('msens').style.display=touchy?'':'none';
    $('mexit').style.display=EMBED?'':'none';m.style.display=G.paused?'flex':'none';},
  dev(){if(!DEV)return;const i=R.info.render;$('dev').textContent=Math.round(1/Math.max(1e-3,G.fdt))+' fps  '+QL+' x'+DYN.toFixed(2)+'  calls '+i.calls+'  tris '+(i.triangles/1000|0)+'k  veg '+VEGN.inst+'  en '+EN.length;}
};
function setupHud(){
  if(touchy)document.body.classList.add('touch');
  const hold=(id,on,off)=>{const b=$(id);b.addEventListener('touchstart',e=>{e.preventDefault();on(e);b.classList.add('on');},{passive:false});
    const up=e=>{off&&off(e);b.classList.remove('on');};b.addEventListener('touchend',up);b.addEventListener('touchcancel',up);};
  hold('bjet',()=>{TS.jet=true;TS.jetHit=true;},()=>{TS.jet=false;});
  hold('bfire',e=>{const t=e.changedTouches[0];TS.fire=true;TS.fireId=t.identifier;TS.lx=t.clientX;TS.ly=t.clientY;},()=>{TS.fire=false;TS.fireId=-1;});
  hold('bmsl',()=>{TS.msl=true;});hold('bvent',()=>{TS.vent=true;});hold('bsalvo',()=>{TS.salvo=true;});
  $('bview').onclick=e=>{e.stopPropagation();cycleView();};
  $('bpause').onclick=e=>{e.stopPropagation();if(G.mode==='play')setPause(!G.paused);};
  $('mresume').onclick=()=>setPause(false);
  $('mview').onclick=()=>{cycleView();HUD.menu();};
  $('mqual').onclick=()=>{const o=['auto','low','med','high'];SET.quality=o[(o.indexOf(SET.quality)+1)%o.length];store.set('quality',SET.quality);
    setQuality(SET.quality==='auto'?(touchy?'med':'high'):SET.quality);HUD.menu();};
  $('msound').onclick=()=>{SET.sound=!SET.sound;store.set('sound',SET.sound?1:0);HUD.menu();};
  $('msens').onclick=()=>{const o=[.6,.8,1,1.3,1.7];SET.sens=o[(o.indexOf(SET.sens)+1)%o.length]||1;store.set('sens',SET.sens);HUD.menu();};
  $('mexit').onclick=()=>ARC.exit();
  $('down').addEventListener('click',()=>{if(G.mode==='down'&&G.downT<=0){if(MISSION)repairAtCheckpoint();else startPlay();}});
  HUD.view(SET.view);
}
