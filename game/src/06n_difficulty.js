/* ===================== Ironhowl 4: EASY / MEDIUM / HARD (session 5) =====================
   Chosen on the title screen (three small buttons under the pilot line), saved in hd-ironhowl4-save as diff, and used by
   every mode. It multiplies on top of the mission's own ramp (06d_missions.js DIFF) and Endless's:
     EASY    machines hit for 55 %, have 75 % of their health, attack 20 % less often.
     MEDIUM  as designed.
     HARD    machines hit for 140 %, have 130 % of their health, attack 20 % more often; XP +25 %. */
const DIFFS={easy:{name:'EASY',dmg:.55,hp:.75,rate:.8,xp:1},medium:{name:'MEDIUM',dmg:1,hp:1,rate:1,xp:1},hard:{name:'HARD',dmg:1.4,hp:1.3,rate:1.2,xp:1.25}};
let DK=DIFFS.medium;
function diffLoad(){const d=SAVE.get().diff;DK=DIFFS[d]||DIFFS.medium;}
function diffSet(id){const sv=SAVE.get();sv.diff=id;SAVE.put(sv);diffLoad();diffUI();sClick();}
function diffUI(){const box=$('tdiff');if(!box)return;const cur=SAVE.get().diff||'medium';
  box.innerHTML=Object.keys(DIFFS).map(k=>'<button data-d="'+k+'"'+(k===cur?' class="sel"':'')+'>'+DIFFS[k].name+'</button>').join('');
  box.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();diffSet(b.dataset.d);});}
diffLoad();
