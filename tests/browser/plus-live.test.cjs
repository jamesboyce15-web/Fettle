// Fettle Plus, live mode against the database stand-in. Off: "I'd pay for this". On: choose a plan -> account -> Stripe checkout;
// back from Stripe, the member sees their plan and can manage it.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8769, URL0 = `http://localhost:${PORT}/`;
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(); const errs = [];
  const mk = async (plusOn) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('fake_tab', '1'); } catch (e) {} });
    await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: `window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true,plusOn:${plusOn}};` }));
    return ctx; };
  try {
    // ----- off -----
    let ctx = await mk(false); let p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0); await p.waitForFunction(() => window.__liveReady);
    ok(await p.isVisible('#pi-plus') && !(await p.isVisible('#plus >> text=Choose Plus')), 'switched off: no subscribe buttons, just "I\'d pay for this"');
    await ctx.close();
    // ----- on -----
    ctx = await mk(true); let body = null;
    await ctx.route('**/api/checkout', async r => { body = JSON.parse(r.request().postData()); await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: URL0 + '?plus=success' }) }); });
    await ctx.route('**/api/billing', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: URL0 + '?plus=manage' }) }));
    p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL0); await p.waitForFunction(() => window.__liveReady);
    await p.click('#plus >> text=Monthly'); await p.click('#plus >> text=Choose Plus with Post');
    ok(await p.isVisible('#a-name'), 'choosing a plan asks for an account first');
    await p.fill('#a-name', 'Pat'); await p.fill('#a-email', 'pat@example.com'); await p.fill('#a-pw', 'password123');
    // Stripe would create the subscription; the webhook writes the row. Simulate that as the redirect happens.
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fake_db') || '{}'); window.__seedSub = true; });
    await Promise.all([p.waitForURL(/plus=success|localhost:\d+\/$/, { timeout: 15000 }), p.click('#v-auth button[type=submit]')]);
    ok(body && body.product === 'post_month', 'after sign-up it goes straight to checkout for Plus with Post, monthly');
    await p.waitForFunction(() => window.__liveReady);
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('fake_db')); d.subscriptions = [{ user_id: d.users[0].id, plan: 'post', period: 'month', status: 'active', current_period_end: '2026-12-18T00:00:00Z', cancel_at_period_end: false }]; localStorage.setItem('fake_db', JSON.stringify(d)); });
    await p.goto(URL0 + '?plus=success'); await p.waitForFunction(() => window.__liveReady); await p.waitForTimeout(500);
    ok(await p.evaluate(() => window.PLUS && window.PLUS.plan === 'post'), 'back from Stripe, the membership is picked up');
    ok(/You're a member/.test(await p.textContent('#plusbox')) && /Renews on/.test(await p.textContent('#plusbox')), 'the member sees their plan and renewal date');
    await Promise.all([p.waitForURL(/plus=manage/), p.click('#plusbox >> text=Manage or cancel')]);
    ok(true, 'Manage or cancel opens Stripe\'s billing page');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); srv.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
