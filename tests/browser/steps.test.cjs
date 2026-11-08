// Behaviour-change layer: next 3 steps, commitments, calendar, follow-ups, barriers, north star.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve('public/index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { pc: 'M14', home: 'flat', floor: 3, lift: 'yes', tenure: 'rent', adults: 2, heat: 'gas', hob: 'gas', water: 'none', food: 'no', kit: ['torch'], fa: 'no', budget: 0 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
  await p.waitForTimeout(300);
  const ids = await p.evaluate(() => nextSteps(H[0]).map(x => x.id));
  ok(ids.length === 3 && ids[0] === 'landlord', 'three steps, critical risk first: ' + ids.join(','));
  ok(await p.isVisible('#steps') && !(await p.isVisible('.fullplan section')), 'next steps shown, full plan collapsed');
  // commit and calendar
  await p.click('#steps .step:nth-of-type(2) .chip:has-text("This weekend")'); await p.waitForTimeout(100);
  ok(await p.evaluate(id => !!H[0].commit[id].due, ids[1]), 'commitment saved with a date');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#steps .step:nth-of-type(2) >> text=Add to my calendar')]);
  const ics = require('fs').readFileSync(await dl.path(), 'utf8');
  ok(/BEGIN:VEVENT[\s\S]*DTSTART;VALUE=DATE:\d{8}[\s\S]*SUMMARY:Fettle:/.test(ics), 'calendar file is valid');
  ok(await p.isVisible('.who input'), 'who-is-doing-this appears after committing');
  // barrier help
  await p.evaluate(id => { stepPanel(id, 'help'); stepWhy(id, 'landlord'); }, ids[0]); await p.waitForTimeout(100);
  ok((await p.textContent('#steps')).includes('private housing team'), 'landlord barrier gives the next step');
  await p.evaluate(id => stepWhy(id, 'cost'), ids[1]); await p.waitForTimeout(100);
  ok(await p.isVisible('text=£10 a month'), 'cost barrier offers a monthly budget');
  // done records date and priority
  await p.click('#steps .step:nth-of-type(1) >> text=I\'ve sorted this'); await p.waitForTimeout(100);
  ok(await p.evaluate(id => !!H[0].done[id] && H[0].done[id].crit === true, ids[0]), 'sorting a step records the date and that it was critical');
  // follow-up after promised date passes
  await p.evaluate(id => { H[0].commit[id].due = new Date(Date.now() - 2 * 864e5).toISOString(); render(); }, ids[1]);
  ok(await p.isVisible('.followup') && (await p.textContent('.followup')).includes('Did you sort this?'), 'follow-up asks after the promised date');
  await p.click('.followup >> text=Not yet'); await p.waitForTimeout(100);
  ok(!(await p.isVisible('.followup')) && await p.evaluate(id => H[0].commit[id].snoozed === 1, ids[1]), '"Not yet" asks for a new date');
  // 2-week nudge when nothing done
  await p.evaluate(() => { const h = H[0]; h.done = {}; h.bought = {}; h.commit = {}; h.nudged14 = null; h.scores[0].d = new Date(Date.now() - 15 * 864e5).toISOString(); render(); });
  ok((await p.textContent('.followup')).includes('How are you getting on?'), '2-week check-in when nothing is done');
  // north star in report
  const q = await ctx.newPage(); await q.setViewportSize({ width: 900, height: 1000 }); await q.goto('file://' + path.resolve('public/index.html')); await q.waitForTimeout(300);
  await q.evaluate(() => proSample()); await q.evaluate(() => reportView()); await q.waitForTimeout(300);
  ok((await q.textContent('#homebox')).includes('sorted at least one priority gap within 30 days'), 'north star shown in the report');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fail ? 'FAILURES ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
