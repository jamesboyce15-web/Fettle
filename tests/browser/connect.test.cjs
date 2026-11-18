// Fettle Connect: up to 5 linked homes, family dashboard, emergency mode, getting ready again, the connected book, and the price question.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  const land = await p.textContent('#connect');
  ok(/One plan for the whole family/.test(land) && /£3 a month for up to 5 homes/.test(land) && /Free while we test it/.test(land), 'landing explains Fettle Connect and its price');
  await p.click('#conn-yes'); ok(/Start with your own home/.test(await p.textContent('#conn-thanks')), 'landing interest button says thanks');
  ok(/digital book are free, and they'll stay free/.test(await p.textContent('.lfaq')), 'FAQ: the core stays free');
  await p.evaluate(() => {
    start(false); Object.assign(cur, { pc: 'LA1', area: 'Lancaster', home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', water: 'half', food: 'yes', kit: ['torch'], budget: 20 }); qi = list().length - 1; drawQ(); next();
    H[0].bought.water = true; H[0].bought.radio = true;
    start(true); Object.assign(cur, { name: 'Mum', relHow: 'phone', relOK: 'yes', pc: 'LA1', area: 'Lancaster', home: 'bungalow', outdoor: 'garden', tenure: 'own', adults: 0, over70: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'yes', health: ['meds', 'fridge'], carers: 'daily', water: 'none', food: 'some', kit: [], fa: 'no', budget: 0 }); qi = list().length - 1; drawQ(); next();
    const h = H[view]; h.circle = [{ name: 'Sarah', tel: '07700 900111', mins: 45, roles: ['call', 'supplies'] }, { name: 'Tom', tel: '07700 900222', mins: 5, roles: ['call', 'visit'] }]; h.subjTel = '01524 000000';
    view = 0; RTAB = 'todo'; render();
  });
  await p.waitForTimeout(150);
  ok(!(await p.$('#regcard')), 'emergency list hidden from residents');
  const card = await p.textContent('#conncard');
  ok(/2 homes linked/.test(card) && /Mum/.test(card) && /Later £3 a month/.test(card), 'plan page shows the Connect card with both homes');
  ok(await p.isVisible('.bnav >> text=Family'), 'bottom nav has Family');
  await p.click('#conncard >> text=Open the family dashboard'); await p.waitForTimeout(150);
  ok(await p.isVisible('#v-connect') && (await p.$$('.ctile')).length === 2, 'dashboard lists both homes');
  const weak = await p.textContent('#cweak');
  ok(/Mum/.test(weak) && /Drinking water/.test(weak), 'weak spots across homes include Mum\'s water');
  await p.evaluate(() => { const s = document.querySelector('#cweak select[onchange*="\'water\'"]'); s.value = 'Tom'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(80);
  ok(await p.evaluate(() => H[1].assign.water === 'Tom') && /Tom[\s\S]*Mum: Drinking water/.test(await p.textContent('#cjobs')), 'choosing who\'s sorting it shows in who\'s doing what');
  ok(/Add a postcode|No flood warnings/.test(await p.textContent('#calerts')), 'local warnings card');
  ok((await p.$$('#cshare button')).length === 2, 'can invite family to each home');
  await p.click('#cvote >> text=Maybe'); await p.waitForTimeout(60);
  ok(await p.evaluate(() => connState().vote.v === 'maybe') && /nothing is charged unless you choose to pay/.test(await p.textContent('#v-connect')), 'price question recorded, nothing charged');
  ok(await p.isVisible('#alert-t') && /Email me warnings for my homes/.test(await p.textContent('#calerts')), 'warning emails can be turned on from the dashboard');
  await p.evaluate(() => { window.__t = []; const t = toast; toast = m => { window.__t.push(m); t(m); }; user = { id: 'u', name: 'J', households: H }; }); await p.check('#alert-t');
  ok(await p.evaluate(() => user.alerts === true && /preview, so nothing is sent/.test(window.__t.join(' '))), 'turning warnings on in the preview says nothing is sent');
  await p.evaluate(() => { user = null; });
  // emergency mode
  await p.click('text=Something\'s happening'); await p.waitForTimeout(60);
  await p.click('text=Start emergency mode'); ok(/Choose what's happening/.test(await p.textContent('#fem-err')), 'must choose what\'s happening');
  await p.click('#fem-k >> text=Power cut'); await p.click('text=Start emergency mode'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => femNow().kind === 'power' && femNow().homes.length === 2 && H[0].em && H[1].em && H[0].em.id === H[1].em.id), 'emergency mode started, with a copy on both homes\' plans');
  ok(/0\s*of\s*2\s*homes have checked in/.test(await p.textContent('.fembar')), 'shows how many homes have checked in');
  const tl = await p.textContent('#ftime');
  ok(/The first hour/.test(tl) && /first call from\s*Sarah/.test(tl) && /105/.test(tl) && /medicine kept in the fridge/.test(tl) && /Day 3/.test(tl), '72-hour timeline from the family circle and Mum\'s needs');
  ok(/Not heard from yet/.test(await p.textContent('#fstatus')), 'status board starts unknown');
  await p.click('#fstatus li:nth-child(2) >> text=Fine'); await p.waitForTimeout(80);
  ok(/Fine/.test(await p.textContent('#fstatus li:nth-child(2) .fs-chip')), 'marking Mum as fine updates the board');
  await p.check('#ftime input >> nth=0'); ok(await p.evaluate(() => Object.values(H[1].em.done).some(x => x.v)), 'ticked steps are saved on every copy');
  // what a family member sees: someone invited only to Mum's plan, after the plans sync
  const other = await p.evaluate(() => {
    const mum = JSON.parse(JSON.stringify(H[1])); const keep = H; H = [Object.assign(fresh(true), mum, { _shared: true })];
    const em = femNow(), board = femHomes(em).map(x => !!x.h), banner = femBanner();
    H = keep; return { kind: em && em.kind, board, banner: /Family emergency mode/.test(banner) };
  });
  ok(other.kind === 'power' && other.board.join() === 'false,true' && other.banner, 'a family member invited to Mum\'s plan sees the same emergency and its banner');
  await p.evaluate(() => { view = 0; go('r'); render(); }); await p.waitForTimeout(80);
  ok(await p.isVisible('.fembanner') && /Power cut/.test(await p.textContent('.fembanner')), 'banner on the plan page while it\'s on');
  await p.evaluate(() => emergency()); await p.waitForTimeout(60);
  ok(/Open family emergency mode/.test(await p.textContent('#em-body')), 'the "It\'s happening now" screen links to family mode');
  await p.click('.em-fam'); await p.waitForTimeout(80); ok(await p.isVisible('#fstatus'), 'and opens it');
  // get ready again
  await p.click('text=It\'s over: get ready again'); await p.waitForTimeout(80);
  ok(/Get ready again/.test(await p.textContent('#v-connect')) && await p.isChecked('#frec input[value=water]'), 'recovery asks what was used, water ticked');
  await p.fill('#rec-notes', 'Mum needed a second torch.'); await p.click('text=Put it back on our plans'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !H[0].bought.water && H[0].bought.radio && !femNow() && femLog()[0].notes === 'Mum needed a second torch.' && H[1].emLog.length === 1), 'used water goes back on the plan; notes kept');
  ok(/What you've been through together/.test(await p.textContent('#v-connect')), 'dashboard remembers the emergency');
  // started by mistake
  await p.click('text=Something\'s happening'); await p.click('#fem-k >> text=Flooding'); await p.click('text=Start emergency mode'); await p.waitForTimeout(80);
  await p.click('text=Started by mistake'); await p.waitForTimeout(80);
  ok(await p.evaluate(() => !femNow() && femLog().length === 1) && !(await p.isVisible('#fstatus')), 'stopping a mistake leaves no record');
  // connected book
  await p.evaluate(() => { connState().fam = 'The Boyce family'; openBook(true); }); await p.waitForTimeout(900);
  const book = await p.textContent('#shelf');
  ok(/Connected Book/.test(book) && /The Boyce family/.test(book) && /Our weak spots/.test(book) && /The first 72 hours/.test(book) && /Get ready again/.test(book) && /Mum needed a second torch/.test(book) && /07700 900111/.test(book), 'connected book has every section and the family\'s numbers');
  ok(/Back to the family/.test(await p.textContent('#bookback')), 'book returns to the family dashboard');
  await p.click('#bookback'); await p.waitForTimeout(80); ok(await p.isVisible('#v-connect'), 'back to the dashboard');
  await p.evaluate(() => { view = 0; H[0].paid = true; openBook(); }); await p.waitForTimeout(400);
  ok(!/Connected Book/.test(await p.textContent('#shelf .cover')), 'household book is unchanged');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
} catch (e) { console.log('FAIL', e); fails++; } finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } } })();
