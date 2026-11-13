// Workbook tools: /calc, /local and /remind (opened from disk with ?go=), in the in-memory version.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const OUTCODES = {
  OL11: { admin_district: ['Rochdale'], country: ['England'] },
  CH1: { admin_district: ['Cheshire West and Chester'], country: ['England'] },
  EH1: { admin_district: ['City of Edinburgh'], country: ['Scotland'] },
};
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.route('**/api.postcodes.io/outcodes/**', r => { const k = decodeURIComponent(r.request().url().split('/').pop()); const j = OUTCODES[k];
    return j ? r.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: j }) }) : r.fulfill({ status: 404, body: '{}' }); });
  const site = 'file://' + path.join(require('./proto-site.cjs'), 'index.html');

  // ---- calculator ----
  await p.goto(site + '?go=calc'); await p.waitForTimeout(300);
  ok(await p.isVisible('#v-tool') && !(await p.isVisible('#v-landing')), '?go=calc opens the calculator, not the landing page');
  let out = await p.textContent('#c-out');
  ok(/18 litres/.test(out) && /9 large 2-litre bottles/.test(out) && /£20/.test(out) && !/Ready-made formula feeds/.test(out), 'default 2 people: 18 litres, 9 bottles, £20, no formula row');
  await p.click('button[aria-label="One more"] >> nth=0'); await p.click('button[aria-label="One more"] >> nth=0');
  await p.click('button[aria-label="One more"] >> nth=1'); for (let i = 0; i < 5; i++) await p.click('button[aria-label="One more"] >> nth=1');
  out = await p.textContent('#c-out');
  ok(/36 litres/.test(out) && /18 large/.test(out) && /36/.test(out) && /£40/.test(out) && /Ready-made formula feeds\s*18/.test(out) && /Torches\s*2/.test(out), '4 people and 6 feeds a day: matches the workbook sums');
  for (let i = 0; i < 20; i++) await p.click('button[aria-label="One fewer"] >> nth=0');
  ok((await p.textContent('#c-p')) === '1', 'people never goes below 1');

  // ---- local information ----
  await p.click('text=Find your local information'); await p.waitForTimeout(100);
  await p.fill('#l-pc', 'ZZ9'); await p.click('text=Show my local information'); await p.waitForTimeout(200);
  ok(/couldn't find that postcode/.test(await p.textContent('#l-err')), 'unknown postcode: says so');
  await p.fill('#l-pc', 'ol11 1ab'); await p.click('text=Show my local information'); await p.waitForTimeout(300);
  out = await p.textContent('#l-out');
  ok(/Rochdale/.test(out) && /Crisis Payments/.test(out) && /01706 923 685/.test(out), 'Rochdale: council and its Crisis Payments line');
  ok(/Electricity North West/.test(out) && /United Utilities/.test(out) && /0800 555 815/.test(out), 'Rochdale: power network, water company and GM fire service');
  ok(/check-long-term-flood-risk/.test(await p.innerHTML('#l-out')), 'England: flood risk link');
  await p.fill('#l-pc', 'CH1'); await p.click('text=Show my local information'); await p.waitForTimeout(300);
  out = await p.textContent('#l-out');
  ok(/SP Energy Networks/.test(out) && /Electricity North West/.test(out) && /Severn Trent/.test(out) && /United Utilities/.test(out) && /Cheshire Fire/.test(out), 'Chester: both networks, both water companies, Cheshire fire');
  ok(!/Crisis Payments/.test(out) && /Crisis and Resilience Fund/.test(out), 'Chester: general crisis fund wording, not Rochdale\'s');
  await p.fill('#l-pc', 'EH1'); await p.click('text=Show my local information'); await p.waitForTimeout(300);
  out = await p.textContent('#l-out');
  ok(/Scottish Welfare Fund/.test(out) && !/check-long-term-flood-risk/.test(await p.innerHTML('#l-out')), 'Scotland: Scottish Welfare Fund, no England flood link');

  // ---- reminders ----
  await p.goto(site + '?go=remind'); await p.waitForTimeout(300);
  const t = await p.textContent('#toolbox');
  ok(/four times a year/i.test(t) && /clocks go forward/.test(t) && /Your next one would be on \d+ \w+ \d{4}/.test(t), 'reminders page: four seasons and the next date');
  await p.fill('#m-email', 'nope'); await p.click('text=Email me a sign-in link');
  ok(/Enter an email address/.test(await p.textContent('#a-err')), 'bad email: error');
  await p.fill('#m-email', 'ann@example.com'); await p.fill('#m-pc', 'NOTAPC'); await p.click('text=Email me a sign-in link');
  ok(/first half of your postcode/.test(await p.textContent('#a-err')), 'bad postcode: error');
  await p.fill('#m-pc', 'OL11'); await p.click('text=Email me a sign-in link'); await p.waitForTimeout(100);
  ok(/Check your email/.test(await p.textContent('#toolbox')) && /ann@example.com/.test(await p.textContent('#toolbox')) && /nothing is sent/.test(await p.textContent('#toolbox')), 'sent screen names the address; preview copy sends nothing');

  // season dates match supabase/reminders.sql
  const d = await p.evaluate(() => [ '2026-11-13', '2027-01-05', '2027-03-28', '2027-03-29', '2027-07-20', '2027-10-31' ].map(x => nextSeason(new Date(x + 'T12:00:00Z')).toISOString().slice(0, 10)));
  ok(JSON.stringify(d) === JSON.stringify(['2027-01-05', '2027-03-29', '2027-03-29', '2027-07-20', '2027-11-01', '2027-11-01']), 'season dates: 5 Jan, Monday after clocks forward, 20 Jul, Monday after clocks back');

  // guide pages keep the QR code's source on the way to the check and reminders
  await p.goto(site.replace('index.html', 'guides/power-cut.html') + '?src=workbook'); await p.waitForTimeout(100);
  ok((await p.$$eval('a[data-app]', a => a.map(x => x.getAttribute('href')))).join() === '../?src=workbook#check,../?src=workbook#check,../remind?src=workbook', 'guide links carry ?src=workbook to the check and to reminders');
  await p.goto(site.replace('index.html', 'guides/no-water.html')); await p.waitForTimeout(100);
  ok((await p.getAttribute('.cta a.btn', 'href')) === '../?src=workbook#check', 'and on the next guide in the same visit');
  ok(/Get a free reminder each season/.test(await p.textContent('.cta')), 'every guide offers seasonal reminders');
  await p.evaluate(() => sessionStorage.clear());

  // footer links and the landing page still work
  await p.goto(site); await p.waitForTimeout(200);
  ok(await p.isVisible('#v-landing') && !(await p.isVisible('#v-tool')), 'no ?go: landing page as before');
  ok(await p.$$eval('.tools-row a', a => a.map(x => x.getAttribute('href')).join()) === 'calc,local,remind', 'footer links to the three tools');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
} finally { await b.close(); } console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0); })();
