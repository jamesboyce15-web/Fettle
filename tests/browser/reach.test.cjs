// Reaching each other when the power's off: phone and landline questions, satellite steps, the contact plan,
// the "I'm OK" text, and the community's outage info, in the plan and the books.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const site = require('./proto-site.cjs'); const b = await chromium.launch(); const errs = [];
  try {
    const P = await b.newPage({ viewport: { width: 390, height: 844 } }); P.on('pageerror', e => errs.push(e.message));
    await P.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await P.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
    await P.goto('file://' + path.join(site, 'index.html')); await P.waitForTimeout(300);
    await P.evaluate(() => { start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, kids: 1, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'all', food: 'yes', kit: ['torch'], fa: 'yes', budget: 20, c2: 'Aunt Sue, 07700 900111' }); qi = list().findIndex(q => q.id === 'phones'); drawQ(); });
    ok(/Which mobile phones/.test(await P.textContent('#v-q')) && /iPhone 15 or newer/.test(await P.textContent('#v-q')), 'the check asks which phones people have');
    await P.click('text=iPhone 15 or newer'); await P.click('text=Samsung Galaxy S25, on O2'); await P.evaluate(() => next());
    ok(/rely on a landline/.test(await P.textContent('#v-q')), 'and whether anyone relies on a landline');
    await P.evaluate(() => { cur.landline = 'yes'; qi = list().length - 1; drawQ(); next(); });
    const N = await P.evaluate(() => Object.fromEntries(needs(H[view]).map(x => [x.id, x])));
    ok(N.sattry && /Try Demo/.test(N.sattry.why) && N.o2sat && !N.sossat, 'satellite steps: try the iPhone demo, consider O2 Satellite');
    ok(N.lineback && /battery backup/.test(N.lineback.title) && /for free/.test(N.lineback.why), 'landline: ask for the free battery backup');
    ok(N.power && /3, one for each phone/.test(N.power.amt) && N.power.cost === 45, 'a power bank for each phone');
    ok(N.reach, 'a step to agree how you\'ll reach each other');
    // the contact plan form, prefilled with the out-of-area contact from the check
    await P.evaluate(() => { setRTab('family'); });
    ok(await P.inputValue('#re-out') === 'Aunt Sue, 07700 900111' && await P.inputValue('#re-times') === '9am and 7pm', 'the form starts from their answers: Aunt Sue outside the area, 9am and 7pm');
    await P.fill('#re-times', '8am and 8pm'); await P.fill('#re-who', 'Dave next door'); await P.selectOption('#re-nonews', 'day1'); await P.click('text=Save our plan'); await P.waitForTimeout(100);
    const card = await P.textContent('#v-r');
    ok(/Switch phones on at\s*8am and 8pm/.test(card) && /Everyone texts\s*Aunt Sue/.test(card) && /by the end of day 1,\s*Dave next door\s*goes round/.test(card) && /texting by satellite/.test(card), 'saved plan reads back: times, out-of-area contact, the rule, satellite');
    ok(await P.evaluate(() => H[view].bought.reach === true), 'saving it ticks the step off');
    // I'm OK text
    const href = await P.evaluate(() => { let u = ''; const d = Object.getOwnPropertyDescriptor(Location.prototype, 'href'); try { okNumbers; } catch (e) {} H[view].circle = [{ name: 'tom', tel: '07971 336186', roles: ['call'] }]; const N = okNumbers(); return N.join(','); });
    ok(/07971336186/.test(href) && /07700900111/.test(href), 'the I\'m OK text goes to the family and the out-of-area contact: ' + href);
    // book
    await P.evaluate(() => { H[view].paid = true; return openBook(); }); await P.waitForTimeout(800);
    const bk = await P.textContent('#shelf');
    ok(/How we'll reach each other/.test(bk) && /Text, don't call/.test(bk) && /Door notes/.test(bk) && /We've gone to/.test(bk) && /Digital landlines stop working/.test(bk), 'the book has the plan, door notes and the landline warning');
    // community outage info
    await P.evaluate(() => { commDash('st-marys-caton', 'info'); }); await P.waitForTimeout(100);
    ok(await P.isVisible('#ci-outage'), 'organisers can say where to go if phones and power are down');
    ok(!errs.length, 'no page errors ' + errs.join(' | '));
  } catch (e) { console.log('FAIL', e); fails++; }
  finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } }
})();
