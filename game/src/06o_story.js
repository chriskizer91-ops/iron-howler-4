/* ===== IH4: story scenes — a still picture with a few lines of text over it, between the fights (8 Nov) =====
   Christopher: "the thing that feels off is the story in between combat … it can be like text and images".
   STORY[mission id] = {open, mid, close}: open plays before the intel brief, mid before step `at` begins (between two
   fights), close after the last step, before the results. Each scene is panels [{img, ph, lines:[[who, text], …]}]:
   img → art/story/<img>.webp (Christopher's ChatGPT pictures); until that file exists, ph → art/story/ph_<ph>.webp,
   a picture of the place taken in the game. who '' = narration. The game is stopped while a scene shows: nothing is
   drawn behind it, and no input reaches the fight. Tap, click, Space or Enter goes on; SKIP (or Esc) ends the scene. */
const STY={open:false,sc:null,key:'',pi:0,li:0,shown:0,full:'',done:null,seen:new Set(),lay:0,t:0};
const STORY_WHO={ROOK:'#ffb347',UNKNOWN:'#ff4d4d'};   /* speaker colours; anyone else is pale grey, narration has no name */
/* STORY_TEXT is filled in by the writers (06p_story_text.js); this file only plays it */
function storyScene(key){const [m,part]=key.split('.'),s=(typeof STORY_TEXT!=='undefined')&&STORY_TEXT[m];return s&&s[part]||null;}
function storySrc(pn,cb){const a='art/story/'+pn.img+'.webp',b='art/story/ph_'+(pn.ph||'field')+'.webp';
  if(window.IH4_URL){cb(IH4_URL(a)||IH4_URL(b)||b);return;}   /* one-file game: its pictures are inside it */
  const im=new Image();im.onload=()=>cb(a);im.onerror=()=>cb(b);im.src=a;}
/* a mission's pictures load while its first scene plays, so the later ones show at once */
function storyPreload(m){const s=(typeof STORY_TEXT!=='undefined')&&STORY_TEXT[m];if(!s)return;
  for(const part of ['open','mid','close'])for(const pn of (s[part]&&s[part].panels)||[])storySrc(pn,()=>{});}
/* open a scene if this run hasn't shown it; returns true if it opened (then `then` runs when it closes) */
function storyPlay(key,then){const sc=storyScene(key);if(DEV&&Q.has('nostory')||!sc||!sc.panels||!sc.panels.length||STY.seen.has(key))return false;
  STY.seen.add(key);storyPreload(key.split('.')[0]);STY.sc=sc;STY.key=key;STY.pi=0;STY.li=0;STY.done=then||null;STY.open=true;jetLoop(0);
  if(document.pointerLockElement)document.exitPointerLock();
  $('stcap').textContent=sc.cap||(MISSION&&!MISSION.endless?(CHAPTER.split(' · ')[0]+' · '+MISSION.name):'');
  $('story').classList.add('on');storyPanel();return true;}
function storyPanel(){const pn=STY.sc.panels[STY.pi],ly=['sta','stb'];
  storySrc(pn,u=>{if(!STY.open)return;const nx=$(ly[1-STY.lay]),cu=$(ly[STY.lay]);nx.style.backgroundImage='url("'+u+'")';
    nx.classList.remove('kb');void nx.offsetWidth;nx.classList.add('kb','on');cu.classList.remove('on');STY.lay=1-STY.lay;});
  if(STY.pi>0)sClick();STY.li=0;storyLine();}
function storyLine(){const ln=STY.sc.panels[STY.pi].lines[STY.li]||['',''];const who=ln[0]||'';
  const w=$('stwho');w.textContent=who;w.style.display=who?'':'none';w.style.color=STORY_WHO[who]||'#c9d1d9';
  $('stline').classList.toggle('nar',!who);STY.full=ln[1]||'';STY.shown=0;STY.t=0;$('stline').textContent='';$('stnext').classList.remove('on');}
/* the line types itself out, about 55 letters a second */
function storyFrame(dt){if(!STY.open||STY.shown>=STY.full.length)return;const a=Math.floor(STY.shown);STY.shown=Math.min(STY.full.length,STY.shown+dt*55);const b=Math.floor(STY.shown);
  if(b!==a)$('stline').textContent=STY.full.slice(0,b);if(STY.shown>=STY.full.length)$('stnext').classList.add('on');}
function storyNext(){if(!STY.open)return;
  if(STY.shown<STY.full.length){STY.shown=STY.full.length;$('stline').textContent=STY.full;$('stnext').classList.add('on');return;}   /* first tap finishes the line */
  const pn=STY.sc.panels[STY.pi];if(++STY.li<pn.lines.length){storyLine();return;}
  if(++STY.pi<STY.sc.panels.length){storyPanel();return;}storyClose();}
function storyClose(){if(!STY.open)return;STY.open=false;$('story').classList.remove('on');
  /* nothing pressed during the scene reaches the fight */
  KEYS.clear();HIT.clear();TS.ldx=TS.ldy=0;TS.look=-1;TS.id=-1;TS.ax=TS.ay=0;TS.fire=false;TS.fireId=-1;TS.jet=false;MOUSE.dx=MOUSE.dy=0;MOUSE.l=false;if(HUD.stick)HUD.stick(false);
  const f=STY.done;STY.done=null;if(f)f();if(!touchy&&G.mode==='play'&&!BAY.open&&!STY.open)lockMouse();}
(function storyInit(){const el=$('story');
  /* on click (the last event of a tap), so the tap that ends a scene can't fall through to the brief opening under it */
  el.addEventListener('click',e=>{if(e.target.id==='stskip')return;e.preventDefault();storyNext();});
  $('stskip').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();sClick();storyClose();});})();
