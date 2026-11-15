/* look.js: open the game in a headless browser straight from the repo folder (no web server and no Python needed),
   start a place or a mission, take pictures and measure. The files are handed to the page from the disk.
   usage:  node game/tools/look.js [map=field|woods|docks|foundry] [mission=1..6] [size=phone|laptop|portrait] [ql=low|med|high|auto]
                                   [calm=1] [hud=0] [q=&nosharp] [js=/path/other-ironhowl4.js] [ev="(P.x=0,P.z=40,P.yaw=.6,CAMS.ready=false,0)"]
                                   [wait=2.5] [shot=/path.png] [perf=1]
   ev= runs inside the game (every game name is reachable); js= swaps in another build of the game code, to compare before and after.
   perf=1 prints draw calls, triangles, KB sent to the graphics card per frame, the game step in ms, textures held.
   The browser draws in software here, so its frame times are far slower than a phone's: compare counts, not milliseconds. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '..', '..');
const A = Object.fromEntries(process.argv.slice(2).map(s => { const i = s.indexOf('='); return i < 0 ? [s, '1'] : [s.slice(0, i), s.slice(i + 1)]; }));
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const HOOK = `(()=>{const B={n:0};window.__bytes=B;for(const C of [WebGL2RenderingContext,WebGLRenderingContext]){const P=C.prototype,d=P.bufferData,s=P.bufferSubData;
  P.bufferData=function(t,a,u,...r){if(a&&a.byteLength)B.n+=a.byteLength;return d.call(this,t,a,u,...r);};
  P.bufferSubData=function(t,o,a,so,len){B.n+=len!=null?len*(a.BYTES_PER_ELEMENT||1):(a.byteLength-(so||0)*(a.BYTES_PER_ELEMENT||1));return s.apply(this,arguments);};}})();`;
const SIZES = { phone: [915, 412], laptop: [1280, 720], portrait: [412, 915] };
(async () => {
  const size = A.size || 'laptop', [W, H] = SIZES[size] || SIZES.laptop, touch = size !== 'laptop';
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await (await b.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch })).newPage(), logs = [];
  await pg.route('http://ih4.test/**', route => {
    const u = new URL(route.request().url()); let f = path.join(REPO, decodeURIComponent(u.pathname)); if (A.js && /ironhowl4\.js$/.test(u.pathname)) f = A.js;
    fs.readFile(f, (e, d) => e ? route.fulfill({ status: 404, body: 'not found' }) : route.fulfill({ status: 200, body: d, contentType: MIME[path.extname(f)] || 'application/octet-stream' }));
  });
  await pg.addInitScript(`localStorage.setItem('hd-ironhowl4-quality','${A.ql || 'med'}');localStorage.setItem('hd-ironhowl4-save',JSON.stringify({unlocked:12,xp:21000}))`);
  await pg.addInitScript(HOOK); pg.setDefaultTimeout(600000);
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  pg.on('pageerror', e => logs.push('ERR ' + String(e).slice(0, 400)));
  await pg.goto('http://ih4.test/game/index.html' + (A.mission ? '?dev&nostory&mission=' + A.mission : '?dev&map=' + (A.map || 'field')) + (A.q || ''));
  await pg.waitForFunction("document.getElementById('load').style.display==='none'");
  await pg.evaluate("window.postMessage({src:'hyperdot-arcade',cmd:'start'},'*')");
  for (let i = 0; i < 8; i++) { await pg.waitForTimeout(400); await pg.evaluate("const b=document.getElementById('baydone');if(b&&b.offsetParent)b.click();"); }   // close the intel brief
  if (A.calm) await pg.evaluate("__ih4.ev('(window.__calm=setInterval(()=>{for(const e of EN)if(!e.dead)hurtEnemy(e,1e9,e.x,e.y,e.z);},300),0)')");
  if (A.hud === '0') await pg.addStyleTag({ content: 'body>*:not(canvas){visibility:hidden!important}' });
  if (A.ev) console.log('->', String(await pg.evaluate(s => __ih4.ev(s), A.ev)).slice(0, 900));
  await pg.waitForTimeout(1000 * (+A.wait || 2.5));
  if (A.shot) { await pg.screenshot({ path: A.shot }); console.log('shot', A.shot); }
  if (A.perf) console.log('perf', await pg.evaluate(`(async()=>{const f=()=>new Promise(r=>requestAnimationFrame(()=>r()));for(let i=0;i<3;i++)await f();
    const b0=__bytes.n;for(let i=0;i<10;i++)await f();const kb=(__bytes.n-b0)/10/1024,I=__ih3.info(),t1=performance.now();__ih3.ff(2);
    return JSON.stringify({draws:I.calls,tris:I.tris,kb_per_frame:+kb.toFixed(1),step_ms:+((performance.now()-t1)/120).toFixed(2),textures:I.tex,quality:I.ql});})()`));
  for (const l of logs) console.log(l);
  await b.close();
})();
