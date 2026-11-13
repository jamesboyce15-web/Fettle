// Money questions (optional, never change the score), partner tags on saved plans, and the /admin page.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const PUB = path.resolve(__dirname, '../../public');
const srv = http.createServer((req, res) => { let f = path.join(PUB, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!path.extname(f)) f += '.html';
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); res.end(b); }); });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const REPORT = { made: '2026-11-13T19:00:00Z',
  overview: { started: 120, finished: 80, plans: 40, checked_twice: 12, accounts: 45, confirmed: 41, reminders_on: 30, count_me: 25, anon_checks: 33, score_first: 38, score_first_twice: 35, score_latest_twice: 61, reminders_sent: 9, organisations: 1 },
  days: [{ day: new Date().toISOString().slice(0, 10), started: 6, finished: 4 }],
  sources: [{ src: '(no tag)', started: 70, finished: 44, calc: 3, local_info: 5, remind_page: 4, remind_signup: 2 }, { src: 'rochdale-fire', started: 50, finished: 36, calc: 0, local_info: 0, remind_page: 0, remind_signup: 0 }],
  areas: [{ area: 'Rochdale', finished: 60, plans: 30, count_me: 22, checked_twice: 10, anon: 20 }, { area: 'Bury', finished: 3, plans: 2, count_me: 1, checked_twice: 0, anon: 1 }],
  partners: [{ src: 'rochdale-fire', households: 18, followed_up: 6, score_first: 33, score_latest: 58 }],
  reminders: [{ area: 'All areas', households: 30 }] };
const AREA = { area: 'Rochdale', made: '2026-11-13T19:00:00Z', outcomes: null, impact: [], groups: [], confidence: [], barriers: [], anon: [], funnel: [{ area: 'All areas', started: 120, finished: 80 }],
  money: [{ measure: 'Could pay an unexpected £200 bill without borrowing', households: 20, first_pct: 40, latest_pct: 55, followed_up: 9 }] };
const stub = mode => `window.supabase={createClient(){return{auth:{async getSession(){return{data:{session:${mode === 'out' ? 'null' : '{user:{id:"u1"}}'}}}}},
  async rpc(fn,args){window.__calls=(window.__calls||[]).concat([[fn,args]]);
    if(${mode === 'no'})return{data:null,error:{message:"not allowed"}};
    const d=${JSON.stringify(REPORT)}; if(args&&args.p_area)d.area=${JSON.stringify(AREA)}; return{data:d,error:null};}}}};`;
(async () => {
  await new Promise(r => srv.listen(8774, r));
  const b = await chromium.launch();
  const page = async mode => { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.route('**fonts.googleapis.com**', r => r.fulfill({ contentType: 'text/css', body: '' }));
    await p.route('**/api.postcodes.io/**', r => r.fulfill({ status: 404, body: '{}' }));
    await p.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: mode ? 'window.FETTLE_CONFIG={supabaseUrl:"https://fake.supabase.co",supabaseAnonKey:"anon",siteUrl:"https://getfettle.co.uk"};' : '' }));
    if (mode) await p.route('**/cdn.jsdelivr.net/npm/@supabase/**', r => r.fulfill({ contentType: 'text/javascript', body: stub(mode) }));
    return p; };
  try {
    // ---- money questions ----
    const p = await page(null);
    await p.goto('http://localhost:8774/?src=rochdale-fire'); await p.waitForTimeout(300);
    const base = { home: "house", outdoor: "garden", tenure: "own", adults: 2, heat: "gas", hob: "gas", cold: "slow", healthGate: "no", water: "all", food: "yes", kit: ["torch"], fa: "no", pay: "dd" };
    const ids = await p.evaluate(base => { start(false); Object.assign(cur, base); return list().map(q => q.id); }, base);
    ok(ids.indexOf('mShock') > ids.indexOf('fa') && ids.indexOf('mFood') < ids.indexOf('budget') && ids.includes('mBills'), 'three money questions, after first aid and before the budget');
    await p.evaluate(() => { qi = list().findIndex(q => q.id === 'mShock'); drawQ(); }); await p.waitForTimeout(100);
    const t = await p.textContent('#v-q');
    ok(/£200/.test(t) && /Optional/.test(t) && /rather not say/.test(t) && /doesn't change your score/.test(t), 'the question says it is optional and offers "I\'d rather not say"');
    const res = await p.evaluate(() => { const s0 = score(cur); cur.mShock = "no"; cur.mBills = "skip"; cur.mFood = "no"; const s1 = score(cur); cur.budget = 10; qi = list().length - 1; next();
      const h = H[H.length - 1]; return { same: s0 === s1, fin: h.scores[0].fin, src: h.src, help: needs(h).some(x => x.id === "moneyhelp"), anon: anonData(h).fin }; });
    ok(res.same, 'money answers do not change the score');
    ok(JSON.stringify(res.fin) === '{"buf":0,"debt":null,"food":0}' && JSON.stringify(res.anon) === JSON.stringify(res.fin), 'saved with the check: no buffer, rather not say, no food bank');
    ok(res.help, 'no £200 buffer: the plan adds "Check what help you can get"');
    ok(res.src === 'rochdale-fire', 'the partner tag from the link is saved with the plan');
    ok(await p.evaluate(() => { start(true); return !list().some(q => /^m(Shock|Bills|Food)$/.test(q.id)); }), "not asked when checking someone else's home");
    ok(/Guidance last checked 12 November 2026\./.test(await p.innerText('#res')) && !/Clinical review/.test(await p.innerText('body')), 'no "Clinical review: pending" on the plan');
    ok(!p.errs.length, 'no page errors ' + p.errs.join(' | '));

    // ---- admin page ----
    let a = await page('out'); await a.goto('http://localhost:8774/admin'); await a.waitForTimeout(400);
    ok(/Sign in to Fettle first/.test(await a.textContent('#box')), 'admin: signed out, asked to sign in');
    a = await page('no'); await a.goto('http://localhost:8774/admin'); await a.waitForTimeout(400);
    ok(/can't see the admin page/.test(await a.textContent('#box')) && !/Checks started/.test(await a.textContent('#box')), 'admin: an ordinary account is refused and sees no numbers');
    a = await page('yes'); await a.goto('http://localhost:8774/admin'); await a.waitForTimeout(400);
    const txt = await a.textContent('#box');
    ok(/120\s*Checks started/.test(txt) && /Checks finished \(67%\)/.test(txt) && /35% → 61%/.test(txt), 'admin: totals, completion rate and before-and-after score');
    ok(/rochdale-fire/.test(txt) && /Bury\s*under 5/.test(txt) && !/Rochdale\s*under 5/.test(txt), 'admin: sources, partners, and small areas flagged');
    await a.fill('#pname', 'Rochdale Fire & Rescue Service!');
    ok((await a.textContent('#pl')) === 'https://getfettle.co.uk/?src=rochdale-fire-rescue', 'admin: partner link maker makes a valid tag');
    await a.click('button.quiet:has-text("Report") >> nth=0'); await a.waitForURL('**/area-report'); await a.waitForTimeout(300);
    const rt = await a.textContent('#report');
    ok(/Household preparedness in Rochdale/.test(rt) && /Money and resilience/.test(rt) && /40%/.test(rt) && /55%/.test(rt) && /Back to admin/.test(rt), 'admin: area report opens with the money outcomes');
    ok(!(await a.isVisible('#input')), 'area report: paste box hidden when opened from admin');
    ok(!a.errs.length, 'no admin page errors ' + a.errs.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
