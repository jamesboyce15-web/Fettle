// The Connected Book: one name per person, jobs grouped by home, a distance warning, what a helper needs,
// and no page spilling onto a second sheet when printed.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), os = require('os');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const site = require('./proto-site.cjs'); const b = await chromium.launch(); const errs = [];
  try {
    const P = await b.newPage({ viewport: { width: 900, height: 1000 } }); P.on('pageerror', e => errs.push(e.message));
    await P.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await P.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await P.goto('file://' + path.join(site, 'index.html')); await P.waitForTimeout(300);
    ok(await P.evaluate(() => /don't start with 04/.test(telProblem('04133618665')) && !telProblem('07971336186')), 'a number starting 04 is caught');
    await P.evaluate(async () => {
      start(false); Object.assign(cur, { area: 'Cheshire East', meet: 'the library', home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'half', food: 'two', kit: ['torch'], fa: 'yes', budget: 20, c1: 'Mum, 07133618625', mealPick: ['soup'] }); qi = list().length - 1; drawQ(); next();
      start(true); Object.assign(cur, { name: 'Mum', relHow: 'phone', relOK: 'yes', area: 'Buckinghamshire', home: 'bungalow', outdoor: 'garden', tenure: 'own', adults: 1, over70: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'yes', health: ['meds'], psr: 'no', water: 'none', food: 'no', kit: [], fa: 'no', budget: 0, waterCo: 'st' }); qi = list().length - 1; drawQ(); next();
      user = { name: 'James' };
      const m = H[1]; m.circle = [{ name: 'james boyce', tel: '07133618665', roles: ['call', 'visit', 'supplies'], mins: 90 }, { name: 'tom boyce', tel: '07971336186', roles: ['call'] }];
      m.assign = { water: 'Them', psr: 'Me', firstaid: 'Me' };
      await openBook(true);
    });
    await P.waitForTimeout(1200);
    const t = await P.textContent('#shelf');
    ok(!/James boyce|tom boyce/.test(t) && /James Boyce/.test(t) && !/James(?! Boyce)/.test(t), 'one name per person, capitalised: "James" and "james boyce" are the same James Boyce');
    ok(/Sorting it now:\s*Mum/.test(t) && /In an emergency, bringing supplies:\s*James Boyce/.test(t), 'weak spots: who buys it now, and who brings supplies in an emergency');
    const wd = t.slice(t.lastIndexOf("Everyone's jobs"), t.indexOf("If you can't get through"));
    ok(/James Boyce\s*For\s*Mum\s*Now\s*Join the Priority Services Register/.test(wd) && /In an emergency\s*Phones every day/.test(wd) && !/Mum:/.test(wd), 'who does what: grouped by home, now and in an emergency');
    ok(/Everyone with a key lives more than 30 minutes away/.test(t), 'warns when everyone with a key lives far away');
    ok(/If you're stepping in\s*Address/.test(t) && /Where the key is/.test(t) && /Medicines, and where they are/.test(t) && /Severn Trent\s*0800 783 4444/.test(t), 'Mum\'s page: address, key, medicines, water company number');
    ok(/Someone over 70/.test(t) && /Takes medicine every day/.test(t), 'good to know: over 70, daily medicine');
    ok(/Our 3-day menu/.test(t) && /Soup with crackers/.test(t), 'each home\'s menu');
    ok(/Meeting points\s*Your home\s*The library/.test(t) && /First call\s*Your home\s*Mum, 07133\s?618625/.test(t), 'inside cover: each home\'s meeting point and first call');
    const pages = await P.$$eval('#shelf .bp', B => B.length);
    const pdf = path.join(os.tmpdir(), 'cbook-' + process.pid + '.pdf'); await P.pdf({ path: pdf, format: 'A4', preferCSSPageSize: true, printBackground: true });
    const n = (fs.readFileSync(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; fs.unlinkSync(pdf);
    ok(n === pages, `prints one sheet per page, no blank pages (${n} sheets, ${pages} pages)`);
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
