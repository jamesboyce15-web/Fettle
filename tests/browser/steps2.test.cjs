// Survey-based barriers, situations, "doesn't apply to us", and picking a date.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { pc: 'M14', home: 'house', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', water: 'none', food: 'no', kit: ['torch', 'smoke', 'co', 'radio'], fa: 'no', budget: 0 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
  await p.waitForTimeout(300);
  // situations
  const sit = await p.textContent('.sits');
  ok(sit.includes('A power cut') && sit.includes('Missing:'), 'situations show what is missing');
  await p.evaluate(() => { ['power', 'warm', 'food'].forEach(id => H[0].bought[id] = true); render(); });
  ok((await p.textContent('.sits')).includes("You're ready for") && (await p.textContent('.sits')).includes('A power cut'), 'power cut shows as ready once sorted');
  // new barriers
  const id = await p.evaluate(() => nextSteps(H[0])[0].id);
  for (const [r, txt] of [['expiry', 'oldest first'], ['worry', 'Almost 1 in 5'], ['space', 'shoebox']]) {
    await p.evaluate(([id, r]) => { stepPanel(id, 'help'); stepWhy(id, r); }, [id, r]); await p.waitForTimeout(80);
    ok((await p.textContent('#steps')).includes(txt), `barrier "${r}" gives tailored help`);
  }
  await p.evaluate(([id]) => stepWhy(id, 'expiry'), [id]); await p.waitForTimeout(80);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Add a seasonal check to my calendar')]);
  ok(/RRULE:FREQ=MONTHLY;INTERVAL=3/.test(require('fs').readFileSync(await dl.path(), 'utf8')), 'seasonal check repeats every 3 months');
  // pick a date
  const id2 = await p.evaluate(() => nextSteps(H[0])[1].id);
  await p.evaluate(id => commitStep(id, 'date'), id2); await p.waitForTimeout(80);
  const d = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  await p.fill(`#d_${id2}`, d); await p.click(`#d_${id2} + button`); await p.waitForTimeout(80);
  ok(await p.evaluate(([id, d]) => H[0].commit[id].due.slice(0, 10) === d, [id2, d]), 'picked date saved');
  // doesn't apply (non-critical only)
  const nc = await p.evaluate(() => nextSteps(H[0]).find(x => !critNeedIds(H[0]).includes(x.id)).id);
  await p.evaluate(id => notForUs(id), nc); await p.waitForTimeout(80);
  ok(await p.evaluate(id => !needs(H[0]).some(x => x.id === id), nc), '"doesn\'t apply" removes the step');
  ok((await p.evaluate(() => document.querySelector('.fullplan').textContent)).includes('Show it again'), 'hidden item can be brought back');
  await p.evaluate(() => { H[0].kit = H[0].kit.filter(k => k !== 'smoke'); notForUs('smoke'); });
  ok(await p.evaluate(() => needs(H[0]).some(x => x.id === 'smoke')), 'critical risks cannot be dismissed');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await p.screenshot({ path: (process.argv[2] || require('os').tmpdir()) + '/situations.png', fullPage: false });
  await b.close(); console.log(fail ? 'FAILURES ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
