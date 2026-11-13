// Book contact questions: separate boxes for name, number and address, and an NHS search for GP surgeries and pharmacies.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(8773, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const asked = [];
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '{}' }));
  await p.route('**/api/nhs**', r => { const u = new URL(r.request().url()); asked.push(u.search);
    const q = u.searchParams.get('q');
    const near = [{ name: 'Chelford Surgery', tel: '01625 861316', addr: 'Elmstead Road, Chelford, SK11 9BS' }, { name: 'The Village Practice', tel: '', addr: '1 High Street, Chelford, SK11 9BB' }];
    const body = q === 'zzz' ? { results: [] } : q === 'broken' ? null : { results: q ? near.slice(1) : near };
    return body ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }) : r.fulfill({ status: 502, body: '{}' }); });
  try {
    await p.goto('http://localhost:8773/'); await p.waitForTimeout(300);
    await p.evaluate(() => { start(false); Object.assign(cur, { pc: 'SK11', adults: 2, dogs: 1 }); H.push(cur); view = 0; cur = null; extra(); });
    const goTo = id => p.evaluate(id => { qi = list().findIndex(q => q.id === id); drawQ(); }, id);

    // first contact: two boxes, the phone box is a phone keypad
    await goTo('c1');
    ok(await p.isVisible('#f_c1_name') && await p.getAttribute('#f_c1_tel', 'type') === 'tel' && !(await p.isVisible('#f_c1_addr')), 'first contact: a name box and a phone box');
    await p.fill('#f_c1_name', 'Sarah'); await p.fill('#f_c1_tel', '07700 900123');
    ok(await p.evaluate(() => cur.c1) === 'Sarah, 07700 900123' && (await p.textContent('#q-next')) !== 'Skip', 'saved together for the book');

    // GP: nearby surgeries listed straight away, pick one
    await goTo('gp'); await p.waitForTimeout(200);
    ok(/GP surgeries near you/.test(await p.textContent('#sr_gp')) && (await p.$$('#sr_gp .pick')).length === 2, 'GP: surgeries near their postcode shown straight away');
    ok(asked[0].includes('type=gp') && asked[0].includes('pc=SK11'), 'only the first half of the postcode is sent');
    await p.click('#sr_gp .pick >> nth=0');
    ok(await p.inputValue('#f_gp_name') === 'Chelford Surgery' && await p.inputValue('#f_gp_tel') === '01625 861316' && /Elmstead Road/.test(await p.inputValue('#f_gp_addr')), 'tapping one fills in name, number and address');
    ok(await p.evaluate(() => cur.gp) === 'Chelford Surgery, 01625 861316, Elmstead Road, Chelford, SK11 9BS', 'and the book line');

    // pharmacy: search by word, no match, broken service
    await goTo('pharmacy'); await p.waitForTimeout(200);
    await p.fill('#s_pharmacy', 'village'); await p.press('#s_pharmacy', 'Enter'); await p.waitForTimeout(200);
    ok(asked.some(x => x.includes('type=pharmacy') && x.includes('q=village')) && (await p.$$('#sr_pharmacy .pick')).length === 1, 'pharmacy: search by a word');
    await p.click('#sr_pharmacy .pick'); ok(/Add the phone number below/.test(await p.textContent('#sr_pharmacy')), 'no number on file: asks them to add it');
    await p.fill('#s_pharmacy', 'zzz'); await p.click('#v-q .srow .btn'); await p.waitForTimeout(200);
    ok(/No matches/.test(await p.textContent('#sr_pharmacy')), 'no matches: says so');
    await p.fill('#s_pharmacy', 'broken'); await p.click('#v-q .srow .btn'); await p.waitForTimeout(200);
    ok(/isn't working right now/.test(await p.textContent('#sr_pharmacy')), 'service down: type it in instead');

    // older answers typed in one box still show, in the name box
    await p.evaluate(() => { cur.vet = 'Paws Vets 01234 567890'; delete cur.vetF; }); await goTo('vet');
    ok(await p.inputValue('#f_vet_name') === 'Paws Vets 01234 567890' && !(await p.isVisible('#sr_vet')), 'vet: no search, and an older one-box answer is kept');

    // stay with: name, address, phone
    await goTo('stayWith');
    ok(await p.isVisible('#f_stayWith_name') && await p.isVisible('#f_stayWith_addr') && await p.isVisible('#f_stayWith_tel'), 'where you could stay: name, address and phone');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
