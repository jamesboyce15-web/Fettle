// Live mode with "Confirm email" on (as on getfettle.co.uk): the check finished before signing up must still be
// there after clicking the confirmation link, in the same browser or a different one. And "Save my plan" is at the top.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { fs.readFile(path.join(PUB, 'index.html'), (e2, b2) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(b2); }); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(8772, r));
  const b = await chromium.launch();
  const page = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' }));
    return p; };
  const finishCheck = p => p.evaluate(() => { start(false); Object.assign(cur, { home: "house", outdoor: "garden", tenure: "own", adults: 3, heat: "gas", hob: "gas", cold: "slow", healthGate: "yes", health: ["meds"], water: "half", food: "some", kit: ["torch"], fa: "no", budget: 5 }); tier = "core"; qi = list().length - 1; go("q"); drawQ(); next(); });
  const signUp = async (p, email) => { await p.click('text=Save my plan'); await p.waitForTimeout(150); await p.fill('#a-name', 'James'); await p.fill('#a-email', email); await p.fill('#a-pw', 'password123'); await p.click('button[type=submit]'); await p.waitForTimeout(400); };
  try {
    // ---- same browser ----
    const p = await page();
    await p.goto('http://localhost:8772/'); await p.evaluate(() => localStorage.setItem('fake_confirm', '1')); await p.reload(); await p.waitForTimeout(400);
    await finishCheck(p); await p.waitForTimeout(150);
    const first = await p.$eval('#res', el => el.firstElementChild && el.firstElementChild.className);
    ok(first === 'saved', '"Save my plan" is the first thing on the results page (got: ' + first + ')');
    await signUp(p, 'a@example.com');
    ok(/Check your email/.test(await p.textContent('#a-err')) && /plan will be waiting/.test(await p.textContent('#a-err')), 'sign-up asks them to confirm their email');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('fettle_pending'))[0].adults === 3), 'unsaved check kept in this browser');
    ok(await p.evaluate(() => fakeUser('a@example.com').user_metadata.pending_plans[0].adults === 3), 'and on the account, for another browser');
    const to = await p.evaluate(() => fakeClickLink()); await p.goto('http://localhost:8772' + to); await p.waitForTimeout(800);
    let db = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.length === 1 && db.households[0].data.adults === 3 && db.households[0].data.health[0] === 'meds', 'after the link: the check is saved to the database');
    ok(await p.isVisible('#res') && !(await p.isVisible('#v-landing')) && !(await p.isVisible('text=Save my plan')), 'they land on their plan, not the start, and no save prompt');
    ok(await p.evaluate(() => localStorage.getItem('fettle_pending') === null && fakeUser('a@example.com').user_metadata.pending_plans === null), 'temporary copies cleared');
    await p.reload(); await p.waitForTimeout(700);
    db = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.length === 1 && await p.evaluate(() => H.length === 1), 'reloading does not save it twice');

    // ---- link opened in a different browser (e.g. the mail app) ----
    const q = await page();
    await q.goto('http://localhost:8772/'); await q.evaluate(() => localStorage.setItem('fake_confirm', '1')); await q.reload(); await q.waitForTimeout(400);
    await finishCheck(q); await signUp(q, 'b@example.com');
    const snap = await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('fake_db')); const o = localStorage.getItem('fake_otp'); localStorage.clear(); localStorage.setItem('fake_db', JSON.stringify(d)); localStorage.setItem('fake_otp', o); return true; });
    const to2 = await q.evaluate(() => fakeClickLink()); await q.goto('http://localhost:8772' + to2); await q.waitForTimeout(800);
    db = await q.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.filter(h => db.users.find(u => u.email === 'b@example.com').id === h.user_id).length === 1, 'different browser: check restored from the account and saved');
    ok(await q.isVisible('#res'), 'different browser: lands on the plan');

    // ---- on the way to the free book: the book opens after the link, no questions again ----
    const r = await page();
    await r.goto('http://localhost:8772/'); await r.evaluate(() => localStorage.setItem('fake_confirm', '1')); await r.reload(); await r.waitForTimeout(400);
    await finishCheck(r); await r.waitForTimeout(150);
    await r.evaluate(() => { extra(); cur.surname = 'Boyce'; qi = list().length - 1; drawQ(); next(); }); await r.waitForTimeout(200);
    ok(await r.isVisible('#v-auth'), 'book: asked to create an account');
    await r.fill('#a-name', 'James'); await r.fill('#a-email', 'c@example.com'); await r.fill('#a-pw', 'password123'); await r.click('button[type=submit]'); await r.waitForTimeout(400);
    const to3 = await r.evaluate(() => fakeClickLink()); await r.goto('http://localhost:8772' + to3); await r.waitForTimeout(900);
    ok(await r.isVisible('#v-book') && /Boyce/.test(await r.textContent('#v-book')), 'book: after the link, the finished book opens with their name on it');
    ok(!(await r.isVisible('#v-q')), 'book: no questions again');
    db = await r.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.some(h => h.data.surname === 'Boyce'), 'book: answers saved');
    r.errs.length && console.log(r.errs);
    ok(!p.errs.length && !q.errs.length, 'no page errors ' + p.errs.concat(q.errs).join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
