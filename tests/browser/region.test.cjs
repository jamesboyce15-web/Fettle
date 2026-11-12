// Launch areas: Greater Manchester and Cheshire get the right electricity network and water company, or a clear choice where the boundary splits.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const OUT = { M1: ['Manchester'], WA14: ['Trafford'], WA1: ['Warrington'], WA8: ['Halton'], CW1: ['Cheshire East'], SK10: ['Cheshire East'], CH1: ['Cheshire West and Chester'], SK4: ['Stockport'], LS1: ['Leeds'] };
(async () => { const b = await chromium.launch(); try {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
  await p.route('**/api.postcodes.io/outcodes/**', r => { const k = decodeURIComponent(r.request().url().split('/').pop()); const d = OUT[k]; r.fulfill(d ? { contentType: 'application/json', body: JSON.stringify({ result: { admin_district: d, country: ['England'] } }) } : { status: 404, body: '' }); });
  await p.goto('file://' + require('path').join(require('./proto-site.cjs'), 'index.html')); await p.waitForTimeout(300);
  const at = async pc => p.evaluate(async pc => { const h = fresh(false); h.pc = pc; await lookupPc(h); H = [h]; view = 0; const d = document.createElement('div'); d.innerHTML = psrPanel(h); return { net: network(h).name, netCo: h.netCo, water: h.waterCo, text: d.textContent.replace(/\s+/g, ' ') }; }, pc);
  let r = await at('M1'); ok(r.net === 'Electricity North West' && r.water === 'uu', 'Manchester: ENWL and United Utilities');
  r = await at('WA14'); ok(r.net === 'Electricity North West' && r.water === 'uu', 'Altrincham (WA postcode, Trafford): ENWL, not SP');
  r = await at('SK4'); ok(r.net === 'Electricity North West', 'Stockport: ENWL');
  r = await at('WA1'); ok(r.net === 'SP Energy Networks' && r.water === 'uu' && /0330 10 10 167/.test(r.text), 'Warrington: SP Energy Networks with its register number');
  r = await at('WA8'); ok(r.net === 'SP Energy Networks', 'Widnes (Halton): SP Energy Networks');
  r = await at('CW1'); ok(!r.netCo && r.water === 'uu' && /Most of Cheshire is SP Energy Networks/.test(r.text), 'Crewe (Cheshire East): asked to choose network, with a hint');
  r = await at('SK10'); ok(!r.netCo && /Macclesfield and Wilmslow/.test(r.text), 'Macclesfield: no guess, hint shown');
  r = await at('CH1'); ok(!r.netCo && !r.water && /Around Chester it's Severn Trent/.test(r.text), 'Chester: asked to choose network and water, with hints');
  r = await at('LS1'); ok(r.net === 'your local electricity network' && !r.water, 'outside launch area: national routes');
  // choosing updates the contacts and the printed plan
  const t = await p.evaluate(async () => { const h = fresh(false); h.pc = 'CH1'; await lookupPc(h); h.netCo = 'spen'; h.waterCo = 'st'; H = [h]; view = 0; const d = document.createElement('div'); d.innerHTML = psrPanel(h); return d.textContent.replace(/\s+/g, ' '); });
  ok(/0800 001 5400/.test(t) && /stwater\.co\.uk\/priority/.test(t) && /0800 783 4444/.test(t), 'chosen SP Energy Networks and Severn Trent show their numbers');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
} finally { await b.close(); } process.exit(fails ? 1 : 0); })();
