// The family call: booking from the home page (live, through /api/book-call), the coordinator running a call in the
// dashboard (demo data), the shared screen, sending the plan, the watch list, and the family's own plan page.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8771, URL0 = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', png: 'image/png' };
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); res.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await chromium.launch(); const errs = [];
  try {
    // ---------- booking, live ----------
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",freeBook:true};' }));
    await ctx.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8') }));
    let sent = null;
    await ctx.route('**/api/book-call', async r => { sent = JSON.parse(r.request().postData()); await r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('landing: ' + e.message));
    await p.goto(URL0 + '?via=hv'); await p.waitForFunction(() => window.__liveReady);
    const ctas = await p.$$eval('#v-landing button.btn', bs => [...new Set(bs.map(x => x.textContent.trim()))]);
    ok(ctas.length === 1 && ctas[0] === 'Book your family call', 'the home page has one call to action: ' + ctas.join(' | '));
    ok(!(await p.isVisible('header.top a.hdrlink')), 'no shop or guides links in the header on the home page');
    await p.click('#hero-cta'); await p.waitForTimeout(150);
    await p.fill('[name=booker_name]', 'Tom Hughes'); await p.fill('[name=booker_email]', 'tom@example.com'); await p.fill('[name=for_name]', 'Margaret');
    await p.fill('[name=for_district]', 'la1'); await p.click('label:has(input[name=lives_alone][value=true])'); await p.click('label:has(input[name=times][value="Weekend"])');
    await p.click('#callgo'); await p.waitForTimeout(150);
    ok(/know about the call/.test(await p.textContent('#callerr')) && !sent, 'asks them to check the person knows first, and sends nothing');
    await p.check('[name=told]'); await p.click('#callgo'); await p.waitForTimeout(300);
    ok(sent && sent.booker_email === 'tom@example.com' && sent.for_district === 'LA1' && sent.lives_alone === true && sent.times.join() === 'Weekend' && sent.source === 'hv' && 'turnstile' in sent, 'the booking goes to /api/book-call with what they entered');
    ok(/We've got your request/.test(await p.textContent('#callbox')) && /tom@example.com/.test(await p.textContent('#callbox')), 'confirmation says who will be emailed');
    await ctx.close();

    // ---------- the coordinator, in the demo ----------
    const c = await b.newPage({ viewport: { width: 1360, height: 900 } }); c.on('pageerror', e => errs.push('coordinator: ' + e.message));
    await c.goto(URL0 + 'coordinator.html?demo=1'); await c.waitForTimeout(300);
    ok(/New request from Helen Brookes/.test(await c.textContent('#main')) && /prescribed insulin/.test(await c.textContent('#main')), 'Today: new requests and family messages need attention');
    await c.click('[data-nav=requests]'); await c.click('tr[data-req="rq-new1"]');
    await c.fill('[data-rq=scheduled_at]', '2030-01-10T18:00'); await c.dispatchEvent('[data-rq=scheduled_at]', 'change'); await c.waitForTimeout(100);
    ok(await c.evaluate(() => __coord.S().requests.find(r => r.id === 'rq-new1').status) === 'scheduled', 'putting in a time books the call');
    await c.click('[data-start="rq-new1"]'); await c.waitForTimeout(200);
    ok(await c.evaluate(() => __coord.V.view === 'client') && /Brookes/.test(await c.inputValue('[data-k="@family_name"]')), 'starting the call makes a family from the request');
    ok(/Joan/.test(await c.textContent('#rail')) && /Gap/.test(await c.textContent('#rail')), 'the rail shows Joan, uncovered');
    // helpers
    await c.click('.step[data-step="3"]'); await c.waitForTimeout(100);
    await c.fill('[data-k="helpers.0.miles"]', '40'); await c.check('[data-k="helpers.0.car"]'); await c.check('[data-k="helpers.0.kids"]'); await c.waitForTimeout(100);
    ok(/Children or someone to care for/.test(await c.textContent('#reasons')), 'the reasons table explains why Helen can\'t come');
    await c.click('[data-add-helper="neighbour"]'); await c.waitForTimeout(100);
    await c.fill('[data-k="helpers.1.name"]', 'Bob'); await c.fill('[data-k="helpers.1.miles"]', '0.2'); await c.dispatchEvent('[data-k="helpers.1.miles"]', 'change'); await c.waitForTimeout(150);
    const cov = await c.evaluate(() => { const S = __coord.S(), cl = S.clients.find(x => x.family_name === 'Brookes'); return __coord.K.coverage(cl.data, cl.data.geo).map(r => Object.values(r.bands).map(b => b.status).join()).join(); });
    ok(cov === 'thin,thin,thin', 'a neighbour on foot covers every band, without a backup yet: ' + cov);
    // home answers
    await c.click('.step[data-step="1"]'); await c.waitForTimeout(100);
    await c.selectOption('[data-k="homes.0.a.phone"]', 'digital'); await c.waitForTimeout(150);
    ok(await c.isVisible('[data-yn="homes.0.a.phoneBackup"]'), 'a digital landline asks about battery backup');
    await c.click('[data-yn="homes.0.a.phoneBackup"][data-v="false"]'); await c.waitForTimeout(100);
    ok(/landline stops/.test(await c.textContent('#rail')), 'the finding appears straight away');
    // shared screen + send
    const [pop] = await Promise.all([c.waitForEvent('popup'), c.click('[data-act=present]')]);
    await pop.waitForTimeout(1200);
    ok(/Live/.test(await pop.textContent('#live')) && /Brookes family plan/.test(await pop.textContent('#app')), 'present opens the live family view');
    await pop.close();
    await c.click('[data-act=send]'); await c.waitForTimeout(100);
    ok(/plan\.html\?demo=1&t=/.test(await c.inputValue('#sendbody')) && (await c.getAttribute('#mailto', 'href')).startsWith('mailto:helen@example.com'), 'send drafts an email with the family link, from your own email');
    await c.click('[data-act=marksent]'); await c.waitForTimeout(200);
    ok(await c.evaluate(() => { const cl = __coord.S().clients.find(x => x.family_name === 'Brookes'); return cl.status === 'plan_sent' && !!cl.sent_at && !!cl.next_review; }), 'marked as sent: status, date and a yearly review');
    // watch
    await c.click('[data-nav=watch]'); await c.click('[data-open-ev=ev1]'); await c.waitForTimeout(150);
    const rows = await c.$$eval('#evd tbody tr', r => r.map(x => x.querySelector('button').textContent));
    ok(rows[0] === 'Okafor' && rows.includes('Hughes') && !rows.includes('Brookes'), 'the warning lists families in those areas, highest risk first: ' + rows.join());
    await c.check('[data-contacted="cl-okafor"]'); await c.waitForTimeout(100);
    ok(await c.evaluate(() => !!__coord.S().events[0].contacted['cl-okafor']), 'ticking contacted is saved on the event');
    await c.fill('#ev-title', 'New warm space at St Mary\'s'); await c.selectOption('#ev-kind', 'resource'); await c.fill('#ev-districts', 'M14'); await c.fill('#ev-source', 'javascript:alert(1)');
    await c.click('[data-act=logev]'); await c.waitForTimeout(150); await c.click('[data-act=addres]'); await c.waitForTimeout(150);
    ok(await c.evaluate(() => { const cl = __coord.S().clients.find(x => x.id === 'cl-patel'); return cl.data.resources.some(r => /warm space/.test(r.title) && r.source === ''); }), 'new local help goes into affected plans, and only web links are kept');

    // ---------- the family's plan ----------
    const f = await b.newPage({ viewport: { width: 390, height: 844 } }); f.on('pageerror', e => errs.push('plan: ' + e.message));
    await f.goto(URL0 + 'plan.html?demo=1&t=demo-hughes'); await f.waitForTimeout(400);
    ok(/Hughes family plan/.test(await f.textContent('h1')) && /Covered/.test(await f.textContent('#app')), 'the plan shows who can get there');
    await f.click('.tab.r'); ok(await f.isVisible('[data-panel=r]') && /walking distance/.test(await f.textContent('[data-panel=r]')), 'Red tab: the national emergency plan');
    await f.fill('#fpv-name', 'Tom'); await f.fill('#fpv-msg', 'Mum has a new hearing aid'); await f.click('#fpv-send'); await f.waitForTimeout(150);
    ok(/Sent/.test(await f.textContent('#fpv-sent')) && (await f.evaluate(() => window.__sentMessages[0].text)) === 'Mum has a new hearing aid', 'something\'s changed: the message goes to the coordinator');
    await f.goto(URL0 + 'plan.html?t=not-a-token'); await f.waitForTimeout(300);
    ok(/couldn't find this plan/.test(await f.textContent('#app')), 'a bad link says so, and asks nothing of the database');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL ' + e.message); fail++; }
  await b.close(); srv.close();
  console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
