// The owner's private weekly page, in the demo: mark an enquiry booked, send a review request and a rebook reminder
// (each opens WhatsApp with the message written and no number: the owner picks the chat), rebook a customer, add a regular,
// and see it all in admin and the monthly report. Also: a wrong link, phone width, no page errors.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8792, U = `http://localhost:${PORT}/`;
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); s.end(b); }); });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
    const opened = []; ctx.on('page', pg => opened.push(pg)); await ctx.route('https://wa.me/**', r => r.fulfill({ body: 'whatsapp' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.setDefaultTimeout(5000);
    await p.goto(U + 'my.html?t=nope&demo=1'); await p.waitForTimeout(300); ok(/can't find your page/.test(await p.textContent('#root')), 'a wrong link says so');
    await p.goto(U + 'my.html?demo=1'); await p.waitForTimeout(400);
    const txt = () => p.innerText('#root');
    ok(/Paws & Polish/.test(await p.textContent('h1')) && /here's your week/.test(await txt()), 'the owner sees their week');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'fits a phone');
    // 1. mark an enquiry booked
    const before = (await p.$$('[data-act=not_booked]')).length; ok(before >= 2, `enquiries waiting to be marked (${before})`);
    await p.click('[data-open^=b] >> nth=0'); await p.fill('input[id^=d_]', '2026-11-25'); await p.click('[data-act=booked]'); await p.waitForTimeout(250);
    ok((await p.$$('[data-act=not_booked]')).length === before - 1, 'marking it booked takes it off the list');
    await p.click('[data-act=not_booked] >> nth=0'); await p.waitForTimeout(250); ok((await p.$$('[data-act=not_booked]')).length === before - 2, "and 'didn't book' too");
    // 2. review request: same text for everyone, opens WhatsApp without a number
    const rv = await p.getAttribute('[data-sent=review_asked] >> nth=0', 'href');
    ok(/^https:\/\/wa\.me\/\?text=/.test(rv) && /g\.page/.test(decodeURIComponent(rv)), 'the review request opens WhatsApp with the review link, no number');
    ok(!/star|mention|discount/i.test(decodeURIComponent(rv)), 'no rating, wording or reward suggested');
    const nRev = (await p.$$('[data-sent=review_asked]')).length; await p.click('[data-sent=review_asked] >> nth=0'); await p.waitForTimeout(900);
    ok((await p.$$('[data-sent=review_asked]')).length === nRev - 1, 'sending it notes that this customer was asked');
    // 3. reminder
    ok(/Mel · Labradoodle/.test(await txt()), 'a regular due back is listed');
    const rm = decodeURIComponent(await p.getAttribute('[data-sent=reminded] >> nth=0', 'href'));
    ok(/Hi Mel, just a reminder that your labradoodle's next groom is due/.test(rm) && /Reply STOP/.test(rm), 'the reminder is written for them: ' + rm.split('\n')[0].slice(0, 80));
    await p.click('[data-open^=r] >> nth=0'); await p.click('[data-act=rebooked]'); await p.waitForTimeout(300);
    ok(!/Mel · Labradoodle/.test((await txt()).split('Due back soon')[1].split('Add a regular')[0]), 'booking them again takes them off the due list');
    // 4. add a regular from before Patch, due now
    await p.fill('#ad_label', 'Sue · Bichon'); await p.fill('#ad_date', new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10)); await p.fill('#ad_w', '6'); await p.click('[data-act=add]'); await p.waitForTimeout(300);
    ok(/Sue · Bichon/.test((await txt()).split('Due back soon')[1]), 'a regular added from before Patch shows when due');
    // 5. settings
    await p.fill('#s_url', 'http://not-secure'); await p.click('[data-act=settings]'); await p.waitForTimeout(200); ok(/https/.test(await p.textContent('#toast')), 'review link must be https');
    ok(/rebooked after a reminder/.test(await txt()) && /\b[1-9]\b/.test((await txt()).split('This month')[1]), 'this month shows bookings and rebookings');
    // 6. admin and the monthly report
    const a = await ctx.newPage(); a.on('pageerror', e => errs.push(e.message)); await a.setViewportSize({ width: 1280, height: 900 });
    await a.goto(U + 'members.html?demo=1'); await a.waitForTimeout(400); await a.click('[data-sel=dm1]'); await a.waitForTimeout(150);
    ok(/Their weekly page/.test(await a.textContent('#panel')), "admin links to the owner's weekly page");
    await a.click('[data-tab=msgs]'); const rep = await a.$eval('#msg_report', e => e.value);
    ok(/became bookings?/.test(rep) && /rebooked after a reminder/.test(rep), 'the monthly report counts bookings and rebookings');
    ok(/private Patch page: .*my\.html\?t=demo-desk/.test(await a.$eval('#msg_week', e => e.value)), 'a message sends the owner their private link');
    await a.click('[data-tab=enq]'); ok(/Booked/.test(await a.textContent('#panel')) && /Didn't book/.test(await a.textContent('#panel')), 'admin sees which enquiries booked');
    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  } catch (e) { ok(false, 'crashed: ' + e.message); }
  finally { await b.close(); srv.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
