// Planning for Mum or a relative: family circle, 3-day rota, carer cover, fridge sheet, and the family check-in on a warning.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => { start(true); });
  ok(await p.evaluate(() => { Object.assign(cur, { over70: 1, adults: 0 }); return list().some(q => q.id === 'carers'); }), 'a relative\'s check asks whether carers visit');
  await p.evaluate(() => { Object.assign(cur, { name: 'Mum', pc: 'LA1', area: 'Lancaster', home: 'bungalow', outdoor: 'garden', tenure: 'own', adults: 0, over70: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'yes', health: ['meds'], carers: 'daily', water: 'none', food: 'some', kit: [], fa: 'no', budget: 0 }); qi = list().length - 1; drawQ(); next(); });
  await p.waitForTimeout(200);
  ok(await p.isVisible('#famcard') && /Who will look after them for 3 days/.test(await p.textContent('#famcard')), 'relative\'s plan has a family circle');
  ok(await p.evaluate(() => hasHealth(H[view]) && regNeeds(H[view]).includes('Relies on carer visits')), 'carer visits count as a care need and show on the emergency list');
  // add two people
  const add = async (name, tel, mins, roles) => { await p.click('#famcard >> text=/Add (the first person|someone else)/'); await p.fill('#fm-name', name); await p.fill('#fm-tel', tel); await p.selectOption('#fm-mins', String(mins)); for (const r of roles) await p.check(`.fm-r input[value=${r}]`); await p.click('#famcard form button[type=submit]'); await p.waitForTimeout(80); };
  await p.click('#famcard >> text=Add the first person'); await p.click('#famcard form button[type=submit]'); await p.waitForTimeout(50);
  ok(/Add their name/.test(await p.textContent('#fm-err')), 'needs a name');
  await p.click('#famcard >> text=Cancel');
  await add('Sarah', '07700 900111', 45, ['call', 'supplies']);
  ok(/No one has a key/.test(await p.textContent('#famcard .famgaps')), 'points out that no one has a key');
  await add('Tom', '07700 900222', 5, ['call', 'visit']);
  ok(!(await p.isVisible('#famcard .famgaps')) || !/No one has a key/.test(await p.textContent('#famcard .famgaps')), 'gap closes once someone nearby has a key');
  const rota = await p.evaluate(() => buildRota(H[view]));
  ok(rota[0].am === 'Sarah' && rota[0].pm === 'Tom' && rota[1].am === 'Tom' && rota[0].visit === 'Tom', 'builds a 3-day rota that shares the calls');
  ok(await p.locator('#famcard .rota tr').count() === 4, 'rota shown as a table');
  // carer cover
  await p.click('#famcard >> text=Plan carer cover'); await p.fill('#ca-ag', 'Lune Care'); await p.check('#ca-meds'); await p.selectOption('#cb-meds', 'Tom'); await p.check('#ca-meals');
  await p.click('#famcard form button[type=submit]'); await p.waitForTimeout(80);
  ok(await p.evaluate(() => H[view].care.tasks.meds === 'Tom' && H[view].care.tasks.meals === '') && /Some of the carers' jobs have no one to cover them/.test(await p.textContent('#famcard')), 'carer cover saved, uncovered jobs flagged');
  // send the rota, print the fridge sheet
  const shared = await p.evaluate(async () => { let t = ''; Object.defineProperty(navigator, 'share', { value: d => { t = d.text; return Promise.resolve(); }, configurable: true }); famShare(view); await new Promise(r => setTimeout(r, 50)); return t; });
  ok(/Day 1: Morning call Sarah, Evening call Tom, Visit Tom/.test(shared) && /Medicines Tom/.test(shared), 'rota can be sent to the family group');
  const sheet = await p.evaluate(() => { let html = ''; window.open = () => ({ document: { write: h => html += h, close() {} } }); fridgeSheet(view); return html; });
  ok(/If the power, water or roads go off/.test(sheet) && /Sarah/.test(sheet) && /07700 900222/.test(sheet) && /0345 988 1188/.test(sheet) && /font-size:20px/.test(sheet), 'large-print fridge sheet with the rota and numbers');
  // a warning near Mum
  await p.fill('#f-subj', '01524 000000'); await p.dispatchEvent('#f-subj', 'change');
  await p.evaluate(() => { H[view].flood = { now: [{ sev: 2, where: 'River Lune' }], places: [], rivers: [] }; render(); });
  const card = (await p.textContent('#checkin')).replace(/\s+/g, ' ');
  ok(/Has anyone spoken to them\?/.test(card) && /Yes, they're fine/.test(card), 'family check-in asks if anyone has spoken to them');
  ok(/The family plan for now/.test(card) && /Calls them first: ?Sarah/.test(card) && /they need help: ?Tom/.test(card) && /Medicines: Tom/.test(card), 'shows who calls, who visits and who covers the carers');
  ok(await p.getAttribute('#checkin a[href^="tel:"]', 'href') === 'tel:01524000000', 'one tap to call them');

  // guided set-up for a relative's plan
  await p.evaluate(() => { start(true); });
  ok(/Who are you making this plan for\?/.test(await p.textContent('#v-q')) && await p.inputValue('#t_name') === 'Mum', 'starts by asking who the plan is for');
  await p.fill('#t_name', 'Dad'); await p.click('#q-next'); await p.waitForTimeout(60);
  ok(/How are you doing this check\?/.test(await p.textContent('#v-q')), 'then how they are doing it');
  await p.click('#q-body .opt >> nth=2'); await p.waitForTimeout(250);
  if (/How are you doing/.test(await p.textContent('#v-q'))) await p.click('#q-next');
  await p.waitForTimeout(60);
  ok(/Do they know you're making this plan\?/.test(await p.textContent('#v-q')), 'then whether they know');
  await p.evaluate(() => { Object.assign(cur, { relOK: 'later', pc: 'LA1', area: 'Lancaster', home: 'house', outdoor: 'garden', tenure: 'own', adults: 0, over70: 1, heat: 'gas', hob: 'gas', cold: 'fast', healthGate: 'no', carers: 'no', water: 'none', food: 'no', kit: [], fa: 'no', budget: 0 }); qi = list().length - 1; drawQ(); next(); });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => H[view].name === 'Dad' && H[view].relHow === 'alone'), 'answers kept');
  ok(await p.isVisible('#relstart') && /Dad's plan is ready/.test(await p.textContent('#relstart')), 'finishes with next steps for the family');
  const notes = await p.textContent('#res');
  ok(/Talk to them about this plan/.test(notes) && /You answered from what you know/.test(notes), 'reminds them to talk to Dad and check the guesses');
  ok(!(await p.$('#regcard')), 'no emergency list for residents without a council pilot');
  await p.evaluate(() => { sessionStorage.setItem('fettle-pilot', 'demo'); render(true); }); await p.waitForTimeout(80);
  ok(/Talk to them first/.test(await p.textContent('#regcard')) && !(await p.isVisible('#regcard >> text=Add us to the list')), 'no emergency list until Dad agrees');
  ok(/Talk to them first, then invite the family/.test(await p.textContent('#famshare')), 'no inviting until Dad agrees');
  await p.click('text=We\'ve talked, they\'re happy'); await p.waitForTimeout(80);
  ok(await p.isVisible('#famshare >> text=Invite someone') && await p.isVisible('#regcard >> text=Add us to the list'), 'once Dad agrees, sharing and the list open up');
  // what's missing, and who's sorting it
  const groups = await p.$$eval('#jobscard .jg-n', e => e.map(x => x.textContent));
  ok(groups[0] === 'Water' && groups[1] === 'Food' && groups.includes('Light and news') && groups[groups.length - 1] === 'Other' && await p.locator('#jobscard details[open]').count() === 1, 'gaps grouped, essentials first, one group open at a time');
  await p.evaluate(() => { H[view].circle = [{ name: 'Sarah', tel: '07700 900111', mins: 45, roles: ['supplies'] }]; render(); });
  await p.selectOption('#jobscard li:has-text("Drinking water") select', 'Sarah'); await p.waitForTimeout(60);
  await p.click('#jobscard summary:has-text("Light and news")'); await p.waitForTimeout(40);
  await p.selectOption('#jobscard li:has-text("Battery or wind-up radio") select', 'Me'); await p.waitForTimeout(60);
  ok(/2 of \d+ have someone sorting them/.test((await p.textContent('#jobscard')).replace(/\s+/g, ' ')), 'counts the jobs that have someone');
  const jobs = await p.evaluate(async () => { let t = ''; Object.defineProperty(navigator, 'share', { value: d => { t = d.text; return Promise.resolve(); }, configurable: true }); user = { id: 'u1', name: 'James' }; jobsShare(view); await new Promise(r => setTimeout(r, 50)); return t; });
  ok(/Dad: who's sorting what/.test(jobs) && /Sarah\n- Drinking water/.test(jobs) && /James\n- Battery or wind-up radio/.test(jobs), 'sends everyone their jobs');
  // sharing the plan (live functions stubbed)
  const sent = await p.evaluate(async () => { let t = ''; Object.defineProperty(navigator, 'share', { value: d => { t = d.text; return Promise.resolve(); }, configurable: true });
    window.famInvite = async h => ({ link: 'https://getfettle.co.uk/?family=' + 'a'.repeat(32) }); window.famMembers = async h => [{ id: 'u1', name: 'James', me: true }, { id: 'u2', name: 'Sarah', me: false }];
    window.famRemoveMember = async (h, id) => { window.__removed = id; return true; }; H[view]._id = 'h1'; FAMMEM = {}; render(); await new Promise(r => setTimeout(r, 50));
    await famInviteClick(view); return t; });
  ok(/emergency plan for Dad/.test(sent) && /\?family=a{32}/.test(sent), 'invite link shared with a message');
  await p.waitForTimeout(80);
  ok(/Sarah/.test(await p.textContent('#famshare .members')) && await p.isVisible('#famshare >> text=Remove from the plan'), 'owner sees who has joined and can remove them');
  await p.click('#famshare >> text=Remove from the plan'); await p.waitForTimeout(50);
  ok(await p.evaluate(() => window.__removed === 'u2'), 'removes the right person');
  await p.evaluate(() => { H[view]._shared = true; H[view].ownerName = 'James'; FAMMEM = {}; render(); }); await p.waitForTimeout(80);
  ok(/You were invited to this plan.*Shared by: ?James/.test(await p.textContent('#famshare')) && await p.isVisible('#famshare >> text=Leave this plan') && !(await p.isVisible('#famshare >> text=Remove from the plan')), 'invited family see who shared it and can leave');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await p.screenshot({ path: require('os').tmpdir() + '/family.png', fullPage: true });
} catch (e) { console.log('FAIL', e); fails++; } finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } } })();
