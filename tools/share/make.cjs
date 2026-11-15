// Makes public/og.png (the picture shown when a link is shared) and public/apple-touch-icon.png (home-screen icon).
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const pub = path.resolve(__dirname, '../../public');
  let p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'og.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(pub, 'og.png') });
  p = await b.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await p.setContent('<body style="margin:0"><svg width="180" height="180" viewBox="0 0 32 32" style="display:block"><rect width="32" height="32" fill="#173f35"/><path d="M8 15.5 16 9l8 6.5V24a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="none" stroke="#f6f7f4" stroke-width="2" stroke-linejoin="round"/><path d="M16 14.5c1.9 1.7 2.8 3.2 2.8 4.6a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.9 2.8-4.6z" fill="#f2a900"/></svg></body>');
  await p.screenshot({ path: path.join(pub, 'apple-touch-icon.png') });
  await b.close(); console.log('wrote og.png and apple-touch-icon.png'); })();
