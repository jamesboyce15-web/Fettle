// Offers beside renewals, in the demo: the owner sees a deal to compare on their insurance renewal, with what they paid,
// the disclosure and no stale price; clicking is counted; admin sees the click and can add an offer.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8786, U = `http://localhost:${PORT}/`;
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
    await p.goto(U + 'owner.html?demo=1'); await p.waitForTimeout(600);
    // Make the insurance renewal due soon, with last year's premium on file.
    await p.evaluate(() => { const S = window.__owner.S, r = S.reminders.find(x => /insurance/i.test(x.t)); r.due = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
      S.docs = (S.docs || []).concat({ id: 'd1', rid: r.id, title: r.t, name: 'schedule.pdf', at: '2025-12-01', premium: 512, insurer: 'Acme Mutual' }); });
    const rems = await p.evaluate(() => window.__owner.S.reminders.map(r => r.t));
    ok(rems.some(t => /Energy contract/.test(t)) && rems.some(t => /Card machine/.test(t)), 'energy and card contracts are added to their reminders');
    await p.click('[data-tab=actions]'); await p.click('[data-act=allacts]').catch(() => {}); await p.waitForTimeout(200);
    const card = await p.$('article[data-key^="rem:r:"]:has-text("Insurance")');
    ok(!!card && /Deal to compare/.test(await card.textContent()) && /from £380 a year/.test(await card.textContent()), 'the renewal shows a deal to compare, with its checked price');
    await card.$eval('[data-kit]', e => e.click()); await p.waitForTimeout(200);
    const m = await p.textContent('.modal');
    ok(/You paid £512 with Acme Mutual/.test(m), 'what they paid last time');
    ok(/could be up to £132 less, if the cover matches/.test(m), 'a possible saving, worded as could and like for like');
    ok(/don't give insurance advice/.test(m) && /may be paid by them/.test(m), 'the regulation line and the disclosure');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/offer.png', fullPage: true });
    await p.click('[data-offer="of1"]'); await p.waitForTimeout(200);
    const clicks = await p.evaluate(() => JSON.parse(localStorage.getItem('patch-demo-db-v10')).offer_clicks.length); ok(clicks === 1, 'the click is counted');
    await p.evaluate(() => { const S = window.__owner.S, r = S.reminders.find(x => /card machine/i.test(x.t)); r.due = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10); });
    await p.click('.modal [data-act=closemodal]'); await p.click('[data-tab=home]'); await p.click('[data-tab=actions]'); await p.click('[data-act=allacts]').catch(() => {}); await p.waitForTimeout(200);
    const cardC = await p.$('article[data-key^="rem:r:"]:has-text("Card machine")');
    ok(!!cardC && /TapRight/.test(await cardC.textContent()) && !/1\.39/.test(await cardC.textContent()), 'a price not checked for weeks is not shown');

    const a = await ctx.newPage(); a.on('pageerror', e => errs.push(e.message)); await a.setViewportSize({ width: 1200, height: 900 });
    await a.goto(U + 'admin.html?demo=1'); await a.waitForTimeout(500); await a.click('[data-nav=offers]'); await a.waitForTimeout(300);
    const t = await a.textContent('#main');
    ok(/Shopfront Cover/.test(t) && /hidden from owners/.test(t), 'admin sees the offers, and which price is too old to show');
    ok(/1\s*1 owners/.test(t.replace(/\s+/g, ' ')) || /1 owners/.test(t), 'admin sees the click');
    await a.click('[data-act=newoffer]'); await a.fill('[data-of=provider]', 'Test Energy'); await a.selectOption('#of-kind', 'energy'); await a.check('#of-live');
    await a.click('[data-act=saveoffer]'); ok(/Add their link/.test(await a.textContent('#of-err')), "an offer can't go live without a link");
    await a.fill('[data-of=url]', 'https://example.com/x'); await a.click('[data-act=saveoffer]'); await a.waitForTimeout(200);
    ok(/Test Energy/.test(await a.textContent('#main')), 'a new offer is saved');
    if (SHOTS) await a.screenshot({ path: SHOTS + '/offers-admin.png', fullPage: true });
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join('; ') : ''));
  } catch (e) { ok(false, 'crashed: ' + e.message); } finally { await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
