// Flood steps: the sign-up link, the fill-in flood plan, the flood plan guide, and the insurance policy check (pdf.js, on the phone).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
let PDFJS = null; try { PDFJS = path.dirname(require.resolve('pdfjs-dist/build/pdf.min.js')); } catch (e) {}
(async () => { const b = await chromium.launch(); try {
  const site = require('./proto-site.cjs');
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  if (PDFJS) await p.route('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/*', r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(PDFJS, path.basename(new URL(r.request().url()).pathname))) }));
  await p.goto('file://' + path.join(site, 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => { start(false); Object.assign(cur, { pc: 'LA1', area: 'Lancaster', home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', water: 'few', food: 'some', kit: [], budget: 20, floodRisk: 'yes', floodWarn: 'no', dogs: 1 }); qi = list().length - 1; drawQ(); next(); RTAB = 'todo'; render(); });
  await p.waitForTimeout(150);
  const acts = await p.evaluate(() => { const h = H[view], f = id => howActs(h, needs(h).find(x => x.id === id)); return { w: f('fwarn'), p: f('floodplan'), i: f('floodinsure') }; });
  ok(acts.w[0][1] === 'https://www.gov.uk/sign-up-for-flood-warnings' && acts.w[1][1] === 'tel:03459881188', 'flood warnings step links to the GOV.UK sign-up page and Floodline');
  ok(await p.evaluate(() => floodSignup({ nation: 'wales' })[1].includes('sign-up-to-receive-flood-warnings') && floodSignup({ nation: 'scotland' })[1].includes('myfloodline')), 'Wales and Scotland go to their own sign-up pages');
  ok(acts.p[1][1] === 'guides/flood-plan.html' && fs.existsSync(path.join(site, 'guides/flood-plan.html')), 'flood plan step links to the new guide');
  const guide = fs.readFileSync(path.join(site, 'guides/flood-plan.html'), 'utf8');
  ok(/Find your switch-offs/.test(guide) && /Severe flood warning/.test(guide) && /Flood Re/.test(guide), 'guide covers warnings, switch-offs and insurance');
  ok(await p.evaluate(() => { const x = needs(H[view]).find(x => x.id === 'fwarn'); return /href="https:\/\/www.gov.uk\/sign-up-for-flood-warnings"/.test(howHTML(H[view], x, true)); }), 'the sign-up link is a real link in "How to do it"');
  // flood plan
  await p.evaluate(() => floodPlanView(view)); await p.waitForTimeout(80);
  ok(await p.isVisible('.fpform') && /Medicines/.test(await p.inputValue('#fp-move')) && await p.isVisible('#fp-gas') && await p.isVisible('#fp-pets'), 'flood plan starts from the answers (gas, pets, what to move)');
  await p.fill('#fp-water', 'Under the kitchen sink'); await p.fill('#fp-elec', 'Cupboard under the stairs'); await p.fill('#fp-go1', 'Sam and Jo, 14 Hill Road'); await p.check('#fp-warned');
  await p.click('.fpform button[type=submit]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => H[view].fplan.water === 'Under the kitchen sink' && H[view].bought.floodplan && H[view].floodWarn === 'yes' && H[view].pledge.go === 'Sam and Jo, 14 Hill Road'), 'saving ticks off the flood plan, the warnings step, and sets where you\'d go');
  // policy check: rules
  const r = await p.evaluate(() => analysePolicy(['Section 1 Buildings. What is covered: loss or damage caused by storm or flood.', 'We will not pay for damage to gates, fences and hedges caused by storm or flood. Excesses: the flood excess is £1,000. Your compulsory excess is £250.', 'Alternative accommodation: we will pay for somewhere to stay. Contents cover is included.']));
  ok(r.floodN >= 2 && r.covered.length === 1 && r.excl.length === 1 && r.floodExcess === '1,000' && r.accom && r.buildings && r.contents, 'finds cover, exceptions, flood excess and somewhere to stay');
  const r2 = await p.evaluate(() => analysePolicy(['This home insurance policy covers your buildings and contents against fire, theft, escape of water and accidental damage. The excess is £100 for each claim you make under this policy.']));
  ok(r2.floodN === 0 && r2.excess === '100' && /couldn't find flooding mentioned/.test(await p.evaluate(x => policyHTML(x), r2)), 'no flood mentioned: says so, and shows the excess it did find');
  ok(await p.evaluate(() => analysePolicy(['', ' ']).scanned), 'a scanned PDF is recognised');
  // policy check: a real PDF read with pdf.js
  if (PDFJS) {
    const q = await b.newPage(); await q.setContent('<h1>Home insurance policy wording</h1><p>Section 1 Buildings. What is covered: loss or damage caused by storm or flood.</p><p>We will not pay for damage to gates and fences caused by storm or flood.</p><p>Flood excess: £1,000.</p>');
    const pdf = path.join(require('os').tmpdir(), 'fettle-policy.pdf'); await q.pdf({ path: pdf }); await q.close();
    await p.evaluate(() => policyView(view)); await p.waitForTimeout(60);
    await p.setInputFiles('#pol-file', pdf); await p.waitForSelector('.polres', { timeout: 15000 });
    const t = await p.textContent('.polres');
    ok(/Flood is covered, with some exceptions/.test(t) && /£1,000/.test(t) && /page/.test(t), 'reads a real policy PDF on the phone and explains what it found');
    ok(!(await p.evaluate(() => performance.getEntriesByType('resource').some(e => /upload|api\//.test(e.name)))), 'nothing is uploaded');
    await p.click('text=It covers flooding: tick this off'); await p.waitForTimeout(80);
    ok(await p.evaluate(() => H[view].bought.floodinsure), 'ticks off the insurance step');
  } else console.log('SKIP pdf.js not installed: npm i -g pdfjs-dist@3.11.174');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
} catch (e) { console.log('FAIL', e); fails++; } finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } } })();
