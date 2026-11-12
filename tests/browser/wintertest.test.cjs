// Winter test mode: free book with a free account, anonymous area count without an account, start/finish counts.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(8769, r));
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    let checkout = 0; await ctx.route('**/api/checkout', r => { checkout++; r.fulfill({ status: 500, body: '{}' }); });
    await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await ctx.route('**/api.postcodes.io/outcodes/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: { admin_district: ['Rochdale'], country: ['England'] } }) }));
    await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' }));
    await p.goto('http://localhost:8769/?src=workbook'); await p.waitForTimeout(600);
    ok(await p.isVisible('text=Free to download and print.'), 'landing shows the book as free');
    await p.evaluate(() => start(false)); await p.waitForTimeout(100);
    let d = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(d.fettle_events.length === 1 && d.fettle_events[0].kind === 'check_started' && !d.fettle_events[0].area, 'check started counted, no area or id');
    ok(d.fettle_events[0].src === 'workbook', 'a visit from the workbook is counted as such');
    await p.evaluate(async () => { Object.assign(cur, { pc: 'OL11', home: 'house', outdoor: 'garden', tenure: 'social', adults: 1, over70: 1, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'few', food: 'some', kit: ['torch'], fa: 'no', budget: 0, psr: 'no' }); await lookupPc(cur); scenIds(cur).forEach(id => { cur.scen[id] = { a: 3, b: 'less' }; cur.conf[id] = 2; }); qi = list().length - 1; drawQ(); next(); });
    await p.waitForTimeout(300);
    d = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(d.fettle_events.some(e => e.kind === 'check_finished' && e.area === 'Rochdale'), 'check finished counted with the area');
    ok(await p.isVisible('text=Help your area get ready') && /Rochdale/.test(await p.textContent('.anon')), 'anonymous count card for Rochdale, no account needed');
    await p.click('.anon >> text=Add my answers'); await p.waitForTimeout(300);
    d = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    const a = d.anon_checks[0];
    ok(d.anon_checks.length === 1 && a.area === 'Rochdale' && a.data.m && a.data.sc.power === 2 && a.data.scb.power === 'less' && a.data.f.o70 === true, 'anonymous row has area, measures, scenarios and flags');
    const txt = JSON.stringify(a);
    ok(!/OL11|@|"name"|"pc"/.test(txt), 'no postcode, email or name stored');
    ok(await p.isVisible('text=Your answers are in the anonymous count'), 'thank-you shown; cannot be added twice');
    // free book: needs a free account, then opens without Stripe
    await p.evaluate(() => extra()); await p.waitForTimeout(100);
    await p.evaluate(() => { qi = list().length - 1; drawQ(); next(); }); await p.waitForTimeout(200);
    ok(await p.isVisible('#a-name'), 'free book asks for a free account first');
    await p.fill('#a-name', 'Pat'); await p.fill('#a-email', 'pat@example.com'); await p.fill('#a-pw', 'password123');
    const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), p.click('#v-auth button[type=submit]')]);
    await p.waitForTimeout(800);
    ok(await p.evaluate(() => user && H[view].paid === true), 'book unlocked after sign-up');
    ok(checkout === 0, 'Stripe never called');
    await p.reload(); await p.waitForTimeout(900);
    ok(await p.evaluate(() => H.length === 1 && H[0].paid === true && !!H[0].anonId), 'still unlocked after reload; anonId saved with the plan');
    ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  process.exit(fails ? 1 : 0);
})();
