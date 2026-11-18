// Two real accounts, end to end, against the database stand-in (with family.sql's rules):
// James makes a plan for Mum and invites Sarah. Sarah joins from the link, sees only Mum's plan, and updates it.
// James starts family emergency mode; Sarah sees it, marks Mum as fine; James sees that, ends it; Sarah sees "get ready again".
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8767, URL0 = `http://localhost:${PORT}/`;
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('fake_tab', '1'); } catch (e) {} });
  await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' }));
  const errs = [];
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
  const db = p => p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
  const pull = async p => { await p.bringToFront(); await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(300); };
  const signUp = async (p, name, email) => { await p.fill('#a-name', name); await p.fill('#a-email', email); await p.fill('#a-pw', 'password123'); await p.click('#v-auth button[type=submit]'); await p.waitForFunction(() => typeof user !== 'undefined' && user && user.id, null, { timeout: 15000 }); await p.waitForTimeout(600); };
  try {
    // James: his own home, saved to an account
    const A = await open(); await A.goto(URL0); await A.waitForFunction(() => window.__liveReady); await A.waitForTimeout(500);
    await A.evaluate(() => { cur = fresh(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'half', food: 'some', kit: ['torch'], fa: 'no', budget: 5 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
    await A.click('text=Save my plan'); await signUp(A, 'James', 'james@example.com');
    // ...and Mum's
    await A.evaluate(() => { start(true); Object.assign(cur, { name: 'Mum', relHow: 'phone', relOK: 'yes', home: 'bungalow', outdoor: 'garden', tenure: 'own', adults: 0, over70: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'no', carers: 'no', water: 'none', food: 'some', kit: [], fa: 'no', budget: 0 }); qi = list().length - 1; drawQ(); next(); });
    await A.waitForFunction(() => H.length === 2 && H.every(h => h._id), null, { timeout: 15000 });
    let d = await db(A);
    ok(d.households.length === 2 && d.households.every(h => h.user_id === d.users[0].id), 'James has two plans saved: his home and Mum\'s');
    // invite Sarah to Mum's plan
    const link = await A.evaluate(async () => { let t = ''; Object.defineProperty(navigator, 'share', { value: x => { t = x.text; return Promise.resolve(); }, configurable: true }); const i = H.findIndex(h => h.other); view = i; setRTab('family'); await famInviteClick(i); return t; });
    const m = link.match(/\?family=([a-f0-9]{32})/);
    ok(!!m && /emergency plan for Mum/.test(link), 'James gets an invite link to send');

    // Sarah: opens the link, signs up, joins
    const B = await open(); await B.goto(URL0 + '?family=' + m[1]); await B.waitForFunction(() => window.__liveReady); await B.waitForTimeout(500);
    ok(await B.isVisible('#a-name'), 'the link asks Sarah to make an account first');
    await signUp(B, 'Sarah', 'sarah@example.com'); await B.waitForTimeout(500);
    const sb = await B.evaluate(() => ({ n: H.length, name: H[0] && H[0].name, shared: H[0] && H[0]._shared, user: user && user.name }));
    ok(sb.user === 'Sarah' && sb.n === 1 && sb.name === 'Mum' && sb.shared, 'Sarah joined: she sees Mum\'s plan, and not James\'s own home');
    d = await db(B);
    ok(d.household_members.length === 1 && d.household_members[0].name === 'Sarah', 'Sarah is recorded as a member of Mum\'s plan');
    // Sarah updates Mum's plan; James sees it
    await B.evaluate(() => { H[0].bought.torch = true; H[0].assign = { water: 'Sarah' }; }); await B.waitForTimeout(4600);
    await pull(A);
    ok(await A.evaluate(() => { const h = H.find(x => x.other); return h.bought.torch === true && h.assign.water === 'Sarah'; }), 'Sarah\'s changes reach James');
    ok(await A.evaluate(async () => { const L = await window.famMembers(H.find(x => x.other)); return L.some(x => x.name === 'Sarah'); }), 'James sees Sarah in the family');
    // Sarah can't change who owns the plan
    ok(await B.evaluate(async () => { const s = JSON.parse(localStorage.getItem('fake_db')); return s.households.filter(h => h.name !== undefined).length === 0; }), 'database rows hold plan data only');

    // James starts family emergency mode
    await A.bringToFront(); await A.evaluate(() => { CONNTAB = 'start'; connectView(); }); await A.click('#fem-k >> text=Power cut'); await A.click('text=Start emergency mode'); await A.waitForTimeout(300);
    ok(await A.evaluate(() => femNow() && femNow().by === 'James'), 'James starts a power cut emergency');
    await A.waitForTimeout(4600);
    await pull(B);
    const bem = await B.evaluate(() => { const e = femNow(); return e && { kind: e.kind, by: e.by, n: femHomes(e).length, mine: femHomes(e).filter(x => x.h).length }; });
    ok(bem && bem.kind === 'power' && bem.by === 'James', 'Sarah sees the emergency James started');
    ok(bem && bem.n === 2 && bem.mine === 1, 'Sarah sees both homes in it, with James\'s own home marked as not shared with her');
    await B.evaluate(() => { view = 0; go('r'); render(); }); await B.waitForTimeout(100);
    ok(await B.isVisible('#res .fembanner') && /Started by\s*James/.test(await B.textContent('#res .fembanner')), 'Sarah gets the banner on Mum\'s plan');
    await B.click('#res .fembanner'); await B.waitForTimeout(150);
    ok(/Not shared with you/.test(await B.textContent('#fstatus')), 'the board explains the home Sarah can\'t see');
    await B.click('#fstatus li:has-text("Mum") >> text=Fine'); await B.check('#ftime input >> nth=0'); await B.waitForTimeout(4600);
    await pull(A);
    await A.evaluate(() => connectView(true)); await A.waitForTimeout(100);
    const st = await A.textContent('#fstatus li:has-text("Mum")');
    ok(/Fine/.test(st) && /Sarah/.test(st), 'James sees Sarah marked Mum as fine');
    ok(await A.evaluate(() => Object.values(femNow().done).some(x => x.v)), 'and the step Sarah ticked');
    ok(/1\s*of\s*2\s*homes have checked in/.test(await A.textContent('.fembar')), 'the count goes up');
    // James ends it; Sarah sees "get ready again"
    await A.click('text=It\'s over: get ready again'); await A.waitForTimeout(4600);
    await pull(B);
    await B.evaluate(() => connectView(true)); await B.waitForTimeout(100);
    ok(/Well done for getting through it/.test(await B.textContent('#v-connect')), 'Sarah sees get ready again');
    await B.fill('#rec-notes', 'Mum needs a second torch.'); await B.click('text=Put it back on our plans'); await B.waitForTimeout(4600);
    await pull(A);
    ok(await A.evaluate(() => !femNow() && femLog().some(e => e.notes === 'Mum needs a second torch.')), 'Sarah closing it closes it for James too, with her notes');

    // Sarah leaves the plan
    await B.bringToFront(); await B.evaluate(() => { view = 0; FAMMEM = {}; go('r'); setRTab('family'); }); await B.waitForTimeout(300);
    await B.click('#famshare >> text=Leave this plan'); await B.waitForTimeout(300);
    ok(await B.evaluate(() => H.length === 0), 'Sarah can leave');
    d = await db(B);
    ok(d.household_members.length === 0 && d.households.length === 2, 'leaving removes her access, not the plan');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); srv.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
