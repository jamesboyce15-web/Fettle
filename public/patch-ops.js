/* Patch for owners: the week ahead. Forecast, staffing, prep, price changes, reviews, local posts, reminders and the
   Monday briefing. Plain functions over the owner's workspace; needs patch-core.js first.

   workspace (state):
   { sales: { days: { "2026-09-01": { t: 812.4, n: 240, h: { "8": 120.5, ... } } }, items: { "2026-09-01": { "flat white": 42 } } },
     settings: { perStaffHour: 60, minStaff: 1, special: "" },
     prep: [{ name: "Croissants", perDay: 30 }],
     changes: [{ id, item, from, to, at }],          // price changes the owner made
     reviews: [{ id, at, rating, text, source, replied }],
     reminders: [{ id, t, due, every, note, done }],  // every: months between, 0 = once
     dismissed: { [key]: date } } */
(function (root) {
  "use strict";
  const P = root.PatchCore || (typeof require !== "undefined" ? null : null);
  const C = () => root.PatchCore;
  const iso = d => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
  const addD = (s, n) => iso(new Date(new Date(s + "T12:00:00Z").getTime() + n * 864e5));
  const dowOf = s => new Date(s + "T12:00:00Z").getUTCDay();
  const round = x => Math.round(x);
  const median = xs => { const a = xs.slice().sort((p, q) => p - q); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const uid = () => Math.random().toString(36).slice(2, 10);

  /* ---------- keeping sales ---------- */
  // Turns rows from readSales into per-day, per-hour totals, and item counts per day where the export names items.
  function addSales(state, rows, itemCol) {
    state.sales = state.sales || { days: {}, items: {} };
    const days = {}, items = {};
    rows.forEach(r => { const d = days[r.date] = days[r.date] || { t: 0, n: 0, h: {} }; d.t += r.amount; d.n++; d.h[r.hour] = (d.h[r.hour] || 0) + r.amount;
      if (r.item) { const it = items[r.date] = items[r.date] || {}; const k = r.item.toLowerCase().trim().slice(0, 60); it[k] = (it[k] || 0) + (r.qty || 1); } });
    Object.entries(days).forEach(([k, d]) => { d.t = Math.round(d.t * 100) / 100; Object.keys(d.h).forEach(h => d.h[h] = Math.round(d.h[h] * 100) / 100); state.sales.days[k] = d; });
    Object.entries(items).forEach(([k, v]) => { state.sales.items[k] = v; });
    // keep two years at most
    const cut = addD(iso(new Date()), -730); Object.keys(state.sales.days).forEach(k => { if (k < cut) { delete state.sales.days[k]; delete state.sales.items[k]; } });
    return { days: Object.keys(days).length, from: Object.keys(days).sort()[0], to: Object.keys(days).sort().pop() };
  }
  const salesDays = state => Object.entries((state.sales || {}).days || {}).map(([date, d]) => ({ date, dow: dowOf(date), total: d.t, n: d.n, h: d.h })).sort((a, b) => a.date.localeCompare(b.date));

  /* ---------- what moves takings ---------- */
  // Learned from their own sales where we can; otherwise a cautious default, and we say so.
  function effectFor(entry, learned) {
    const L = learned || [];
    const hit = L.find(x => x.title === entry.title) || (entry.type === "bank" ? L.find(x => x.type === "bank") : null) || L.find(x => x.type === entry.type && x.days >= 2);
    if (hit) return { pct: hit.pct, why: `${entry.title}: ${hit.pct > 0 ? "+" : ""}${hit.pct}% on your past ${hit.title === entry.title ? "ones" : C().CAL_TYPES[entry.type].toLowerCase() + "s"}`, learned: true };
    const d = entry.effect === "busier" ? 15 : entry.effect === "quieter" ? -15 : 0;
    return d ? { pct: d, why: `${entry.title}: about ${d > 0 ? "+" : ""}${d}% (our estimate until we've seen one in your sales)`, learned: false } : null;
  }

  /* ---------- forecast ---------- */
  // One day: the middle of the last 8 same weekdays (no bank holidays or local happenings), nudged by the recent trend,
  // then by whatever is on that day. Returns null until there are at least 3 comparable days.
  function forecastDay(state, dateISO, calendar, district) {
    const K = C(), days = salesDays(state); if (!days.length) return null;
    const cal = (calendar || []);
    const special = d => K.BANK_HOLIDAYS.includes(d) || cal.some(e => d >= e.start && d <= (e.end || e.start));
    const dow = dowOf(dateISO), same = days.filter(d => d.dow === dow && d.date < dateISO && !special(d.date)).slice(-8);
    if (same.length < 3) return null;
    const hours = {}; same.forEach(d => Object.keys(d.h).forEach(h => hours[h] = 1));
    const hourly = {}; Object.keys(hours).forEach(h => { const v = median(same.map(d => d.h[h] || 0)); if (v > 0.5) hourly[h] = v; });
    let base = Object.values(hourly).reduce((a, b) => a + b, 0);
    // trend: last 28 days against the 28 before, half strength, capped at ±8%
    const last = days[days.length - 1].date, sum = (a, b) => days.filter(d => d.date > a && d.date <= b).reduce((t, d) => t + d.total, 0);
    const r1 = sum(addD(last, -28), last), r0 = sum(addD(last, -56), addD(last, -28));
    const trend = r0 > 0 && r1 > 0 ? Math.max(-0.08, Math.min(0.08, (r1 / r0 - 1) / 2)) : 0;
    const reasons = []; let mult = 1 + trend;
    if (Math.abs(trend) >= 0.02) reasons.push(`Trend: ${trend > 0 ? "up" : "down"} ${Math.round(Math.abs(trend) * 100)}% on recent weeks`);
    const pat = K.salesPattern(days.flatMap(d => [{ date: d.date, dow: d.dow, hour: 0, amount: d.total }]));
    const learned = K.salesVsCalendar(pat, cal);
    K.calendarFor(cal, district, dateISO, 0).filter(e => dateISO >= e.start && dateISO <= (e.end || e.start)).forEach(e => { const f = effectFor(e, learned); if (f) { mult *= 1 + f.pct / 100; reasons.push(f.why); } });
    Object.keys(hourly).forEach(h => hourly[h] = Math.round(hourly[h] * mult));
    const total = Object.values(hourly).reduce((a, b) => a + b, 0);
    const peak = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0];
    return { date: dateISO, dow, total, base: Math.round(base), hourly, peak: peak ? { hour: +peak[0], v: peak[1] } : null, reasons, basedOn: same.length };
  }
  function forecastWeek(state, fromISO, calendar, district) {
    return Array.from({ length: 7 }, (_, i) => forecastDay(state, addD(fromISO, i), calendar, district)).map((f, i) => f || { date: addD(fromISO, i), dow: dowOf(addD(fromISO, i)), total: null });
  }

  /* ---------- staffing and prep ---------- */
  // People needed each hour: enough that nobody serves more than perStaffHour of sales, never fewer than minStaff. Grouped into shifts.
  function staffing(day, settings) {
    if (!day || !day.hourly) return [];
    const per = Math.max(10, +((settings || {}).perStaffHour) || 60), min = Math.max(1, +((settings || {}).minStaff) || 1);
    const hrs = Object.keys(day.hourly).map(Number).sort((a, b) => a - b), out = [];
    hrs.forEach(h => { const n = Math.max(min, Math.ceil(day.hourly[h] / per)); const lastB = out[out.length - 1];
      if (lastB && lastB.n === n && lastB.to === h) lastB.to = h + 1; else out.push({ from: h, to: h + 1, n }); });
    return out;
  }
  // How much of each prep item: their usual amount on an average day, scaled by this day's forecast.
  function prep(day, state) {
    if (!day || !day.total) return [];
    const days = salesDays(state).slice(-56), avg = days.length ? days.reduce((t, d) => t + d.total, 0) / days.length : null;
    if (!avg) return [];
    return (state.prep || []).filter(p => p.name && +p.perDay > 0).map(p => ({ name: p.name, usual: +p.perDay, qty: Math.max(1, Math.round((+p.perDay * day.total) / avg)) }));
  }

  /* ---------- price changes ---------- */
  // What a price change has done: sales of that item before and after (if the till export names items), and the extra money.
  function priceImpact(state, ch, todayISO) {
    const today = todayISO || iso(new Date()), items = (state.sales || {}).items || {}, key = String(ch.item || "").toLowerCase();
    const per = d => { const it = items[d]; if (!it) return null; let n = 0, seen = false; Object.entries(it).forEach(([k, v]) => { if (k.includes(key) || key.includes(k)) { n += v; seen = true; } }); return seen ? n : 0; };
    const range = (a, b) => { const out = []; for (let d = a; d <= b; d = addD(d, 1)) { const v = per(d); if (v != null) out.push(v); } return out; };
    const before = range(addD(ch.at, -28), addD(ch.at, -1)), after = range(ch.at, today);
    const per1 = (+ch.to - +ch.from) / 1.2;
    if (before.length >= 5 && after.length >= 3) {
      const b = before.reduce((x, y) => x + y, 0) / before.length, a = after.reduce((x, y) => x + y, 0) / after.length;
      return { measured: true, days: after.length, beforePerDay: Math.round(b * 10) / 10, afterPerDay: Math.round(a * 10) / 10, volume: b ? Math.round((a / b - 1) * 100) : null,
        extra: Math.round(per1 * after.reduce((x, y) => x + y, 0)) };
    }
    const wk = +ch.perWeek || 0, daysSince = Math.max(0, Math.round((new Date(today) - new Date(ch.at)) / 864e5) + 1);
    return { measured: false, days: daysSince, extra: wk ? Math.round(per1 * (wk / 7) * daysSince) : null };
  }

  /* ---------- reviews ---------- */
  const THEMES = [
    { k: "wait", t: "Waiting", bad: /slow|wait(ed|ing)?\b|queue|ages|took forever|long time/i, good: /quick|fast|efficient/i },
    { k: "staff", t: "Staff", bad: /rude|unfriendly|ignored|attitude/i, good: /friendly|lovely staff|welcoming|helpful|kind/i },
    { k: "coffee", t: "Coffee", bad: /(coffee|latte|flat white|cappuccino).{0,25}(bitter|burnt|weak|cold|lukewarm)|(bitter|burnt|weak|lukewarm) (coffee|latte)/i, good: /(great|best|lovely|amazing|good) (coffee|latte|flat white)/i },
    { k: "food", t: "Food", bad: /(stale|dry|cold|soggy|bland)\b/i, good: /(delicious|tasty|fresh|amazing (cake|food|brunch)|great (cake|food|brunch))/i },
    { k: "price", t: "Prices", bad: /expensive|overpriced|pricey|rip.?off/i, good: /good value|reasonable|cheap/i },
    { k: "clean", t: "Cleanliness", bad: /dirty|sticky|messy|unclean|toilet/i, good: /spotless|clean/i },
    { k: "space", t: "Space", bad: /cramped|no seats|nowhere to sit|noisy|loud|cold inside/i, good: /cosy|cozy|spacious|lovely space|light|quiet/i },
    { k: "dogs", t: "Dogs", bad: /no dogs/i, good: /dog.?friendly|dogs welcome/i },
  ];
  function reviewThemes(reviews, sinceISO) {
    const rs = (reviews || []).filter(r => !sinceISO || r.at >= sinceISO);
    return THEMES.map(th => ({ k: th.k, t: th.t, bad: rs.filter(r => th.bad.test(r.text || "")).length, good: rs.filter(r => th.good.test(r.text || "")).length }))
      .filter(x => x.bad || x.good).sort((a, b) => b.bad - a.bad || b.good - a.good);
  }
  // A starting point for a reply, for the owner to change before posting. Never posted by Patch.
  function replyDraft(review, cafeName) {
    const r = +review.rating || 0, bad = THEMES.filter(t => t.bad.test(review.text || "")), good = THEMES.filter(t => t.good.test(review.text || ""));
    const name = (review.author || "").split(/\s+/)[0];
    const hi = name ? `Hi ${name}, ` : "Hi, ";
    if (r >= 4) return `${hi}thank you for taking the time to write this. ${good.length ? `We're so glad you liked the ${good[0].t.toLowerCase() === "staff" ? "team" : good[0].t.toLowerCase()}. ` : ""}${bad.length ? `Thanks for the note about ${bad[0].t.toLowerCase()} too: we're on it. ` : ""}Hope to see you again soon at ${cafeName}.`;
    if (r === 3) return `${hi}thanks for your honest review. ${bad.length ? `You're right to mention ${bad[0].t.toLowerCase()}, and we're looking at it. ` : ""}We'd love the chance to make your next visit a 5. Come and say hello next time you're in.`;
    return `${hi}I'm sorry your visit wasn't what it should have been. ${bad.length ? `Thank you for telling us about the ${bad.map(t => t.t.toLowerCase()).slice(0, 2).join(" and ")}. ` : ""}I'd like to put it right: please get in touch with us directly, and ask for me.`;
  }

  /* ---------- local posts ---------- */
  function posts(calendar, district, cafe, settings, fromISO, days) {
    const K = C(), from = fromISO || iso(new Date()), out = [];
    const dm = s => new Date(s + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    K.calendarFor(calendar, district, from, days || 14).forEach(e => {
      const sp = settings && settings.special ? ` This week's special: ${settings.special}.` : "";
      if (e.type === "event") out.push({ key: "ev:" + e.start + e.title, when: e.start, for: e.title, text: `${e.title} is on ${dm(e.start)}. Come and find us at ${cafe}: coffee to warm you up and something good to eat.${sp}` });
      else if (e.type === "bank") out.push({ key: "bank:" + e.start, when: e.start, for: "Bank holiday", text: `Bank holiday ${dm(e.start)}: we're open [your hours]. Pop in for a slow coffee.`, todo: `Update your hours on Google for ${dm(e.start)}` });
      else if (e.type === "roadworks") out.push({ key: "rw:" + e.start, when: e.start, for: e.title, text: `Heads up: there are roadworks on ${e.title.replace(/^roadworks:?\s*/i, "")} from ${dm(e.start)}. We're still open as usual, and it's worth the detour.${sp}` });
      else if (e.type === "school") out.push({ key: "sch:" + e.start, when: e.start, for: e.title, text: `${e.title} start ${dm(e.start)}. Bring the kids in: we're here all holidays.${sp}` });
    });
    if (settings && settings.special && !out.length) out.push({ key: "sp:" + from, when: from, for: "This week", text: `New this week at ${cafe}: ${settings.special}. Come and try it.` });
    return out;
  }

  /* ---------- reminders ---------- */
  const DEFAULT_REMINDERS = [
    ["Insurance renewal", 12], ["Fire risk assessment review", 12], ["Gas safety check", 12], ["Pest control visit", 3], ["Allergen information check", 6],
    ["Pavement licence renewal", 12], ["Electrical installation check (EICR)", 60], ["Portable appliance testing", 12],
  ];
  // Owner's dated reminders, plus ones we know about: minimum wage rises each April, Google hours before bank holidays,
  // and a nudge when their hygiene inspection is likely to be due.
  function remindersDue(state, venue, todayISO, withinDays) {
    const K = C(), today = todayISO || iso(new Date()), end = addD(today, withinDays || 30), out = [];
    (state.reminders || []).filter(r => r.due && !r.done && r.due <= end).forEach(r => out.push({ key: "r:" + r.id, id: r.id, t: r.t, due: r.due, own: true, overdue: r.due < today }));
    const yr = +today.slice(0, 4), april = [`${yr}-04-01`, `${yr + 1}-04-01`].find(d => d >= today);
    if (april && april <= addD(today, 45)) out.push({ key: "nmw:" + april, t: "Minimum wage rises on 1 April: check your staff rates and prices", due: april, note: "New rates are on gov.uk/national-minimum-wage-rates" });
    K.BANK_HOLIDAYS.filter(d => d >= today && d <= addD(today, 10)).forEach(d => out.push({ key: "bh:" + d, t: "Update your Google hours for the bank holiday", due: addD(d, -3) }));
    if (venue && venue.hygieneDate && venue.hygieneDate < addD(today, -540)) out.push({ key: "fhrs", t: "Your hygiene inspection could be due: run through your food safety records", due: today, note: `Last inspected ${venue.hygieneDate}` });
    return out.filter(r => !(state.dismissed || {})[r.key]).sort((a, b) => a.due.localeCompare(b.due));
  }

  /* ---------- the Monday briefing ---------- */
  // At most five things, most useful first. Each says where to look for more.
  function briefing(state, ctx, todayISO) {
    const K = C(), today = todayISO || iso(new Date()), items = [];
    const district = ctx.district, cal = ctx.calendar || [];
    const week = forecastWeek(state, today, cal, district), known = week.filter(d => d.total);
    if (known.length >= 4) {
      const tot = known.reduce((t, d) => t + d.total, 0), best = known.slice().sort((a, b) => b.total - a.total)[0];
      const days = salesDays(state), lastWk = days.filter(d => d.date >= addD(today, -7) && d.date < today).reduce((t, d) => t + d.total, 0);
      const hr = best.peak ? (best.peak.hour > 12 ? best.peak.hour - 12 + "pm" : best.peak.hour === 12 ? "12pm" : best.peak.hour + "am") : "";
      items.push({ k: "week", tone: "", go: "week", t: `About £${Math.round(tot).toLocaleString("en-GB")} expected this week`, s: `Busiest: ${K.DAYNAME[["sun", "mon", "tue", "wed", "thu", "fri", "sat"][best.dow]]}${hr ? `, around ${hr}` : ""}.${lastWk ? ` Last 7 days: £${Math.round(lastWk).toLocaleString("en-GB")}.` : ""}` });
    } else items.push({ k: "sales", tone: "warn", go: "more:sales", t: "Add your sales to see your week ahead", s: "Export the last few weeks from your till and drop the file in. It takes a minute." });
    const evs = K.calendarFor(cal, district, today, 7).filter(e => e.type !== "uni" || e.start >= today);
    if (evs.length) items.push({ k: "cal", tone: evs.some(e => e.effect === "busier") ? "good" : evs.some(e => e.effect === "quieter") ? "warn" : "", go: "week", t: evs.length === 1 ? evs[0].title : `${evs.length} things on locally this week`, s: evs.slice(0, 3).map(e => `${e.title} (${new Date(e.start + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })})`).join(", ") });
    const news = (ctx.newNearby || []).filter(x => !(state.dismissed || {})["new:" + x.name]);
    if (news.length) items.push({ k: "new", tone: "warn", go: "more:area", dkey: "new:" + news[0].name, t: `New nearby: ${news[0].name}`, s: `${news[0].d != null ? news[0].d.toFixed(1) + " miles away. " : ""}Waiting for its first hygiene inspection, so probably just opened.` });
    // After a price sweep: the item most nearby cafés have put up, if this café hasn't.
    const mv = (ctx.moves || []).filter(m => m.up >= 3 && m.up / m.n >= 0.4 && !(m.mine && m.mine.d >= 0.05)).sort((a, b) => b.up / b.n - a.up / a.n)[0];
    if (mv) items.push({ k: "moves", tone: "warn", go: "insights:prices", t: `${mv.up} of ${mv.n} cafés nearby have put up their ${mv.t.toLowerCase()}`, s: `By ${mv.avgUp >= 1 ? "£" + mv.avgUp.toFixed(2) : Math.round(mv.avgUp * 100) + "p"} on average since ${new Date(mv.since + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long" })}. You haven't yet.` });
    const wins = (state.changes || []).map(ch => Object.assign({ ch }, priceImpact(state, ch, today))).filter(x => x.extra > 0);
    if (wins.length) { const tot = wins.reduce((t, x) => t + x.extra, 0); items.push({ k: "win", tone: "good", go: "money", t: `Your price changes have made £${tot.toLocaleString("en-GB")} so far`, s: wins.map(x => `${x.ch.item} £${(+x.ch.from).toFixed(2)} to £${(+x.ch.to).toFixed(2)}`).join(", ") }); }
    const rs = (state.reviews || []).filter(r => r.at >= addD(today, -14)), low = rs.filter(r => +r.rating <= 3 && !r.replied);
    if (low.length) items.push({ k: "rev", tone: "warn", go: "more:reviews", t: `${low.length} review${low.length > 1 ? "s" : ""} to reply to`, s: `“${String(low[0].text).slice(0, 80)}${String(low[0].text).length > 80 ? "…" : ""}”` });
    else { const th = reviewThemes(state.reviews, addD(today, -30)).find(x => x.bad >= 2); if (th) items.push({ k: "theme", tone: "warn", go: "more:reviews", t: `${th.bad} recent reviews mention ${th.t.toLowerCase()}`, s: "Worth a look before it becomes a pattern." }); }
    const due = remindersDue(state, ctx.venue, today, 14);
    if (due.length) items.push({ k: "rem", tone: due.some(d => d.overdue) ? "bad" : "", go: "more:reminders", t: due[0].t, s: due.length > 1 ? `And ${due.length - 1} more coming up.` : `Due ${new Date(due[0].due + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.` });
    const ps = posts(cal, district, ctx.cafe, state.settings, today, 7);
    if (ps.length && items.length < 5) items.push({ k: "post", tone: "", go: "more:posts", t: "A post ready for this week", s: ps[0].for });
    return items.slice(0, 5);
  }
  // The same briefing as plain text, for an email.
  function briefingText(items, cafe) {
    return `Your week at ${cafe}\n\n` + items.map(i => `• ${i.t}\n  ${i.s}`).join("\n\n") + `\n\nOpen Patch for the detail.`;
  }

  const api = { iso, addD, dowOf, addSales, salesDays, effectFor, forecastDay, forecastWeek, staffing, prep, priceImpact, THEMES, reviewThemes, replyDraft, posts, DEFAULT_REMINDERS, remindersDue, briefing, briefingText, uid };
  // Always on the global too, so the server bundle (where `module` exists) can share these between files.
  root.PatchOps = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
