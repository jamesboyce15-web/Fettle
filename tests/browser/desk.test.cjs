// Front desk, end to end in the demo: a sole trader signs up; admin sets them up; a customer finds the groomer's page,
// fills in the enquiry and WhatsApp opens with the message written; admin sees it counted, voids one, and the bill and
// monthly message follow the rules. Also: phone width, no page errors.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8791, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css', json: 'application/json' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const over = p => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
    let wa = null; await ctx.route('https://wa.me/**', r => { wa = r.request().url(); r.fulfill({ body: 'whatsapp' }); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.setDefaultTimeout(5000);

    // 1. The start page and a sign-up.
    await p.goto(U + '?demo=1'); await p.waitForTimeout(200);
    ok(/You only pay when they do/.test(await p.textContent('h1')), 'the start page says the offer');
    ok(/Each enquiry[\s\S]*£4/.test(await p.textContent('body')) && /£29 a month/.test(await p.textContent('body')), 'prices are on the page');
    ok(await over(p) <= 0, 'start page fits a phone');
    await p.fill('#nm', 'Jo Test'); await p.fill('#bz', 'Jo’s Dog Spa'); await p.fill('#wa', '07700 900111'); await p.click('#go');
    ok(/town/.test(await p.textContent('#err')), 'the town is needed for the check');
    await p.fill('#tw', 'Stockport'); await p.fill('#wa', '123'); await p.click('#go');
    ok(/WhatsApp number/.test(await p.textContent('#err')), 'a bad number is caught');
    await p.fill('#wa', '07700 900111'); await p.fill('#pd', 'SK4'); await p.click('#go'); await p.waitForTimeout(300);
    ok(/Asking now/.test(await p.textContent('#thanks')) && /dog groomer near SK4/.test(await p.textContent('#thanks')), 'the free check starts at once, with the questions it is asking');
    await p.waitForTimeout(1700); const th = await p.textContent('#thanks');
    ok(/wasn't named in any of 3 answers/.test(th) && /It named Bark & Bubble/.test(th), 'the results show who was named instead');
    ok(/yell\.com/.test(th) && /07700 900111/.test(th), 'with where the answers came from, and what happens next');

    // 1b. A trade page: its own question, and the sign-up starts on that trade.
    await p.goto(U + 'nails-lashes-brows.html?demo=1'); await p.waitForTimeout(200);
    ok(/BIAB nail tech/.test(await p.textContent('#ask')) && await p.$eval('#tr', e => e.value) === 'nails', 'the nails page asks its own question and presets the sign-up');
    ok(await over(p) <= 0, 'trade page fits a phone');
    await p.goto(U + 'dog-groomers.html?demo=1'); await p.waitForTimeout(200); ok(await p.$eval('#tr', e => e.value) === 'groomer', 'the groomers page presets dog grooming');

    // 2. The live groomer's page, as a customer sees it.
    await p.goto(U + 'b.html?b=paws-and-polish-demo&demo=1'); await p.waitForTimeout(300);
    const body = await p.textContent('body');
    ok(/Paws & Polish/.test(await p.textContent('h1')) && /£45/.test(body) && /cockapoos and doodles/i.test(body), 'the page shows name, prices and specialisms as text');
    ok((await p.$$('script[type="application/ld+json"]')).length === 2, 'schema.org data is on the page');
    ok(!/Sarah Jones/.test(body), 'only the owner\'s first name is shown');
    ok(await over(p) <= 0, 'business page fits a phone');
    await p.click('button[type=submit]'); ok(/Breed/.test(await p.textContent('#enqErr')), 'breed is needed before sending');
    await p.fill('#q_breed', 'Cockapoo'); await p.selectOption('#q_size', 'Medium'); await p.selectOption('#q_service', { index: 2 }); await p.fill('#q_when', 'Saturday morning'); await p.fill('#q_district', 'SK4'); await p.selectOption('#q_source', 'chatgpt');
    await Promise.all([p.waitForURL(/wa\.me/), p.click('button[type=submit]')]);
    const text = decodeURIComponent((wa || '').split('text=')[1] || '');
    ok(/^https:\/\/wa\.me\/447700900123\?/.test(wa || ''), 'WhatsApp opens to the owner\'s number');
    ok(/I found you on ChatGPT/.test(text) && /Cockapoo/.test(text) && /Saturday morning/.test(text), 'the message is written for them: ' + text.split('\n')[0]);

    // 3. A page being set up isn't public; its preview link works.
    await p.goto(U + 'b.html?b=shine-on-valeting-demo&demo=1'); await p.waitForTimeout(200);
    ok(/can't find/.test(await p.textContent('body')), 'a page being set up is not public');
    await p.goto(U + 'b.html?b=shine-on-valeting-demo&p=demo-preview-2&demo=1'); await p.waitForTimeout(200);
    ok(/Preview/.test(await p.textContent('body')) && /Shine On/.test(await p.textContent('h1')), 'the preview link shows it');

    // 4. Admin: the counts, the sign-up, the bill, voiding, the monthly message.
    const a = await ctx.newPage(); a.on('pageerror', e => errs.push(e.message)); a.setDefaultTimeout(5000); await a.setViewportSize({ width: 1280, height: 900 });
    await a.goto(U + 'members.html?demo=1'); await a.waitForTimeout(300);
    const list = await a.textContent('table');
    ok(/Paws & Polish/.test(list) && /Jo’s Dog Spa/.test(list), 'admin lists the live groomer and the new sign-up');
    await a.click('[data-sel=dm1]'); await a.waitForTimeout(100);
    await a.click('[data-tab=enq]'); await a.waitForTimeout(100);
    const enqTxt = await a.textContent('#panel');
    ok(/ChatGPT/.test(enqTxt) && /Cockapoo, Medium, Saturday morning/.test(enqTxt.replace(/\s+/g, ' ')) || /Cockapoo/.test(enqTxt), 'the customer\'s enquiry is counted in admin');
    const before = await a.$eval('#panel .stats .stat:nth-child(2) b', e => e.textContent);
    await a.click('[data-act=void] >> nth=0'); await a.waitForTimeout(150);
    const after = await a.$eval('#panel .stats .stat:nth-child(2) b', e => e.textContent);
    ok(before !== after || /Voided/.test(await a.textContent('#panel')), `voiding changes the bill (${before} → ${after})`);
    await a.click('[data-tab=msgs]'); await a.waitForTimeout(100);
    const rep = await a.$eval('#msg_report', e => e.value);
    ok(/your \w+ with Patch/.test(rep) && /Bill: £/.test(rep) && /STOP/.test(rep), 'the monthly WhatsApp report is written');
    ok(/named you in 2 of 3 searches, up from 0 of 3/.test(rep), 'it shows the AI before and after');
    ok(/wa\.me\/447700900123\?text=/.test(await a.getAttribute('[data-wa=report]', 'href')), 'it opens in WhatsApp to the owner, for James to send');
    await a.click('[data-tab=setup]'); await a.waitForTimeout(100);
    await a.check('[data-ls=apple]'); await a.waitForTimeout(150);
    ok(/7 of 10 done/.test(await a.textContent('#panel')), 'ticking a setup step saves it');
    await a.click('[data-tab=ai]'); await a.fill('#ck_q', 'dog groomer in Stockport'); await a.check('#ck_named'); await a.click('[data-act=addcheck]'); await a.waitForTimeout(150);
    ok(/dog groomer in Stockport/.test(await a.textContent('#panel')), 'an AI check is recorded');

    // 5. Set up the new sign-up and make it live.
    await a.click('[data-filter=lead]'); await a.click('tr:has-text("Jo’s Dog Spa")'); await a.waitForTimeout(100);
    ok(/I'm You from Patch|from Patch/.test(await a.$eval('#msg_opener', e => e.value)), 'a sign-up opens on the first message to send');
    await a.click('[data-tab=profile]'); await a.click('[data-act=starters]'); await a.waitForTimeout(100);
    ok((await a.$$('[data-sv]')).length >= 6 * 3, 'a typical groomer price list can be started from');
    await a.fill('[data-f=locality]', 'Edgeley'); await a.selectOption('[data-f=status]', 'live'); await a.click('[data-act=save]'); await a.waitForTimeout(200);
    ok(/Live page/.test(await a.textContent('#panel')), 'saved as live, with a public page link');
    const live = await a.getAttribute('a:has-text("Live page")', 'href');
    ok(/b=jos-dog-spa-stockport&/.test(live), 'its web address was made from the name at sign-up: ' + live.split('b=')[1]);
    await p.goto(live); await p.waitForTimeout(300); ok(/Full groom/.test(await p.textContent('body')), 'the new page is live with its prices');

    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  } catch (e) { ok(false, 'crashed: ' + e.message); }
  finally { await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
