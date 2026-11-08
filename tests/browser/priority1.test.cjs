// Priority 1 fixes: plan before sign-up, postcode-based contacts, per-child feeding, food days, pets water,
// carbon monoxide vs landlord duty, critical-risk flags, sections, medicine photo reading hidden.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://api.postcodes.io/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: { admin_district: ['Rochdale'], country: ['England'] } }) }));
  await p.goto('file://' + path.resolve(process.argv[2] || 'public/index.html')); await p.waitForTimeout(300);
  const H0 = o => p.evaluate(o => { const h = fresh(false); Object.assign(h, { adults: 1, home: 'house', tenure: 'own', heat: 'electric', hob: 'electric', water: 'none', food: 'no', kit: [], fa: 'no' }, o); return h; }, o);
  const ev = (o, fn) => p.evaluate(([o, fn]) => { const h = fresh(false); Object.assign(h, { adults: 1, home: 'house', tenure: 'own', heat: 'electric', hob: 'electric', water: 'none', food: 'no', kit: [], fa: 'no' }, o); return eval(fn)(h); }, [o, fn]);

  // postcode question first, validation, lookup
  await p.evaluate(() => start(false));
  ok(await p.evaluate(() => list()[0].id === 'pc'), 'postcode is the first question');
  await p.fill('#t_pc', 'OL11 3AB'); await p.click('#q-next');
  ok((await p.textContent('#q-err')).includes('first part'), 'full postcode rejected with a clear message');
  await p.fill('#t_pc', 'ol11'); await p.click('#q-next'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => cur.pc === 'OL11' && cur.area === 'Rochdale' && cur.nation === 'england' && cur.waterCo === 'uu'), 'outward code looked up, area and nation set, water company defaulted');

  // contacts by area
  ok(await ev({ pc: 'OL11' }, 'h=>network(h).name') === 'Electricity North West', 'North West gets Electricity North West');
  ok(await ev({ pc: 'SW1A' }, 'h=>network(h).name') === 'your local electricity network', 'London gets national network routes');
  ok(!(await ev({ pc: 'SW1A', health: ['meds'], healthGate: 'yes', over70: 1 }, 'h=>psrPanel(h)')).includes('enwl'), 'PSR panel outside North West has no ENWL link');
  ok(await ev({ pc: 'EH1' }, 'h=>local(h).nation') === 'scotland' && await ev({ pc: 'CH1' }, 'h=>local(h).nation') === null, 'nation from postcode, mixed areas left unknown');

  // feeding per child
  ok(await ev({ under5: 3, babies: 1, feed: 'formula', bottles: 6 }, 'h=>meals(h).eaters') === 3, 'two toddlers eat food, the baby does not');
  ok(await ev({ under5: 3, babies: 1, feed: 'formula', bottles: 6 }, 'h=>needs(h).some(x=>x.id==="rtf")'), 'formula baby still gets ready-made formula');
  ok(await ev({ under5: 2, feed: 'food' }, 'h=>babies(h)') === 0 && await ev({ under5: 2, feed: 'formula' }, 'h=>babies(h)') === 1, 'older plans migrate sensibly');

  // food days
  const meals3 = await ev({ adults: 2, food: 'no' }, 'h=>needs(h).find(x=>x.id==="food").amt');
  const meals1 = await ev({ adults: 2, food: 'two' }, 'h=>needs(h).find(x=>x.id==="food").amt');
  ok(meals3.startsWith('18 meals') && meals1.startsWith('6 meals'), `food tops up what's there (${meals3} / ${meals1})`);

  // pets
  ok((await ev({ dogs: 1 }, 'h=>needs(h).find(x=>x.id==="water").why')).includes('ask your vet'), 'water note says pets need extra, no invented figure');

  // carbon monoxide and landlord duty
  const renterHob = await ev({ tenure: 'rent', hob: 'gas', heat: 'electric', pc: 'OL11', kit: ['smoke'] }, 'h=>needs(h).map(x=>x.id)');
  ok(renterHob.includes('co') && !renterHob.includes('landlord'), 'renter with only a gas cooker: CO advice, no landlord duty claimed');
  const renterBoiler = await ev({ tenure: 'rent', heat: 'gas', pc: 'OL11' }, 'h=>needs(h).find(x=>x.id==="landlord").why');
  ok(renterBoiler.includes('boiler') && renterBoiler.includes("Gas cookers aren't covered"), 'renter with a gas boiler: landlord duty explained');
  ok((await ev({ tenure: 'rent', heat: 'gas', pc: 'EH1' }, 'h=>needs(h).find(x=>x.id==="landlord").why')).includes('different in Scotland'), 'Scotland gets different-rules wording');

  // critical risks
  ok((await ev({ healthGate: 'yes', health: ['device'], kit: ['smoke'] }, 'h=>openCriticals(h).map(c=>c.id)')).includes('device'), 'powered equipment flagged critical');
  ok((await ev({ healthGate: 'yes', health: ['device'], kit: ['smoke'], bought: { device: true } }, 'h=>openCriticals(h).length')) === 0, 'flag clears when backup confirmed');
  ok((await ev({ home: 'flat', floor: 3, lift: 'no', kit: ['smoke'] }, 'h=>openCriticals(h).map(c=>c.id)')).includes('evac'), 'stairs problem in a flat flagged');

  // full flow: no sign-up wall, sections and critical box shown, personalised pill
  await p.evaluate(() => { cur = fresh(false); Object.assign(cur, { pc: 'M14', home: 'house', tenure: 'own', adults: 1, heat: 'gas', hob: 'gas', healthGate: 'yes', health: ['device'], water: 'none', food: 'no', kit: [], fa: 'no', budget: 0 }); tier = 'core'; qi = list().length - 1; go('q'); drawQ(); next(); });
  await p.waitForTimeout(300);
  ok(await p.isVisible('#res .crit') && await p.isVisible('text=Save my plan'), 'plan shows with critical box and save prompt, no sign-up wall');
  ok((await p.textContent('#res')).includes('72-hour essentials') && (await p.textContent('#res')).includes('Household plan'), 'three sections shown');
  await p.click('.fullplan > summary'); ok(await p.isVisible('.pill.mine'), 'personalised items marked');
  await p.screenshot({ path: require('os').tmpdir() + '/p1-results.png', fullPage: true });

  // medicine photo reading hidden by default
  ok(!(await p.evaluate(() => { H[view].meds = [{ name: '', store: [], found: [], opened: '', outfridge: '' }]; return medPanel(H[view]); })).includes('Scan the leaflet'), 'medicine photo reading hidden unless ?labs=1');

  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); console.log(fail ? 'FAILURES ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
