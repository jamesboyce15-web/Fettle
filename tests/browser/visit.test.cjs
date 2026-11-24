// The visit form in the demo: pick a café, Google details, photos, scores with a live rank, prices, save.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8783, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const SHOTS = process.env.SHOTS;
// a small real PNG to upload as a "photo"
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAG0lEQVR4nGP4z8DwHwkzMDCgMUgUQwVY4qQKAgCwLR/hQ4G0mAAAAABJRU5ErkJggg==', 'base64');
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(U + 'visit.html?demo=1'); await p.waitForTimeout(500);
    ok((await p.$$('#pick li button')).length > 5, 'a list of cafés to pick from');
    await p.fill('#q', 'little fig'); ok((await p.$$('#pick li button')).length === 1, 'typing narrows the list');
    await p.click('#pick li button'); await p.waitForTimeout(100);
    ok(/Little Fig/.test(await p.textContent('.venue')) && /Find them on Google Maps/.test(await p.textContent('#app')), 'the café is chosen, with a link to find it on Google');
    await p.fill('[data-g=url]', 'https://maps.app.goo.gl/abc123'); await p.fill('[data-g=rating]', '4.6'); await p.fill('[data-g=reviews]', '212');
    await p.setInputFiles('#photoIn', [{ name: 'counter.png', mimeType: 'image/png', buffer: PNG }, { name: 'board.png', mimeType: 'image/png', buffer: PNG }]); await p.waitForTimeout(400);
    ok((await p.$$('.ph')).length === 2 && await p.inputValue('[data-ptag="1"]') === 'Menu board', 'two photos, labelled counter and menu board');
    ok(/Answer a few more/.test(await p.textContent('#dock')), 'no score until enough is answered');
    for (const [k, v] of [['welcome', 5], ['friendly', 5], ['coffee', 5], ['clean', 4], ['value', 4], ['ambience', 5], ['food', 4]]) await p.click(`[data-s=${k}][data-v="${v}"]`);
    await p.click('[data-s=toilets][data-v=na]'); await p.click('[data-s=accuracy][data-v=true]'); await p.click('[data-s=wifi][data-v=true]');
    for (let i = 0; i < 2; i++) await p.click('[data-step=wait][data-d="1"]');
    const dock = await p.textContent('#dock'); ok(/\d+\/100/.test(dock) && /of \d+/.test(dock), 'a live score and rank: ' + dock.trim());
    ok((await p.$$('#where .dim')).length >= 8, 'each answer against the middle nearby');
    await p.fill('[data-price=flat_white]', '3.60');
    if (SHOTS) await p.screenshot({ path: SHOTS + '/visit.png', fullPage: true });
    await p.reload(); await p.waitForTimeout(500);
    ok(await p.$eval('[data-s=coffee][data-v="5"]', b => b.getAttribute('aria-pressed')) === 'true', 'answers survive closing the page (photos excepted)');
    await p.setInputFiles('#photoIn', [{ name: 'drink.png', mimeType: 'image/png', buffer: PNG }]); await p.waitForTimeout(300);
    await p.fill('[data-price=latte]', '99'); await p.click('[data-act=save]'); ok(/Latte: that price/.test(await p.textContent('#saveErr')), 'a silly price is caught');
    await p.fill('[data-price=latte]', '3.80'); await p.click('[data-act=save]'); await p.waitForTimeout(500);
    const done = await p.textContent('#app'); ok(/Saved: Little Fig/.test(done) && /1 photo, 2 prices/.test(done), 'saved: ' + done.replace(/\s+/g, ' ').slice(0, 120));
    const db = await p.evaluate(() => JSON.parse(localStorage.getItem('patch-demo-db-v9')));
    const o = db.observations.filter(x => x.venue_id === 'dv1').pop();
    const v = db.venues.find(x => x.id === 'dv1');
    ok(o && o.photos.length === 1 && /^data:image\/jpeg/.test(o.photos[0].data) && o.scores.coffee === 5 && o.scores.toilets === 'na' && o.prices.flat_white === 3.6, 'the visit is stored with its photo, scores and prices');
    ok(v.google_rating === 4.6 && v.google_reviews === 212 && v.google_url === 'https://maps.app.goo.gl/abc123', 'Google details are stored on the café');
    await p.goto(U + 'admin.html?demo=1'); await p.waitForTimeout(500); await p.click('button:has-text("Record a visit or menu")');
    ok(/Open the visit form/.test(await p.textContent('#root')), 'admin links to the visit form');
    ok(errs.length === 0, 'no page errors ' + errs.join('; '));
  } catch (e) { ok(false, 'crashed: ' + e.message); }
  await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
