const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const base='file://'+require('path').join(require('./proto-site.cjs'))+'/';const out=process.argv[2]||require("os").tmpdir();let fail=0;
const ctx=await b.newContext({viewport:{width:390,height:844}});
const pages=['guides/index.html',...require('fs').readdirSync('public/guides').filter(f=>f!=='index.html').map(f=>'guides/'+f)];
for(const u of pages){const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_/.test(m.text()))errs.push(m.text())});
 await p.goto(base+u);const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 const bad=await p.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^https?:|^\.\.\/|^#|^\.\/$/.test(h)));
 const fs=require('fs');const missing=bad.filter(h=>!fs.existsSync('public/guides/'+h.split('#')[0]));
 if(ov>0||errs.length||missing.length){fail++;console.log('FAIL',u,ov,errs,missing)}
 if(['guides/index.html','guides/high-rise-flats.html','guides/no-cook-meals.html'].includes(u))await p.screenshot({path:out+'/'+path.basename(u,'.html')+'.png',fullPage:true});
 await p.close();}
// hub filter
let p=await ctx.newPage();await p.goto(base+'guides/index.html');await p.click('.chips button[data-c="food"]');
const vis=await p.$$eval('#cards li',l=>l.filter(x=>!x.hidden).length);console.log('food visible',vis);if(vis!==2)fail++;
// landing + deep link
p=await ctx.newPage();await p.goto(base+'index.html');const n=await p.$$eval('#guides .guidegrid a',a=>a.length);console.log('landing guide links',n);
const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);console.log('landing overflow',ov);if(ov>0)fail++;
await p.screenshot({path:out+'/header.png'});await (await p.$('#guides')).screenshot({path:out+'/landing-guides.png'});
p=await ctx.newPage();await p.goto(base+'index.html#check');await p.waitForTimeout(800);
const q=await p.evaluate(()=>!document.getElementById('v-q')?.classList.contains('hide')&&location.hash==='');console.log('deep link opens check',q);if(!q)fail++;
await b.close();console.log(fail?'FAILURES '+fail:'ALL OK');})();
