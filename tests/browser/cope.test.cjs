// "Could you cope?": ask -> reveal -> ask again; results cards; re-rate as steps complete; re-check; council report.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.resolve(__dirname, '../../public/index.html')); await p.waitForTimeout(300);
  // a family of 4 with a formula-fed baby, on the 6th floor
  await p.evaluate(() => { start(false); Object.assign(cur, { pc: "", home: "flat", floor: 6, lift: "yes", doorEntry: "no", outdoor: "none", tenure: "social", adults: 2, kids: 1, under5: 1, babies: 1, feed: "formula", bottles: 6 }); qi = list().findIndex(q => q.type === "scen"); drawQ(); });
  ok(await p.textContent('#q-sec') === 'Could you cope?', 'scenarios come straight after who lives here');
  ok(/winter evening/.test(await p.textContent('#qt')), 'first scenario: a power cut');
  await p.click('#q-body .opt >> nth=0'); await p.waitForTimeout(150);
  let rev = await p.textContent('.reveal');
  ok(/Great/.test(rev) && /36 meals/.test(rev) && /gas boiler/.test(rev) && /lift will stop/.test(rev), 'reveal is worked out for this home: ' + rev.replace(/\s+/g, ' ').slice(0, 120));
  ok(await p.isVisible('text=Still feel the same?'), 'asks again after the reveal');
  await p.click('text=Less sure now'); await p.waitForTimeout(500);
  ok(/feed the baby/.test(await p.textContent('#qt')), 'baby scenario for a formula-fed baby');
  await p.click('#q-body .opt >> nth=1'); await p.waitForTimeout(150);
  rev = await p.textContent('.reveal');
  ok(/18 feeds of ready-made formula/.test(rev) && /70°C/.test(rev) && /6 clean bottles/.test(rev), 'baby reveal: 18 feeds, 6 bottles, 70°C rule');
  await p.click('text=Yes, still the same'); await p.waitForTimeout(500);
  ok(/water stops/.test(await p.textContent('#qt')), 'water scenario');
  await p.click('#q-body .opt >> nth=3'); await p.waitForTimeout(150);
  rev = await p.textContent('.reveal');
  ok(/That's honest/.test(rev) && /36 litres/.test(rev) && /high floor/.test(rev), 'water reveal: 36 litres and the high-floor pump point');
  ok(!(await p.isVisible('text=Still feel the same?')), "no 'still feel the same' after a No");
  await p.click('#q-next'); await p.waitForTimeout(150);
  ok(/leave in 15 minutes/.test(await p.textContent('#qt')), 'leaving scenario');
  await p.click('#q-body .opt >> nth=2'); await p.waitForTimeout(150); await p.click('#q-next'); await p.waitForTimeout(150);
  const st = await p.evaluate(() => ({ scen: cur.scen, conf: cur.conf }));
  ok(st.scen.power.a === 3 && st.scen.power.b === 'less' && st.conf.power === 2 && st.conf.water === 0 && st.conf.baby === 2, 'answers stored: first answer, second thoughts, current confidence');
  // finish the check
  await p.evaluate(() => { Object.assign(cur, { heat: "gas", hob: "electric", cold: "slow", healthGate: "no", water: "few", food: "some", kit: ["torch"], fa: "no", budget: 0, psr: "no" }); qi = list().length - 1; drawQ(); next(); });
  await p.waitForTimeout(300);
  ok(await p.isVisible('.cope'), 'results show Could you cope?');
  const cards = await p.evaluate(() => [...document.querySelectorAll('.copecard')].map(c => c.innerText.replace(/\s+/g, ' ')));
  ok(cards.length === 4 && /You said Just about/.test(cards[0]) && /Your answers show 1 of 5 things/.test(cards[0]), 'power card: you said vs your answers show: ' + cards[0]);
  ok(await p.evaluate(() => H[view].scores[0].sc.power === 2 && H[view].scores[0].cp.power === 0), 'first snapshot stores confidence and capability');
  // complete the water scenario through steps -> asked how it feels now
  await p.evaluate(() => { const h = H[view]; h.bought.water = true; WIN = null; sortStep('hygiene'); render(true); });
  ok(/How does it feel now\?/.test(await p.textContent('.win')), 'completing a scenario asks how it feels now');
  await p.click('.win .rerate >> text=Yes, easily'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => H[view].conf.water === 3 && H[view].confLog.length === 1), 're-rating updates confidence');
  // 30-day re-check asks the scenarios again, ask only
  await p.evaluate(() => recheck(view));
  ok(await p.textContent('#q-sec') === 'Could you cope?' && !(await p.isVisible('text=Still feel the same?')), 're-check asks the scenarios again');
  await p.click('#q-body .opt >> nth=0'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => cur.conf.power === 3), 're-check answer recorded');
  await p.evaluate(() => { qi = list().length - 1; drawQ(); next(); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const h = H[view], l = h.scores[h.scores.length - 1]; return h.scores.length === 2 && l.sc.power === 3 && l.sc.water === 3 && l.sc.leave === 1; }), 're-check snapshot keeps earlier answers for scenarios not re-asked');
  // council report
  await p.evaluate(() => { signOut(); proSample(); reportView(); });
  const sec = await p.evaluate(() => [...document.querySelectorAll('#homebox section')].find(x => /Could residents cope/.test(x.textContent))?.innerText || '');
  ok(/Said they'd cope/.test(sec) && /Answers show ready/.test(sec) && /→/.test(sec), 'ward report: confidence beside capability, first → latest');
  ok(await p.evaluate(() => copeStats(H.filter(h => h.consent && h.consent.share)).some(r => r.less > 0 && r.asked >= 5)), "'less sure after seeing what it takes' counted");
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => downloadReport())]);
  ok(/Could residents cope\?/.test(fs.readFileSync(await dl.path(), 'utf8')), 'CSV includes the scenarios');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
} finally { await b.close(); } process.exit(fails ? 1 : 0); })();
