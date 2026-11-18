// The shop: what the plan says is missing comes first, links carry an affiliate tag only when one is set, and the list can be copied.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const site = require('./proto-site.cjs'); const b = await chromium.launch(); const errs = [];
  try {
    const P = await b.newPage({ viewport: { width: 390, height: 844 } }); P.on('pageerror', e => errs.push(e.message));
    await P.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await P.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await P.goto('file://' + path.join(site, 'index.html')); await P.waitForTimeout(300);
    await P.click('header.top a.hdrlink:has-text("Shop")'); await P.waitForTimeout(100);
    ok(/Everything for 3 days/.test(await P.textContent('#shopbox')) && await P.isVisible('#shopbox >> text=Check my household'), 'without a plan, the shop asks you to do the check first');
    ok(!(await P.$$eval('#shopbox a.plink', A => A.map(a => a.href))).some(h => /tag=/.test(h)) && !/paid link/.test(await P.textContent('#shopbox')) && /doesn't earn anything/.test(await P.textContent('#shopbox')), 'with no affiliate ID set: no tag, no "paid link", and it says so');
    await P.evaluate(() => { start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'all', food: 'no', kit: ['torch', 'opener'], fa: 'yes', budget: 20, mealPick: ['soup'] }); qi = list().length - 1; drawQ(); next(); });
    await P.evaluate(() => setRTab('shop')); await P.click('#v-r button:has-text("Shop for what\'s missing")'); await P.waitForTimeout(100);
    const first = await P.$$eval('#shopbox section.shopc h2', H => H.map(h => h.textContent));
    ok(first[0] !== 'Water' && /Food|radio|warm|First aid/i.test(first[0]), 'missing things come first (water is covered, so not first): ' + first.slice(0, 3).join(', '));
    ok(/You have this/.test(await P.textContent('#shop_water')) && /Missing from your plan/.test(await P.textContent('#shop_food')), 'each section says whether the plan needs it');
    ok(/tins of soup/.test(await P.textContent('#shop_food')), 'the food section lists their own menu');
    await P.click('#shop_food button:has-text("Food you can eat cold")'); await P.waitForTimeout(100);
    ok(await P.evaluate(() => H[view].bought.food === true) && /You have this/.test(await P.textContent('#shop_food')), 'ticking it off in the shop ticks the plan');
    const txt = await P.evaluate(() => shopText(H[view]));
    ok(/Shopping list for/.test(txt) && /Battery or wind-up radio/.test(txt) && !/Food you can eat cold/.test(txt), 'the copied list has what\'s left to buy');
    // with a tag
    await P.evaluate(() => { window.FETTLE_CONFIG = { amazonTag: 'fettle-21' }; shopDraw(); });
    const hrefs = await P.$$eval('#shopbox a.plink', A => A.map(a => a.href));
    ok(hrefs.length && hrefs.filter(h => /amazon\.co\.uk/.test(h)).every(h => /tag=fettle-21/.test(h)) && hrefs.some(h => /sja\.org/.test(h) && !/tag=/.test(h)) && /paid link/.test(await P.textContent('#shopbox')), 'with an affiliate ID: every Amazon link is tagged and marked');
    await P.screenshot({ path: process.env.SHOT || '/tmp/shop.png', fullPage: false });
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
