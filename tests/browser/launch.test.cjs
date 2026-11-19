// Launch checks: an unfinished or unsaved check survives a reload, the same plan is never saved twice, the council
// tick at sign-up, the easy first question, the Continue bar, and what a shared link or a search engine sees.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const TYPES = { '.js': 'text/javascript', '.png': 'image/png', '.xml': 'text/xml', '.txt': 'text/plain' };
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { fs.readFile(path.join(PUB, 'index.html'), (e2, b2) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(b2); }); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const URL0 = 'http://localhost:8775/';
(async () => {
  await new Promise(r => srv.listen(8775, r));
  const b = await chromium.launch();
  const page = async (mode, cfg) => { const ctx = await b.newContext({ viewport: { width: 390, height: 700 } }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await p.route('**/api.postcodes.io/outcodes/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: { admin_district: ['Rochdale'], country: ['England'] } }) }));
    await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: mode === 'live' ? 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' : cfg || '' }));
    if (mode === 'live') await p.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    return p; };
  const ANS = { home: "house", outdoor: "garden", tenure: "own", pc: "OL11", area: "Rochdale", nation: "england", adults: 3, heat: "gas", hob: "gas", cold: "slow", pay: "dd", healthGate: "yes", health: ["meds"], water: "half", food: "two", kit: ["torch"], fa: "no", mShock: "skip", mBills: "skip", mFood: "skip", budget: 5 };
  const finish = p => p.evaluate(a => { if (!cur) start(false); Object.assign(cur, a); qi = list().length - 1; drawQ(); next(); }, ANS);
  try {
    // ---------- what a shared link, a search engine and a phone's home screen see ----------
    const html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
    ok(/<meta name="description" content="[^"]{80,}">/.test(html) && /property="og:image" content="https:\/\/getfettle\.co\.uk\/og\.png"/.test(html) && /name="twitter:card" content="summary_large_image"/.test(html) && /rel="canonical" href="https:\/\/getfettle\.co\.uk\/"/.test(html) && /rel="icon"/.test(html), 'home page has a description, share image, canonical address and icon');
    const png = fs.readFileSync(path.join(PUB, 'og.png')); ok(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630 && fs.existsSync(path.join(PUB, 'apple-touch-icon.png')), 'share image is 1200 x 630, and there is a home-screen icon');
    const robots = fs.readFileSync(path.join(PUB, 'robots.txt'), 'utf8'), map = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
    ok(/Disallow: \/admin/.test(robots) && /Sitemap: https:\/\/getfettle\.co\.uk\/sitemap\.xml/.test(robots) && !/Disallow: \/\s*$/m.test(robots), 'robots.txt lets search engines in, keeps them out of /admin, and names the sitemap');
    ok((map.match(/<loc>/g) || []).length >= 26 && /guides\/emergency-toilet</.test(map) && !/admin/.test(map), 'sitemap lists the home page and every guide');
    ok(/og:image" content="https:\/\/getfettle\.co\.uk\/og\.png"/.test(fs.readFileSync(path.join(PUB, 'guides/power-cut.html'), 'utf8')), 'guides share with a picture too');

    // ---------- the check itself ----------
    let p = await page();
    await p.goto(URL0); await p.waitForTimeout(300);
    ok(!(await p.isVisible('#wbpromo')), 'no workbook link until config.js has its Amazon address');
    await p.evaluate(() => start(false)); await p.waitForTimeout(200);
    ok(/What kind of home/.test(await p.textContent('#qt')) && !(await p.isVisible('#v-q input.txt')), 'first question is a tap, not typing');
    await p.click('.opt >> nth=0'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => cur.home === 'house' && qi === 1), 'one tap answers it and moves on');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#v-q .navq')).position) === 'sticky', 'Back and Continue stay at the bottom of the screen');
    await p.evaluate(() => { qi = list().findIndex(q => q.id === 'people'); drawQ(); }); await p.waitForTimeout(100);
    ok(await p.evaluate(() => { const r = document.getElementById('q-next').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'on a long question, Continue is on screen without scrolling');

    // ---------- an unfinished check survives a reload ----------
    await p.evaluate(() => { Object.assign(cur, { outdoor: 'garden', tenure: 'own', adults: 4 }); qi = list().findIndex(q => q.id === 'heat'); drawQ(); });
    const at = await p.evaluate(() => qi);
    await p.reload(); await p.waitForTimeout(400);
    ok(await p.isVisible('#v-landing') && new RegExp('Continue your check \\(question ' + (at + 1) + '\\)').test(await p.textContent('#resume')), 'reload part-way: the home page offers to carry on from the same question');
    await p.click('#resume button'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => cur.adults === 4 && cur.home === 'house' && list()[qi].id === 'heat'), 'and the answers are still there');

    // ---------- a finished, unsaved plan survives a reload ----------
    await finish(p); await p.waitForTimeout(200);
    const s0 = await p.evaluate(() => ({ s: score(H[0]), hid: H[0].hid, n: H.length }));
    await p.reload(); await p.waitForTimeout(400);
    ok(await p.isVisible('#res') && !(await p.isVisible('#v-landing')) && await p.evaluate(s0 => H.length === 1 && score(H[0]) === s0.s && H[0].hid === s0.hid && H[0].scores.length === 1, s0), 'reload on the plan: straight back to the same plan, same score');
    await p.goto(URL0 + 'calc'); await p.waitForTimeout(300);
    ok(await p.isVisible('#v-tool') && /free 4-minute check/.test(await p.textContent('.tnext .btn')), 'a workbook tool page still opens as itself, with the check as its main next step');
    const q = await page(); await q.goto(URL0); await q.waitForTimeout(300);
    ok(await q.isVisible('#v-landing') && await q.evaluate(() => H.length === 0 && !sessionStorage.getItem('fettle-keep')), 'a different tab or visitor sees nothing of it');

    // ---------- the council tick at sign-up ----------
    await p.goto(URL0); await p.waitForTimeout(300);
    await p.click('text=Save my plan'); await p.waitForTimeout(150);
    ok(await p.isVisible('#a-count') && !(await p.isChecked('#a-count')) && /never a group smaller than 5 homes/.test(await p.textContent('#authbox')), 'sign-up offers "Help my council plan", not ticked for them');
    await p.fill('#a-name', 'Ann'); await p.fill('#a-email', 'ann@example.com'); await p.fill('#a-pw', 'password123'); await p.check('#a-count'); await p.click('button[type=submit]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => H[0].countMe === true && sessionStorage.getItem('fettle-keep') === null), 'ticked: the household is counted, and the tab copy is cleared once there is an account');
    ok(!p.errs.length && !q.errs.length, 'no page errors ' + p.errs.concat(q.errs).join(' | '));

    // ---------- the workbook link, once config.js has it ----------
    const w = await page(null, 'window.FETTLE_CONFIG={workbookUrl:"https://www.amazon.co.uk/dp/EXAMPLE"};'); await w.goto(URL0); await w.waitForTimeout(300);
    ok(!(await w.$('#wbpromo')) && await w.isVisible('#hero-cta'), 'the home page keeps one call to action, even with a workbook address in config.js');
    await w.selectOption('header select', 'pl'); await w.waitForTimeout(300);
    ok(!(await w.isVisible('#wbpromo')), 'not shown in other languages: the workbook is in English');

    // ---------- live site: reload, save once, never twice ----------
    const L = await page('live'); await L.goto(URL0); await L.waitForTimeout(500);
    await L.evaluate(() => start(false)); await finish(L); await L.waitForTimeout(200);
    await L.reload(); await L.waitForTimeout(700);
    ok(await L.isVisible('#res') && await L.evaluate(() => H.length === 1 && !H[0]._id), 'live: signed out, a reload brings the unsaved plan back');
    await L.click('text=Save my plan'); await L.waitForTimeout(150);
    await L.fill('#a-name', 'Bob'); await L.fill('#a-email', 'bob@example.com'); await L.fill('#a-pw', 'password123'); await L.check('#a-count'); await L.click('button[type=submit]'); await L.waitForTimeout(600);
    let db = await L.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.length === 1 && db.households[0].data.countMe === true && db.households[0].data.hid && db.households[0].data.adults === 3, 'live: sign-up saves the plan once, counted for the council');
    ok(await L.evaluate(() => sessionStorage.getItem('fettle-keep') === null), 'live: the tab copy is cleared after saving');
    await L.reload(); await L.waitForTimeout(800);
    db = await L.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.length === 1 && await L.evaluate(() => H.length === 1 && !!H[0]._id), 'live: reloading when signed in loads it from the account and saves nothing new');
    // the same plan, unsaved, in another tab that then signs in (the email link opened elsewhere)
    await L.evaluate(async () => { const copy = JSON.parse(JSON.stringify(H[0])); delete copy._id; await signOut(); H = [Object.assign(fresh(false), copy)]; view = 0; go('r'); render(); });
    await L.evaluate(() => authView('signin')); await L.fill('#a-email', 'bob@example.com'); await L.fill('#a-pw', 'password123'); await L.click('button[type=submit]'); await L.waitForTimeout(700);
    db = await L.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(db.households.length === 1 && await L.evaluate(() => H.length === 1), 'live: signing in with the same plan open unsaved does not save it a second time');
    ok(!L.errs.length, 'no live page errors ' + L.errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
