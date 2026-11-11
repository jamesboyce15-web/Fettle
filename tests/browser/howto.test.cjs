// Every step says how to do it, with one thing to tap: a link, a printable sheet or a message ready to send.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.resolve(__dirname, '../../public/index.html')); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const all = {}; const mk = a => { const h = fresh(false); Object.assign(h, { home: 'flat', floor: 9, lift: 'hard', doorEntry: 'yes', outdoor: 'none', tenure: 'temp', adults: 1, over70: 1, under5: 1, babies: 1, feed: 'formula', bottles: 6, dogs: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'yes', health: ['meds', 'fridge', 'device', 'stairs', 'memory', 'hearing', 'alarm'], water: 'none', food: 'no', kit: [], fa: 'no', budget: 0, pay: 'prepay', psr: 'no' }, a); H = [h]; view = 0;
      needs(h).forEach(x => { all[x.id] = { n: (HOW_STEPS[x.id] || []).length, acts: howActs(h, x), msg: msgText(h, x.id), panel: !!(x.psrpanel || x.medpanel) }; }); };
    mk({}); mk({ tenure: 'own', kit: ['firstaid'] }); mk({ tenure: 'rent' }); return all; });
  const ids = Object.keys(r);
  ok(ids.length >= 34 && ids.every(i => r[i].n >= 2 && r[i].n <= 3), 'every step has 2 or 3 instructions (' + ids.length + ' steps)');
  const bare = ids.filter(i => !r[i].acts.length && !r[i].panel);
  ok(bare.every(i => ['insure', 'kitplace', 'facheck', 'tempacc', 'device', 'alarm'].includes(i)), 'every step that can be started with a tap has one: only ' + bare.join(', ') + ' have none');
  ok(ids.every(i => r[i].acts.every(([t, u]) => /^(https:\/\/|guides\/)/.test(u) || /^[a-zA-Z]+\(.*\)$/.test(u))), 'every action is a link or a function call');
  ok(['landlord', 'door', 'evac', 'buddy'].every(i => !r[i] || /^Hello\. .* Thank you\.$/.test(r[i].msg)), 'message steps carry a message ready to send');
  // printable sheets
  const sheets = await p.evaluate(() => { const out = {}; let last = ''; window.open = () => ({ document: { write: s => { last = s; }, close() { } } });
    for (const f of ['numbersSheet', 'shoppingList', 'packList', 'talkSheet', 'neighbourCard']) { last = ''; window[f](); out[f] = last; } return out; });
  ok(/Important numbers/.test(sheets.numbersSheet) && /105/.test(sheets.numbersSheet) && /0800 111 999/.test(sheets.numbersSheet) && /print\(\)/.test(sheets.numbersSheet), 'numbers sheet prints with emergency numbers filled in');
  ok(/Shopping list/.test(sheets.shoppingList) && /Drinking water/.test(sheets.shoppingList), 'shopping list prints what is still to buy');
  ok(/packing list/.test(sheets.packList) && /Torch/.test(sheets.packList), 'packing list prints');
  ok((sheets.talkSheet.match(/class="q"/g) || []).length === 7, 'family talk sheet has 7 questions with space to write');
  ok(/Check on me/.test(sheets.neighbourCard), 'neighbour card prints');
  // in the plan
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'rent', adults: 1, over70: 1, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'all', food: 'yes', kit: ['torch', 'radio', 'power', 'warm', 'firstaid', 'cash', 'opener', 'co'], fa: 'yes', budget: 5, pay: 'bill', psr: 'yes', nation: 'england' }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
  ok(await p.locator('#steps details.how[open]').count() === 3, 'instructions are open on all three next steps');
  ok(await p.isVisible('#steps >> text=Send the message'), 'first step has its action button');
  const sent = await p.evaluate(async () => { let got = ''; Object.defineProperty(navigator, 'share', { value: d => { got = d.text; return Promise.resolve(); }, configurable: true }); setLang && setLang('pl'); await new Promise(r => setTimeout(r, 200)); sendMsg('landlord'); const el = document.querySelector('#steps .notin-en'); const note = !!el && el.offsetParent !== null; setLang('en'); return { got, note }; });
  ok(/^Hello\. Please could you check/.test(sent.got) && sent.note, 'landlord message is sent in English, and the page says so');
  ok(errs.length === 0, 'no page errors ' + errs.join('; '));
} finally { await b.close(); } console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0); })();
