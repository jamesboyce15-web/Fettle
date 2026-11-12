const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const T='/tmp/claude-0/-home-claude/778c13de-ddcf-58b9-aaaa-3ea0073d941f/scratchpad/t';
(async () => { const b = await chromium.launch();
 for (const L of ['en','pl','ur']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const css=require(T+'/common.js'); // reuse font css via route
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(T+'/fonts.css','utf8')+[400,700].map(w=>`@font-face{font-family:"Noto Nastaliq Urdu";font-weight:${w};src:url("file://${T}/node_modules/@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-${w}-normal.woff2")}`).join('') }));
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html') + '?lang=' + L); await p.waitForTimeout(300);
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { home: "flat", floor: 3, lift: "yes", outdoor: "none", tenure: "rent", adults: 2, heat: "gas", hob: "electric", cold: "fast", healthGate: "no", water: "few", food: "some", kit: ["torch"], fa: "no", budget: 5 }); H.push(cur); view = 0; cur = null; go('r'); render(); });
  await p.waitForTimeout(300);
  console.log(L, 'help card:', await p.isVisible('.helpcard'), await p.textContent('.helpcard h3'));
  await p.evaluate(() => document.querySelector('.helpcard').scrollIntoView({block:'center'})); await p.screenshot({ path: `${T}/share-${L}.png` });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.helpcard .btn.quiet')]);
  await dl.saveAs(`${T}/card-${L}.png`);
  // mum prompt starts a relative's check, and disappears afterwards
  await p.click('.helpcard .btn:not(.quiet)'); console.log(L, 'relative check started:', await p.evaluate(() => cur && cur.other === true));
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html') + '?ref=share&lang=' + L); await p.waitForTimeout(300);
  console.log(L, 'ref note:', await p.textContent('.refnote'), 'errs', errs);
  await p.close(); }
 await b.close(); })();
