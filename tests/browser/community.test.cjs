// Fettle Communities. Preview: the sample community and the resident's choices. Live (against the database stand-in,
// which follows community.sql): an organiser starts a community, six homes join from its link, some give names, one
// asks for help; the organiser sees totals with small numbers hidden, names only where given, the request, and a
// newsletter written from the biggest gap; residents' books carry the community's local information.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8768, URL0 = `http://localhost:${PORT}/`;
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { fs.readFile(path.join(PUB, 'index.html'), (e2, b2) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(b2); }); return; }
    res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch(); const errs = [];
  try {
    // ---------- preview copy ----------
    const site = require('./proto-site.cjs');
    const P = await b.newPage({ viewport: { width: 390, height: 844 } }); P.on('pageerror', e => errs.push('preview: ' + e.message));
    await P.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await P.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await P.goto('file://' + path.join(site, 'index.html') + '?c=st-marys-caton'); await P.waitForTimeout(500);
    ok(/St Mary's Church, Caton/.test(await P.textContent('#commjoin')) && /choose whether/.test(await P.textContent('#commjoin')), 'a community link shows who invited you, and that sharing is your choice');
    ok(await P.isVisible('#hero-cta') && /Book your family call/.test(await P.textContent('#hero-cta')), 'landing: one call to action, the family call');
    await P.evaluate(() => { start(false); Object.assign(cur, { pc: 'LA1', area: 'Lancaster', home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', water: 'few', food: 'some', kit: [], budget: 20 }); qi = list().length - 1; drawQ(); next(); });
    await P.waitForTimeout(150);
    ok(await P.isVisible('#commcard') && await P.isChecked('#cm-anon') && !(await P.isChecked('#cm-named')) && !(await P.isVisible('#cm-name')), 'after the check: anonymous totals ticked, name not asked unless they choose');
    await P.click('text=Save my choice'); await P.waitForTimeout(100);
    ok(await P.evaluate(() => H[view].comm.state === 'shared' && !H[view].comm.named) && /anonymous totals/.test(await P.textContent('#commcard')), 'shared anonymously');
    const dd = await P.evaluate(() => commData(H[view]));
    ok(dd.ind.water === 0 && dd.ind.light === 0 && !('fwarn' in dd.ind) && !JSON.stringify(dd).match(/Lancaster|LA1/), 'what\'s shared: yes/no per essential, nothing about where they live');
    await P.evaluate(() => commDash('st-marys-caton')); await P.waitForTimeout(150);
    ok(/This is an example/.test(await P.textContent('#commbox')) && (await P.$$('.cbars li')).length > 5, 'the example dashboard shows totals');
    await P.evaluate(() => { CDTAB = 'news'; commDashDraw(); });
    ok(/Water to drink/.test(await P.textContent('.newsprev')) && /67%/.test(await P.textContent('.newsprev')), 'the example newsletter leads with the biggest gap: water');
    await P.close();

    // ---------- live: organiser starts a community ----------
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('fake_tab', '1'); } catch (e) {} });
    await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await ctx.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' }));
    const open = async u => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(u); await p.waitForFunction(() => window.__liveReady); await p.waitForTimeout(400); return p; };
    const O = await open(URL0);
    await O.evaluate(() => commStart()); await O.waitForTimeout(200);
    ok(await O.isVisible('#a-name'), 'starting a community asks for an account first');
    await O.fill('#a-name', 'Jo'); await O.fill('#a-email', 'jo@example.com'); await O.fill('#a-pw', 'password123'); await O.click('#v-auth button[type=submit]');
    await O.waitForSelector('#cs-name', { timeout: 15000 });
    ok(true, 'after signing up, the organiser goes straight to starting the community');
    await O.fill('#cs-name', "St Mary's Church, Caton"); await O.selectOption('#cs-kind', 'faith'); await O.fill('#cs-area', 'Lancaster');
    ok(await O.inputValue('#cs-slug') === 'st-marys-church-caton', 'the web address is suggested from the name');
    await O.fill('#cs-slug', 'stmarys'); await O.click('text=Start the community'); await O.waitForSelector('#ci-meet', { timeout: 10000 });
    await O.fill('#ci-meet', 'St Mary\'s church hall, Brookhouse Road'); await O.fill('#ci-help', 'We have a fund for essentials. Speak to Jo in confidence.'); await O.fill('#ci-contact', 'Jo: 01524 000000');
    await O.click('#commbox button[type=submit]'); await O.waitForTimeout(300);
    let d = await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(d.communities.length === 1 && d.communities[0].slug === 'stmarys' && d.communities[0].info.help.startsWith('We have a fund') && d.community_admins.length === 1, 'community and its local information saved; Jo is its organiser');
    await O.evaluate(() => commDash('stmarys', 'overview')); await O.waitForTimeout(300);
    ok(/0\s*homes have joined/.test(await O.textContent('#commbox')) && /once 5 homes have joined/.test(await O.textContent('#commbox')), 'no totals until 5 homes have joined');

    // ---------- six homes join from getfettle.co.uk/stmarys ----------
    const homes = [
      { water: 'none', named: 'Pat', contact: '07700 900333', ask: true },
      { water: 'none' }, { water: 'none' }, { water: 'none', named: 'Ali' },
      { water: 'all' }, { water: 'all' }];
    for (const [i, x] of homes.entries()) {
      const R = await open(URL0 + 'stmarys');
      if (i === 0) ok(/St Mary's Church, Caton/.test(await R.textContent('#commjoin')), 'the community\'s own link works: getfettle.co.uk/stmarys');
      await R.evaluate(x => { start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: x.water, food: 'yes', kit: ['torch', 'radio'], fa: 'yes', budget: 20 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); }, x);
      await R.waitForSelector('#commcard');
      if (x.named) { await R.check('#cm-named'); await R.fill('#cm-name', x.named); if (x.contact) await R.fill('#cm-contact', x.contact); }
      await R.click('text=Save my choice'); await R.waitForTimeout(200);
      if (x.ask) {
        await R.click('#commcard >> text=Ask them for help'); await R.check('input[name=cm-need][value=costs]'); await R.fill('#cm-note', "We can't afford the water this month.");
        await R.click('#commcard >> text=Send'); await R.waitForTimeout(200);
        await R.evaluate(() => { H[view].paid = true; return openBook(); }); await R.waitForTimeout(1200);
        const book = await R.textContent('#shelf');
        ok(/St Mary's church hall, Brookhouse Road/.test(book) && /We have a fund for essentials/.test(book), 'the resident\'s book has the community\'s meeting point and help');
      }
      if (i === 5) { ok(/Only this community's organisers/.test(JSON.stringify(await R.evaluate(() => window.commStats('stmarys')))), 'a member can\'t read the totals'); }
      await R.close();
    }
    d = await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')));
    ok(d.community_members.length === 6 && d.community_members.filter(m => m.named).length === 2 && !d.community_members.some(m => m.user_id || m.household_id), '6 homes joined, 2 with names, and no account or plan is linked to a row');

    // ---------- organiser sees totals, names given, the request, a newsletter ----------
    await O.evaluate(() => commDash('stmarys', 'overview')); await O.waitForTimeout(300);
    const ov = await O.textContent('#commbox');
    ok(/6\s*homes have joined/.test(ov) && /3 days of drinking water\s*67%\s*missing/.test(ov), 'totals: 4 of 6 homes are short of water (67%)');
    ok(/When homes joined/.test(ov) && /6\s*in the last hour/.test(ov) && (await O.$$('.cdays i')).length === 14, 'the organiser sees when homes joined: 6 in the last hour, and 14 days of bars');
    ok(!/A torch with spare batteries\s*\d+%/.test(ov) && /Almost every home has:[^.]*A torch with spare batteries/.test(ov), 'essentials that no home (or only 1 or 2) lack are listed as covered, without numbers');
    await O.evaluate(() => { CDTAB = 'help'; commDashDraw(); }); await O.waitForTimeout(100);
    const hp = await O.textContent('#commbox');
    ok(/We can't afford the water this month/.test(hp) && /Pat, 07700 900333/.test(hp), 'the help request, with the contact Pat chose to give');
    ok(/Ali/.test(hp) && (await O.$$('#commbox .calist li')).length === 2, 'only the 2 people who gave their names are listed');
    await O.click('text=Mark as sorted'); await O.waitForTimeout(200);
    ok((await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).community_requests[0].status)) === 'done', 'requests can be marked as sorted');
    await O.evaluate(() => { CDTAB = 'news'; commDashDraw(); }); await O.waitForTimeout(100);
    ok(/Food that needs no cooking/.test(await O.textContent('.newsprev')), 'the newsletter starts from the biggest gaps');
    const news = await O.evaluate(() => { let t = ''; shareText = x => { t = x; }; NEWSDRAFT.pick = ['water']; newsCopy(); return t; });
    ok(/Water to drink/.test(news) && /67%/.test(news) && /fund for essentials/.test(news) && /getfettle\.co\.uk\/stmarys/.test(news), 'newsletter: the water gap, how to fix it, the church\'s help, and the link');
    ok(!/Pat|Ali/.test(news), 'the newsletter never names anyone');
    // a resident leaves
    const tok = d.community_members[5].token;
    await O.evaluate(t => window.commLeave(t), tok);
    ok((await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).community_members.length)) === 5, 'stopping sharing removes the home from the totals');
    await O.evaluate(t => window.commLeave(t), d.community_members[0].token);
    ok((await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).community_requests.length)) === 0, 'and removes any help request that home sent');

    // ---------- keeping the totals honest ----------
    const R2 = await open(URL0 + 'stmarys');
    await R2.evaluate(() => { window.__fakeRobot = false; start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 1, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'none', food: 'yes', kit: [], fa: 'no', budget: 0 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
    await R2.waitForSelector('#commcard'); await R2.click('text=Save my choice'); await R2.waitForTimeout(200);
    ok(/couldn't check this was a person/.test(await R2.textContent('#cm-err')) && await R2.evaluate(() => H[view].comm.state !== 'shared'), 'a home that fails the robot check isn\'t added, and is told why');
    await R2.close();
    const before = (await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).community_members.length));
    const bulk = await O.evaluate(async () => { const out = []; for (let i = 0; i < 17; i++) out.push(await window.commShare('stmarys', crypto.randomUUID(), { v: 1, ind: { water: 1 } }, '', '')); return out; });
    ok(bulk.slice(0, 14).every(x => x === true) && bulk.slice(14).every(x => typeof x === 'string' && /internet connection/.test(x)), 'one internet connection can add 20 homes a day to a community, then is told to try tomorrow');
    ok((await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).community_members.length)) === before + 14, 'the extra homes weren\'t counted');
    ok(await O.evaluate(async () => { window.__fakeNet = 'net-2'; const r = await window.commShare('stmarys', crypto.randomUUID(), { v: 1, ind: {} }, '', ''); window.__fakeNet = 'net-1'; return r === true; }), 'another connection can still join');
    ok(/Add your home to their totals first/.test(String(await O.evaluate(() => window.commAsk('stmarys', crypto.randomUUID(), 'costs', 'spam', '', '')))), 'help requests only come from homes that have joined');
    // a home removed after a flag is added back when it next updates
    const back = await O.evaluate(async () => { const d = JSON.parse(localStorage.getItem('fake_db')), m = d.community_members[0]; d.community_members.shift(); localStorage.setItem('fake_db', JSON.stringify(d));
      window.__fakeNet = 'net-3'; const ok = await window.commShare('stmarys', m.token, m.data, '', ''); window.__fakeNet = 'net-1'; return ok === true && JSON.parse(localStorage.getItem('fake_db')).community_members.some(x => x.token === m.token); });
    ok(back, 'a real home that was removed rejoins on its next visit');
    // the organiser flags the burst
    await O.evaluate(() => commDash('stmarys', 'overview')); await O.waitForTimeout(300);
    ok(/16\s*in the last hour|1[0-9]\s*in the last hour|2[0-9]\s*in the last hour/.test(await O.textContent('#commbox')), 'the burst shows up in the last hour');
    await O.click('text=Something look wrong?'); await O.check('input[name=cf-h][value="1"]'); await O.fill('#cf-note', 'We had no event today.'); await O.click('text=Send to Fettle'); await O.waitForTimeout(300);
    const fl = await O.evaluate(() => JSON.parse(localStorage.getItem('fake_db')).community_flags);
    ok(fl && fl.length === 1 && fl[0].joins >= 15 && fl[0].note === 'We had no event today.', 'the flag is recorded with how many homes joined in that hour');
    ok(/You've flagged this/.test(await O.textContent('#commbox')), 'and the organiser sees it\'s being looked at');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); srv.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
