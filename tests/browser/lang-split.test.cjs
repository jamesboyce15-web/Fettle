// Translations live in their own files (public/tr/). English visitors download none; a language loads when it's picked,
// comes back after a reload, and is ready before a book is made in it.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
(async () => { const b = await chromium.launch(); try {
  const site = require('./proto-site.cjs');
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
  ok(html.length < 1.2e6 && !/Object\.assign\(TR\.pl,\{"/.test(html), 'the page itself carries no dictionaries (' + Math.round(html.length / 1024) + ' KB)');
  const files = fs.readdirSync(path.join(site, 'tr'));
  ok(['pl', 'ro', 'pa', 'ur'].every(l => files.some(f => f.startsWith(l + '.'))), 'one file per language');
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const req = []; p.on('request', r => { if (/\/tr\//.test(r.url())) req.push(r.url()); });
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' })); await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '' }));
  await p.goto('file://' + path.join(site, 'index.html')); await p.waitForTimeout(400);
  ok(req.length === 0, 'English visitors download no translations');
  await p.selectOption('#langsel', 'ro'); await p.waitForFunction(() => LANG === 'ro'); await p.waitForTimeout(200);
  ok(req.length === 1 && /ro\./.test(req[0]) && !/Could your home cope/.test(await p.textContent('#v-landing h1')), 'picking Romanian loads only Romanian and translates the page');
  await p.reload(); await p.waitForFunction(() => LANG === 'ro'); await p.waitForTimeout(200);
  ok(!/Could your home cope/.test(await p.textContent('#v-landing h1')), 'the language comes back after a reload');
  await p.selectOption('#langsel', 'en'); await p.waitForTimeout(150);
  await p.evaluate(() => { start(false); Object.assign(cur, { home: 'house', outdoor: 'garden', tenure: 'own', adults: 2, heat: 'gas', hob: 'gas', water: 'few', food: 'some', kit: [], budget: 20 }); qi = list().length - 1; drawQ(); next(); });
  await p.selectOption('#langsel', 'pl'); await p.waitForFunction(() => LANG === 'pl');
  await p.evaluate(() => { H[view].paid = true; return openBook(); }); await p.waitForTimeout(1200);
  ok(/Spis treści|Wstęp|Książka/.test(await p.textContent('#shelf')), 'a book made in Polish is in Polish');
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
} catch (e) { console.log('FAIL', e); fails++; } finally { await b.close(); if (fails) { console.log(fails + ' FAILED'); process.exit(1); } } })();
