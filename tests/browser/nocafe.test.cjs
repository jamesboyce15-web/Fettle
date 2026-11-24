// Patch is for salons and barbers: no café words on any screen the public or a salon owner sees (the demo, every tab, every kit).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const PUB = path.resolve(__dirname, '../../public'), PORT = 8793, U = `http://localhost:${PORT}/`;
const TYPES = { js: 'text/javascript', css: 'text/css' };
const srv = http.createServer((q, s) => { let f = path.join(PUB, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': TYPES[f.split('.').pop()] || 'text/html' }); s.end(b); }); });
const RE = /caf[eé]s?\b|coffee|latte|espresso|croissant|brunch|cake|milk|food hygiene|hygiene rating|menu board|pavement|pest control|gas safety|barista|toastie/ig;
(async () => {
  await new Promise(r => srv.listen(PORT, r)); const b = await chromium.launch(), found = {}, errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route('**fonts.g*/**', r => r.fulfill({ body: '' }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  const grab = async name => { const t = await p.innerText('body'); const m = t.match(RE); if (m) found[name] = [...new Set(m.map(x => x.toLowerCase()))].join(', ') + '  «' + (t.match(new RegExp('.{0,50}(' + m[0] + ').{0,40}', 'i')) || [''])[0].replace(/\n/g, ' ') + '»'; };
  for (const u of ['?demo=1', 'price-check.html?demo=1', 'report.html?demo=1', 'privacy.html', '404.html']) { await p.goto(U + u); await p.waitForTimeout(500); await grab(u); }
  await p.goto(U + 'owner.html?demo=1'); await p.waitForTimeout(800); await grab('owner home');
  for (const t of ['actions', 'insights', 'plan', 'upload']) { await p.click(`[data-tab=${t}]`); await p.click('[data-act=allacts]', { timeout: 1000 }).catch(() => {}); await p.waitForTimeout(200); await grab('owner ' + t); }
  await p.click('[data-tab=insights]'); const subs = await p.$$eval('[data-sub]', es => [...new Set(es.map(e => e.dataset.sub).filter(Boolean))]);
  for (const s of subs) { await p.click('[data-tab=insights]'); await p.click(`[data-sub=${s}]`); await p.waitForTimeout(200); await grab('insights ' + s); }
  await p.click('[data-tab=actions]'); await p.click('[data-act=allacts]', { timeout: 1000 }).catch(() => {});
  const kits = await p.$$eval('[data-kit]', es => [...new Set(es.map(e => e.dataset.kit))]);
  for (const k of kits) { await p.click('[data-tab=actions]'); await p.click('[data-act=allacts]', { timeout: 1000 }).catch(() => {}); await p.click(`[data-kit="${k}"]`, { timeout: 2000 }).catch(() => {}); await p.waitForTimeout(200); await grab('kit ' + k); await p.click('.modal [data-act=closemodal]', { timeout: 1000 }).catch(() => {}); }
  await p.click('[data-act=account]'); await p.waitForTimeout(100); await grab('account'); 
  const n = Object.keys(found).length; Object.entries(found).forEach(([k, v]) => console.log('FAIL ' + k + ': ' + v));
  if (errs.length) console.log('FAIL page errors: ' + errs.join('; '));
  console.log(`${n || errs.length ? 0 : 1} passed, ${n + (errs.length ? 1 : 0)} failed`); await b.close(); srv.close(); process.exit(n || errs.length ? 1 : 0);
})();
