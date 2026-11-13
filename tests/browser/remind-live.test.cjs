// /remind on the live site: sign-in link, back from the link, reminders on, area kept only with consent.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
// Like Cloudflare Pages with no 404.html: an unknown path such as /remind gets index.html.
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) b = fs.readFileSync(path.join(PUB, 'index.html')), f = 'index.html';
    res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(8771, r));
  const b = await chromium.launch(); try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon"};' }));
    await p.route('**/api.postcodes.io/outcodes/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: { admin_district: ['Rochdale'], country: ['England'] } }) }));

    await p.goto('http://localhost:8771/remind?src=wb-remind'); await p.waitForTimeout(600);
    ok(await p.isVisible('#m-email'), '/remind opens the reminder form');
    ok(!/preview copy/.test(await p.textContent('#toolbox')), 'no preview wording on the live site');
    await p.fill('#m-email', 'Ann@Example.com'); await p.fill('#m-name', 'Ann'); await p.fill('#m-pc', 'ol11'); await p.check('#m-count');
    await p.click('text=Email me a sign-in link'); await p.waitForTimeout(400);
    ok(/Check your email/.test(await p.textContent('#toolbox')), 'link sent screen');
    let u = await p.evaluate(() => fakeUser('ann@example.com'));
    ok(u && u.user_metadata.remind_emails === true && u.user_metadata.remind_area === 'Rochdale' && u.user_metadata.remind_count === true && u.user_metadata.first_name === 'Ann' && u.user_metadata.remind_src === 'wb-remind', 'account made with reminders on, area, consent, name and which QR code');
    ok(!('pc' in u.user_metadata) && !JSON.stringify(u.user_metadata).includes('OL11'), 'the postcode itself is not stored');
    const to = await p.evaluate(() => fakeClickLink());
    ok(/\/remind\?on=1$/.test(to), 'link returns to /remind?on=1');
    await p.goto(to); await p.waitForTimeout(700);
    ok(/Your reminders are on/.test(await p.textContent('#toolbox')) && /Your next email: \d+ \w+ \d{4}/.test(await p.textContent('#toolbox')), 'back from the link: reminders on, next date shown');
    ok(!(await p.evaluate(() => location.search)), 'address cleaned up');
    const ev = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).fettle_events.map(e => e.kind + ':' + (e.area || '') + ':' + (e.src || '')));
    ok(ev.includes('remind_signup:Rochdale:wb-remind') && ev.includes('tool_remind::wb-remind'), 'counted: page opened and sign-up, with area and QR code: ' + ev.join(' '));
    await p.click('text=Turn reminders off'); await p.waitForTimeout(300);
    u = await p.evaluate(() => fakeUser('ann@example.com'));
    ok(u.user_metadata.remind_emails === false && await p.isVisible('text=Turn on reminders'), 'turn off works, and offers to turn back on');
    await p.click('text=Turn on reminders'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => fakeUser('ann@example.com'))).user_metadata.remind_emails === true, 'turn back on works');

    // no consent: no area in the sign-up count
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await p.goto('http://localhost:8771/remind'); await p.waitForTimeout(600);
    await p.fill('#m-email', 'bob@example.com'); await p.fill('#m-pc', 'OL11'); await p.click('text=Email me a sign-in link'); await p.waitForTimeout(400);
    await p.goto(await p.evaluate(() => fakeClickLink())); await p.waitForTimeout(700);
    const ev2 = await p.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).fettle_events.filter(e => e.kind === 'remind_signup'));
    ok(ev2.length === 1 && !ev2[0].area, 'no "help your council plan" tick: sign-up counted without an area');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
