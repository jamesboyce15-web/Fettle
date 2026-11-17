// Health answers are only saved to an account with explicit consent: the tick at sign-up, on the health question,
// and on the plan page. Without it the plan is saved without them.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const TYPES = { '.js': 'text/javascript', '.png': 'image/png', '.xml': 'text/xml', '.txt': 'text/plain' };
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { fs.readFile(path.join(PUB, 'index.html'), (e2, b2) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(b2); }); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const URL0 = 'http://localhost:8776/';
(async () => {
  await new Promise(r => srv.listen(8776, r));
  const b = await chromium.launch();
  const page = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 700 } }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await p.route('**/api.postcodes.io/outcodes/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: { admin_district: ['Rochdale'], country: ['England'] } }) }));
    await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' }));
    await p.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    return p; };
  const ANS = { home: "house", outdoor: "garden", tenure: "own", pc: "OL11", area: "Rochdale", nation: "england", adults: 2, heat: "gas", hob: "gas", cold: "slow", pay: "dd", healthGate: "yes", health: ["meds", "device"], diets: ["gf"], water: "half", food: "two", kit: ["torch"], fa: "no", mShock: "skip", mBills: "skip", mFood: "skip", budget: 5 };
  const finish = (p, a) => p.evaluate(a => { start(false); Object.assign(cur, a); qi = list().length - 1; drawQ(); next(); }, a);
  const dbh = p => p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).households);
  const signup = async (p, who, tick) => { await p.evaluate(() => authView('signup', true)); await p.waitForTimeout(150);
    await p.fill('#a-name', who); await p.fill('#a-email', who + '@example.com'); await p.fill('#a-pw', 'password123'); if (tick) await p.check('#a-health'); await p.click('button[type=submit]'); await p.waitForTimeout(700); };
  try {
    // 1. sign up without the tick: plan saved, health answers not
    let p = await page(); await p.goto(URL0); await p.waitForTimeout(500); await finish(p, ANS); await p.waitForTimeout(200);
    await p.click('text=Save my plan'); await p.waitForTimeout(150);
    ok(await p.isVisible('#a-health') && !(await p.isChecked('#a-health')) && /save your plan without them/.test(await p.textContent('#authbox')), 'sign-up asks to save health answers, not ticked for them');
    await signup(p, 'ann', false);
    let rows = await dbh(p), d = rows[0] && rows[0].data;
    ok(rows.length === 1 && d.adults === 2 && !('healthGate' in d) && !('health' in d) && !('meds' in d) && !('diets' in d), 'no tick: the plan is saved without any health answers');
    ok(await p.evaluate(() => H[0].healthGate === 'yes'), 'no tick: the plan on screen still uses them');
    // plan page switch adds them
    await p.evaluate(() => { view = 0; homeView(); });
    ok(await p.isVisible('text=Save health answers'), 'plan page offers "Save health answers"');
    await p.evaluate(() => setHealthOK(0, true)); await p.waitForTimeout(4500);
    d = (await dbh(p))[0].data;
    ok(d.healthOK === true && d.healthGate === 'yes' && d.health.length === 2, 'ticking it on the plan page saves them');
    await p.evaluate(() => setHealthOK(0, false)); await p.waitForTimeout(4500);
    d = (await dbh(p))[0].data;
    ok(!('health' in d) && !('healthGate' in d), 'unticking removes them from the saved plan');
    ok(!p.errs.length, 'no page errors ' + p.errs.join(' | '));

    // 2. sign up with the tick: saved with them
    p = await page(); await p.goto(URL0); await p.waitForTimeout(500); await finish(p, ANS); await p.waitForTimeout(200);
    await signup(p, 'bob', true);
    d = (await dbh(p)).find(r => r.data.healthOK); 
    ok(d && d.data.healthGate === 'yes' && d.data.health.includes('device') && d.data.diets.includes('gf'), 'tick at sign-up: health answers saved');

    // 3. no health answers: no tick box
    p = await page(); await p.goto(URL0); await p.waitForTimeout(500); await finish(p, Object.assign({}, ANS, { healthGate: 'no', health: [], diets: [] })); await p.waitForTimeout(200);
    await p.click('text=Save my plan'); await p.waitForTimeout(150);
    ok(!(await p.isVisible('#a-health')), 'no health answers: no health tick box');

    // 4. signed in, the health question shows its own tick
    p = await page(); await p.goto(URL0); await p.waitForTimeout(500); await finish(p, ANS); await signup(p, 'cat', false);
    await p.evaluate(() => { start(false); qi = list().findIndex(q => q.id === 'healthGate'); drawQ(); });
    ok(await p.isVisible('#q-health') && !(await p.isChecked('#q-health')), 'signed in: the health question has its own unticked "save" box');
    ok(!p.errs.length, 'no page errors ' + p.errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
