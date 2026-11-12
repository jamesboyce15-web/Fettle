const { chromium } = require('playwright'); const path=require('path');
(async () => { const b = await chromium.launch(); const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
 for (const L of ['en','pl']) {
  const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html') + '?lang='+L); await p.waitForTimeout(200);
  const r = await p.evaluate(() => {
    const flat = Object.assign(fresh(false), { home: "flat", floor: 5, lift: "yes", outdoor: "none", tenure: "social", adults: 2, under5: 1, feed: "formula", heat: "electric", hob: "electric", cold: "fast", healthGate: "no", water: "none", food: "no", kit: [], budget: 5, doorEntry: "yes" });
    const house = Object.assign(fresh(false), { home: "house", outdoor: "garden", tenure: "own", adults: 2, heat: "gas", hob: "gas", cold: "slow", healthGate: "no", water: "none", food: "no", kit: [], budget: 5, pump: "yes" });
    cur = flat; tier = "core"; const qf = list().map(q => q.id); cur = house; const qh = list().map(q => q.id); cur = null;
    const nf = needs(flat), nh = needs(house);
    const allText = JSON.stringify([nf, flows(flat), chapters(flat)]);
    return { qf, qh, door: nf.some(n => n.id === "door"), pumpWhy: (nh.find(n => n.id === "water") || {}).why || "", oldFormula: /isn't recommended for powder formula|Don't use bottled water/.test(allText), fsa: /Food Standards Agency/.test(allText), powerStep: JSON.stringify(flows(house)) };
  });
  if (L === 'en') {
    ok(r.qf.includes('doorEntry') && !r.qf.includes('pump'), 'flat gets door entry question, not pump');
    ok(r.qh.includes('pump') && !r.qh.includes('doorEntry'), 'house gets pump question, not door entry');
    ok(r.door, 'door job added for electric entry');
    ok(/electric pump/.test(r.pumpWhy), 'pump explained in water item');
    ok(/Your pump has stopped/.test(r.powerStep), 'pump step in power cut steps');
    ok(!r.oldFormula && r.fsa, 'old bottled water wording gone, FSA guidance referenced');
  }
  await p.evaluate(() => { const h = Object.assign(fresh(false), { home: "flat", floor: 5, lift: "yes", outdoor: "none", tenure: "social", adults: 2, under5: 1, feed: "formula", heat: "electric", hob: "electric", cold: "fast", healthGate: "no", water: "none", food: "no", kit: [], budget: 5, doorEntry: "yes" }); H.push(h); view = 0; go('r'); render(); });
  await p.waitForTimeout(200);
  const txt = await p.textContent('#res');
  if (L === 'pl') { ok(/Dowiedz się, co robią drzwi budynku/.test(txt), 'door job translated (pl)'); ok(/Food Standards Agency/.test(txt) && !/If your tap water is off/.test(txt), 'formula note translated (pl)'); }
  ok(errs.length === 0, L + ' no page errors ' + errs.join(';'));
  await p.close(); }
 await b.close(); })();
