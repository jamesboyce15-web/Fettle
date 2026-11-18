// The meal picker: what you'd normally eat becomes a 3-day no-power menu, a shopping list with diet swaps, and recipes in the book.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const site = require('./proto-site.cjs'); const b = await chromium.launch(); const errs = [];
  try {
    const P = await b.newPage({ viewport: { width: 390, height: 844 } }); P.on('pageerror', e => errs.push(e.message));
    await P.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await P.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await P.goto('file://' + path.join(site, 'index.html')); await P.waitForTimeout(300);
    await P.evaluate(() => { start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, kids: 1, heat: 'gas', hob: 'electric', cold: 'slow', healthGate: 'no', water: 'all', food: 'no', kit: [], fa: 'no', budget: 20 }); qi = list().findIndex(q => q.id === 'mealPick'); drawQ(); });
    ok(/Which of these do you normally eat/.test(await P.textContent('#v-q')) && /Becomes: Overnight oats/.test(await P.textContent('#v-q')), 'the check asks which meals you normally eat, and says what each becomes');
    await P.click('text=Porridge'); await P.click('text=Curry, dal or chana'); await P.click('text=Soup');
    ok(await P.evaluate(() => cur.mealPick.join()) === 'porridge,curry,soup', 'picks are saved');
    await P.evaluate(() => { qi = list().length - 1; drawQ(); next(); }); await P.waitForTimeout(150);
    const m = await P.evaluate(() => menu(H[view]));
    ok(m.every(d => d.b === 'porridge') && m.some(d => d.l === 'curry' || d.t === 'curry') && m.some(d => d.l === 'soup' || d.t === 'soup'), 'the menu uses the picks: porridge each morning, curry and soup for lunch and dinner');
    const food = await P.evaluate(() => needs(H[view]).find(x => x.id === 'food'));
    const L = food.list.map(i => i[0]).join(' | ');
    ok(/tins of dal or chana masala/.test(L) && /ready-to-eat rice pouches/.test(L) && /porridge oats/.test(L) && /long-life \(UHT\) milk/.test(L), 'the shopping list matches the menu: ' + L);
    ok(food.cost > 5 && food.cost < 80, 'with a realistic cost: £' + food.cost);
    await P.evaluate(() => { setRTab('shop'); }); await P.click('#sh_food summary'); await P.waitForTimeout(100);
    ok(/Your 3-day menu/.test(await P.textContent('#sh_food')) && /Chana or dal with rice/.test(await P.textContent('#sh_food')), 'the shopping row shows the menu');
    await P.click('#sh_food >> text=Change the meals'); await P.waitForTimeout(100);
    await P.uncheck('#mealedit input[value=curry]'); await P.check('#mealedit input[value=pasta]'); await P.click('text=Save my menu'); await P.waitForTimeout(100);
    ok(await P.evaluate(() => H[view].mealPick.includes('pasta') && !H[view].mealPick.includes('curry')) && !/dal or chana/.test(await P.evaluate(() => needs(H[view]).find(x => x.id === 'food').list.map(i => i[0]).join())), 'changing the meals updates the menu and list');
    // diet swaps
    const sw = await P.evaluate(() => { const h = H[view]; h.diets = ['gf', 'dairy', 'veg']; h.mealPick = ['porridge', 'pasta', 'rice', 'tuna']; return needs(h).find(x => x.id === 'food').list.map(i => i[0]).join(' | '); });
    ok(/gluten-free oats/.test(sw) && /oat or soya milk/.test(sw) && !/tuna|chicken|ravioli/.test(sw), 'diet swaps: gluten-free, dairy-free, vegetarian: ' + sw);
    await P.evaluate(() => { const h = H[view]; h.diets = []; h.paid = true; return openBook(); }); await P.waitForTimeout(800);
    const bk = await P.textContent('#shelf');
    ok(/Your 3-day menu/.test(bk) && /Overnight oats/.test(bk) && /Tinned ravioli or spaghetti/.test(bk), 'the book has the menu and its recipes');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
