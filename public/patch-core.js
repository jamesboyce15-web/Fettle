/* Patch: the comparisons behind every area page and café report. Plain functions over plain data, no network or DOM,
   so the admin page, the report page and the tests all use the same sums.

   venue: {id, name, address, postcode, lat, lng, kind: "independent"|"chain", hygiene: "5"|"AwaitingInspection"|..., hygieneDate, hours}
   hours: {mon:["08:00","17:00"], ..., sun:null}   (null = closed)
   observation: {venueId, at, source: "menu"|"visit"|"website"|"owner", prices:{flat_white:3.4,...}, scores:{wait:4, clean:4, friendly:5, wifi:true, card_only:false}} */
(function (root) {
  "use strict";

  // The basket compared everywhere. Prices are what the customer pays, VAT included.
  const ITEMS = [
    { k: "espresso", t: "Espresso" }, { k: "americano", t: "Americano" }, { k: "flat_white", t: "Flat white" }, { k: "latte", t: "Latte" },
    { k: "cappuccino", t: "Cappuccino" }, { k: "tea", t: "Pot or cup of tea" }, { k: "hot_choc", t: "Hot chocolate" }, { k: "oat_extra", t: "Oat milk extra" },
    { k: "croissant", t: "Croissant" }, { k: "cake", t: "Slice of cake" }, { k: "toastie", t: "Toastie" }, { k: "brunch", t: "Full breakfast or brunch dish" },
  ];
  const ITEM = Object.fromEntries(ITEMS.map(i => [i.k, i]));

  // Rough cost per serving from public wholesale prices, before anyone's invoices are in. Estimates: the admin can change them.
  // flat white: 18g coffee at about £20/kg (36p) + 150ml milk at about £1.10/litre (17p) + takeaway cup and lid share (6p).
  const BENCH = { espresso: 0.40, americano: 0.42, flat_white: 0.59, latte: 0.66, cappuccino: 0.62, tea: 0.12, hot_choc: 0.55, oat_extra: 0.14,
    croissant: 0.90, cake: 0.85, toastie: 1.35, brunch: 2.90 };

  const SCORES = [
    { k: "wait", t: "Time to be served", unit: "minutes", lowerBetter: true },
    { k: "clean", t: "Cleanliness", unit: "out of 5" },
    { k: "friendly", t: "Friendliness", unit: "out of 5" },
    { k: "seats", t: "Seats free at the time", unit: "out of 5" },
  ];
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAYNAME = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  let MIN_N = 5; // never show an area figure made from fewer than 5 cafés (salons: 3, marked thin under 5)

  /* ---------- sectors ---------- */
  // An area is cafés or salons. The pages all read P.ITEMS, so switching sector swaps the basket in place.
  const CAFE_ITEMS = ITEMS.slice();
  const SECTORS = { cafe: { place: "café", places: "cafés", maxPrice: 40, minN: 5 }, salon: { place: "salon", places: "salons and barbers", maxPrice: 600, minN: 3 } };
  let SECTOR = "cafe";
  function useSector(s) {
    s = SECTORS[s] ? s : "cafe"; const PS = root.PatchSectors;
    const list = s === "salon" && PS ? PS.SALON_ITEMS.map(i => ({ k: i.k, t: i.t, g: i.g })) : CAFE_ITEMS;
    ITEMS.splice(0, ITEMS.length, ...list); Object.keys(ITEM).forEach(k => delete ITEM[k]); ITEMS.forEach(i => { ITEM[i.k] = i; });
    SECTOR = s; MIN_N = SECTORS[s].minN; api.MIN_N = MIN_N; api.SECTOR = s; api.WORDS = SECTORS[s]; api.MAX_PRICE = SECTORS[s].maxPrice; return s;
  }

  /* ---------- small sums ---------- */
  const num = v => (v === "" || v == null || isNaN(+v) ? null : +v);
  function quantile(xs, q) {
    const a = xs.filter(x => x != null && !isNaN(x)).map(Number).sort((p, r) => p - r);
    if (!a.length) return null;
    const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return a[lo] + (a[hi] - a[lo]) * (i - lo);
  }
  const median = xs => quantile(xs, 0.5);
  const round2 = x => (x == null ? null : Math.round(x * 100) / 100);
  // A price people would actually put on a board: the nearest 5p, or 10p from £3 up.
  const boardPrice = x => { const step = x >= 3 ? 0.1 : 0.05; return Math.round(Math.round(x / step) * step * 100) / 100; };
  // The same, but never above x: for a cap that must hold.
  const boardFloor = x => { const step = x >= 3 ? 0.1 : 0.05; return Math.round(Math.floor(x / step + 1e-9) * step * 100) / 100; };
  function miles(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 3958.8, r = d => (d * Math.PI) / 180, dl = r(b.lat - a.lat), dn = r(b.lng - a.lng);
    const s = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 100) / 100;
  }
  const toMin = t => { if (!t) return null; const m = /^(\d{1,2}):(\d{2})$/.exec(t); return m ? +m[1] * 60 + +m[2] : null; };

  /* ---------- latest data per café ---------- */
  // The newest price for each item, and the newest of each visit score, across everything seen at a café.
  function latest(observations, venueId) {
    const obs = observations.filter(o => o.venueId === venueId).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const prices = {}, scores = {}, seen = {};
    obs.forEach(o => {
      // Delivery-app prices are often higher than the counter, so they never count as a café's price.
      if (o.source !== "delivery") Object.entries(o.prices || {}).forEach(([k, v]) => { if (prices[k] == null && num(v) != null) { prices[k] = +v; seen[k] = o.at; } });
      Object.entries(o.scores || {}).forEach(([k, v]) => { if (scores[k] == null && v !== "" && v != null) scores[k] = v; });
    });
    return { prices, scores, seen, count: obs.length, lastAt: obs[0] && obs[0].at, visited: obs.some(o => o.source === "visit") };
  }

  function nearest(venue, venues, n) {
    return venues.filter(v => v.id !== venue.id && v.included !== false && v.lat != null)
      .map(v => ({ v, d: miles(venue, v) })).filter(x => x.d != null).sort((a, b) => a.d - b.d).slice(0, n || 10);
  }

  /* ---------- the area page ---------- */
  function areaStats(venues, observations) {
    const inc = venues.filter(v => v.included !== false), ind = inc.filter(v => v.kind !== "chain");
    const L = Object.fromEntries(inc.map(v => [v.id, latest(observations, v.id)]));
    const prices = ITEMS.map(i => { const xs = inc.map(v => L[v.id].prices[i.k]).filter(x => x != null);
      return { k: i.k, t: i.t, n: xs.length, thin: xs.length >= MIN_N && xs.length < 5, median: xs.length >= MIN_N ? round2(median(xs)) : null, low: xs.length >= MIN_N ? round2(quantile(xs, 0.1)) : null, high: xs.length >= MIN_N ? round2(quantile(xs, 0.9)) : null }; });
    const scores = SCORES.map(s => { const xs = inc.map(v => num(L[v.id].scores[s.k])).filter(x => x != null);
      return Object.assign({}, s, { n: xs.length, median: xs.length >= MIN_N ? round2(median(xs)) : null }); });
    const yes = k => { const xs = inc.map(v => L[v.id].scores[k]).filter(x => x === true || x === false); return xs.length >= MIN_N ? Math.round((xs.filter(Boolean).length / xs.length) * 100) : null; };
    const hyg = {}; inc.forEach(v => { const h = v.hygiene || "Unknown"; hyg[h] = (hyg[h] || 0) + 1; });
    return { cafes: inc.length, independents: ind.length, chains: inc.length - ind.length, priced: inc.filter(v => Object.keys(L[v.id].prices).length).length,
      visited: inc.filter(v => L[v.id].visited).length, prices, scores, wifi: yes("wifi"), cardOnly: yes("card_only"), hygiene: hyg,
      awaiting: inc.filter(v => v.hygiene === "AwaitingInspection").length, gaps: hoursGaps(inc) };
  }

  // When few cafés are open: early mornings, evenings and Sundays. Only counts cafés whose hours we know.
  function hoursGaps(venues) {
    const known = venues.filter(v => v.hours && DAYS.some(d => v.hours[d] !== undefined));
    if (known.length < MIN_N) return null;
    const share = f => Math.round((known.filter(f).length / known.length) * 100);
    const openBy = (v, d, t) => v.hours[d] && toMin(v.hours[d][0]) != null && toMin(v.hours[d][0]) <= t;
    const openTill = (v, d, t) => v.hours[d] && toMin(v.hours[d][1]) != null && toMin(v.hours[d][1]) >= t;
    return { known: known.length,
      before8: share(v => ["mon", "tue", "wed", "thu", "fri"].some(d => openBy(v, d, 8 * 60))),
      after5: share(v => ["mon", "tue", "wed", "thu", "fri"].some(d => openTill(v, d, 17 * 60))),
      sunday: share(v => !!v.hours.sun), sundayAfter3: share(v => openTill(v, "sun", 15 * 60)) };
  }

  /* ---------- one café's position ---------- */
  // How a café compares with its nearest rivals, item by item. quality: 0 to 1, from hygiene and visit scores.
  function position(venue, venues, observations, n) {
    const near = nearest(venue, venues, n || 10), me = latest(observations, venue.id);
    const items = ITEMS.map(i => {
      const peers = near.map(x => ({ name: x.v.name, d: x.d, price: latest(observations, x.v.id).prices[i.k] })).filter(x => x.price != null);
      const xs = peers.map(p => p.price), mine = me.prices[i.k] ?? null;
      const enough = xs.length >= 3;
      return { k: i.k, t: i.t, mine, peers, n: xs.length, median: enough ? round2(median(xs)) : null, high: enough ? round2(quantile(xs, 0.75)) : null,
        low: enough ? round2(quantile(xs, 0.25)) : null, diff: enough && mine != null ? round2(mine - median(xs)) : null,
        cheaperThan: mine != null && xs.length ? xs.filter(x => x > mine).length : null };
    });
    return { venue, near, me, items, quality: quality(venue, me) };
  }

  // 0 to 1. Hygiene 5 and good visit scores push it up; we only claim a premium where the evidence is there.
  function quality(venue, me) {
    const parts = [];
    const h = num(venue.hygiene); if (h != null) parts.push(h / 5);
    ["clean", "friendly"].forEach(k => { const s = num(me.scores[k]); if (s != null) parts.push(s / 5); });
    const w = num(me.scores.wait); if (w != null) parts.push(Math.max(0, Math.min(1, (10 - w) / 8)));
    const g = num(venue.googleRating); if (g != null) parts.push(Math.max(0, (g - 3) / 2));
    return parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100 : null;
  }

  /* ---------- margin and the two levers ---------- */
  // Margin on one item. VAT comes off the price first (most café sales are standard-rated; cold takeaway food may not be).
  function margin(price, cost, vat) {
    const p = num(price), c = num(cost), v = vat == null ? 0.2 : vat;
    if (p == null || c == null || p <= 0) return null;
    const ex = p / (1 + v), profit = ex - c;
    return { ex: round2(ex), profit: round2(profit), pct: Math.round((profit / ex) * 100) };
  }

  // For one item: first, can they buy it cheaper? If not, can they charge more and stay competitive?
  // row: {k, price, cost, perWeek}; pos: the item from position(); q: quality (0 to 1); bench: cost per serving
  function levers(row, pos, q, bench, vat) {
    const v = vat == null ? 0.2 : vat, out = { k: row.k, saving: null, price: null, perYear: 0 };
    const cost = num(row.cost), price = num(row.price), wk = num(row.perWeek) || 0, b = num(bench);
    if (cost != null && b != null && cost > b * 1.08) {
      const per = round2(cost - b);
      out.saving = { per, perYear: Math.round(per * wk * 52), text: `You pay about ${pence(cost)} a serving. Similar ${api.WORDS.places} can get it for about ${pence(b)}.` };
      out.perYear += out.saving.perYear;
    }
    if (price != null && pos && pos.median != null) {
      // Where they can sit: up to the nearby upper quartile if their quality is high, the median if it's average, never more than 12% up at once.
      const ceiling = q != null && q >= 0.85 ? pos.high : pos.median;
      const target = Math.min(boardPrice(ceiling), boardFloor(price * 1.12));
      if (target - price >= 0.1 && !out.saving) {
        const exGain = (target - price) / (1 + v);
        out.price = { from: price, to: target, perYear: Math.round(exGain * wk * 52),
          text: `Nearby ${api.WORDS.places} charge ${money(pos.median)} on average${q != null && q >= 0.85 ? `, and the dearer ones ${money(pos.high)}` : ""}. At ${money(target)} you'd still be ${target <= pos.median ? "at or below most of them" : "below the dearest"}.` };
        out.perYear += out.price.perYear;
      }
    }
    return out;
  }
  const money = x => (x == null ? "" : "£" + (+x).toFixed(2));
  const pence = x => (x == null ? "" : x < 1 ? Math.round(x * 100) + "p" : money(x));

  // The whole margin calculator: rows the owner typed in, against their position.
  function calculator(rows, pos, benchTable, vat) {
    const byK = Object.fromEntries((pos ? pos.items : []).map(i => [i.k, i]));
    const out = rows.map(r => Object.assign({ t: (ITEM[r.k] || {}).t || r.k, margin: margin(r.price, r.cost, vat) }, levers(r, byK[r.k], pos && pos.quality, (benchTable || BENCH)[r.k], vat)));
    const saving = out.reduce((t, r) => t + (r.saving ? r.saving.perYear : 0), 0), price = out.reduce((t, r) => t + (r.price ? r.price.perYear : 0), 0);
    return { rows: out, saving, price, total: saving + price };
  }

  // New places nearby: awaiting their first hygiene inspection usually means newly opened or new owners.
  // How prices nearby have moved: for each item, each nearby café's latest price against what it charged at least
  // `gapDays` before (so two sweeps, not two photos a day apart). Delivery-app prices never count.
  function priceMoves(venue, venues, observations, n, gapDays) {
    const gap = gapDays || 28, near = nearest(venue, venues, n || 10).map(x => x.v);
    const series = (vid, k) => observations.filter(o => o.venueId === vid && o.source !== "delivery" && num((o.prices || {})[k]) != null).map(o => ({ at: String(o.at), p: +o.prices[k] })).sort((a, b) => a.at.localeCompare(b.at));
    const change = (vid, k) => { const xs = series(vid, k); if (xs.length < 2) return null; const last = xs[xs.length - 1], cut = new Date(new Date(last.at + "T12:00:00Z").getTime() - gap * 864e5).toISOString().slice(0, 10);
      const prev = xs.filter(x => x.at <= cut).pop(); return prev ? { from: prev.p, to: last.p, fromAt: prev.at, toAt: last.at, d: round2(last.p - prev.p) } : null; };
    return ITEMS.map(i => {
      const ch = near.map(v => change(v.id, i.k)).filter(Boolean), up = ch.filter(c => c.d >= 0.05), down = ch.filter(c => c.d <= -0.05);
      const mine = change(venue.id, i.k);
      return { k: i.k, t: i.t, n: ch.length, up: up.length, down: down.length, same: ch.length - up.length - down.length, avgUp: up.length ? round2(up.reduce((t, c) => t + c.d, 0) / up.length) : null,
        since: ch.length ? ch.map(c => c.fromAt).sort()[0] : null, mine };
    }).filter(x => x.n >= 3);
  }
  function newNearby(venue, venues, withinMiles) {
    return venues.filter(v => v.id !== venue.id && v.hygiene === "AwaitingInspection").map(v => ({ v, d: miles(venue, v) }))
      .filter(x => x.d != null && x.d <= (withinMiles || 1)).sort((a, b) => a.d - b.d);
  }


  /* ---------- calendar: what's happening locally ---------- */
  // England and Wales bank holidays, for reading past sales and planning ahead. Refreshed from gov.uk where reachable.
  const BANK_HOLIDAYS = ["2024-01-01","2024-03-29","2024-04-01","2024-05-06","2024-05-27","2024-08-26","2024-12-25","2024-12-26",
    "2025-01-01","2025-04-18","2025-04-21","2025-05-05","2025-05-26","2025-08-25","2025-12-25","2025-12-26",
    "2026-01-01","2026-04-03","2026-04-06","2026-05-04","2026-05-25","2026-08-31","2026-12-25","2026-12-28",
    "2027-01-01","2027-03-26","2027-03-29","2027-05-03","2027-05-31","2027-08-30","2027-12-27","2027-12-28"];
  const CAL_TYPES = { event: "Local event", school: "School holiday", uni: "University holiday", roadworks: "Roadworks", bank: "Bank holiday", weather: "Weather warning", other: "Other" };
  // entry: {type, title, start:"YYYY-MM-DD", end:"YYYY-MM-DD", districts:[...], effect:"busier"|"quieter"|"", note}
  const inRange = (d, e) => d >= e.start && d <= (e.end || e.start);
  function calendarFor(calendar, district, fromISO, days) {
    const from = fromISO || new Date().toISOString().slice(0, 10), to = new Date(new Date(from).getTime() + (days || 56) * 864e5).toISOString().slice(0, 10);
    const d = String(district || "").toUpperCase();
    const bank = BANK_HOLIDAYS.filter(x => x >= from && x <= to).map(x => ({ type: "bank", title: "Bank holiday", start: x, end: x, districts: [], effect: "" }));
    return (calendar || []).concat(bank).filter(e => (e.end || e.start) >= from && e.start <= to && (!e.districts || !e.districts.length || !d || e.districts.map(x => String(x).toUpperCase()).includes(d)))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  /* ---------- cost changes ---------- */
  // change: {k:"milk", t:"Milk", at:"YYYY-MM-DD", pct: 6, source}. Which basket items each input feeds, and roughly how much of their cost it is.
  const COST_INPUTS = { milk: { t: "Milk", items: { flat_white: 0.3, latte: 0.35, cappuccino: 0.3, hot_choc: 0.3 } }, coffee: { t: "Coffee beans", items: { espresso: 0.85, americano: 0.8, flat_white: 0.6, latte: 0.55, cappuccino: 0.58 } },
    oat: { t: "Oat milk", items: { oat_extra: 0.9 } }, dairy: { t: "Butter and cheese", items: { croissant: 0.3, toastie: 0.35, brunch: 0.15 } }, cups: { t: "Takeaway cups and lids", items: { flat_white: 0.1, latte: 0.1, americano: 0.12 } } };
  // The cost per serving after the changes logged since a date.
  function benchAfter(bench, changes, sinceISO) {
    const out = Object.assign({}, bench), since = sinceISO || "0000";
    (changes || []).filter(c => c.at > since && COST_INPUTS[c.k] && num(c.pct) != null).forEach(c => {
      Object.entries(COST_INPUTS[c.k].items).forEach(([item, share]) => { if (out[item] != null) out[item] = round2(out[item] * (1 + (share * +c.pct) / 100)); });
    });
    return out;
  }

  /* ---------- sales: read a till export, find the pattern ---------- */
  // A small CSV reader: quotes, commas or semicolons, line ends inside quotes.
  function parseCSV(text) {
    const first = text.split(/\r?\n/, 1)[0] || "", sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : first.includes("\t") && !first.includes(",") ? "\t" : ",";
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ""));
  }
  // Dates as tills write them: 2026-11-03, 03/11/2026, 3/11/26, with or without a time.
  function parseWhen(dateStr, timeStr) {
    const s = String(dateStr || "").trim(); let y, mo, d, h = 0, mi = 0, m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/.exec(s))) { [y, mo, d] = [+m[1], +m[2], +m[3]]; if (m[4]) { h = +m[4]; mi = +m[5]; } }
    else if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:[\s,]+(\d{1,2}):(\d{2}))?/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; if (m[4]) { h = +m[4]; mi = +m[5]; } }
    else return null;
    const t = String(timeStr || "").trim(); if ((m = /^(\d{1,2}):(\d{2})/.exec(t))) { h = +m[1]; mi = +m[2]; if (/pm/i.test(t) && h < 12) h += 12; if (/am/i.test(t) && h === 12) h = 0; }
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
    return { date: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, hour: h, minute: mi, dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
  }
  const money2 = v => { const x = parseFloat(String(v || "").replace(/[£$€,\s]/g, "").replace(/^\((.*)\)$/, "-$1")); return isNaN(x) ? null : x; };
  // Works out which columns hold the date, time and amount. Returns {rows, mapping, skipped} or {error}.
  function readSales(text, mapping) {
    const all = parseCSV(text); if (all.length < 2) return { error: "That file looks empty." };
    const head = all[0].map(h => String(h).trim()), low = head.map(h => h.toLowerCase());
    const find = res => { for (const re of res) { const i = low.findIndex(h => re.test(h)); if (i >= 0) return i; } return -1; };
    const map = Object.assign({ date: find([/^date$/, /date.*time|datetime|timestamp/, /date/, /created/]), time: find([/^time$/, /time(?!stamp)/]),
      amount: find([/^gross sales$/, /gross/, /^total$/, /total/, /net sales/, /^amount$/, /amount/, /sales/, /value/]),
      item: find([/^item$/, /^item name$/, /product/, /^description$/, /description/, /^name$/]), qty: find([/^qty$/, /quantity/, /^count$/, /units/]) }, mapping || {});
    if (map.time === map.date) map.time = -1;
    if (map.date < 0 || map.amount < 0) return { error: "We couldn't tell which columns hold the date and the amount. Choose them below.", head, mapping: map };
    const rows = []; let skipped = 0;
    all.slice(1).forEach(r => { const w = parseWhen(r[map.date], map.time >= 0 ? r[map.time] : ""), a = money2(r[map.amount]);
      if (!w || a == null) { skipped++; return; }
      const row = Object.assign(w, { amount: a });
      if (map.item >= 0 && r[map.item]) { row.item = String(r[map.item]).trim(); const q = map.qty >= 0 ? parseFloat(r[map.qty]) : 1; row.qty = isNaN(q) ? 1 : q; }
      rows.push(row); });
    if (!rows.length) return { error: "We couldn't read any sales from that file. Check the date and amount columns below.", head, mapping: map };
    return { rows, head, mapping: map, skipped, hasTime: map.time >= 0 || rows.some(r => r.hour || r.minute) };
  }
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // The pattern: average takings per weekday and hour, daily totals, best and quiet hours, average sale.
  function salesPattern(rows) {
    const days = {}, cells = {}, dayCount = {};
    rows.forEach(r => { days[r.date] = days[r.date] || { date: r.date, dow: r.dow, total: 0, sales: 0 }; days[r.date].total += r.amount; days[r.date].sales++;
      const k = r.dow + ":" + r.hour; cells[k] = (cells[k] || 0) + r.amount; });
    Object.values(days).forEach(d => dayCount[d.dow] = (dayCount[d.dow] || 0) + 1);
    const grid = {}; Object.entries(cells).forEach(([k, v]) => { const [dw] = k.split(":"); grid[k] = round2(v / dayCount[dw]); });
    const dlist = Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
    const tot = dlist.reduce((t, d) => t + d.total, 0), n = rows.length, peak = Math.max(0, ...Object.values(grid));
    const hours = Object.keys(grid).map(k => +k.split(":")[1]), hMin = Math.min(...hours), hMax = Math.max(...hours);
    const quiet = Object.entries(grid).filter(([, v]) => v < peak * 0.25).map(([k, v]) => ({ dow: +k.split(":")[0], hour: +k.split(":")[1], v })).sort((a, b) => a.v - b.v);
    const best = Object.entries(grid).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({ dow: +k.split(":")[0], hour: +k.split(":")[1], v }));
    const byDow = [0, 1, 2, 3, 4, 5, 6].map(dw => { const ds = dlist.filter(d => d.dow === dw); return { dow: dw, avg: ds.length ? round2(ds.reduce((t, d) => t + d.total, 0) / ds.length) : null, n: ds.length }; });
    return { days: dlist, grid, peak, hMin, hMax, best, quiet: quiet.slice(0, 6), byDow, from: dlist[0] && dlist[0].date, to: dlist.length && dlist[dlist.length - 1].date,
      total: round2(tot), avgSale: n ? round2(tot / n) : null, sales: n, avgDay: dlist.length ? round2(tot / dlist.length) : null };
  }
  // For each kind of local happening: takings on those days against the same weekdays without one.
  function salesVsCalendar(pattern, calendar) {
    const days = pattern.days; if (days.length < 14) return [];
    const entries = (calendar || []).concat(BANK_HOLIDAYS.map(x => ({ type: "bank", title: "Bank holidays", start: x, end: x })));
    const groups = {};
    entries.forEach(e => { const key = e.type === "bank" ? "bank" : e.type + ":" + e.title; (groups[key] = groups[key] || { type: e.type, title: e.type === "bank" ? "Bank holidays" : e.title, entries: [] }).entries.push(e); });
    const out = [];
    Object.values(groups).forEach(g => {
      const hit = days.filter(d => g.entries.some(e => inRange(d.date, e))); if (hit.length < 1) return;
      const dows = new Set(hit.map(d => d.dow)), base = days.filter(d => dows.has(d.dow) && !hit.includes(d) && !entries.some(e => e.type === "bank" && inRange(d.date, e)));
      if (base.length < 3) return;
      // compare day by day against the same weekday's normal
      const normal = dw => { const xs = base.filter(d => d.dow === dw).map(d => d.total); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
      const ratios = hit.map(d => { const nm = normal(d.dow); return nm ? d.total / nm : null; }).filter(x => x != null);
      if (!ratios.length) return;
      const pct = Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length - 1) * 100);
      out.push({ type: g.type, title: g.title, days: hit.length, pct });
    });
    return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  }
  // Only totals by weekday and hour, never single sales: what an owner can choose to share with Patch.
  const salesShare = p => ({ from: p.from, to: p.to, days: p.days.length, avgDay: p.avgDay, avgSale: p.avgSale, grid: p.grid, byDow: p.byDow });

  const BENCH_DATE = "2026-11-01"; // when the starting costs per serving were set
  const api = { SECTORS, useSector, SECTOR: "cafe", WORDS: SECTORS.cafe, MAX_PRICE: 40, BENCH_DATE, BANK_HOLIDAYS, CAL_TYPES, calendarFor, COST_INPUTS, benchAfter, parseCSV, parseWhen, readSales, salesPattern, salesVsCalendar, salesShare, DOW, ITEMS, ITEM, BENCH, SCORES, DAYS, DAYNAME, MIN_N, quantile, median, boardPrice, miles, latest, nearest, areaStats, hoursGaps, position, quality, margin, levers, calculator, newNearby, priceMoves, money, pence };
  // Always on the global too, so the server bundle (where `module` exists) can share these between files.
  root.PatchCore = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
