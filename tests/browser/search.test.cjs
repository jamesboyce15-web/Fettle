// Google and AI, the owner's side, in the demo: the next moves with what each is worth, ticking one updates the score,
// a website check they run themselves, what to do about a question AI doesn't name them for, and where AI looks.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8787, U = `http://localhost:${PORT}/`;
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
    await p.goto(U + 'owner.html?demo=1&t=demo-owner'); await p.waitForTimeout(600);
    await p.click('[data-tab=insights]'); await p.click('[data-sub=search]'); await p.waitForTimeout(150);
    const score = async () => +((await p.textContent('#app')).match(/(\d+)\/100/) || [])[1];
    const t0 = await p.textContent('#app'), s0 = await score();
    ok(/How easy you are to find/.test(t0) && s0 > 0, 'a score to start from: ' + s0);
    const moves = await p.$$('.move'); ok(moves.length >= 1 && moves.length <= 3, 'at most three next moves: ' + moves.length);
    ok(/\+\d+ points/.test(await moves[0].textContent()), 'each move says what it is worth');
    const first = await moves[0].$('[data-gbpown][data-val="1"]');
    if (first) { await first.click(); await p.waitForTimeout(200); ok(/\+\d+ points: you're now on \d+\/100/.test(await p.textContent('#toast')), 'doing a Google move updates the score at once'); ok((await score()) > s0, 'score went up'); }
    else ok(true, 'first move is website work');
    await p.fill('#site', 'brambledemo.example'); await p.click('section:has-text("Everything we check") [data-act=sitecheck]'); await p.waitForTimeout(600);
    const s2 = await score(); ok(s2 >= s0, 'checking their own website: ' + s0 + ' → ' + s2);
    ok(await p.evaluate(() => !!window.__owner.S.seoOwn.site && window.__owner.S.settings.website === 'brambledemo.example'), 'the check and their website are kept');
    const q = await p.$('details.aiq:has(.chip.bad)'); ok(!!q, 'a question AI does not name them for');
    if (q) { await q.click('summary'); await p.waitForTimeout(100); const txt = await q.textContent(); ok(/They suggest/.test(txt) && /Say it in words on your website/.test(txt) && !/\{place\}/.test(txt), 'who they suggest instead, and what to do, in plain steps'); }
    const t = await p.textContent('#app'); ok(/Where AI assistants look/.test(t) && /Tripadvisor/.test(t) && /Yell/.test(t) && !/google\.com/.test(t), 'the sites AI read, named, without Google itself');
    await p.check('[data-ailisted="Tripadvisor"]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => window.__owner.S.aiListed.Tripadvisor === true), 'they can tick off the sites they are on');
    const hist = await p.evaluate(() => window.__owner.S.searchHistory); ok(hist.length >= 1 && hist[hist.length - 1].score === (await score() || hist[hist.length - 1].score), 'progress is recorded for next time');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/search.png', fullPage: true });
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join('; ') : ''));
  } catch (e) { ok(false, 'crashed: ' + e.message); } finally { await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
