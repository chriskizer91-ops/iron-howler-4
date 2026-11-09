/* ===================== living places (session 7, built with Fable 5.2) =====================
   Each place adds its own life in its own file with
     lifeOn('field',{build(L){...}, tick(dt,t){...}, noise(x,z,k,kind){...}})      ('*' = every map)
   build(L) runs once, after the map, its plants and the weather are ready (L = the look in use: L.night, L.rain, L.storm, L.fogFar...)
   tick(dt,t) runs every frame, on the title screen too (t = seconds since build)
   noise(x,z,k,kind) is told about the fight so the place can react: kind 'shot' (the Wraith's gun), 'eshot' (a machine fires),
     'boom' (an explosion, k = its size), 'step' (a footfall). k is roughly 0..2.
   A part that throws an error is switched off on its own; the rest of the game keeps going. */
const LIFE={on:{},act:[],t:0,ready:false,L:null};
function lifeOn(map,o){(LIFE.on[map]=LIFE.on[map]||[]).push(o);}
function lifeOff(o,e){console.warn('life part switched off:',e);LIFE.act=LIFE.act.filter(a=>a!==o);}
function lifeBuild(L){LIFE.L=L;LIFE.act=(LIFE.on['*']||[]).concat(LIFE.on[MAPID]||[]);
  for(const o of LIFE.act.slice())if(o.build)try{o.build(L);}catch(e){lifeOff(o,e);}LIFE.ready=true;}
function lifeTick(dt){if(!LIFE.ready)return;LIFE.t+=dt;for(const o of LIFE.act)if(o.tick)try{o.tick(dt,LIFE.t);}catch(e){lifeOff(o,e);}}
function lifeNoise(x,z,k,kind){if(!LIFE.ready)return;for(const o of LIFE.act)if(o.noise)try{o.noise(x,z,k,kind);}catch(e){lifeOff(o,e);}}
