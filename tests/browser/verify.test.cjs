// Verification on visits and outcome counts in the Communities report.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  const ctx = await b.newContext({ viewport: { width: 900, height: 1000 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => proSample()); await p.waitForTimeout(300);
  const O = await p.evaluate(() => outcomeStats(H.filter(h => h.consent && h.consent.share)));
  ok(O.assessed >= 5 && O.identified > 0 && O.sorted <= O.identified && O.verified <= O.sorted, `outcome counts add up (${JSON.stringify(O)})`);
  // open a case, tick a job, verify it
  const i = await p.evaluate(() => H.findIndex(h => h.scores && h.scores.length > 1));
  await p.evaluate(i => { view = i; go('r'); render(); }, i); await p.waitForTimeout(200);
  ok(await p.isVisible('.crit.pro'), 'critical risks show statuses for workers');
  const id = await p.evaluate(() => needs(H[view]).find(x => x.cat === 'do').id);
  await p.evaluate(id => tick(id, true), id); await p.waitForTimeout(100);
  ok(await p.isVisible(`.verify input[onchange*="'${id}'"]`), 'done job offers "Checked on a visit"');
  await p.click(`.verify input[onchange*="'${id}'"]`); await p.waitForTimeout(100);
  ok(await p.evaluate(id => !!H[view].verified[id], id), 'verification saved with a date');
  await p.evaluate(() => { saveVisit(view); });
  ok(await p.evaluate(id => H[view].scores.at(-1).v.includes(id), id), 'visit snapshot records what was verified');
  // report shows outcomes
  await p.evaluate(() => reportView()); await p.waitForTimeout(300);
  ok((await p.textContent('#homebox')).includes('Critical risks found'), 'report shows outcome counts');
  await (await p.$('#homebox')).screenshot({ path: process.argv[2] ? process.argv[2] + '/outcomes.png' : require('os').tmpdir() + '/outcomes.png' });
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => { window.print = () => { }; impactReport(); })]);
  await pop.waitForLoadState();
  ok((await pop.textContent('body')).includes('Checked on a visit'), 'PDF report includes outcomes');
  if (process.argv[2]) await pop.pdf({ path: process.argv[2] + '/impact-report.pdf', format: 'A4', printBackground: true });
  // households on their own can't verify
  const q = await ctx.newPage(); await q.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html')); await q.waitForTimeout(200);
  await q.evaluate(() => { cur = fresh(false); Object.assign(cur, { pc: 'M14', adults: 1, home: 'house', tenure: 'own', heat: 'electric', hob: 'electric', water: 'none', food: 'no', kit: [], fa: 'no', budget: 0 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
  await q.evaluate(() => tick('cash', true)); await q.waitForTimeout(100);
  ok(!(await q.isVisible('.verify')), 'no verify option outside Communities mode');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fail ? 'FAILURES ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
