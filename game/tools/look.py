"""look.py: open the game in a headless browser, start a map or a mission, run steps, take screenshots and measure.
Needs the local server:  cd <repo> && python3 -m http.server 8770
Settings (environment variables):
  MAP=field|woods|docks|foundry     sandbox map (endless waves)        or  MISSION=1..12 (that mission's map and look; story scenes skipped)
  SIZE=phone (915x412, touch) | laptop (1280x720)   or  W=.. H=..     QL=low|med|high (default med)
  HUD=0 hides the HUD for clean pictures      CALM=1 keeps machines from spawning (kills them as they appear)
  STEPS=file  steps separated by lines '//--':
     shot:/path.png        take a screenshot
     wait:2.5              let the game run that many seconds
     perf:                 print draw calls, triangles, KB uploaded per frame, ms per frame (10 frames)
     ev:<js expression>    run inside the game, where every game name is reachable (P, MAPDEF, LIFE, boom, part, cam, ...)
     <js>                  run in the page
Example step file:
  ev:(P.x=0,P.z=60,P.yaw=Math.PI,0)
  //--
  wait:2
  //--
  shot:/tmp/a.png
  //--
  ev:(boom(P.x-14,hgt(P.x-14,P.z-20)+1,P.z-20,1.2),0)
"""
import time, os, sys
from playwright.sync_api import sync_playwright
HOOK = """(()=>{const B={n:0};window.__bytes=B;window.__dc={n:0};for(const C of [WebGL2RenderingContext,WebGLRenderingContext]){const P=C.prototype,d=P.bufferData,s=P.bufferSubData;
  P.bufferData=function(t,a,u,...r){if(a&&a.byteLength)B.n+=a.byteLength;return d.call(this,t,a,u,...r);};
  P.bufferSubData=function(t,o,a,so,len){B.n+=len!=null?len*(a.BYTES_PER_ELEMENT||1):(a.byteLength-(so||0)*(a.BYTES_PER_ELEMENT||1));return s.apply(this,arguments);};
  for(const k of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const f=P[k];if(f)P[k]=function(){window.__dc.n++;return f.apply(this,arguments);};}}})();"""
SIZES = {'phone': (915, 412), 'laptop': (1280, 720)}
size = os.environ.get('SIZE', 'laptop')
W, H = SIZES.get(size, (1280, 720))
W, H = int(os.environ.get('W', W)), int(os.environ.get('H', H))
QL = os.environ.get('QL', 'med')
MIS = os.environ.get('MISSION')
MAP = os.environ.get('MAP', 'field')
BASE = os.environ.get('URL', 'http://localhost:8770/game/index.html')
q = ('?dev&nostory&mission=%s' % MIS) if MIS else ('?dev&map=%s' % MAP)
steps = open(os.environ['STEPS']).read().split('//--') if os.environ.get('STEPS') else ['wait:4', 'shot:/tmp/look.png', 'perf:']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}, has_touch=W < 1000 and size == 'phone', is_mobile=size == 'phone')
    logs = []
    pg.add_init_script("localStorage.setItem('hd-ironhowl4-quality','" + QL + "');localStorage.setItem('hd-ironhowl4-save',JSON.stringify({unlocked:12,xp:21000}))")
    pg.add_init_script(HOOK)
    pg.set_default_timeout(300000)
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('ERR ' + str(e)))
    pg.goto(BASE + q, timeout=300000)
    pg.wait_for_function("document.getElementById('load').style.display==='none'", timeout=300000)
    pg.evaluate("window.postMessage({src:'hyperdot-arcade',cmd:'start'},'*')")
    for _ in range(12):   # close the bay or the intel brief if one opens
        time.sleep(.6)
        pg.evaluate("const b=document.getElementById('baydone');if(b&&b.offsetParent)b.click();")
    if os.environ.get('CALM') == '1':
        pg.evaluate("__ih4.ev('(window.__calm=setInterval(()=>{for(const e of EN)if(!e.dead)hurtEnemy(e,1e9,e.x,e.y,e.z);},300),0)')")
    if os.environ.get('HUD') == '0':
        pg.add_style_tag(content="body>*:not(canvas){visibility:hidden!important}")
    for st in steps:
        st = st.strip()
        if not st:
            continue
        if st.startswith('shot:'):
            pg.screenshot(path=st[5:].strip()); print('shot', st[5:].strip()); continue
        if st.startswith('wait:'):
            time.sleep(float(st[5:])); continue
        if st.startswith('perf:'):
            r = pg.evaluate("""async()=>{const f=()=>new Promise(r=>requestAnimationFrame(()=>r()));for(let i=0;i<3;i++)await f();
              const b0=__bytes.n,d0=__dc.n,t0=performance.now();for(let i=0;i<10;i++)await f();
              const I=__ih3.info();return JSON.stringify({kb_per_frame:+((__bytes.n-b0)/10/1024).toFixed(1),draws:Math.round((__dc.n-d0)/10),tris:I.tris,ms:Math.round((performance.now()-t0)/10),particles:__ih3.PFX.list.length});}""")
            print('perf', r); continue
        if st.startswith('ev:'):
            r = pg.evaluate("s=>__ih4.ev(s)", st[3:].strip())
        else:
            r = pg.evaluate(st)
        print('->', str(r)[:900])
    for l in logs:
        print(l[:300])
    b.close()
