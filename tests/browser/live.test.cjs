const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
(async () => {
  await new Promise(r => srv.listen(8765, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon"};' }));
  let checkoutBody = null;
  await p.route('**/api/checkout', async r => { checkoutBody = JSON.parse(r.request().postData()); const ok = r.request().headers()['authorization']?.startsWith('Bearer tok_'); r.fulfill({ status: ok ? 200 : 401, contentType: 'application/json', body: JSON.stringify({ url: `http://localhost:8765/?checkout=success&hh=${checkoutBody.householdId}&fake_pay=1` }) }); });
  await p.route('**/api/delete-account', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"deleted":true}' }));
  const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

  await p.goto('http://localhost:8765/'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.body.classList.contains('live')), 'live mode on');
  ok(!(await p.isVisible('text=Test prices for the prototype')), 'prototype pricing note hidden');
  ok(await p.isVisible('text=Secure payment by Stripe. The printed book'), 'live pricing note shown');
  // finish a check, then sign up
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { home: "house", outdoor: "garden", tenure: "own", adults: 2, heat: "gas", hob: "gas", cold: "slow", healthGate: "yes", health: ["meds"], water: "half", food: "some", kit: ["torch"], fa: "no", budget: 5 }); tier = "core"; qi = list().length - 1; go("q"); drawQ(); next(); });
  ok(await p.isVisible('#res') && !(await p.isVisible('#a-name')), 'plan shown straight after check, no sign-up wall');
  await p.click('text=Save my plan'); await p.waitForTimeout(200);
  ok(await p.isVisible('#a-name'), 'save button opens sign-up');
  ok(await p.isVisible('text=By creating an account you agree'), 'terms line shown');
  await p.fill('#a-name', 'Jo'); await p.fill('#a-email', 'jo@example.com'); await p.fill('#a-pw', 'password123');
  await p.click('button[type=submit]'); await p.waitForTimeout(800);
  const db1 = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
  ok(db1.households.length === 1 && db1.households[0].data.health[0] === 'meds', 'plan saved to database');
  ok(!('paid' in db1.households[0].data), 'paid flag never written by the browser');
  ok(await p.isVisible('#del-acct'), 'delete account link on home');
  // reload: session and plan come back
  await p.reload(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => user && user.name === 'Jo' && H.length === 1 && !!H[0]._id), 'session and plan restored after reload');
  // change something, autosave
  await p.evaluate(() => { H[0].water = 'all'; }); await p.waitForTimeout(4600);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).households[0].data.water === 'all'), 'changes autosave');
  // try to fake paid in the browser: should not unlock after reload
  await p.evaluate(() => { H[0].paid = true; }); await p.waitForTimeout(4600); await p.reload(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => H[0].paid === false), 'setting paid in the browser does not stick');
  // buy the book
  await p.evaluate(() => { view = 0; go('r'); render(); });
  ok(await p.isVisible('text=Get The Fettle Book: £5'), 'live buy button');
  await p.evaluate(() => { extra(); qi = list().length - 1; drawQ(); });
  await Promise.all([p.waitForNavigation(), p.evaluate(() => next())]);
  ok(checkoutBody && checkoutBody.product === 'book_digital' && /^[0-9a-f-]{36}$/.test(checkoutBody.householdId), 'checkout called with plan id');
  await p.waitForTimeout(4500);
  ok(await p.isVisible('#v-book'), 'book opens after payment');
  ok(await p.evaluate(() => location.search === ''), 'address bar cleaned');
  ok(await p.evaluate(() => H[0].paid === true), 'plan marked paid from purchases');
  // cancelled return
  await p.goto(`http://localhost:8765/?checkout=cancelled&hh=${checkoutBody.householdId}`); await p.waitForTimeout(900);
  ok(await p.isVisible('#v-r'), 'cancelled payment returns to plan');
  // sign out and back in
  await p.evaluate(() => signOut()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => user === null && H.length === 0), 'signed out clears plans from page');
  await p.evaluate(() => authView('signin')); await p.fill('#a-email', 'jo@example.com'); await p.fill('#a-pw', 'wrong-pass'); await p.click('button[type=submit]'); await p.waitForTimeout(300);
  ok((await p.textContent('#a-err')).includes("don't match"), 'wrong password message');
  await p.fill('#a-pw', 'password123'); await p.click('button[type=submit]'); await p.waitForTimeout(800);
  ok(await p.evaluate(() => H.length === 1 && H[0].paid), 'sign in brings back paid plan');
  // delete
  await p.click('#del-acct'); await p.click('text=Delete everything'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => user === null), 'account deleted and signed out');
  // professional accounts in live need an invite code (full flow in pro-live.test.cjs)
  await p.evaluate(() => proAuth());
  ok(await p.isVisible('#j-code') && await p.isVisible('text=Join your team'), 'professional account asks for an invite code');
  console.log('page errors:', errs.filter(e => !/favicon|404/.test(e)));
  await b.close(); srv.close();
})();
