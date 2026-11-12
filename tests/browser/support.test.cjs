// Low income, prepayment meters, social housing and temporary accommodation: questions, steps, barrier help and report groups.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  const mk = a => p.evaluate(a => { cur = fresh(false); Object.assign(cur, { home: "house", outdoor: "garden", tenure: "own", adults: 2, heat: "gas", hob: "gas", cold: "slow", healthGate: "no", water: "few", food: "some", kit: ["smoke", "co"], fa: "no", budget: 10, pay: "bill" }, a); const h = cur; const N = needs(h); const g = id => N.find(n => n.id === id);
    return { ids: N.map(n => n.id), money: g("moneyhelp") && g("moneyhelp").why, evac: g("evac") && g("evac").why, cost: barrierHelp(h, N.find(n => n.cat === "buy") || N[0], "cost"), ll: barrierHelp(h, { id: "smoke", title: "Smoke alarms", cat: "buy" }, "landlord"), renting: renting(h), tight: tight(h), flags: anonData ? anonData(h).f : null }; }, a);
  ok(await p.evaluate(() => { cur = fresh(false); tier = 'core'; return list().some(q => q.id === 'pay'); }), 'check asks how energy is paid for');
  const base = await mk({});
  ok(!base.ids.includes("prepay") && !base.ids.includes("moneyhelp") && !base.ids.includes("tempacc") && !base.tight, 'no extra steps for a household that did not ask for them');
  const pre = await mk({ pay: "prepay" });
  ok(pre.ids.includes("prepay") && pre.ids.includes("moneyhelp") && pre.flags.prepay === true, 'prepayment meter: meter plan and help step');
  const zero = await mk({ budget: 0, nation: "england" });
  ok(zero.ids.includes("moneyhelp") && /Crisis and Resilience Fund/.test(zero.money) && zero.flags.nospend === true, 'no budget: England crisis fund named');
  ok(/Scottish Welfare Fund/.test((await mk({ budget: 0, nation: "scotland" })).money) && /Discretionary Assistance Fund/.test((await mk({ budget: 0, nation: "wales" })).money) && /Finance Support Service/.test((await mk({ budget: 0, nation: "ni" })).money), 'right scheme in Scotland, Wales and Northern Ireland');
  ok(/Your council has emergency help/.test((await mk({ budget: 0, nation: null })).money), 'unknown nation: no scheme named');
  ok(/council and local food bank/.test(zero.cost) && /guides\/help-you-can-get\.html/.test(zero.cost), 'cost barrier points to real help');
  const temp = await mk({ tenure: "temp" });
  ok(temp.ids.includes("tempacc") && temp.renting && temp.tight && temp.flags.temp === true, 'temporary accommodation: own step, counted as renting');
  ok(/support worker/.test(temp.ll) && !/private housing team/.test(temp.ll), 'temporary accommodation: escalation goes to support worker or council');
  const soc = await mk({ tenure: "social", nation: "england" });
  ok(/complaints process/.test(soc.ll) && /Housing Ombudsman/.test(soc.ll), 'social tenant in England: complaints then Ombudsman');
  ok(!/Ombudsman/.test((await mk({ tenure: "social", nation: "scotland" })).ll), 'Ombudsman line is England only');
  const hi = await mk({ home: "flat", floor: 9, lift: "yes", healthGate: "yes", health: ["stairs"], nation: "england" });
  ok(hi.evac && /7 storeys/.test(hi.evac), 'high flat in England: evacuation step mentions the written plan');
  const hiS = await mk({ home: "flat", floor: 9, lift: "yes", healthGate: "yes", health: ["stairs"], nation: "scotland" });
  ok(hiS.evac && !/7 storeys/.test(hiS.evac), 'not shown outside England');
  // plan shows a guide link, and the guide exists
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { home: "house", outdoor: "garden", tenure: "temp", adults: 1, heat: "gas", hob: "gas", cold: "slow", healthGate: "no", water: "few", food: "some", kit: ["smoke", "co"], fa: "no", budget: 0, pay: "prepay" }); tier = "core"; qi = list().length - 1; go("q"); drawQ(); next(); });
  const links = await p.$$eval('#res a[href^="guides/"]', A => A.map(a => a.getAttribute('href')));
  ok(links.length > 0 && links.every(l => fs_exists(l)), 'steps link to guides that exist: ' + [...new Set(links)].join(', '));
  // report groups
  await p.evaluate(() => { signOut(); proSample(); reportView(); });
  const rows = await p.evaluate(() => groupStats(H.filter(h => h.consent && h.consent.share)).filter(r => ["temp", "prepay", "nospend"].includes(r.id)).map(r => [r.id, r.n]));
  ok(rows.length === 3 && rows.every(r => r[1] >= 5), 'report splits out temporary accommodation, prepayment and no budget: ' + JSON.stringify(rows));
  ok(errs.length === 0, 'no page errors ' + errs.join('; '));
} finally { await b.close(); } console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0); })();
function fs_exists(l) { return fs.existsSync(path.resolve(__dirname, '../../public', l)); }
