/* Patch: data for the three pages. Live: Supabase (config.js). Demo: made-up cafés in a made-up area, kept in this browser
   only (localStorage), so the admin page, the area page and a report can be tried end to end before the database exists. */
(function (root) {
  "use strict";
  const CFG = root.PATCH_CONFIG || {};
  const Q = new URLSearchParams(location.search);
  const DEMO = Q.has("demo") || !CFG.supabaseUrl;
  const KEY = "patch-demo-db-v11";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- the demo: made-up cafés around a made-up high street ---------- */
  function demoSeed() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const names = ["Juniper & Rye", "Little Fig", "Kettle Lane Coffee", "Bramble Café", "Northfield Roasters", "The Sunny Spoon", "Oak & Oat", "Café Marigold",
      "Two Swans Tea Room", "Brickworks Coffee", "Cornerstone Kitchen", "Pebble Bakehouse", "Moss Hill Café", "Hollybank Coffee House", "Starling Coffee Co (chain)", "Bean Station (chain)"];
    const y = new Date().getFullYear(), dd = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const area = { id: "area-demo", slug: "demo", name: "Elm Park cafés (old demo)", districts: ["EP1", "EP2"], bench: {}, published: null, published_at: null,
      calendar: [{ type: "event", title: "Elm Park farmers' market", start: dd(9), end: dd(9), districts: [], effect: "busier", note: "Second Saturday of the month" },
        { type: "roadworks", title: "High Street resurfacing", start: dd(16), end: dd(27), districts: ["EP1"], effect: "quieter", note: "" },
        { type: "school", title: "School Christmas holidays", start: `${y}-12-19`, end: `${y + 1}-01-05`, districts: [], effect: "", note: "" },
        { type: "uni", title: "University Christmas break", start: `${y}-12-12`, end: `${y + 1}-01-18`, districts: [], effect: "quieter", note: "" }],
      costs: [{ k: "milk", at: dd(-20), pct: 6, source: "Made-up figure for the demo" }],
      profile: { people: "31,000", students: "9", over65: "17", wfh: "36", families: "29", source: "Made up for the demo" } };
    const venues = names.map((n, i) => ({ id: "dv" + i, area_id: area.id, name: n.replace(" (chain)", ""), address: `${10 + i * 7} High Street, Elm Park`, postcode: `EP${i < 8 ? 1 : 2} ${i + 1}AB`,
      lat: 53.40 + (rnd() - 0.5) * 0.02, lng: -2.20 + (rnd() - 0.5) * 0.03, kind: /chain/.test(n) ? "chain" : "independent", included: true,
      hygiene: i === 11 ? "AwaitingInspection" : i === 9 ? "3" : i === 5 ? "4" : "5", hygiene_date: "2026-0" + (1 + (i % 9)) + "-15",
      hours: { mon: ["0" + (7 + (i % 3)) + ":30", i % 4 === 0 ? "18:00" : "16:00"], tue: ["0" + (7 + (i % 3)) + ":30", "16:00"], wed: ["08:00", "16:00"], thu: ["08:00", "16:00"], fri: ["08:00", "16:30"],
        sat: ["09:00", "16:00"], sun: i % 3 === 0 ? ["10:00", "14:00"] : null } }));
    const base = { espresso: 2.4, americano: 2.9, flat_white: 3.35, latte: 3.45, cappuccino: 3.4, tea: 2.6, hot_choc: 3.5, oat_extra: 0.45, croissant: 2.9, cake: 3.75, toastie: 6.5, brunch: 11.5 };
    const observations = [];
    venues.forEach((v, i) => {
      const lift = (rnd() - 0.45) * 0.5, prices = {};
      Object.entries(base).forEach(([k, p]) => { if (rnd() > 0.12) prices[k] = Math.round((p * (1 + lift * (k === "brunch" ? 0.6 : 0.25)) ) / 0.05) * 0.05; });
      Object.keys(prices).forEach(k => prices[k] = Math.round(prices[k] * 100) / 100);
      observations.push({ id: uid(), venue_id: v.id, at: "2026-11-0" + (1 + (i % 8)), source: "visit", prices,
        scores: { wait: 2 + Math.round(rnd() * 7), clean: 3 + Math.round(rnd() * 2), friendly: 3 + Math.round(rnd() * 2), seats: 2 + Math.round(rnd() * 3), welcome: 2 + Math.round(rnd() * 3), coffee: 2 + Math.round(rnd() * 3), food: 2 + Math.round(rnd() * 3), value: 2 + Math.round(rnd() * 3), ambience: 2 + Math.round(rnd() * 3), drink_wait: 2 + Math.round(rnd() * 5), accuracy: rnd() > 0.15, wifi: rnd() > 0.35, card_only: rnd() > 0.6, dog: rnd() > 0.5, plugs: rnd() > 0.5 }, notes: "", by_name: "Demo" });
    });
    const requests = [
      { id: uid(), created_at: new Date(Date.now() - 864e5).toISOString(), area_id: area.id, venue_id: "dv1", name: "Sam (made up)", email: "sam@example.com", role: "Owner", phone: "", message: "Is my pricing right?", status: "new", token: "demo-report-1", report: null, report_at: null, founding_interest: false },
      { id: uid(), created_at: new Date(Date.now() - 3 * 864e5).toISOString(), area_id: area.id, venue_id: null, venue_text: "A café that isn't on the list", name: "Priya (made up)", email: "priya@example.com", role: "Manager", status: "new", token: "demo-report-2", report: null, report_at: null, founding_interest: false },
    ];
    // Past markets (second Saturday of each of the last three months), so the forecast can learn what they do.
    const secondSat = (y0, m0) => { const d = new Date(Date.UTC(y0, m0, 1)); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); };
    const now = new Date(), past = [1, 2, 3].map(k => { const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); return secondSat(m.getUTCFullYear(), m.getUTCMonth()); });
    past.forEach(dt => area.calendar.push({ type: "event", title: "Elm Park farmers' market", start: dt, end: dt, districts: [], effect: "busier", note: "" }));
    // Little Fig's last 10 weeks: busy 8 to 10, Saturdays half as busy again, market days +30%, a flat white rise four weeks ago.
    const sales = { days: {}, items: {} }, rise = dd(-28);
    for (let k = 70; k >= 1; k--) { const ds = dd(-k), t = new Date(ds + "T12:00:00Z"), dow = t.getUTCDay(); if (dow === 0) continue;
      const mk = past.includes(ds) ? 1.3 : 1, sat = dow === 6 ? 1.5 : 1, day = { t: 0, n: 0, h: {} }, it = {};
      for (let h = 8; h <= 15; h++) { const n = Math.round((h <= 9 ? 26 : h === 12 ? 18 : 10) * sat * mk * (0.9 + rnd() * 0.2)); let v = 0;
        for (let i = 0; i < n; i++) { const kind = i % 3 === 0 ? "cake" : i % 3 === 1 ? "flat white" : "latte", p = kind === "cake" ? 3.6 : kind === "latte" ? 3.45 : ds >= rise ? 3.4 : 3.1; v += p; it[kind] = (it[kind] || 0) + 1; }
        day.h[h] = Math.round(v * 100) / 100; day.t += v; day.n += n; }
      day.t = Math.round(day.t * 100) / 100; sales.days[ds] = day; sales.items[ds] = it; }
    const ownerState = { sales, prep: [{ name: "Croissants", perDay: 40 }, { name: "Banana bread slices", perDay: 24 }, { name: "Soup portions", perDay: 15 }],
      changes: [{ id: "c1", item: "Flat white", k: "flat_white", from: 3.1, to: 3.4, at: rise }],
      reviews: [{ id: "r1", at: dd(-2), rating: 2, author: "Chris P (made up)", text: "Waited ages on Saturday morning and my latte was lukewarm. Lovely cake though.", source: "Google" },
        { id: "r2", at: dd(-6), rating: 5, author: "Amira (made up)", text: "Lovely staff, great coffee and really cosy. Dog friendly too!", source: "Google" },
        { id: "r3", at: dd(-20), rating: 3, author: "Dan (made up)", text: "Good coffee but slow service at the weekend.", source: "Google" }],
      reminders: [{ id: "m1", t: "Insurance renewal", every: 12, due: dd(12) }, { id: "m2", t: "Pest control visit", every: 3, due: dd(40) }, { id: "m3", t: "Fire risk assessment review", every: 12, due: null }] };
    // Search checks for every made-up café; Little Fig has gaps worth fixing.
    const SEOK = ["gbp_hours", "gbp_photos", "gbp_reviews", "gbp_replies", "gbp_category", "site", "https", "mobile", "title", "menu", "schema", "nap"];
    venues.forEach((v, i) => { const c = {}; SEOK.forEach((k, j) => c[k] = ((i * 7 + j * 3) % 10) < 7); v.seo = { at: dd(-9), checks: c }; });
    venues[1].seo = { at: dd(-9), checks: { gbp_hours: true, gbp_photos: false, gbp_reviews: false, gbp_replies: false, gbp_category: true, site: true, https: true, mobile: true, title: false, menu: false, schema: false, nap: true } };
    // What AI assistants said when asked about Elm Park.
    const Q = [["Where's the best coffee in Elm Park?", "best coffee"], ["Good brunch in Elm Park", "brunch"], ["Dog-friendly café in Elm Park", "dog-friendly"], ["Quiet café to work from in Elm Park", "laptop-friendly"], ["Best cake in Elm Park", "cake"]];
    const ANS = [[["Oak & Oat", "Little Fig", "Northfield Roasters"], ["Northfield Roasters", "Oak & Oat"]], [["Cornerstone Kitchen", "Café Marigold"], ["Cornerstone Kitchen", "Little Fig"]],
      [["Bramble Café", "Moss Hill Café"], ["Bramble Café", "Oak & Oat"]], [["Brickworks Coffee", "Hollybank Coffee House"], ["Brickworks Coffee"]], [["Pebble Bakehouse", "Juniper & Rye"], ["Juniper & Rye", "Pebble Bakehouse"]]];
    area.geo = { at: dd(-5), engines: ["ChatGPT", "Claude"], prompts: Q.map(([q, theme]) => ({ q, theme })), answers: {} };
    Q.forEach(([q], i) => { area.geo.answers[q + "|ChatGPT"] = ANS[i][0]; area.geo.answers[q + "|Claude"] = ANS[i][1]; });
    area.geo.sources = { [Q[0][0] + "|Claude"]: ["https://www.tripadvisor.co.uk/Restaurants-elm-park", "https://www.elmparknews.example/best-coffee", "https://www.google.com/maps"], [Q[1][0] + "|Claude"]: ["https://www.tripadvisor.co.uk/Restaurants-elm-park", "https://www.yell.com/s/cafes-elm+park.html"] };
    // Little Fig: a good visit six weeks ago, a slower one this month.
    const lf = observations.find(o => o.venue_id === "dv1"); lf.at = dd(-12); Object.assign(lf.scores, { wait: 9, clean: 4, friendly: 5, seats: 3, welcome: 3, coffee: 4, food: 4, value: 3, ambience: 4, drink_wait: 6, accuracy: true });
    observations.push({ id: uid(), venue_id: "dv1", at: dd(-44), source: "visit", prices: {}, scores: { wait: 3, clean: 5, friendly: 5, seats: 4, welcome: 5, coffee: 5, food: 5, value: 4, ambience: 5, drink_wait: 3, accuracy: true, wifi: true, card_only: false }, notes: "", by_name: "Demo" });
    // Four weeks of supplier invoices: milk and cups dearer than they should be.
    const invoices = [0, 1, 2, 3].map(w => ({ id: "inv" + w, name: `Valley Dairy invoice ${w + 1}.pdf`, at: dd(-7 * (w + 1)), kind: "pdf", supplier: "Valley Dairy (made up)", found: "milk, oat milk",
      lines: [{ desc: "Whole Milk 4pt", qty: 14, total: 14 * 2.98, date: dd(-7 * (w + 1)) }, { desc: "Oatly Barista 6 x 1L", qty: 2, total: 2 * 11.4, date: dd(-7 * (w + 1)) }] }))
      .concat([{ id: "inv9", name: "Cup & Co order.csv", at: dd(-20), kind: "csv", supplier: "Cup & Co (made up)", found: "takeaway cups, lids, coffee beans",
        lines: [{ desc: "8oz ripple cups box of 1000", qty: 1, total: 112, date: dd(-20) }, { desc: "8oz cup lids box of 1000", qty: 1, total: 52, date: dd(-20) }, { desc: "House espresso blend 1kg", qty: 6, total: 6 * 19.5, date: dd(-20) }] }]);
    ownerState.invoices = invoices; ownerState.settings = { perStaffHour: 60, minStaff: 1, special: "", website: "littlefig.example" };
    requests.push({ id: uid(), created_at: new Date(Date.now() - 40 * 864e5).toISOString(), area_id: area.id, venue_id: "dv1", name: "Jess (made up)", email: "jess@example.com", role: "Owner", status: "founding", token: "demo-owner", report: null, report_at: null, founding_interest: true, owner_state: ownerState });
    // An earlier price sweep, about three months ago: most cafés have put something up since, so there's movement to show.
    venues.forEach((v, i) => { const now = observations.find(o => o.venue_id === v.id && o.source === "visit"); if (!now) return; const was = {};
      Object.entries(now.prices).forEach(([k, p]) => { was[k] = (i % 5 !== 0 && rnd() > 0.3) ? Math.round((p - (rnd() > 0.5 ? 0.2 : 0.1)) * 100) / 100 : p; });
      observations.push({ id: uid(), venue_id: v.id, at: dd(-105), source: "menu", prices: was, scores: {}, notes: "August price sweep (demo)", by_name: "Demo" }); });
    // This month's sweep, part done: a link a student opens on their phone.
    const sweeps = [{ id: "sw1", area_id: area.id, name: "November prices", sweeper: "Alex (made up)", rate: 5, due: dd(6), token: "demo-sweep", status: "open", created_at: new Date(Date.now() - 2 * 864e5).toISOString() }];
    const sweep_items = venues.filter(v => v.id !== "dv1").map((v, i) => ({ id: "si" + i, sweep_id: "sw1", venue_id: v.id, status: i < 3 ? "approved" : i < 5 ? "sent" : i === 5 ? "skipped" : "todo",
      note: i === 5 ? "Closed on Mondays" : null, taken_at: i < 5 ? new Date(Date.now() - (30 - i) * 3600e3).toISOString() : null, photo_path: null,
      read: i < 5 ? { prices: Object.fromEntries(Object.entries((observations.find(o => o.venue_id === v.id && o.source === "visit") || { prices: {} }).prices).slice(0, 9)), seen: {}, legible: i === 4 ? "partly" : "good", notes: i === 4 ? "Cake prices hidden behind the till" : null, demo: true } : null }));
    const sal = salonSeed(rnd, dd); venues.push(...sal.venues); observations.push(...sal.observations); requests.push(...sal.requests);
    // Made-up partner offers, so the renewal flow can be tried. Real ones go in from admin once you've joined each scheme.
    const offers = [
      { id: "of1", kind: "insurance", sectors: ["cafe", "salon"], provider: "Shopfront Cover (demo)", headline: "Compare cover from several insurers in one form", url: "https://example.com/demo-insurance", rate_from: 380, rate_unit: "a year", rate_note: "café or salon, public and employers' liability", checked_at: dd(-5), commission: "10% of the first premium, capped at £100 (made up)", network: "Demo", live: true, notes: "" },
      { id: "of2", kind: "energy", sectors: ["cafe", "salon"], provider: "Brightline Energy (demo)", headline: "Fixed business rates, commission shown before you sign", url: "https://example.com/demo-energy", rate_from: null, rate_unit: "a year", checked_at: null, commission: "£40 a switch (made up)", network: "Demo", live: true, notes: "" },
      { id: "of3", kind: "card", sectors: ["cafe", "salon"], provider: "TapRight Payments (demo)", headline: "No monthly fee, next-day payouts", url: "https://example.com/demo-card", rate_from: 1.39, rate_unit: "% a transaction", checked_at: dd(-70), commission: "Share of fees (made up)", network: "Demo", live: true, notes: "Price is stale on purpose: it shouldn't show." },
      { id: "of4", kind: "pat", sectors: ["cafe"], provider: "Not live yet (demo)", headline: "", url: null, live: false, commission: "", network: "", notes: "Waiting on their link" }];
    return { areas: [sal.area, area], venues, observations, requests, sweeps, sweep_items, offers, offer_clicks: [], admins: [{ user_id: "demo", name: "You" }] };
  }
  // A made-up salon area: some businesses priced, some not, so the price check and the coverage list have something to show.
  function salonSeed(rnd, dd) {
    const area = { id: "area-demo-salons", slug: "demo-salons", name: "Elm Park (demo)", sector: "salon", districts: ["EP1", "EP2"], bench: {}, calendar: [], costs: [], published: null, published_at: null };
    const list = [["Fringe Benefits", "hair"], ["The Cutting Room", "hair"], ["Mane Street", "hair"], ["Curl Up & Dye", "hair"], ["Lather & Line", "hair"], ["Studio Nine Hair", "hair"], ["Parlour Rose", "hair"],
      ["Blade Runners", "barber"], ["Short Back & Sides Co", "barber"], ["The Gentry Barbers", "barber"], ["Clipper Club", "barber"], ["Fade Street", "barber"], ["Old Town Barbers", "barber"],
      ["Polished", "nails"], ["Ten Little Nails", "nails"], ["Gloss Box", "nails"], ["Lacquer Lounge", "nails"], ["Brow & Arrow", "beauty"], ["The Lash Loft", "beauty"], ["Glow Skin Studio", "aesthetics"]];
    const base = { w_cut_blow: 40, w_dry_cut: 26, blow_dry: 24, root_tint: 37, full_colour: 50, half_hl: 60, balayage: 110, m_cut: 20, skin_fade: 21, beard: 13, cut_beard: 26, gel_mani: 29, biab: 35, pedicure: 28, brow_shape: 11, brow_lam: 38, lash_lift: 45 };
    const offer = { hair: ["w_cut_blow", "w_dry_cut", "blow_dry", "root_tint", "full_colour", "half_hl", "balayage"], barber: ["m_cut", "skin_fade", "beard", "cut_beard"], nails: ["gel_mani", "biab", "pedicure"], beauty: ["brow_shape", "brow_lam", "lash_lift"], aesthetics: [] };
    const venues = list.map(([n, c], i) => ({ id: "ds" + i, area_id: area.id, name: n, address: `${3 + i * 4} Market Row, Elm Park`, postcode: `EP${i % 2 ? 2 : 1} ${i + 2}CD`, category: c,
      lat: 53.40 + (rnd() - 0.5) * 0.02, lng: -2.20 + (rnd() - 0.5) * 0.03, kind: "independent", included: true, hygiene: null }));
    const observations = venues.filter((v, i) => i % 4 !== 3).map(v => ({ id: uid(), venue_id: v.id, at: dd(-6), source: "platform", scores: {}, notes: "Booking page (demo)", by_name: "Demo",
      prices: Object.fromEntries(offer[v.category].filter(() => rnd() > 0.2).map(k => [k, Math.round(base[k] * (0.8 + rnd() * 0.4))])) }));
    // Mane Street: the made-up salon whose owner's page the demo opens on.
    const me = venues[2]; me.hours = { tue: ["09:00", "17:30"], wed: ["09:00", "17:30"], thu: ["09:00", "20:00"], fri: ["09:00", "18:00"], sat: ["08:30", "16:00"] };
    const mine = observations.find(o => o.venue_id === me.id); mine.prices = { w_cut_blow: 36, w_dry_cut: 24, blow_dry: 22, root_tint: 39, full_colour: 48, half_hl: 58, balayage: 95 };
    area.calendar = [{ type: "event", title: "Christmas party season", start: dd(7), end: dd(30), districts: [], effect: "busier", note: "Blow-dries and colour book up" },
      { type: "event", title: "Elm Park Christmas lights switch-on", start: dd(10), end: dd(10), districts: [], effect: "busier", note: "" },
      { type: "event", title: "Prom season", start: dd(190), end: dd(220), districts: [], effect: "busier", note: "Up-dos, nails and lashes" }];
    // Search and AI: every salon checked; Mane Street has gaps worth fixing.
    const SK = ["gbp_hours", "gbp_booking", "gbp_services", "gbp_photos", "gbp_reviews", "gbp_replies", "gbp_category", "site", "https", "mobile", "title", "menu", "booking", "schema", "nap"];
    venues.forEach((v, i) => { const c = {}; SK.forEach((k, j) => c[k] = ((i * 7 + j * 3) % 10) < 7); v.seo = { at: dd(-9), checks: c }; });
    me.seo = { at: dd(-9), checks: { gbp_hours: true, gbp_booking: false, gbp_services: false, gbp_photos: true, gbp_reviews: false, gbp_replies: false, gbp_category: true, site: true, https: true, mobile: true, title: false, menu: false, booking: true, schema: false, nap: true } };
    const Q = [["Best hairdresser in Elm Park", "hair salon"], ["Best balayage salon in Elm Park", "balayage"], ["Where to get BIAB nails in Elm Park", "BIAB nails"], ["Good barber in Elm Park", "barber"], ["Curly hair specialist in Elm Park", "curly hair"]];
    const ANS = [[["Fringe Benefits", "Mane Street", "The Cutting Room"], ["The Cutting Room", "Fringe Benefits"]], [["Curl Up & Dye", "Parlour Rose"], ["Parlour Rose", "Mane Street"]],
      [["Polished", "Gloss Box"], ["Ten Little Nails", "Polished"]], [["Blade Runners", "Old Town Barbers"], ["Old Town Barbers", "Fade Street"]], [["Curl Up & Dye", "Studio Nine Hair"], ["Curl Up & Dye"]]];
    area.geo = { at: dd(-5), engines: ["ChatGPT", "Claude (web)"], prompts: Q.map(([q, theme]) => ({ q, theme })), answers: {}, web: true,
      sources: { [Q[0][0] + "|Claude (web)"]: ["https://www.treatwell.co.uk/places/at-hair-salon/in-elm-park/", "https://www.fresha.com/lp/en/bt/hair-salons/in/elm-park", "https://www.google.com/maps"],
        [Q[1][0] + "|Claude (web)"]: ["https://www.treatwell.co.uk/places/at-balayage/in-elm-park/", "https://www.instagram.com/explore/tags/elmparkhair/"], [Q[4][0] + "|Claude (web)"]: ["https://www.yell.com/s/hairdressers-elm+park.html"] } };
    Q.forEach(([q], i) => { area.geo.answers[q + "|ChatGPT"] = ANS[i][0]; area.geo.answers[q + "|Claude (web)"] = ANS[i][1]; });
    // Ten weeks of takings: Tuesday to Saturday, busiest Friday and Saturday, a late Thursday, a price rise four weeks ago.
    const sales = { days: {}, items: {} }, rise = dd(-28);
    for (let k = 70; k >= 1; k--) { const ds = dd(-k), dow = new Date(ds + "T12:00:00Z").getUTCDay(); if (dow === 0 || dow === 1) continue;
      const busy = dow === 6 ? 1.5 : dow === 5 ? 1.3 : 1, day = { t: 0, n: 0, h: {} }, it = {}, last = dow === 4 ? 19 : dow === 6 ? 15 : 17;
      for (let h = 9; h <= last; h++) { const n = Math.max(0, Math.round((h >= 10 && h <= 14 ? 3 : 2) * busy * (0.75 + rnd() * 0.5))); let v = 0;
        for (let i = 0; i < n; i++) { const kind = i % 3 === 0 ? "cut and blow-dry" : i % 3 === 1 ? "colour" : "blow-dry", p = kind === "colour" ? 52 : kind === "blow-dry" ? 22 : ds >= rise ? 36 : 33; v += p; it[kind] = (it[kind] || 0) + 1; }
        day.h[h] = v; day.t += v; day.n += n; }
      sales.days[ds] = day; sales.items[ds] = it; }
    const ownerState = { sales, prep: [], settings: { perStaffHour: 45, minStaff: 1, special: "", website: "manestreet.example" },
      changes: [{ id: "c1", item: "Women's cut and blow-dry", k: "w_cut_blow", from: 33, to: 36, at: rise }],
      reviews: [{ id: "r1", at: dd(-3), rating: 2, author: "Hannah K (made up)", text: "Colour came out much warmer than we agreed and I had to wait 25 minutes past my appointment.", source: "Google" },
        { id: "r2", at: dd(-8), rating: 5, author: "Aisha (made up)", text: "Best balayage I've ever had. Mia really listened. Booking online was so easy.", source: "Google" },
        { id: "r3", at: dd(-21), rating: 4, author: "Tom (made up)", text: "Great cut, friendly team. Bit pricey for a dry cut.", source: "Treatwell" }],
      reminders: [{ id: "m1", t: "Insurance renewal", every: 12, due: dd(14) }, { id: "m2", t: "Treatment licence or skin piercing registration", every: 12, due: dd(75) },
        { id: "m3", t: "Fire risk assessment review", every: 12, due: null }, { id: "m4", t: "Card machine contract review", every: 12, due: dd(40) }, { id: "m5", t: "Energy contract end", every: 12, due: null }],
      docs: [{ id: "d1", rid: "m1", title: "Insurance renewal", name: "salon-insurance-schedule.pdf", at: dd(-351), premium: 486, insurer: "Acme Mutual (made up)" }],
      invoices: [0, 1, 2].map(w => ({ id: "sinv" + w, name: `Salon Supplies Co invoice ${w + 1}.pdf`, at: dd(-10 * (w + 1)), kind: "pdf", supplier: "Salon Supplies Co (made up)", found: "colour, developer, foils",
        lines: [{ desc: "Permanent colour 60ml", qty: 12, total: 12 * 6.4, date: dd(-10 * (w + 1)) }, { desc: "Developer 6% 1L", qty: 2, total: 2 * 7.9, date: dd(-10 * (w + 1)) }, { desc: "Foil roll 100m", qty: 1, total: 9.5, date: dd(-10 * (w + 1)) }] })) };
    const requests = [{ id: uid(), created_at: new Date(Date.now() - 40 * 864e5).toISOString(), area_id: area.id, venue_id: me.id, name: "Leah (made up)", email: "leah@example.com", role: "Owner", status: "founding", token: "demo-salon", report: null, report_at: null, founding_interest: true, owner_state: ownerState },
      { id: uid(), created_at: new Date(Date.now() - 2 * 864e5).toISOString(), area_id: area.id, venue_id: venues[9].id, name: "Ben (made up)", email: "ben@example.com", role: "Owner", status: "new", token: "demo-salon-2", message: "Are my prices right for the area?", report: null, report_at: null, founding_interest: false }];
    const K = root.PatchCore;
    if (K && K.useSector && root.PatchSectors) { const was = K.SECTOR; K.useSector("salon");
      area.published = { at: new Date().toISOString(), stats: K.areaStats(venues.map(toVenue), observations.map(toObs)) }; area.published_at = area.published.at; K.useSector(was); }
    return { area, venues, observations, requests };
  }
  function demoLoad() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.areas) return d; } catch (e) {} const d = demoSeed(); demoSave(d); return d; }
  function demoSave(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  /* ---------- public calls (area page, report page) ---------- */
  async function rpc(fn, body) {
    if (DEMO) return demoRpc(fn, body);
    const r = await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!r.ok) throw new Error((j && j.message) || "That didn't work. Please try again.");
    return j;
  }
  function demoRpc(fn, b) {
    const d = demoLoad(), area = d.areas.find(a => a.slug === (b.p_slug || "demo")) || d.areas[0];
    if (fn === "area_public") return { slug: area.slug, name: area.name, sector: area.sector || "cafe", districts: area.districts, published: area.published, published_at: area.published_at,
      venues: d.venues.filter(v => v.area_id === area.id && v.included).map(v => ({ id: v.id, name: v.name, postcode: v.postcode, kind: v.kind, category: v.category || null, hygiene: v.hygiene })).sort((a, c) => a.name.localeCompare(c.name)) };
    if (fn === "request_report") { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.p_email || "") || !(b.p_name || "").trim()) return "bad";
      d.requests.unshift({ id: uid(), created_at: new Date().toISOString(), area_id: area.id, venue_id: b.p_venue, venue_text: b.p_venue_text, name: b.p_name, email: b.p_email.toLowerCase(), role: b.p_role, phone: b.p_phone, message: b.p_message, status: "new", token: "demo-" + Math.random().toString(36).slice(2, 10), report: null, report_at: null, founding_interest: false });
      demoSave(d); return "ok"; }
    if (fn === "price_check") { if (area.sector !== "salon") return "area"; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.p_email || "") || !(b.p_name || "").trim()) return "bad";
      const prices = Object.fromEntries(Object.entries(b.p_prices || {}).filter(([k, v]) => /^[a-z_]{2,20}$/.test(k) && +v >= 1 && +v <= 600)); if (!Object.keys(prices).length) return "none";
      d.requests.unshift({ id: uid(), created_at: new Date().toISOString(), area_id: area.id, venue_id: b.p_venue, venue_text: b.p_venue_text, name: b.p_name, email: b.p_email.toLowerCase(), role: b.p_role,
        message: `Price check: sent ${Object.keys(prices).length} prices for a comparison`, status: "new", token: "demo-" + Math.random().toString(36).slice(2), owner_state: { menuBoard: { at: new Date().toISOString().slice(0, 10), prices, perWeek: b.p_per_week || {}, via: "price-check" } } });
      demoSave(d); return "ok"; }
    if (fn === "offers_public") { const r = d.requests.find(x => x.token === b.p_token), a = r && d.areas.find(x => x.id === r.area_id); if (!a) return [];
      return (d.offers || []).filter(o => o.live && o.url && o.sectors.includes(a.sector || "cafe")).map(o => { const c = Object.assign({}, o); delete c.url; delete c.commission; delete c.network; delete c.notes; return c; }); }
    if (fn === "offer_go") { const r = d.requests.find(x => x.token === b.p_token), o = r && (d.offers || []).find(x => x.id === b.p_offer && x.live); if (!o) return null;
      d.offer_clicks = d.offer_clicks || []; d.offer_clicks.push({ id: uid(), offer_id: o.id, request_id: r.id, at: new Date().toISOString() }); demoSave(d); return null; }
    if (fn === "report_public") { const r = d.requests.find(x => x.token === b.p_token); if (!r) return null;
      if (!r.report && r.venue_id) { const a = d.areas.find(x => x.id === r.area_id), K = root.PatchCore; if (K.useSector) K.useSector(a.sector || "cafe");
        const vs = d.venues.filter(x => x.area_id === a.id).map(toVenue), obs = d.observations.map(toObs), me = vs.find(x => x.id === r.venue_id), pos = K.position(me, vs, obs, 10);
        return { report: { at: new Date().toISOString(), area: { name: a.name, slug: a.slug, sector: a.sector || "cafe" }, venue: { name: me.name, address: me.address, postcode: me.postcode, hours: me.hours || null }, quality: pos.quality,
          me: { scores: pos.me.scores, visited: pos.me.visited, lastAt: pos.me.lastAt }, near: pos.near.map(x => ({ name: x.v.name, d: x.d, kind: x.v.kind })),
          items: pos.items.map(i => ({ k: i.k, t: i.t, mine: i.mine, n: i.n, median: i.median, low: i.low, high: i.high, diff: i.diff, cheaperThan: i.cheaperThan, peers: i.peers })),
          areaScores: { scores: {}, visited: 0 }, nearScores: [], calendar: K.calendarFor(a.calendar || [], (me.postcode || "").split(" ")[0], null, 56), salesCalendar: a.calendar || [], costs: [], gaps: K.hoursGaps(pos.near.map(x => x.v)), newNearby: [] }, report_at: new Date().toISOString(), name: r.name, founding: r.founding_interest }; }
      return r.report ? { report: r.report, report_at: r.report_at, name: r.name, founding: r.founding_interest } : null; }
    if (fn === "share_sales") { const r = d.requests.find(x => x.token === b.p_token && x.report); if (!r) return false; r.sales = b.p_sales; r.sales_at = new Date().toISOString(); demoSave(d); return true; }
    if (fn === "owner_get") { const r = d.requests.find(x => x.token === b.p_token); if (!r || !r.venue_id) return null; const v = d.venues.find(x => x.id === r.venue_id), a = d.areas.find(x => x.id === r.area_id);
      const K = root.PatchCore; if (K.useSector) K.useSector(a.sector || "cafe"); const vs = d.venues.filter(x => x.area_id === a.id).map(toVenue), obs = d.observations.map(toObs), me = vs.find(x => x.id === v.id);
      const pos = K.position(me, vs, obs, 10), I = root.PatchInsights, near = K.nearest(me, vs, 10).map(x => x.v);
      return { name: r.name, emailOn: !r.briefing_off, state: r.owner_state || null, venue: { name: v.name, address: v.address || null, lat: v.lat, lng: v.lng, postcode: v.postcode, hygiene: v.hygiene, hygieneDate: v.hygiene_date },
        area: { name: a.name, sector: a.sector || "cafe", calendar: a.calendar || [], costs: a.costs || [], supplyBench: a.supply_bench || null }, geo: a.geo || null, seo: v.seo || null,
        rank: { visit: I ? I.rankTrend(me, vs, obs) : null, moves: K.priceMoves(me, vs, obs, 10), seoPeers: I ? near.map(x => x.seo && I.seoScore(x.seo.checks, a.sector)).filter(Boolean).map(x => x.score) : [] },
        report: r.report || { quality: pos.quality, gaps: K.hoursGaps(near), venue: { hours: v.hours }, items: pos.items.map(i => ({ k: i.k, t: i.t, mine: i.mine, median: i.median, high: i.high, low: i.low, n: i.n, diff: i.diff })) },
        newNearby: K.newNearby(me, vs, 1).map(x => ({ name: x.v.name, d: x.d })) }; }
    if (fn === "sweep_get") { const sw = (d.sweeps || []).find(x => x.token === b.p_token); if (!sw) return null; const a = d.areas.find(x => x.id === sw.area_id);
      return { name: sw.name, sweeper: sw.sweeper, rate: sw.rate, due: sw.due, status: sw.status, area: a.name, items: d.sweep_items.filter(i => i.sweep_id === sw.id).map(i => { const v = d.venues.find(x => x.id === i.venue_id);
        return { id: i.id, name: v.name, address: v.address, postcode: v.postcode, lat: v.lat, lng: v.lng, status: i.status, note: i.note, taken_at: i.taken_at, found: i.read && i.read.prices ? Object.keys(i.read.prices).length : 0 }; }).sort((x, y) => (x.postcode || "").localeCompare(y.postcode || "") || x.name.localeCompare(y.name)) }; }
    if (fn === "sweep_skip") { const sw = (d.sweeps || []).find(x => x.token === b.p_token && x.status === "open"), i = sw && d.sweep_items.find(x => x.id === b.p_item && x.sweep_id === sw.id && ["todo", "retake"].includes(x.status)); if (!i) return false; i.status = "skipped"; i.note = String(b.p_reason || "").slice(0, 300); demoSave(d); return true; }
    if (fn === "owner_email_pref") { const r = d.requests.find(x => x.token === b.p_token); if (!r) return false; r.briefing_off = !b.p_on; demoSave(d); return true; }
    if (fn === "owner_put") { const r = d.requests.find(x => x.token === b.p_token); if (!r) return false; r.owner_state = b.p_state; demoSave(d); return true; }
    if (fn === "founding_interest") { const r = d.requests.find(x => x.token === b.p_token && x.report); if (!r) return false; r.founding_interest = true; r.founding_message = b.p_message; demoSave(d); return true; }
    throw new Error("Unknown call");
  }

  /* ---------- sweeps: the sweeper's photo ---------- */
  // Live: the server stores it and has Claude read it. Demo: kept in this browser, with made-up "readings" from the demo prices.
  async function sweepUpload(token, itemId, blob) {
    if (!DEMO) { const fd = new FormData(); fd.append("s", token); fd.append("item", itemId); fd.append("file", blob, "board.jpg");
      const r = await fetch("/api/sweep-photo", { method: "POST", body: fd }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Didn't send. Try again."); return j; }
    const d = demoLoad(), sw = d.sweeps.find(x => x.token === token && x.status === "open"), it = sw && d.sweep_items.find(x => x.id === itemId && x.sweep_id === sw.id);
    if (!it) throw new Error("That café isn't on this sweep");
    const data = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
    const now = (d.observations.filter(o => o.venue_id === it.venue_id && o.source !== "delivery").sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] || { prices: {} }).prices, prices = {};
    Object.entries(now).forEach(([k, p]) => { prices[k] = Math.round((p + (Math.random() > 0.6 ? 0.1 : 0)) * 100) / 100; });
    Object.assign(it, { status: "sent", photo_data: data, taken_at: new Date().toISOString(), note: null, read: { prices, seen: {}, legible: "good", notes: null, demo: true } }); demoSave(d);
    return { found: Object.keys(prices).length, legible: "good", read: true, demo: true };
  }

  /* ---------- admin ---------- */
  // Rows come back in the shape PatchCore expects: venues {id, lat, ...}, observations {venueId, ...}.
  const toObs = o => Object.assign({}, o, { venueId: o.venue_id });
  const toVenue = v => Object.assign({}, v, { hygieneDate: v.hygiene_date, googleRating: v.google_rating, googleUrl: v.google_url, googleReviews: v.google_reviews });
  function demoAdmin() {
    const d = demoLoad(), save = () => demoSave(d);
    const upd = (arr, id, p) => { const r = d[arr].find(x => x.id === id); Object.assign(r, clone(p)); save(); return clone(r); };
    return { demo: true,
      async me() { return { name: "You", email: "demo" }; }, async signIn() {}, async signOut() {},
      async areas() { return clone(d.areas); },
      async venues(areaId) { return d.venues.filter(v => v.area_id === areaId).map(toVenue); },
      async observations(areaId) { const ids = new Set(d.venues.filter(v => v.area_id === areaId).map(v => v.id)); return d.observations.filter(o => ids.has(o.venue_id)).map(toObs); },
      async requests() { return clone(d.requests); },
      async updVenue(id, p) { return toVenue(upd("venues", id, p)); },
      async addVenues(rows) { const out = rows.map(r => Object.assign({ id: uid(), included: true, kind: "independent" }, clone(r))); d.venues.push(...out); save(); return out.map(toVenue); },
      async addObservation(row) { const r = Object.assign({ id: uid(), created_at: new Date().toISOString() }, clone(row)); d.observations.push(r); save(); return toObs(r); },
      async delObservation(id) { d.observations = d.observations.filter(o => o.id !== id); save(); },
      async updRequest(id, p) { return upd("requests", id, p); },
      async updArea(id, p) { return upd("areas", id, p); },
      async reset() { localStorage.removeItem(KEY); },
      async offers() { return clone(d.offers || []); },
      async saveOffer(o) { d.offers = d.offers || []; const r = o.id && d.offers.find(x => x.id === o.id); if (r) Object.assign(r, clone(o)); else d.offers.push(Object.assign({ id: uid(), created_at: new Date().toISOString() }, clone(o))); save(); return clone(r || d.offers[d.offers.length - 1]); },
      async offerClicks() { return clone(d.offer_clicks || []); },
      async token() { return null; },
      async emailLog() { return []; },
      async sweeps(areaId) { return clone((d.sweeps || []).filter(x => x.area_id === areaId)); },
      async sweepItems(sweepId) { return clone((d.sweep_items || []).filter(x => x.sweep_id === sweepId)); },
      async addSweep(row, venueIds) { const sw = Object.assign({ id: uid(), token: uid(), status: "open", created_at: new Date().toISOString() }, clone(row)); d.sweeps = d.sweeps || []; d.sweeps.push(sw);
        d.sweep_items = (d.sweep_items || []).concat(venueIds.map(v => ({ id: uid(), sweep_id: sw.id, venue_id: v, status: "todo" }))); save(); return clone(sw); },
      async updSweep(id, p) { return upd("sweeps", id, p); },
      async updSweepItem(id, p) { return upd("sweep_items", id, p); },
      async sweepPhotoUrl(it) { return it.photo_data || null; },
      // In the demo a photo is kept as a small picture in this browser; live, it goes to private storage.
      async uploadPhoto(path, blob) { return { data: await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); }) }; },
      async photoUrl(ph) { return ph.data || null; },
    };
  }
  function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
  async function liveAdmin() {
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
    const sb = root.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const ok = r => { if (r.error) throw new Error(r.error.message); return r.data; };
    const strip = o => { const c = Object.assign({}, o); ["venueId", "hygieneDate", "googleRating", "googleUrl", "googleReviews"].forEach(k => delete c[k]); return c; };
    return { demo: false,
      async me() { const { data } = await sb.auth.getSession(); const s = data && data.session; if (!s) return null;
        const r = await sb.from("admins").select("*").eq("user_id", s.user.id).maybeSingle(); return r.data ? Object.assign({ email: s.user.email }, r.data) : { notAdmin: true, email: s.user.email }; },
      async signIn(email, password) { const r = await sb.auth.signInWithPassword({ email, password }); if (r.error) throw new Error(/invalid/i.test(r.error.message) ? "That email and password don't match." : r.error.message); },
      async signOut() { await sb.auth.signOut(); },
      async token() { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.access_token : null; },
      async areas() { return ok(await sb.from("areas").select("*").order("name")); },
      async venues(areaId) { return ok(await sb.from("venues").select("*").eq("area_id", areaId).limit(2000)).map(toVenue); },
      async observations(areaId) { return ok(await sb.from("observations").select("*, venues!inner(area_id)").eq("venues.area_id", areaId).order("at", { ascending: false }).limit(10000)).map(o => { delete o.venues; return toObs(o); }); },
      async requests() { return ok(await sb.from("requests").select("*").order("created_at", { ascending: false }).limit(500)); },
      async updVenue(id, p) { return toVenue(ok(await sb.from("venues").update(strip(p)).eq("id", id).select().single())); },
      async addVenues(rows) { const out = []; for (let i = 0; i < rows.length; i += 200) out.push(...ok(await sb.from("venues").upsert(rows.slice(i, i + 200).map(strip), { onConflict: "area_id,fsa_id" }).select())); return out.map(toVenue); },
      async addObservation(row) { return toObs(ok(await sb.from("observations").insert(strip(row)).select().single())); },
      async delObservation(id) { ok(await sb.from("observations").delete().eq("id", id)); },
      async updRequest(id, p) { return ok(await sb.from("requests").update(p).eq("id", id).select().single()); },
      async updArea(id, p) { return ok(await sb.from("areas").update(p).eq("id", id).select().single()); },
      async sweeps(areaId) { return ok(await sb.from("sweeps").select("*").eq("area_id", areaId).order("created_at", { ascending: false })); },
      async sweepItems(sweepId) { return ok(await sb.from("sweep_items").select("*").eq("sweep_id", sweepId)); },
      async addSweep(row, venueIds) { const sw = ok(await sb.from("sweeps").insert(row).select().single());
        for (let i = 0; i < venueIds.length; i += 200) ok(await sb.from("sweep_items").insert(venueIds.slice(i, i + 200).map(v => ({ sweep_id: sw.id, venue_id: v }))));
        return sw; },
      async updSweep(id, p) { return ok(await sb.from("sweeps").update(p).eq("id", id).select().single()); },
      async updSweepItem(id, p) { return ok(await sb.from("sweep_items").update(p).eq("id", id).select().single()); },
      async sweepPhotoUrl(it) { if (!it.photo_path) return null; const r = await sb.storage.from("sweep-photos").createSignedUrl(it.photo_path, 3600); return r.error ? null : r.data.signedUrl; },
      async offers() { return ok(await sb.from("offers").select("*").order("kind").order("provider")); },
      async saveOffer(o) { const c = Object.assign({}, o); delete c.created_at; return c.id ? ok(await sb.from("offers").update(c).eq("id", c.id).select().single()) : ok(await sb.from("offers").insert(c).select().single()); },
      async offerClicks() { return ok(await sb.from("offer_clicks").select("*").gte("at", new Date(Date.now() - 90 * 864e5).toISOString()).limit(5000)); },
      async emailLog() { return ok(await sb.from("email_log").select("*").order("at", { ascending: false }).limit(50)); },
      async uploadPhoto(path, blob) { ok(await sb.storage.from("visit-photos").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false })); return { path }; },
      async photoUrl(ph) { if (!ph.path) return ph.data || null; const r = await sb.storage.from("visit-photos").createSignedUrl(ph.path, 3600); return r.error ? null : r.data.signedUrl; },
    };
  }

  root.PatchData = { CFG, DEMO, rpc, sweepUpload, admin: () => (DEMO ? Promise.resolve(demoAdmin()) : liveAdmin()), uid };
})(window);
