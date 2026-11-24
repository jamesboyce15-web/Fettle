// The salon price check in the demo: an owner swaps prices for an instant comparison; admin sees the prices waiting,
// adds them, and the coverage view counts them.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8785, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const SHOTS = process.env.SHOTS;
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(U + 'price-check.html?demo=1'); await p.waitForTimeout(400);
    ok(/How do your prices compare/.test(await p.textContent('#app')), 'the price check opens for the demo salon area');
    ok((await p.$$('[data-p]')).length === 0, 'no services until they say what they do');
    await p.fill('#venue', 'Old Town Barbers'); await p.dispatchEvent('#venue', 'change'); await p.waitForTimeout(100);
    ok((await p.$eval('#kind', e => e.value)) === 'barber', 'picking their business from the list sets what they do');
    const svc = await p.$$eval('[data-p]', es => es.map(e => e.dataset.p)); ok(svc.includes('m_cut') && !svc.includes('balayage'), 'a barber is asked about barber services only');
    await p.click('#all'); ok((await p.$$('[data-p]')).length > svc.length, 'every service can be shown'); await p.click('#all');
    await p.fill('[data-p=m_cut]', '15'); await p.fill('[data-w=m_cut]', '40'); await p.fill('[data-p=skin_fade]', '£21'); await p.fill('[data-p=beard]', '30');
    await p.fill('#nm', 'Sam Test'); await p.fill('#em', 'sam@example.com');
    await p.click('#go'); ok(/Tick the box/.test(await p.textContent('#err')), 'prices are only taken with their say-so');
    await p.check('#ok'); await p.click('#go'); await p.waitForTimeout(300);
    const res = await p.textContent('#app');
    ok(/Here's how you compare, Sam/.test(res), 'the comparison shows straight away');
    ok(/under the middle price/.test(res) && /a year/.test(res), 'under the middle on a haircut, with what going halfway is worth');
    ok(/over the middle price/.test(res), 'over the middle on a beard trim');
    ok(!/Fringe Benefits|Blade Runners|Clipper Club/.test(res), 'no other business is named');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/price-check.png', fullPage: true });

    const a = await ctx.newPage(); a.on('pageerror', e => errs.push(e.message)); await a.setViewportSize({ width: 1200, height: 900 });
    await a.goto(U + 'admin.html?demo=1'); await a.waitForTimeout(500);
    await a.selectOption('#areaSel', 'area-demo-salons'); await a.waitForTimeout(300);
    await a.click('[data-nav=coverage]'); await a.waitForTimeout(150);
    const cov = await a.textContent('#main');
    ok(/Enough prices to mean something/.test(cov) && /1<\/b>|price checks to look over/.test(cov), 'coverage shows services against the target');
    const waitingBefore = await a.$eval('#main .stat:nth-child(4) b', e => e.textContent); ok(waitingBefore === '1', 'one price check waiting to be looked over');
    ok(/Who to ask next/.test(cov) && (await a.$$('[data-copy*="&v="]')).length > 0, 'a list of who to ask next, each with their own link');
    await a.click('[data-nav=requests]'); await a.waitForTimeout(150);
    await a.click('text=Sam Test'); await a.waitForTimeout(150);
    ok(/They sent their menu board/.test(await a.textContent('#main')), 'admin sees the prices they sent');
    await a.click('[data-act=usemenu]'); await a.waitForTimeout(200);
    await a.click('[data-nav=coverage]'); await a.waitForTimeout(150);
    ok((await a.$eval('#main .stat:nth-child(4) b', e => e.textContent)) === '0', 'once added, nothing is waiting');
    if (SHOTS) await a.screenshot({ path: SHOTS + '/coverage.png', fullPage: true });
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join('; ') : ''));
  } catch (e) { ok(false, 'crashed: ' + e.message); } finally { await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
