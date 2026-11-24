// Every page at phone width: nothing scrolls sideways, every page has a way home, dead ends point somewhere useful.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8791, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { fs.readFile(path.join(PUB, '404.html'), (e2, b2) => { s.writeHead(404, { 'Content-Type': 'text/html' }); s.end(b2); }); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 375, height: 800 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    const wide = async () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const pages = ['?demo=1', 'prices.html?a=demo-salons&demo=1', 'price-check.html?demo=1', 'members.html?demo=1', 'my.html?demo=1', 'b.html?b=paws-and-polish-demo&demo=1', 'owner.html?demo=1', 'report.html?demo=1', 'visit.html?demo=1', 'sweep.html?demo=1', 'privacy.html', 'nowhere'];
    for (const u of pages) { await p.goto(U + u); await p.waitForTimeout(400); const w = await wide(); ok(w <= 1, `${u}: fits a phone (${w}px over)`); if (!/sweep|b\.html/.test(u)) ok(!!(await p.$('a.brand')), `${u}: the logo leads home`); }
    await p.goto(U + 'admin.html?demo=1'); await p.waitForTimeout(500);
    for (const n of await p.$$eval('[data-nav]', es => es.map(e => e.dataset.nav))) { await p.click(`[data-nav=${n}]`); await p.waitForTimeout(150); const w = await wide(); ok(w <= 1, `admin ${n}: fits a phone (${w}px over)`); }
    await p.goto(U + 'report.html?demo=1'); await p.waitForTimeout(400); ok(!/missing its code/.test(await p.textContent('#app')), 'the demo report opens without a code');
    await p.goto(U + 'nowhere'); ok(/can't find that page/.test(await p.textContent('main')), 'a wrong link gets a helpful page');
    await p.goto(U + 'privacy.html'); ok(/Your rights/.test(await p.textContent('main')), 'there is a privacy page');
    await p.goto(U + 'prices.html?a=demo-salons&demo=1'); await p.waitForTimeout(400); const t = await p.innerText('body');
    ok(/made-up salons and barbers/.test(t) && /What salons and barbers in Elm Park/.test(t) && !/hygiene/i.test(t) && !/Elm Park salons/.test(t), 'the salon area page talks about salons, not cafés or hygiene');
    ok(/privacy\.html/.test(await p.innerHTML('#foot')), 'the area page links to privacy');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join('; ') : ''));
  } catch (e) { ok(false, 'crashed: ' + e.message); } finally { await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
