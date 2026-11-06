const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.goto('file://' + require('path').resolve(__dirname, '../../public/index.html')); await p.waitForTimeout(300);
  console.log(await p.evaluate(() => [LIVE, document.body.classList.contains('live'), !!document.querySelector('[data-live=hide]').offsetParent]), 'expect false,false,true');
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { home: "house", adults: 1, water: "none", food: "no", kit: [], budget: 0 }); H.push(cur); view = 0; cur = null; go('r'); render(); extra(); qi = list().length - 1; drawQ(); next(); });
  await p.waitForTimeout(1500); console.log('book opens in prototype:', await p.isVisible('#v-book'), 'errs', errs); await b.close(); })();
