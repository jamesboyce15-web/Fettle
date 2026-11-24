// A price sweep in the demo: the student's phone list, a photo read straight away, a skip; then admin checks and approves,
// owners are updated, and the owner sees what's changed nearby.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8784, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const SHOTS = process.env.SHOTS;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAG0lEQVR4nGP4z8DwHwkzMDCgMUgUQwVY4qQKAgCwLR/hQ4G0mAAAAABJRU5ErkJggg==', 'base64');
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(U + 'sweep.html?demo=1'); await p.waitForTimeout(500);
    const head = await p.textContent('#app');
    ok(/November prices/.test(head) && /£15/.test(head), 'the sweeper sees the sweep and what they have earned so far (3 approved × £5)');
    const todo = (await p.$$('.cafe')).length; ok(todo >= 8, 'a list of cafés still to do: ' + todo);
    const first = await p.getAttribute('[data-photo]', 'data-photo');
    await p.setInputFiles(`[data-photo="${first}"]`, { name: 'board.png', mimeType: 'image/png', buffer: PNG }); await p.waitForTimeout(600);
    await p.click('[data-f=all]'); ok(/Got it: \d+ prices read/.test(await p.textContent(`#c-${first}`)), 'the photo is read straight away and the sweeper told');
    await p.click('[data-f=todo]'); const second = await p.getAttribute('[data-skip]', 'data-skip');
    await p.click(`[data-skip="${second}"]`); await p.click(`[data-why="${second}"][data-r="No menu board"]`); await p.waitForTimeout(150);
    await p.click('[data-f=all]'); ok(/No menu board/.test(await p.textContent(`#c-${second}`)), 'a café with no board can be skipped, with the reason');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/sweep.png', fullPage: true });

    const a = await ctx.newPage(); a.on('pageerror', e => errs.push(e.message)); await a.setViewportSize({ width: 1200, height: 900 });
    await a.goto(U + 'admin.html?demo=1'); await a.waitForTimeout(500); await a.click('[data-nav=sweeps]'); await a.waitForTimeout(200);
    await a.click('button[data-sw="sw1"]'); await a.waitForTimeout(300);
    const det = await a.textContent('#main'); ok(/3 to check/.test(det) && /Pay Alex \(made up\) £15\.00/.test(det), 'admin sees what needs checking and what to pay: ' + (det.match(/\d+ approved[^.]*\./) || [''])[0]);
    const firstBox = await a.getAttribute('[data-swok]', 'data-swok'); await a.click(`[data-swok="${firstBox}"]`); await a.waitForTimeout(250);
    ok(/4 approved/.test(await a.textContent('#main')) && /£20\.00/.test(await a.textContent('#main')), 'approving adds the prices and the pay');
    const re = await a.getAttribute('[data-swre]', 'data-swre'); await a.fill(`#rt-${re}`, 'Board cut off on the right'); await a.click(`[data-swre="${re}"]`); await a.waitForTimeout(200);
    ok(/retake/.test(await a.textContent('#main')), 'a blurry one goes back for a retake');
    await a.click('[data-act=updowners]'); await a.waitForTimeout(300);
    const rk = await a.evaluate(() => JSON.parse(localStorage.getItem('patch-demo-db-v9')).areas[0].rankings.dv1);
    ok(rk && rk.moves && rk.moves.length && rk.prices.length === 12, 'owners are updated with prices and what has moved');
    await a.click('[data-nav=sweeps]'); await a.fill('#sw-who', 'Sam'); await a.click('[data-act=newsweep]'); await a.waitForTimeout(300);
    const lk = await a.$('input[aria-label="The sweep link"]'); if (!lk) console.log('DEBUG', await a.textContent('#main').then(t => t.slice(0, 300)));
    ok(lk && /sweep(\.html)?\?s=/.test(await lk.inputValue()), 'a new sweep makes a link to send');

    const o = await ctx.newPage(); o.on('pageerror', e => errs.push(e.message)); await o.goto(U + 'owner.html?demo=1'); await o.waitForTimeout(500);
    ok(/cafés nearby have put up their/.test(await o.textContent('#app')), 'the owner\'s week says who has put prices up nearby');
    await o.click('[data-tab=insights]'); await o.click('[data-sub=prices]'); await o.waitForTimeout(150);
    ok(/What's changed nearby since/.test(await o.textContent('#app')) && /of \d+ put it up/.test(await o.textContent('#app')), 'and the detail is in Insights, Prices');
    await o.click('[data-tab=upload]'); await o.setInputFiles('#menuIn', { name: 'm.png', mimeType: 'image/png', buffer: PNG }); await o.waitForTimeout(200);
    await o.fill('[data-mb=flat_white]', '3.60'); await o.click('[data-k=mb-save]'); await o.waitForTimeout(450);
    ok(await o.evaluate(() => JSON.parse(localStorage.getItem('patch-demo-db-v9')).requests.find(r => r.token === 'demo-owner').owner_state.menuBoard.prices.flat_white === 3.6), 'an owner can send their own menu board');
    ok(errs.length === 0, 'no page errors ' + errs.join('; '));
  } catch (e) { ok(false, 'crashed: ' + e.message); }
  await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
