// Refresh dates: ticking something off sets when to check it again; soon-due items show at the top of the plan.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const site = require('./proto-site.cjs'); const b = await chromium.launch(); const errs = [];
  try {
    const P = await b.newPage({ viewport: { width: 390, height: 844 } }); P.on('pageerror', e => errs.push(e.message));
    await P.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await P.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await P.goto('file://' + path.join(site, 'index.html')); await P.waitForTimeout(300);
    await P.evaluate(() => { start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'none', food: 'no', kit: [], fa: 'yes', budget: 20, mealPick: ['cereal', 'soup'] }); qi = list().length - 1; drawQ(); next(); });
    const r = await P.evaluate(() => { tick('water', true); tick('power', true); tick('food', true); return H[view].refresh; });
    const mon = d => Math.round((new Date(d) - Date.now()) / (30.4 * 864e5));
    ok(r.water && mon(r.water.due) === 12 && r.water.t === 'Drinking water', 'water: refresh in 12 months');
    ok(r.power && mon(r.power.due) === 3, 'power bank: recharge in 3 months');
    ok(r.food && mon(r.food.due) === 6, 'food: 6 months, because their menu has long-life milk');
    await P.evaluate(() => tick('power', false));
    ok(!(await P.evaluate(() => H[view].refresh.power)), 'unticking removes it');
    // pretend the water was bought 11.5 months ago
    await P.evaluate(() => { const h = H[view]; h.refresh.water.due = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10); setRTab('todo'); });
    ok(/Time to refresh/.test(await P.textContent('#v-r')) && /Check the dates on the bottles/.test(await P.textContent('.refc')), 'due soon: shown at the top of the plan, with what to do');
    await P.click('.refc >> text=Done'); await P.waitForTimeout(100);
    ok(!(await P.isVisible('.refc')) && mon(await P.evaluate(() => H[view].refresh.water.due)) === 12, 'marking it done sets the next date, a year on');
    await P.evaluate(() => setRTab('done'));
    ok(/When to refresh/.test(await P.textContent('#v-r')), 'the Done tab lists when each thing needs refreshing');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
