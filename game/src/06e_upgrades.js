/* ===================== hangar: scrap from wrecks buys upgrades (6 tracks, 5 levels each) =====================
   Scrap is earned in missions (kills, objectives, a bonus for finishing) and kept in hd-ironhowl3-save.scrap.
   Upgrades are applied when a run starts (applyUpgrades) and work in missions and in the sandbox. */
const UPG=[
  {id:'gun',name:'GUN',fx:['START AT TIER II','START AT TIER III','START AT TIER IV','+15% DAMAGE','+30% DAMAGE']},
  {id:'cool',name:'COOLING',fx:['-12% HEAT PER SHOT','-24% HEAT, FASTER COOLING','-36% HEAT, VENT 6 S','-48% HEAT, FASTER COOLING','-60% HEAT, VENT 4 S']},
  {id:'shield',name:'SHIELD',fx:['SHIELD 80','SHIELD 100, FASTER RECHARGE','SHIELD 120','SHIELD 140, RECHARGE AFTER 2 S','SHIELD 160']},
  {id:'msl',name:'MISSILES',fx:['SALVO OF 3, +4 AMMO','SALVO OF 4, +8 AMMO','SALVO OF 5, +12 AMMO','SALVO OF 6, +16 AMMO','SALVO OF 8, +20 AMMO']},
  {id:'jets',name:'JETS',fx:['3 FUEL CELLS','FASTER REFILL','STOMP LANDING (HURTS MACHINES BELOW)','4 FUEL CELLS','SALVO RECHARGES IN 8 S']},
  {id:'hull',name:'HULL',fx:['HULL 120','HULL 140, REPAIRS +45','HULL 160','HULL 180, REPAIRS +55','HULL 200']}];
const UPG_COST=[150,300,500,800,1200];
function upgLv(id){const u=(SAVE.get().upg)||{};return Math.min(5,u[id]||0);}
function scrap(){return SAVE.get().scrap||0;}
function addScrap(n){if(!MISSION)return;MS.scrap=(MS.scrap||0)+n*(MISSION.endless?.5:1);}
function bankScrap(){if(!MISSION||!MS.scrap)return 0;const sv=SAVE.get();sv.scrap=(sv.scrap||0)+MS.scrap;SAVE.put(sv);const n=MS.scrap;MS.scrap=0;return n;}
function buyUpg(id){const lv=upgLv(id);if(lv>=5)return false;const c=UPG_COST[lv],sv=SAVE.get();if((sv.scrap||0)<c)return false;sv.scrap-=c;sv.upg=sv.upg||{};sv.upg[id]=lv+1;SAVE.put(sv);return true;}
const UP={dmgK:1,stomp:false,repair:35};
function applyUpgrades(){
  const g=upgLv('gun'),c=upgLv('cool'),s=upgLv('shield'),m=upgLv('msl'),j=upgLv('jets'),h=upgLv('hull');
  GUN.base=1+Math.min(3,g);UP.dmgK=1+Math.max(0,g-3)*.15;
  HEAT.shot=2.3*(1-.12*c);HEAT.cool=30*(1+[0,0,.15,.15,.3,.3][c]);GUN.ventCool=[8,8,8,6,6,4][c];
  P.shieldMax=[60,80,100,120,140,160][s];P.shield=P.shieldMax;P.regenDelay=s>=4?2:3;P.regenRate=s>=2?30:22;
  MSL.salvo=[2,3,4,5,6,8][m];MSL.max=24+[0,4,8,12,16,20][m];MSL.ammo=12+[0,4,8,12,16,20][m];
  P.cells=j>=4?4:j>=1?3:2;P.fuel=P.cells;JET.refill=j>=2?2.4:3.2;UP.stomp=j>=3;SALVO.cool=j>=5?8:12;
  P.hullMax=[100,120,140,160,180,200][h];P.hull=P.hullMax;UP.repair=h>=4?55:h>=2?45:35;
  GUN.tier=GUN.base;
  if(!hasKit('mpod')){MSL.ammo=0;MSL.max=0;}   /* Ironhowl 4: missiles come from the MP-9 pod */
}
function hangar(){
  const box=$('hangar');
  const draw=()=>{$('hscrap').textContent='SCRAP '+scrap().toLocaleString('en-US');
    $('hrows').innerHTML=UPG.map(u=>{const lv=upgLv(u.id),max=lv>=5,c=UPG_COST[lv]||0,can=!max&&scrap()>=c;
      return '<div class="hrow"><div class="hn"><b>'+u.name+'</b><span class="pips">'+'●'.repeat(lv)+'○'.repeat(5-lv)+'</span><span class="fx">'+(max?'MAXED':'NEXT: '+u.fx[lv])+'</span></div>'+
        '<button data-id="'+u.id+'"'+(can?'':' disabled')+'>'+(max?'DONE':c+' SCRAP')+'</button></div>';}).join('');
    box.querySelectorAll('.hrow button').forEach(b=>b.onclick=e=>{e.stopPropagation();if(buyUpg(b.dataset.id)){sPickup();draw();}});};
  draw();box.style.display='flex';
}
