// Planning for Mum or a relative: family circle, 3-day rota, carer cover, fridge sheet, and the family check-in on a warning.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => { start(true); });
  ok(await p.evaluate(() => { Object.assign(cur, { over70: 1, adults: 0 }); return list().some(q => q.id === 'carers'); }), 'a relative\'s check asks whether carers visit');
  await p.evaluate(() => { Object.assign(cur, { name: 'Mum', pc: 'LA1', area: 'Lancaster', home: 'bungalow', outdoor: 'garden', tenure: 'own', adults: 0, over70: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'yes', health: ['meds'], carers: 'daily', water: 'none', food: 'some', kit: [], fa: 'no', budget: 0 }); qi = list().length - 1; drawQ(); next(); });
  await p.waitForTimeout(200);
  ok(await p.isVisible('#famcard') && /Who will look after them for 3 days/.test(await p.textContent('#famcard')), 'relative\'s plan has a family circle');
  ok(await p.evaluate(() => hasHealth(H[view]) && regNeeds(H[view]).includes('Relies on carer visits')), 'carer visits count as a care need and show on the emergency list');
  // add two people
  const add = async (name, tel, mins, roles) => { await p.click('#famcard >> text=/Add (the first person|someone else)/'); await p.fill('#fm-name', name); await p.fill('#fm-tel', tel); await p.selectOption('#fm-mins', String(mins)); for (const r of roles) await p.check(`.fm-r input[value=${r}]`); await p.click('#famcard form button[type=submit]'); await p.waitForTimeout(80); };
  await p.click('#famcard >> text=Add the first person'); await p.click('#famcard form button[type=submit]'); await p.waitForTimeout(50);
  ok(/Add their name/.test(await p.textContent('#fm-err')), 'needs a name');
  await p.click('#famcard >> text=Cancel');
  await add('Sarah', '07700 900111', 45, ['call', 'supplies']);
  ok(/No one has a key/.test(await p.textContent('#famcard .famgaps')), 'points out that no one has a key');
  await add('Tom', '07700 900222', 5, ['call', 'visit']);
  ok(!(await p.isVisible('#famcard .famgaps')) || !/No one has a key/.test(await p.textContent('#famcard .famgaps')), 'gap closes once someone nearby has a key');
  const rota = await p.evaluate(() => buildRota(H[view]));
  ok(rota[0].am === 'Sarah' && rota[0].pm === 'Tom' && rota[1].am === 'Tom' && rota[0].visit === 'Tom', 'builds a 3-day rota that shares the calls');
  ok(await p.locator('#famcard .rota tr').count() === 4, 'rota shown as a table');
  // carer cover
  await p.click('#famcard >> text=Plan carer cover'); await p.fill('#ca-ag', 'Lune Care'); await p.check('#ca-meds'); await p.selectOption('#cb-meds', 'Tom'); await p.check('#ca-meals');
  await p.click('#famcard form button[type=submit]'); await p.waitForTimeout(80);
  ok(await p.evaluate(() => H[view].care.tasks.meds === 'Tom' && H[view].care.tasks.meals === '') && /Some of the carers' jobs have no one to cover them/.test(await p.textContent('#famcard')), 'carer cover saved, uncovered jobs flagged');
  // send the rota, print the fridge sheet
  const shared = await p.evaluate(async () => { let t = ''; Object.defineProperty(navigator, 'share', { value: d => { t = d.text; return Promise.resolve(); }, configurable: true }); famShare(view); await new Promise(r => setTimeout(r, 50)); return t; });
  ok(/Day 1: Morning call Sarah, Evening call Tom, Visit Tom/.test(shared) && /Medicines Tom/.test(shared), 'rota can be sent to the family group');
  const sheet = await p.evaluate(() => { let html = ''; window.open = () => ({ document: { write: h => html += h, close() {} } }); fridgeSheet(view); return html; });
  ok(/If the power, water or roads go off/.test(sheet) && /Sarah/.test(sheet) && /07700 900222/.test(sheet) && /0345 988 1188/.test(sheet) && /font-size:20px/.test(sheet), 'large-print fridge sheet with the rota and numbers');
  // a warning near Mum
  await p.fill('#f-subj', '01524 000000'); await p.dispatchEvent('#f-subj', 'change');
  await p.evaluate(() => { H[view].flood = { now: [{ sev: 2, where: 'River Lune' }], places: [], rivers: [] }; render(); });
  const card = (await p.textContent('#checkin')).replace(/\s+/g, ' ');
  ok(/Has anyone spoken to them\?/.test(card) && /Yes, they're fine/.test(card), 'family check-in asks if anyone has spoken to them');
  ok(/The family plan for now/.test(card) && /Calls them first: ?Sarah/.test(card) && /they need help: ?Tom/.test(card) && /Medicines: Tom/.test(card), 'shows who calls, who visits and who covers the carers');
  ok(await p.getAttribute('#checkin a[href^="tel:"]', 'href') === 'tel:01524000000', 'one tap to call them');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await p.screenshot({ path: require('os').tmpdir() + '/family.png', fullPage: true });
} catch (e) { console.log('FAIL', e); fails++; } finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } } })();
