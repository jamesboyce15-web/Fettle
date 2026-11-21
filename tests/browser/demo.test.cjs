// The demo, end to end: an owner asks for a report on the area page, the admin records a visit, builds and saves the
// report, the owner opens it, uses the calculator and asks for a founding place. Also: the area page after publishing.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8781, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const SHOTS = process.env.SHOTS;
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('area: ' + e.message));
    await p.goto(U + '?demo=1'); await p.waitForTimeout(300);
    ok(/Elm Park \(demo\)/.test(await p.textContent('#app')) && /16/.test(await p.textContent('.stat b')), 'area page: the demo area and its café count');
    ok(/collecting menus/.test(await p.textContent('#app')), 'before publishing: no prices shown, says they are being collected');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/area-before.png', fullPage: true });
    await p.click('text=See where you stand'); await p.fill('#cafe', 'Oak & Oat (EP1 7AB)'); await p.fill('#nm', 'Alex Owner'); await p.fill('#em', 'alex@example.com');
    await p.click('#go'); await p.waitForTimeout(200);
    ok(/We'll email your report on Oak &amp; Oat|We'll email your report on Oak & Oat/.test(await p.innerHTML('#thanks')), 'the request is sent and confirmed');
    // admin
    const a = await ctx.newPage(); await a.setViewportSize({ width: 1280, height: 900 }); a.on('pageerror', e => errs.push('admin: ' + e.message));
    await a.goto(U + 'admin.html?demo=1'); await a.waitForTimeout(300);
    ok(/Alex Owner/.test(await a.textContent('#main')), 'admin sees the new request');
    await a.click('[data-nav=search]'); await a.waitForTimeout(150);
    ok(/On Google/.test(await a.textContent('#main')) && /Dog-friendly café in Elm Park/.test(await a.textContent('#main')) && (await a.$$('[data-gbp]')).length > 20, 'admin: search checks for every café, and the AI questions and answers');
    await a.click('[data-gbp="dv1.gbp_reviews"]'); await a.waitForTimeout(100);
    ok(await a.evaluate(() => __patch.S.venues.find(v => v.id === 'dv1').seo.checks.gbp_reviews === true), 'ticking a Google profile check saves it');
    await a.click('[data-nav=record]'); await a.fill('#recCafe', 'Oak & Oat (EP1 7AB)'); await a.dispatchEvent('#recCafe', 'change'); await a.waitForTimeout(100);
    await a.fill('[data-price=flat_white]', '3.10'); await a.fill('[data-price=cake]', '3.20'); await a.click('[data-score=clean][data-v="5"]'); await a.click('[data-score=friendly][data-v="5"]');
    await a.click('[data-act=saverec]'); await a.waitForTimeout(150);
    ok(await a.evaluate(() => __patch.S.obs.some(o => o.venueId === 'dv6' && o.prices.flat_white === 3.1)), 'a visit with prices and scores is saved');
    await a.click('[data-nav=requests]'); await a.click('tr[data-req] >> text=Alex Owner'); await a.waitForTimeout(100);
    await a.click('[data-act=build]'); await a.waitForTimeout(150);
    const acts = await a.inputValue('#actions');
    ok(/flat white is £0\.\d\d below the nearby average/.test(acts), 'draft actions point out the cheap flat white: ' + acts.split('\n')[0]);
    await a.click('[data-act=savereport]'); await a.waitForTimeout(150);
    const href = await a.getAttribute('text=Open it', 'href');
    ok(/report\.html\?t=demo-.*&demo=1|report\?t=demo-.*&demo=1/.test(href), 'the report has its own private link: ' + href);
    if (SHOTS) await a.screenshot({ path: SHOTS + '/admin-request.png', fullPage: true });
    await a.click('[data-act=emailreport]'); await a.waitForTimeout(200);
    ok(/Your Patch report for/.test(await a.textContent('#main')) && /dry-run/.test(await a.textContent('#main')), 'emailing the report in the demo writes it to the log, not sent');
    ok((await a.$$('#main iframe')).length === 3, 'the Emails tab previews all three emails for approval');
    await a.click('[data-nav=calendar]'); await a.click('[data-act=addcal]'); const last = (await a.$$('[data-cal$=".title"]')).length - 1;
    const day = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    await a.fill(`[data-cal="${last}.title"]`, 'Christmas lights switch-on'); await a.dispatchEvent(`[data-cal="${last}.title"]`, 'change');
    await a.fill(`[data-cal="${last}.start"]`, day); await a.dispatchEvent(`[data-cal="${last}.start"]`, 'change');
    await a.click('[data-act=savecal]'); await a.waitForTimeout(100);
    await a.click('[data-nav=area]'); await a.click('[data-act=publish]'); await a.waitForTimeout(150);
    // owner's report
    const r = await ctx.newPage(); r.on('pageerror', e => errs.push('report: ' + e.message));
    await r.goto(new URL(href, U).href); await r.waitForTimeout(300);
    ok(/Oak &amp; Oat|Oak & Oat/.test(await r.innerHTML('h1')) && /10 cafés nearest you/.test(await r.textContent('.lede')), 'the owner sees their report against the 10 nearest');
    await r.fill('input[aria-label="Flat white sold a week"]', '150'); await r.waitForTimeout(100);
    const head = await r.textContent('#headline');
    ok(/£[\d,]+ a year/.test(head), 'the calculator turns a weekly figure into money a year: ' + head.replace(/\s+/g, ' ').trim());
    // a till export: 12 weeks from 3 August 2026, quiet on the August bank holiday
    const lines = ['Date,Time,Item,Gross Sales']; const t0 = Date.UTC(2026, 7, 3);
    for (let d = 0; d < 84; d++) { const t = new Date(t0 + d * 864e5), ds = t.toISOString().slice(0, 10), bank = ds === '2026-08-31';
      for (let h = 8; h <= 15; h++) { const n = Math.round((h <= 9 ? 10 : 4) * (bank ? 0.5 : 1)); for (let i = 0; i < n; i++) lines.push(`${ds},${h}:${String(i * 5).padStart(2, '0')},Flat white,3.40`); } }
    const csv = path.join(require('os').tmpdir(), 'patch-till.csv'); fs.writeFileSync(csv, lines.join('\n'));
    await r.setInputFiles('#salesFile', csv); await r.waitForTimeout(300);
    ok(await r.isVisible('.heat') && /£3\.40/.test(await r.textContent('#salesOut')), 'a till export becomes an hour-by-hour picture');
    ok(/Bank holidays/.test(await r.textContent('#salesOut')) && /-\d+%/.test(await r.textContent('#salesOut')), 'and shows what bank holidays did to takings');
    await r.check('#shareSales'); await r.waitForTimeout(150);
    ok(/Shared/.test(await r.textContent('#shareMsg')), 'the owner can share totals only');
    if (SHOTS) await r.screenshot({ path: SHOTS + '/report-sales.png', fullPage: true });
    await r.click('#fgo'); await r.waitForTimeout(150);
    ok(/We'll be in touch/.test(await r.textContent('#found')), 'asking for a founding place charges nothing and says thanks');
    if (SHOTS) await r.screenshot({ path: SHOTS + '/report.png', fullPage: true });
    await p.goto(U + '?demo=1'); await p.waitForTimeout(300);
    ok(/What cafés here charge/.test(await p.textContent('#app')) && /Flat white/.test(await p.textContent('#app')) && /Christmas lights/.test(await p.textContent('#app')) && /Who's on your doorstep/.test(await p.textContent('#app')), 'after publishing: typical prices and local events on the area page');
    ok(!/Oak & Oat.*£3\.10/.test(await p.textContent('#app')), 'no café is named with its prices on the public page');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/area-after.png', fullPage: true });
    await a.goto(U + 'admin.html?demo=1'); await a.waitForTimeout(200);
    ok(/Wants a founding place/.test(await a.textContent('#main')), 'admin sees who wants a founding place');
    ok(await a.evaluate(() => { const r = __patch.S.area.rankings; return r && r.dv1 && r.dv1.visit && r.dv1.visit.of > 3; }), 'publishing ranks every café on its visits');
    const bad = await ctx.newPage(); await bad.goto(U + 'report.html?t=nope&demo=1'); await bad.waitForTimeout(200);
    ok(/couldn't find this report/.test(await bad.textContent('#app')), 'a wrong link shows nothing');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL ' + e.message); fail++; }
  await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
