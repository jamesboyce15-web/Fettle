const { chromium } = require('playwright');const path=require('path');
(async () => { const b = await chromium.launch(); const out=process.argv[2]||require("os").tmpdir(); let fail=0; const ok=(c,m)=>{console.log(c?'ok ':'FAIL',m); if(!c)fail++;};
 const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+path.resolve('public/index.html')); await p.waitForTimeout(300);
 // consumer: finish core check
 await p.evaluate(()=>{start(false);Object.assign(cur,{home:"house",adults:2,water:"none",food:"no",kit:[],fa:"no",budget:0,heat:"gas",hob:"gas"});qi=list().length-1;drawQ();next();});
 await p.waitForTimeout(300);
 ok(await p.evaluate(()=>H[0].scores.length===1&&H[0].scores[0].m.water3===0&&H[0].scores[0].m.co===0),'first check saved with measures');
 ok(await p.isVisible('#res'),'plan shown before sign-up');
 await p.click('text=Save my plan'); await p.waitForTimeout(200);
 // sign up with reminders
 await p.evaluate(()=>{document.getElementById('a-name').value='Ann';document.getElementById('a-email').value='ann@x.test';document.getElementById('a-pw').value='password1';document.getElementById('a-remind').checked=true;});
 await p.click('#authbox button[type=submit]'); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>user&&user.remind===true),'reminder consent saved');
 // pretend 31 days passed
 await p.evaluate(()=>{H[0].scores[0].d=new Date(Date.now()-31*864e5).toISOString();homeView();});
 ok(await p.isVisible('text=Your 30-day check is due'),'30-day card shows');
 await p.screenshot({path:out+'/due-card.png'});
 await p.click('text=Start my check'); await p.waitForTimeout(200);
 ok(await p.evaluate(()=>tier==='recheck'&&list().every(q=>q.type==='scen'||q.sec==='What you have'||q.id==='psr')&&list()[0].type==='scen'),'recheck asks the scenarios, then what-you-have');
 await p.evaluate(()=>{cur.water="all";cur.kit=["torch","radio","cash"];qi=list().length-1;drawQ();});
 ok((await p.textContent('#q-next')).includes('Save my check'),'button says save');
 await p.click('#q-next'); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>H[0].scores.length===2&&H[0].scores[1].m.water3===1),'second snapshot saved');
 ok((await p.textContent('#res')).includes('Since your first check'),'progress line shows');
 await p.screenshot({path:out+'/progress.png'});
 await p.evaluate(()=>homeView()); ok(!(await p.isVisible('text=Your 30-day check is due')),'card gone after check');
 await p.evaluate(()=>{H[0].scores[0].d=new Date(Date.now()-91*864e5).toISOString();homeView();});
 ok(await p.isVisible('text=Your 90-day check is due'),'90-day due');
 // count me
 await p.evaluate(()=>{const c=[...document.querySelectorAll('#homebox input[type=checkbox]')].find(x=>x.closest('label')&&/Help your council/.test(x.closest('label').textContent));c.click();});
 ok(await p.evaluate(()=>H[0].countMe===true),'count-me consent');
 // pro report
 const q=await ctx.newPage(); q.on('pageerror',e=>errs.push(e.message));
 await q.goto('file://'+path.resolve('public/index.html')); await q.waitForTimeout(300);
 await q.evaluate(()=>{proSample();});
 await q.waitForTimeout(300);
 await q.evaluate(()=>reportView()); await q.waitForTimeout(300);
 const txt=await q.textContent('#homebox'); ok(/Before and after/.test(txt)&&/UK in 2026/.test(txt),'report has before/after');
 const sec=await q.$('section.section'); await q.setViewportSize({width:900,height:900}); await (await q.$('#homebox')).screenshot({path:out+'/report.png'});
 const [pop]=await Promise.all([ctx.waitForEvent('page'),q.evaluate(()=>{window.print=()=>{};impactReport();})]);
 await pop.waitForLoadState(); await pop.evaluate(()=>{}); await pop.setViewportSize({width:794,height:1123});
 await pop.pdf({path:out+'/impact-report.pdf',format:'A4',printBackground:true}).catch(()=>{});
 await pop.screenshot({path:out+'/impact-report.png',fullPage:true});
 const pages=await pop.evaluate(()=>document.body.scrollHeight); console.log('report height px',pages);
 console.log('errs',errs); await b.close(); console.log(fail?'FAILURES '+fail:'ALL OK');})();
