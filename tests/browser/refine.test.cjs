// Action-first headline, "what changed" after sorting a step, same-gap help for barriers, barrier totals in reports.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.resolve(__dirname, '../../public/index.html')); await p.waitForTimeout(300);
  const run = a => p.evaluate(a => { cur = fresh(false); Object.assign(cur, a); tier = "core"; qi = list().length - 1; go("q"); drawQ(); next(); }, a);
  // no critical risk: headline is the steps, score is secondary
  await run({ home: "house", outdoor: "garden", tenure: "own", adults: 2, heat: "electric", hob: "electric", cold: "slow", healthGate: "no", water: "few", food: "some", kit: ["torch", "smoke", "radio", "power", "warm"], fa: "no", budget: 5 });
  ok(/^Your next 3 steps$/.test(await p.textContent('#res h1')), 'headline leads with the next steps: ' + await p.textContent('#res h1'));
  ok(/% ready for 72 hours\. \d+ things in your plan\./.test(await p.textContent('#res .headline p.sm')), 'score is a small line underneath');
  ok(await p.locator('#steps h2').count() === 0, 'no duplicate steps heading');
  // sort a step that completes "A power cut"
  await p.evaluate(() => { const h = H[view]; h.food = "no"; h.bought = {}; render(); });
  const pre = await p.evaluate(() => readyFor(H[view]));
  await p.evaluate(() => { WIN = null; view = H.length - 1; sortStep('food'); render(true); });
  const win = (await p.textContent('.win')).replace(/\s+/g, ' ');
  ok(!pre.includes('A power cut') && /You're now ready for: ?A power cut/.test(win), 'says which situation is now covered: ' + win);
  ok(/things? left in your plan, down from \d+/.test(win), 'says how many things are left');
  await p.evaluate(() => render(true));
  ok(await p.locator('.win').count() === 0, 'message shows once');
  // critical risk removed
  await run({ home: "house", outdoor: "garden", tenure: "own", adults: 1, heat: "gas", hob: "gas", cold: "slow", healthGate: "no", water: "all", food: "yes", kit: ["torch", "radio", "power", "smoke"], fa: "no", budget: 5 });
  ok(/critical risk/.test(await p.textContent('#res h1')), 'critical risk still leads');
  await p.evaluate(() => { const id = nextSteps(H[view])[0].id; stepDone(id); });
  ok(/last critical risk|critical risk removed/i.test(await p.textContent('.win')), 'says the critical risk is gone: ' + (await p.textContent('.win')).replace(/\s+/g, ' '));
  // barrier help
  const help = await p.evaluate(() => { const h = H[view]; const x = id => ({ ...needs(h).find(n => n.id === id) || { id, cat: "buy", title: id } }); return {
    water: barrierHelp(h, x('water'), 'cost'), co: barrierHelp(h, x('co'), 'cost'), torchLL: barrierHelp(h, x('torch'), 'landlord'), smokeLL: barrierHelp(h, { id: 'smoke', title: 'Smoke alarms', cat: 'buy' }, 'landlord') }; });
  ok(/same thing/.test(help.water) && /from the tap/.test(help.water) && !/amazon|paid link/i.test(help.water), 'cost: cheaper way to fix the same gap, no shop link');
  ok(/fire and rescue/.test(help.co) && /don't go without/.test(help.co), 'cost: CO alarm keeps the safety line');
  ok(/usually yours to sort/.test(help.torchLL), "landlord: says plainly when it isn't the landlord's job");
  ok(/must do this/.test(help.smokeLL) && /smoke alarms in my home/.test(help.smokeLL), 'landlord: legal duty and exact words for smoke alarms');
  // reports
  await p.evaluate(() => { signOut(); proSample(); reportView(); });
  ok(await p.isVisible("text=What's getting in the way"), 'ward report shows barriers');
  ok(await p.evaluate(() => { const B = barrierStats(H.filter(h => h.consent && h.consent.share)); return B.n >= 5 && B.rows.every(r => r.n >= 1) && B.rows[0].n >= B.rows[B.rows.length - 1].n; }), 'barrier totals sorted and counted');
  ok(await p.evaluate(() => [...document.querySelectorAll('.rtab td')].some(td => /Hidden: fewer than 5 households/.test(td.textContent))), 'small groups hidden');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => downloadReport())]);
  const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  ok(/What's getting in the way/.test(csv) && /"Cost",/.test(csv), 'CSV includes barriers');
  await p.evaluate(() => proCase(1));
  ok(await p.isVisible("text=What's stopping them?"), 'workers can record barriers on a visit');
  const sel = await p.evaluate(() => document.querySelector('[id^="pb-"]').id.slice(3));
  await p.selectOption('#pb-' + sel, 'landlord');
  ok(await p.evaluate(id => H[1].commit[id].reason === 'landlord' && H[1].commit[id].why.slice(-1)[0].by === 'worker', sel), 'worker answer saved');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
} finally { await b.close(); } process.exit(fails ? 1 : 0); })();
