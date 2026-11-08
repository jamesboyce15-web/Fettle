// Fettle for Communities in live mode: invite code -> join -> make a case -> shared with a colleague -> delete.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
const ORG = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(8766, r));
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await ctx.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon"};' }));
    const U = 'http://localhost:8766/';
    await p.goto(U); await p.waitForTimeout(300);
    // Fettle sets up the pilot: an organisation with wards, an admin code, and another org with a case nobody else may see.
    await p.evaluate(([ORG, OTHER]) => localStorage.setItem('fake_db', JSON.stringify({ users: [], households: [{ id: 'x1', org_id: OTHER, user_id: null, data: { ref: 'SECRET', ward: 'Elsewhere' } }], purchases: [],
      organisations: [{ id: ORG, name: 'Rochdale Borough Council', wards: ['Kingsway', 'Central Rochdale'] }, { id: OTHER, name: 'Other Council', wards: [] }],
      org_members: [], org_invites: [{ code: 'ADMN-2345', org_id: ORG, role: 'admin' }], case_events: [] })), [ORG, OTHER]);

    // The pilot lead opens the invite link.
    await p.goto(U + '?join=ADMN-2345'); await p.waitForTimeout(600);
    ok(await p.isVisible('text=Join your team'), 'invite link opens the join form');
    ok(await p.inputValue('#j-code') === 'ADMN-2345', 'code filled in from the link');
    ok(!(await p.isVisible('text=Prototype: accounts only last')), 'no prototype warning on the live join form');
    await p.click('text=Join my team'); await p.waitForTimeout(200);
    ok((await p.textContent('#a-err')).includes('first name'), 'checks the form');
    await p.fill('#j-name', 'Sam'); await p.fill('#j-email', 'sam@rochdale.gov.uk'); await p.selectOption('#j-role', 'Emergency planner'); await p.fill('#j-pw', 'password123');
    await p.click('text=Join my team'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => isPro() && user.pro.admin && user.pro.org === 'Rochdale Borough Council' && user.pro.role === 'Emergency planner'), 'joined as admin with job title');
    ok(await p.isVisible('text=Caseload') && await p.isVisible('#invite-card'), 'caseload with invite card for admin');
    ok(await p.evaluate(() => !H.some(h => h.ref === 'SECRET')), "another organisation's case is not visible");
    ok(await p.evaluate(() => !document.querySelector('.samplebar')), 'no sample banner on a real caseload');

    // Make an invite for a colleague.
    await p.fill('#i-email', 'alex@rochdale.gov.uk'); await p.click('text=Make an invite code'); await p.waitForTimeout(300);
    const code = await p.textContent('#i-code');
    ok(/^TEST-\d{4}$/.test(code), 'invite code shown');
    ok((await p.textContent('#i-link')).includes('/?join=' + code), 'invite link shown');

    // Add a resident: consent, ward from the organisation's list, questions.
    await p.click('text=+ Add a resident'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => [...document.querySelectorAll('#c-ward option')].map(o => o.value).join('|') === 'Kingsway|Central Rochdale'), "ward list is the organisation's own");
    const ref = await p.evaluate(() => document.querySelector('.sm.mute b').textContent);
    ok(/^R-[A-Z2-9]{5}$/.test(ref), 'random case reference in live mode: ' + ref);
    await p.check('#c-store'); await p.selectOption('#c-ward', 'Kingsway');
    await p.click('text=Start the questions'); await p.waitForTimeout(200);
    await p.evaluate(() => { Object.assign(cur, { home: 'flat', floor: 6, lift: 'yes', outdoor: 'none', tenure: 'social', adults: 1, over70: 1, heat: 'electric', hob: 'electric', cold: 'fast', healthGate: 'yes', health: ['device'], water: 'none', food: 'some', kit: [], fa: 'no', budget: 0 }); qi = list().length - 1; drawQ(); next(); });
    await p.waitForTimeout(5000);
    let d = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    const row = d.households.find(h => h.data.ref === ref);
    ok(row && row.org_id === ORG && row.user_id === null && row.created_by === d.users[0].id, 'case saved to the organisation, not the worker');
    ok(d.case_events.some(e => e.action === 'created' && e.household_id === row.id && e.ref === ref), 'created event recorded');
    // Save a visit and verify a job.
    await p.evaluate(() => saveVisit(H.findIndex(h => h.ref && h.ref.startsWith('R-')))); await p.waitForTimeout(4600);
    d = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(d.households.find(h => h.id === row.id).data.scores.length === 2 && d.case_events.some(e => e.action === 'visit'), 'visit saved and recorded');
    ok(d.households.find(h => h.id === row.id).updated_by === d.users[0].id, 'updated_by set');
    await p.evaluate(() => signOut()); await p.waitForTimeout(300);

    // The colleague joins with the code and sees the shared caseload.
    await p.evaluate(() => proAuth());
    await p.fill('#j-code', code.toLowerCase()); await p.fill('#j-name', 'Alex'); await p.fill('#j-email', 'alex@rochdale.gov.uk'); await p.selectOption('#j-role', 'Housing officer'); await p.fill('#j-pw', 'password456');
    await p.click('text=Join my team'); await p.waitForTimeout(900);
    ok(await p.evaluate(r => isPro() && !user.pro.admin && H.some(h => h.ref === r), ref), 'colleague sees the shared case');
    ok(!(await p.isVisible('#invite-card')), 'workers do not get the invite card');
    // A used code can't be used again.
    await p.evaluate(() => signOut()); await p.waitForTimeout(200); await p.evaluate(() => proAuth());
    await p.fill('#j-code', code); await p.fill('#j-name', 'Kim'); await p.fill('#j-email', 'kim@rochdale.gov.uk'); await p.fill('#j-pw', 'password789');
    await p.click('text=Join my team'); await p.waitForTimeout(700);
    ok((await p.textContent('#a-err')).includes("isn't valid"), 'used code refused');
    ok(await p.evaluate(() => !isPro()), 'not a member after a refused code');

    // Back as Alex: reload restores pro mode; delete the case at the resident's request.
    await p.evaluate(() => signOut()); await p.waitForTimeout(200);
    await p.evaluate(() => authView('signin')); await p.fill('#a-email', 'alex@rochdale.gov.uk'); await p.fill('#a-pw', 'password456'); await p.click('button[type=submit]'); await p.waitForTimeout(900);
    ok(await p.isVisible('text=Caseload'), 'normal sign-in goes to the caseload');
    await p.reload(); await p.waitForTimeout(900);
    ok(await p.evaluate(() => isPro() && H.length === 1), 'caseload restored after reload');
    await p.evaluate(() => proCase(0)); await p.click('text=Delete this plan at their request'); await p.waitForTimeout(4600);
    d = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(!d.households.some(h => h.id === row.id), 'case deleted from the database');
    ok(d.case_events.some(e => e.action === 'deleted' && e.ref === ref && e.household_id === null), 'deletion recorded by reference only');
    ok(d.households.some(h => h.id === 'x1'), "other organisation's case untouched");
    ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  process.exit(fails ? 1 : 0);
})();
