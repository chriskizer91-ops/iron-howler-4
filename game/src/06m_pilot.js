/* ===================== Ironhowl 4: pilot levels (session 4) =====================
   XP comes from every machine you destroy (its score, without the combo), every wave you clear (100 + 50 a wave) and every
   mission you finish (half its bonus), in every mode. 10 levels. Levels 2-5 open kit for the modification bay, levels 6-10
   bring AI assists (on by themselves once earned). Saved in hd-ironhowl4-save: xp, beaten (machines destroyed, for the
   armory book), unlockAll (the bay's TEST: UNLOCK ALL switch, for trying everything before you've earned it). */
const PILOT={lv:[0,2000,5000,9000,14000,20000,27000,35000,44000,54000],   /* XP at the start of levels 1..10 */
  kit:{ac:1,mpod:1,jetpack:1,ln:2,watcher:3,ar:4,drone:5},
  assists:[{lv:6,id:'vent',name:'AUTO-VENT',fx:'The autocannon vents by itself just before it overheats.'},
    {lv:7,id:'lock',name:'LOCK ASSIST',fx:'Missile lock 25% faster.'},
    {lv:8,id:'repair',name:'FIELD REPAIR',fx:'The drone also repairs during fights (1 hull a second), and 3 a second after.'},
    {lv:9,id:'hover',name:'HOVER RESERVE',fx:'Hover tank 45 s.'},
    {lv:10,id:'ace',name:'ACE',fx:'Every weapon +10% damage.'}]};
const PL={xp:0,lv:1,all:false,run:0,ups:[]};
function pilotRefresh(){const sv=SAVE.get();PL.xp=sv.xp||0;PL.all=!!sv.unlockAll;PL.lv=pilotLv(PL.xp);}
function pilotLv(x){let l=1;for(let i=1;i<PILOT.lv.length;i++)if(x>=PILOT.lv[i])l=i+1;return l;}
function kitOpen(id){return !id||PL.all||PL.lv>=(PILOT.kit[id]||1);}
function assistOn(id){const a=PILOT.assists.find(q=>q.id===id);return !!a&&(PL.all||PL.lv>=a.lv);}
/* what a level opens, in words */
function levelGives(l){const k=Object.keys(PILOT.kit).filter(id=>PILOT.kit[id]===l).map(id=>KIT_INFO[id].name.split(' ').slice(1).join(' '));
  const a=PILOT.assists.filter(q=>q.lv===l).map(q=>q.name);return k.concat(a);}
function addXP(n,why){if((G.mode!=='play'&&!(G.mode==='results'&&why==='mission'))||!(n>0))return;   /* the mission bonus comes as the results open */
  n=Math.round(n*DK.xp);   /* HARD: +25 % (06n_difficulty.js) */const sv=SAVE.get(),was=pilotLv(sv.xp||0);sv.xp=(sv.xp||0)+n;SAVE.put(sv);PL.run+=n;pilotRefresh();
  if(PL.lv>was){for(let l=was+1;l<=PL.lv;l++)PL.ups.push(l);const g=levelGives(PL.lv),kit=Object.keys(PILOT.kit).some(id=>PILOT.kit[id]===PL.lv);
    HUD.banner('PILOT LEVEL '+PL.lv);HUD.msg(g.length?g.join(' + ')+(kit?' UNLOCKED · FIT IT IN THE MOD BAY':' ONLINE'):'LEVEL UP',3.2);
    tone('triangle',520,1040,.35,.07);setTimeout(()=>tone('triangle',780,1560,.4,.07),160);applyAssists();}}
/* a machine destroyed: XP, and its card for the armory book */
function pilotKill(key,score){if(G.mode!=='play')return;const sv=SAVE.get();sv.beaten=sv.beaten||{};sv.beaten[key]=(+sv.beaten[key]||0)+1;SAVE.put(sv);addXP(score);}
function pilotRunStart(){PL.run=0;PL.ups=[];RUNSEEN=new Set();pilotRefresh();
  /* a level reached last run may have opened kit that the default loadout carries: fit it now */
  if(M&&M.W){const L=loadout();if(SLOTS.some(s=>(M.W.kit[s]||null)!==(L[s]||null)))refitKit(M);}}
/* the AI assists that work through numbers (the others are checked where they act) */
function applyAssists(){UP.lockK=assistOn('lock')?.75:1;UP.repairK=assistOn('repair')?1.5:1;UP.hoverK=assistOn('hover')?1.5:1;UP.dmgK=(UP.dmgK0||1)*(assistOn('ace')?1.1:1);}
/* the line under the title, and the results */
function pilotLine(){const l=PL.lv,nx=PILOT.lv[l],k=nx?(PL.xp-PILOT.lv[l-1])/(nx-PILOT.lv[l-1]):1;
  return '<b>PILOT LV '+l+'</b><span>'+(nx?(nx-PL.xp).toLocaleString('en-US')+' XP TO LV '+(l+1)+(levelGives(l+1).length?' · '+levelGives(l+1).join(' + '):''):'TOP LEVEL')+'</span><i><em style="width:'+(k*100).toFixed(1)+'%"></em></i>';}
function pilotRows(){const r=[['DIFFICULTY',DK.name],['XP',(PL.run>0?'+':'')+PL.run.toLocaleString('en-US')+' · PILOT LV '+PL.lv]];
  if(PL.ups.length)r.push(['UNLOCKED',PL.ups.map(l=>levelGives(l).join(' + ')||('LV '+l)).join(' · ')]);return r;}
function titlePilot(){const el=$('tpilot');if(el)el.innerHTML=pilotLine();}
pilotRefresh();
