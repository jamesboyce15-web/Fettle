// Flood pathway: postcode -> Environment Agency flood areas -> flood-ready check -> flood steps.
// Emergency list: resident opts in with consent; council staff see consented households, most at risk first.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  const sent = [];
  await p.route('**/api.postcodes.io/**', r => { const u = r.request().url(); const pc = u.split('/').pop();
    const geo = { LA1: ['Lancaster', 'England', 54.05, -2.8], CF10: ['Cardiff', 'Wales', 51.48, -3.18], LS29: ['Bradford', 'England', 53.92, -1.82] }[pc];
    r.fulfill(geo ? { contentType: 'application/json', body: JSON.stringify({ result: { admin_district: [geo[0]], country: [geo[1]], latitude: geo[2], longitude: geo[3] } }) } : { status: 404, body: '' }); });
  await p.route('**/environment.data.gov.uk/**', r => { const u = r.request().url(); sent.push(u);
    const dry = /lat=53\.92/.test(u);
    if (/floodAreas/.test(u)) return r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ items: dry ? [] : [
      { fwdCode: '012FWFLU01', label: 'River Lune at Lancaster Quay', riverOrSea: 'River Lune' },
      { fwdCode: '012FWFLU02', label: 'Caton Road industrial estate', riverOrSea: 'River Lune' },
      { fwdCode: '012WAFLUNE', label: 'Lower River Lune', riverOrSea: 'River Lune' }] }) });
    r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ items: dry ? [] : [{ severityLevel: 3, severity: 'Flood alert', description: 'Lower River Lune' }] }) }); });
  const site = require('./proto-site.cjs');
  await p.goto('file://' + path.join(site, 'index.html')); await p.waitForTimeout(300);

  // landing entry point
  ok(await p.isVisible('.lflood'), 'landing page offers the flood check');
  await p.click('.lflood'); await p.waitForTimeout(100);
  ok(await p.isVisible('#v-tool >> text=Does your area flood?'), 'flood tool opens');
  await p.fill('#f-pc', 'LA1'); await p.click('#v-tool button[type=submit]'); await p.waitForTimeout(300);
  const out = (await p.textContent('#f-out')).replace(/\s+/g, ' ');
  ok(/This area has places that flood/.test(out) && /LA1 · Lancaster/.test(out) && /2 flood warning areas/.test(out) && /River Lune at Lancaster Quay/.test(out), 'finds the flood warning areas near LA1');
  ok(/In force now/.test(out) && /Flood alert: flooding is possible/.test(out), 'shows the warning in force now');
  ok(sent.some(u => /floodAreas\?lat=54\.05&long=-2\.8&dist=3/.test(u)) && !sent.some(u => /LA1/i.test(u)), 'sends only the centre point to the Environment Agency, never the postcode');
  ok(await p.isVisible('#f-out >> text=Sign up on GOV.UK') && /0345 988 1188/.test(out), 'links to flood warning sign-up and Floodline');
  ok(/30cm can float a car/.test(out), 'flood check carries the floodwater rule');

  // a dry area, and Wales
  await p.fill('#f-pc', 'LS29'); await p.click('#v-tool button[type=submit]'); await p.waitForTimeout(300);
  ok(/No flood warning areas near the middle of this area/.test(await p.textContent('#f-out')), 'a dry area says so, and still points to the address check');
  await p.fill('#f-pc', 'CF10'); await p.click('#v-tool button[type=submit]'); await p.waitForTimeout(300);
  ok(/Natural Resources Wales/.test(await p.textContent('#f-out')) && !sent.some(u => /lat=51\.48/.test(u)), 'Wales goes to Natural Resources Wales, no English lookup');

  // flood-ready check
  await p.fill('#f-pc', 'LA1'); await p.click('#v-tool button[type=submit]'); await p.waitForTimeout(300);
  await p.click('text=Start my flood-ready check'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => cur.pathway === 'flood' && cur.pc === 'LA1' && cur.floodNear === true && list().some(q => q.id === 'floodRisk')), 'check starts with the flood pathway and postcode carried over');
  await p.evaluate(() => { qi = list().findIndex(q => q.id === 'floodRisk'); drawQ(); });
  ok(/River Lune at Lancaster Quay/.test(await p.textContent('#v-q')), 'flood question names the nearby flood areas');
  await p.evaluate(() => { Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'rent', adults: 2, under5: 1, babies: 0, heat: 'gas', hob: 'gas', cold: 'slow', healthGate: 'no', water: 'few', food: 'some', kit: ['torch'], fa: 'no', budget: 5, floodRisk: 'yes', floodWarn: 'no' }); qi = list().length - 1; drawQ(); next(); });
  await p.waitForTimeout(200);
  const ids = await p.evaluate(() => needs(H[view]).map(x => x.id));
  ok(['fwarn', 'floodplan', 'floodbag', 'floodinsure'].every(i => ids.includes(i)), 'flood steps are in the plan');
  ok(await p.evaluate(() => nextSteps(H[view]).some(x => x.id === 'fwarn')), 'signing up for flood warnings is one of the next steps');
  ok(await p.evaluate(() => /Your landlord insures the building/.test(needs(H[view]).find(x => x.id === 'floodinsure').why)), 'renters get the contents insurance advice');
  ok(await p.evaluate(() => { const h = H[view]; h.floodWarn = 'yes'; const r = !needs(h).some(x => x.id === 'fwarn'); h.floodWarn = 'no'; return r; }), 'already signed up: no warning step');
  ok(await p.evaluate(() => { const h = fresh(false); Object.assign(h, { floodRisk: 'no' }); return !needs(h).some(x => /^flood|fwarn/.test(x.id)); }), 'no flood risk: no flood steps');

  // emergency list: hidden from residents until a council has joined (a pilot link)
  ok(!(await p.$('#regcard')) && !/emergency list/i.test(await p.textContent('#res')), 'no emergency list for residents without a council pilot');
  await p.evaluate(() => { sessionStorage.setItem('fettle-pilot', 'demo'); render(true); }); await p.waitForTimeout(80);
  ok(await p.isVisible('#regcard') && /Let your council know if you'd need help/.test(await p.textContent('#regcard')), 'plan page offers the emergency list');
  ok(/Less than a day/.test(await p.textContent('#regcard .regdl')) && /2 adults, 1 under 5/.test(await p.textContent('#regcard .regdl')), 'shows exactly what planners would see');
  await p.click('#regcard >> text=Add us to the list'); await p.waitForTimeout(150);
  ok(await p.isVisible('#v-auth'), 'not signed in: asked to save the plan first');
  await p.evaluate(() => { user = { id: 'u1', name: 'Sam', email: 's@example.com' }; go('r'); render(); });
  await p.click('#regcard >> text=Add us to the list'); await p.waitForTimeout(100);
  await p.fill('#r-addr', '12 Quay Street'); await p.fill('#r-pc', 'la11aa'); await p.fill('#r-tel', '07700 900123');
  await p.click('#regcard button[type=submit]'); await p.waitForTimeout(100);
  ok(/Tick the box/.test(await p.textContent('#r-err')), 'needs the consent box ticked');
  await p.check('#r-ok'); await p.click('#regcard button[type=submit]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => H[view].reg && H[view].reg.on && H[view].reg.pc === 'LA1 1AA'), 'joins the list with address, postcode and phone');
  ok(/You're on the emergency list/.test(await p.textContent('#regcard')), 'confirms and keeps showing what would be shared');
  await p.click('#regcard >> text=Leave the list'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !H[view].reg), 'leaving removes the details');

  // where they heard about Fettle
  await p.click('#regcard >> text=Add us to the list'); await p.waitForTimeout(100);
  ok(await p.isVisible('#r-via') && (await p.$$eval('#r-via option', o => o.length)) === 13, 'joining asks how they heard about Fettle');
  await p.selectOption('#r-via', 'hv'); await p.fill('#r-addr', '12 Quay Street'); await p.fill('#r-pc', 'LA1 1AA'); await p.fill('#r-tel', '07700 900123'); await p.check('#r-ok');
  await p.click('#regcard button[type=submit]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => H[view].reg.via === 'hv' && H[view].via === 'hv'), 'touch point saved with the household');
  ok(await p.evaluate(() => { sessionStorage.setItem('fettle-via', 'library'); return viaTag() === 'library'; }) && await p.evaluate(() => { history.replaceState(null, '', location.pathname + '?via=nope'); return viaTag() === 'library'; }), 'partner link codes are checked against the list');

  // flood warning check-in
  ok(!(await p.isVisible('#checkin')), 'a flood alert alone does not ask for a check-in');
  await p.evaluate(() => { H[view].flood.now = [{ sev: 2, where: 'River Lune at Lancaster Quay' }]; render(); });
  ok(await p.isVisible('#checkin') && /River Lune at Lancaster Quay/.test(await p.textContent('#checkin')), 'a flood warning in force asks "Are you OK?"');
  await p.click('#checkin button.btn.small'); await p.waitForTimeout(80);
  ok(/Choose whether you're OK/.test(await p.textContent('#chk-err')), 'needs an answer');
  await p.click('#checkin >> text=We might need help'); await p.click('#checkin >> text=Less than a day'); await p.click('#checkin >> text=Save'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const c = H[view].checkins.slice(-1)[0]; return c.ok === 'maybe' && c.days === 0 && supplyDays(H[view]) === 0; }), 'check-in saved and updates days of supplies');
  ok(await p.isVisible('.pcard.chk.done') && /you checked in at/.test(await p.textContent('.pcard.chk.done')), 'thanks them and shows when');
  ok(await p.evaluate(() => { const h = H[view], s0 = regScore(h); h.checkins.push({ d: new Date().toISOString(), ok: 'now', days: 0 }); const r = regScore(h) - s0 >= 16; h.checkins.pop(); return r; }), 'asking for help now puts a household at the top');

  // decide now, while it's calm
  await p.evaluate(() => { H[view].checkins = []; H[view].flood.now = []; render(); });
  ok(await p.isVisible('#pledge') && /If there's a flood warning, we will/.test(await p.textContent('#pledge')), 'plan asks them to decide in advance what they will do');
  await p.fill('#pl-go', ''); await p.click('#pledge button[type=submit]'); await p.waitForTimeout(80);
  ok(/Write where you'd go/.test(await p.textContent('#pl-err')), 'needs somewhere to go');
  await p.fill('#pl-go', "Sam's house on Aldcliffe Road"); await p.fill('#pl-who', 'Sam'); await p.fill('#pl-tel', '07700 900456');
  await p.click('#pledge button[type=submit]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => H[view].pledge.go === "Sam's house on Aldcliffe Road" && H[view].pledge.take.includes('meds')) && /You've decided what you'll do/.test(await p.textContent('#pledge')), 'decision saved and shown back');
  ok(await p.evaluate(() => /Sam's house on Aldcliffe Road/.test(flows(H[view]).flood.steps.join(' ')) && /30cm can float a car/.test(flows(H[view]).flood.steps.join(' '))), 'emergency flood steps use their decision and the floodwater rule');
  ok(await p.evaluate(() => /30cm of flowing water can float a car/.test(needs(H[view]).find(x => x.id === 'floodplan').why) && /Your area has places the Environment Agency warns about/.test(needs(H[view]).find(x => x.id === 'floodplan').why)), 'flood plan step is local and has the floodwater rule');

  // the warning arrives: their own script, how many others have checked in, a text to their person
  await p.evaluate(() => { window.recentCheckins = async a => a === 'Lancaster' ? 23 : null; NEARBY = {}; H[view].flood.now = [{ sev: 2, where: 'River Lune at Lancaster Quay' }]; render(); });
  await p.waitForTimeout(150);
  const card = (await p.textContent('#checkin')).replace(/\s+/g, ' ');
  ok(/Your plan for now/.test(card) && /go to: ?Sam's house on Aldcliffe Road/.test(card) && /Medicines ?Documents and bank cards ?Phones and chargers/.test(card), 'warning shows their own plan as a short script');
  ok(/23 households in your area have checked in today/.test(card), 'shows how many others nearby have checked in');
  await p.click('#checkin >> text=We\'re fine'); await p.click('#checkin >> text=Save'); await p.waitForTimeout(120);
  const href = await p.getAttribute('.pcard.chk.done a[href^="sms:"]', 'href');
  ok(/^sms:07700900456\?&body=Flood%20warning%20here\.%20We're%20OK\./.test(href), 'one tap to text their check-on-me person');

  // emergency view for council staff
  const q = await b.newPage({ viewport: { width: 1100, height: 900 } }); q.on('pageerror', e => errs.push(e.message));
  await q.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await q.goto('file://' + path.join(site, 'index.html')); await q.waitForTimeout(300);
  await q.evaluate(() => proSample()); await q.waitForTimeout(200);
  ok(await q.isVisible('text=Emergency view'), 'caseload links to the emergency view');
  await q.click('.glance >> text=Emergency view'); await q.waitForTimeout(150);
  const pr = await q.evaluate(() => [...document.querySelectorAll('.emtab tr')].slice(1).map(r => r.querySelector('.pill').textContent));
  const order = pr.map(t => ({ 'Check first': 1, 'Check soon': 2, 'Likely coping': 3 })[t]);
  ok(pr.length > 10 && order.every((v, i) => !i || v >= order[i - 1]) && pr[0] === 'Check first', 'households listed most at risk first (' + pr.length + ')');
  ok(await q.evaluate(() => H.filter(h => h.consent.reg).length === document.querySelectorAll('.emtab tr').length - 1), 'only households who agreed are listed');
  const w0 = await q.evaluate(() => document.querySelector('.chips .chip').textContent);
  await q.click('.chips .chip >> nth=0'); await q.waitForTimeout(100);
  ok(await q.evaluate(w => ![...document.querySelectorAll('.emtab tr')].slice(1).some(r => r.textContent.includes(w)), w0), 'wards can be switched off');
  ok(await q.isVisible('text=Coverage') && await q.isVisible('text=Who brought them in') && /Health visitor or baby group/.test(await q.textContent('#v-home')), 'coverage by ward and by touch point');
  await q.click('text=Show a sample flood warning'); await q.waitForTimeout(150);
  const first = await q.evaluate(() => document.querySelector('.emtab tr:nth-child(2)').textContent);
  ok(/Needs help now/.test(first) && Number(await q.evaluate(() => document.querySelector('.kpis div:nth-child(2) b').textContent)) > 0, 'after a warning, households asking for help come first');
  await q.screenshot({ path: require('os').tmpdir() + '/emergency-view.png', fullPage: true });
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
} catch (e) { console.log('FAIL', e); fails++; } finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } } })();
