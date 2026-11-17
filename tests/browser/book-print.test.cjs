// The printed plan: fills an A4 sheet (also with the margins and scaling an iPhone adds), no near-empty chapter pages,
// no placeholder text, matching snack counts, tidy names, and a warning for phone numbers with the wrong number of digits.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const pdfPages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
(async () => {
  await new Promise(r => srv.listen(8777, r));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '{}' }));
  try {
    await p.goto('http://localhost:8777/'); await p.waitForTimeout(400);
    // phone warning in the contact question (asked when building the book)
    await p.evaluate(() => { start(false); Object.assign(cur, { pc: 'SK11', adults: 2 }); H.push(cur); view = 0; cur = null; extra(); qi = list().findIndex(q => q.id === 'c1'); drawQ(); });
    await p.fill('#f_c1_name', 'Sam'); await p.fill('#f_c1_tel', '078451658165');
    ok(/12 digits/.test(await p.textContent('#tw_c1')), 'a 12-digit number gets a warning as you type');
    await p.click('#q-next'); ok(/12 digits/.test(await p.textContent('#q-err')) && await p.evaluate(() => list()[qi].id === 'c1'), 'Continue stops once to check it');
    await p.click('#q-next'); ok(await p.evaluate(() => list()[qi].id !== 'c1'), 'and lets them carry on if it is right');
    await p.evaluate(() => { qi = list().findIndex(q => q.id === 'c1'); drawQ(); });
    await p.fill('#f_c1_tel', '07971 336186'); ok((await p.textContent('#tw_c1')).trim() === '', 'an 11-digit number is fine');
    await p.evaluate(() => { H.length = 0; cur = null; });
    // build the household from the review and open its book
    await p.evaluate(() => { start(false); Object.assign(cur, { pc: 'SK11', area: 'Cheshire East', nation: 'england', home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, kids: 1, under5: 1, dogs: 1, heat: 'gas', hob: 'electric', cold: 'slow', pay: 'dd', healthGate: 'no', health: [], water: 'none', food: 'two', kit: [], fa: 'no', budget: 5,
      surname: 'boyce', c1: 'james boyce, 07971336186', c2: 'jackie boyce, 07568454618', meet: 'tatton park', stayWith: 'adam dixon, 07845165816, 26a dixon drive', gp: 'Chelford Surgery, 01625 861316, Elmstead Road, Chelford, Macclesfield, sk11 9bs', vet: 'vets for pets, 07845165818' });
      qi = list().length - 1; drawQ(); next(); H[view].paid = true; });
    await p.evaluate(() => openBook()); await p.waitForTimeout(1500);
    const info = await p.evaluate(() => { const bp = [...document.querySelectorAll('#shelf .bp')]; const txt = document.getElementById('shelf').innerText;
      return { n: bp.length, openers: document.querySelectorAll('#shelf .bp.opener').length, heads: document.querySelectorAll('#shelf .chhead').length,
        over: bp.filter(x => { const i = x.querySelector('.inner'); return i && i.scrollHeight > i.clientHeight + 2; }).length, txt }; });
    ok(info.openers === 0 && info.heads >= 15, `no near-empty chapter pages; ${info.heads} chapter headings sit on their first page`);
    ok(info.n <= 45, `the book is ${info.n} pages (was about 60)`);
    ok(info.over === 0, 'nothing is cut off at the bottom of any page');
    ok(!/Sample until/.test(info.txt) && /community risk register/i.test(info.txt), 'no placeholder text; points to the area risk register');
    ok(!/Free options:\s*\n/.test(info.txt) && /listed on the First aid page/.test(info.txt), 'the first aid job points to the First aid page');
    const m = info.txt.match(/(\d+) meals and (\d+) snacks/), s = info.txt.match(/\n(\d+) snacks\n/);
    ok(m && s && m[2] === s[1], `snack counts match (${m && m[2]} and ${s && s[1]})`);
    ok(/The Boyce household/.test(info.txt) && /James Boyce, 07971336186/.test(info.txt) && /Adam Dixon/.test(info.txt) && /Tatton park/.test(info.txt) && /SK11 9BS/.test(info.txt) && /Vets for Pets/.test(info.txt), 'names get capitals, postcode in capitals');
    ok(!/In a national power cut the sewers stop working, so don't flush at all/.test(info.txt), 'toilet advice matches the 72-hour pages');
    const tocOk = await p.evaluate(() => { const li = [...document.querySelectorAll('.toc li')].filter(x => x.querySelector('.pg')); const bp = [...document.querySelectorAll('#shelf .bp')];
      return li.every(x => { const t = x.querySelector('span').textContent.trim(), n = +x.querySelector('.pg').textContent; const page = bp[n - 1]; return page && page.querySelector('.chhead h1') && page.querySelector('.chhead h1').textContent.trim() === t; }); });
    ok(tocOk, 'every contents entry points to the page where that chapter starts');
    // print: Chrome honours the page size; the iPhone-like run ignores it, adds its own margins and scales up 6%
    await p.emulateMedia({ media: 'print' });
    const pdfA = await p.pdf({ preferCSSPageSize: true, printBackground: true });
    const pdfB = await p.pdf({ format: 'A4', preferCSSPageSize: false, margin: { top: '14mm', bottom: '22mm', left: '14mm', right: '14mm' }, scale: 1.0625, printBackground: true });
    fs.writeFileSync(path.join(require('os').tmpdir(), 'fettle-book-print-test.pdf'), pdfA);
    ok(pdfPages(pdfA) === info.n, `Chrome print: ${pdfPages(pdfA)} sheets for ${info.n} pages`);
    ok(pdfPages(pdfB) === info.n, `iPhone-like print: ${pdfPages(pdfB)} sheets for ${info.n} pages, none split`);
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
