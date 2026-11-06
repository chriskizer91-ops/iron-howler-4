/* ===================== basics =====================
   World: three.js axes. x east, y up, z south. A yaw of 0 faces north (-z);
   forward(yaw) = (-sin yaw, 0, -cos yaw), right(yaw) = (cos yaw, 0, -sin yaw). Object3D.rotation.y = yaw. */
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const damp=(rate,dt)=>1-Math.exp(-rate*dt);
const angD=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const Q=new URLSearchParams(location.search);
const DEV=Q.has('dev');
const KP='hd-ironhowl4-';
const store={get(k,d){try{const v=localStorage.getItem(KP+k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(KP+k,String(v));}catch(e){}}};
const touchy=Q.has('touch')||matchMedia('(hover: none)').matches;
const EMBED=Q.get('embed')==='1';
/* arcade bridge. The 3D Hyperdot Arcade loads this page in an iframe with ?embed=1:
   game -> arcade {src:'hyperdot',id,type:'ready'|'score'|'over'|'exit',...}
   arcade -> game {src:'hyperdot-arcade',cmd:'start'|'pause'|'resume'|'attract'|'mute'|'unmute'} */
const ARC={id:'ironhowl4',title:'IRONHOWL 4',muted:false,live:false,last:0,sent:-1,
  post(type,data){if(window.parent===window)return;try{window.parent.postMessage(Object.assign({src:'hyperdot',type,id:this.id},data||{}),'*');}catch(e){}},
  begin(){this.live=true;this.sent=-1;},
  score(s){if(!this.live)return;const t=performance.now();if(s!==this.sent&&t-this.last>250){this.last=t;this.sent=s;this.post('score',{score:s});}},
  over(score,tickets){if(!this.live)return;this.live=false;this.post('over',{score,tickets:Math.max(0,Math.round(tickets||0))});},
  exit(){this.post('exit');}
};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
/* smooth value noise for terrain */
function hash2(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,o){let s=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){s+=vnoise(x*f,y*f)*a;n+=a;a*=.5;f*=2.03;}return s/n;}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
