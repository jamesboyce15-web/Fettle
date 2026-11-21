// The owner's week: forecast, staffing, prep, price changes, reviews, posts, reminders, the Monday briefing.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const box = { module: { exports: {} } }; box.globalThis = box; box.window = box;
vm.createContext(box);
vm.runInContext(fs.readFileSync(new URL("../public/patch-core.js", import.meta.url), "utf8").replace('if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PatchCore = api;', "root.PatchCore = api;"), box);
vm.runInContext(fs.readFileSync(new URL("../public/patch-ops.js", import.meta.url), "utf8").replace('if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PatchOps = api;', "root.PatchOps = api;"), box);
const P = box.PatchCore, O = box.PatchOps;

// 10 weeks to Sunday 8 November 2026. Saturdays busier; the market (2nd Saturday) +30%; flat white rises from £3.10 to £3.40 on 26 October.
function workspace() {
  const lines = ["Date,Time,Item,Qty,Gross Sales"], start = Date.UTC(2026, 7, 31);
  for (let d = 0; d < 70; d++) { const t = new Date(start + d * 864e5), ds = t.toISOString().slice(0, 10), dow = t.getUTCDay(), market = dow === 6 && t.getUTCDate() >= 8 && t.getUTCDate() <= 14;
    const fw = ds >= "2026-10-26" ? 3.4 : 3.1;
    for (let h = 8; h <= 15; h++) { const n = Math.round((h <= 9 ? 10 : 4) * (dow === 6 ? 1.5 : 1) * (market ? 1.3 : 1));
      for (let i = 0; i < n; i++) lines.push(`${ds},${h}:${String(i * 4).padStart(2, "0")},${i % 2 ? "Flat white" : "Cake"},1,${i % 2 ? fw : 3.5}`); } }
  const r = P.readSales(lines.join("\n")); assert.ok(!r.error, r.error);
  const s = { settings: { perStaffHour: 60, minStaff: 1 }, prep: [{ name: "Croissants", perDay: 30 }] };
  O.addSales(s, r.rows); return s;
}
const markets = ["2026-09-12", "2026-10-10"].map(d => ({ type: "event", title: "Farmers' market", start: d, end: d, effect: "busier" }));

test("sales are kept per day and hour, with item counts", () => {
  const s = workspace(), d = s.sales.days["2026-09-01"];
  assert.ok(d.t > 0 && d.h["8"] > d.h["14"]); assert.ok(s.sales.items["2026-09-01"]["flat white"] > 0);
});

test("forecast: same weekdays, then local happenings learned from their own sales", () => {
  const s = workspace(), cal = markets.concat([{ type: "event", title: "Farmers' market", start: "2026-11-14", end: "2026-11-14", effect: "busier" }]);
  const plain = O.forecastDay(s, "2026-11-21", cal, "M20"), market = O.forecastDay(s, "2026-11-14", cal, "M20");
  assert.ok(plain.total > 0 && plain.basedOn >= 3);
  assert.ok(market.total > plain.total * 1.2 && market.total < plain.total * 1.4, `${market.total} vs ${plain.total}`);
  assert.ok(market.reasons.some(r => /Farmers' market: \+\d+% on your past ones/.test(r)), market.reasons.join("|"));
  const wk = O.forecastWeek(s, "2026-11-09", cal, "M20"); assert.equal(wk.length, 7); assert.ok(wk.every(d => d.total > 0));
  assert.equal(O.forecastDay({ sales: { days: {} } }, "2026-11-14", [], ""), null);
});

test("an event we haven't seen yet uses a cautious estimate, and says so", () => {
  const s = workspace(), cal = [{ type: "event", title: "Christmas lights", start: "2026-11-21", end: "2026-11-21", effect: "busier" }];
  const f = O.forecastDay(s, "2026-11-21", cal, ""); assert.ok(f.reasons.some(r => /our estimate/.test(r)));
});

test("staffing in shifts, and prep scaled by the forecast", () => {
  const s = workspace(), f = O.forecastDay(s, "2026-11-14", markets.concat([{ type: "event", title: "Farmers' market", start: "2026-11-14", end: "2026-11-14" }]), "");
  const sh = O.staffing(f, s.settings);
  assert.equal(sh[0].from, 8); assert.ok(sh[0].n >= 2, JSON.stringify(sh)); assert.equal(sh[sh.length - 1].to, 16); assert.ok(sh.every(b => b.n >= 1));
  const pr = O.prep(f, s); assert.equal(pr[0].name, "Croissants"); assert.ok(pr[0].qty > 30, String(pr[0].qty));
});

test("a price change, measured from item sales", () => {
  const s = workspace(), imp = O.priceImpact(s, { item: "Flat white", from: 3.1, to: 3.4, at: "2026-10-26" }, "2026-11-08");
  assert.equal(imp.measured, true); assert.ok(Math.abs(imp.volume) <= 5, String(imp.volume)); assert.ok(imp.extra > 0, JSON.stringify(imp));
  const est = O.priceImpact({ sales: { days: {}, items: {} } }, { item: "Toastie", from: 6, to: 6.5, at: "2026-11-01", perWeek: 70 }, "2026-11-07");
  assert.equal(est.measured, false); assert.equal(est.extra, Math.round((0.5 / 1.2) * 10 * 7));
});

test("review themes and reply drafts", () => {
  const rv = [{ at: "2026-11-01", rating: 2, text: "Waited ages for a lukewarm latte, and it's expensive", author: "Jo Bloggs" }, { at: "2026-11-03", rating: 5, text: "Lovely staff and great coffee, really cosy" }, { at: "2026-11-04", rating: 3, text: "Slow service on a Saturday" }];
  const th = O.reviewThemes(rv); assert.equal(th[0].k, "wait"); assert.equal(th[0].bad, 2);
  const d = O.replyDraft(rv[0], "Little Fig"); assert.match(d, /^Hi Jo, I'm sorry/); assert.match(d, /waiting/);
  assert.match(O.replyDraft(rv[1], "Little Fig"), /Little Fig/);
});

test("posts from the local calendar, and reminders", () => {
  const ps = O.posts([{ type: "event", title: "Didsbury Festival", start: "2026-12-05", end: "2026-12-05" }], "M20", "Little Fig", { special: "mince pie croissants" }, "2026-12-01", 30);
  assert.match(ps[0].text, /Didsbury Festival is on Saturday 5 December/); assert.match(ps[0].text, /mince pie croissants/);
  assert.ok(ps.some(p => p.todo && /hours on Google/.test(p.todo)), "bank holiday post with a Google hours to-do");
  const due = O.remindersDue({ reminders: [{ id: "a", t: "Insurance renewal", due: "2027-03-10" }] }, { hygieneDate: "2024-12-01" }, "2027-03-01", 45);
  assert.ok(due.some(d => /Minimum wage/.test(d.t))); assert.ok(due.some(d => d.t === "Insurance renewal")); assert.ok(due.some(d => /hygiene inspection could be due/.test(d.t)));
  assert.equal(O.remindersDue({ reminders: [], dismissed: { "fhrs": "x" } }, { hygieneDate: "2024-12-01" }, "2026-06-01", 10).length, 0);
});

test("the Monday briefing: five things at most, most useful first", () => {
  const s = workspace(); s.changes = [{ id: "c1", item: "Flat white", from: 3.1, to: 3.4, at: "2026-10-26" }];
  s.reviews = [{ id: "r1", at: "2026-11-07", rating: 2, text: "Slow and rude" }];
  const b = O.briefing(s, { district: "M20", cafe: "Little Fig", calendar: markets.concat([{ type: "event", title: "Farmers' market", start: "2026-11-14", end: "2026-11-14" }]), newNearby: [{ name: "Moss Hill Café", d: 0.4 }], venue: {} }, "2026-11-09");
  assert.ok(b.length <= 5); assert.equal(b[0].k, "week"); assert.match(b[0].t, /£[\d,]+ expected this week/);
  ["cal", "new", "win", "rev"].forEach(k => assert.ok(b.some(x => x.k === k), k));
  assert.match(O.briefingText(b, "Little Fig"), /Your week at Little Fig/);
  const empty = O.briefing({}, { calendar: [], cafe: "X" }, "2026-11-09"); assert.equal(empty[0].k, "sales");
});
