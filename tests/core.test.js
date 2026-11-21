import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const box = { module: { exports: {} } }; box.globalThis = box;
vm.runInNewContext(fs.readFileSync(new URL("../public/patch-core.js", import.meta.url), "utf8"), box);
const P = box.module.exports;

// Eight cafés along one street, 0.1 miles apart.
const venues = Array.from({ length: 8 }, (_, i) => ({ id: "v" + i, name: "Cafe " + i, lat: 53.43 + i * 0.00145, lng: -2.23, kind: i === 7 ? "chain" : "independent", hygiene: i === 6 ? "AwaitingInspection" : "5" }));
const prices = [3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.4];
const obs = venues.map((v, i) => ({ venueId: v.id, at: "2026-11-01", source: "visit", prices: { flat_white: prices[i], cake: 3 + i * 0.1 }, scores: { clean: 4, friendly: 5, wait: 4, wifi: i % 2 === 0 } }));

test("area figures need at least 5 cafés", () => {
  const s = P.areaStats(venues, obs), fw = s.prices.find(p => p.k === "flat_white");
  assert.equal(fw.n, 8); assert.equal(fw.median, 3.4); assert.equal(s.independents, 7); assert.equal(s.awaiting, 1);
  assert.equal(s.prices.find(p => p.k === "toastie").median, null, "no toastie prices, so no figure");
  const few = P.areaStats(venues.slice(0, 4), obs); assert.equal(few.prices.find(p => p.k === "flat_white").median, null);
  assert.equal(s.wifi, 50);
});

test("newest price wins", () => {
  const o = obs.concat([{ venueId: "v0", at: "2026-11-15", source: "menu", prices: { flat_white: 3.25 } }]);
  assert.equal(P.latest(o, "v0").prices.flat_white, 3.25); assert.equal(P.latest(o, "v0").prices.cake, 3);
});

test("position against the nearest cafés", () => {
  const p = P.position(venues[0], venues, obs, 5);
  assert.equal(p.near.length, 5); assert.equal(p.near[0].v.id, "v1"); assert.ok(p.near[0].d > 0.05 && p.near[0].d < 0.15, String(p.near[0].d));
  const fw = p.items.find(i => i.k === "flat_white");
  assert.equal(fw.mine, 3.1); assert.equal(fw.median, 3.4); assert.equal(fw.diff, -0.3); assert.equal(fw.cheaperThan, 5);
  assert.ok(p.quality > 0.85, String(p.quality));
});

test("margin takes VAT off first", () => {
  const m = P.margin(3.6, 0.6); assert.equal(m.ex, 3); assert.equal(m.profit, 2.4); assert.equal(m.pct, 80);
  assert.equal(P.margin("", 0.6), null);
});

test("two levers: a saving first, otherwise a price change", () => {
  const pos = P.position(venues[0], venues, obs, 5).items.find(i => i.k === "flat_white");
  const save = P.levers({ k: "flat_white", price: 3.1, cost: 0.8, perWeek: 100 }, pos, 0.9, 0.59);
  assert.ok(save.saving && save.saving.per === 0.21 && save.saving.perYear === 1092 && !save.price, JSON.stringify(save));
  const raise = P.levers({ k: "flat_white", price: 3.1, cost: 0.6, perWeek: 100 }, pos, 0.9, 0.59);
  assert.ok(!raise.saving && raise.price, JSON.stringify(raise));
  assert.ok(raise.price.to <= 3.1 * 1.12 && raise.price.to >= 3.3, String(raise.price.to));
  const avgQ = P.levers({ k: "flat_white", price: 3.1, cost: 0.6, perWeek: 100 }, pos, 0.6, 0.59);
  assert.ok(avgQ.price.to <= pos.median, "average quality: no higher than the median");
  const none = P.levers({ k: "flat_white", price: 3.6, cost: 0.6, perWeek: 100 }, pos, 0.9, 0.59);
  assert.equal(none.price, null, "already at the top: no rise suggested");
});

test("calculator adds it up", () => {
  const pos = P.position(venues[0], venues, obs, 5);
  const c = P.calculator([{ k: "flat_white", price: 3.1, cost: 0.6, perWeek: 100 }, { k: "cake", price: 3, cost: 1.2, perWeek: 40 }], pos);
  assert.equal(c.rows.length, 2); assert.equal(c.total, c.saving + c.price); assert.ok(c.saving > 0 && c.price > 0, JSON.stringify([c.saving, c.price]));
});

test("board prices and new openings", () => {
  assert.equal(P.boardPrice(3.37), 3.4); assert.equal(P.boardPrice(2.33), 2.35);
  assert.equal(P.newNearby(venues[0], venues, 1)[0].v.id, "v6");
});

test("opening hours gaps", () => {
  const h = venues.map((v, i) => Object.assign({}, v, { hours: { mon: ["07:30", i < 2 ? "18:00" : "16:00"], sun: i < 3 ? ["09:00", "14:00"] : null } }));
  const g = P.hoursGaps(h); assert.equal(g.before8, 100); assert.equal(g.after5, 25); assert.equal(g.sunday, 38); assert.equal(g.sundayAfter3, 0);
});

test("calendar: local entries, bank holidays, by district", () => {
  const cal = [{ type: "event", title: "Didsbury Festival", start: "2026-06-13", end: "2026-06-14", districts: ["M20"] }, { type: "roadworks", title: "Barlow Moor Road", start: "2026-06-01", end: "2026-06-20", districts: ["M21"] }];
  const m20 = P.calendarFor(cal, "M20", "2026-05-20", 30).map(e => e.title);
  assert.equal(m20.join(), "Bank holiday,Didsbury Festival");
  assert.equal(P.calendarFor(cal, "M21", "2026-05-26", 10).map(e => e.title).join(), "Barlow Moor Road");
});

test("cost changes lift the cost per serving", () => {
  const b = P.benchAfter(P.BENCH, [{ k: "milk", at: "2026-10-01", pct: 10 }, { k: "coffee", at: "2025-01-01", pct: 50 }], "2026-01-01");
  assert.equal(b.flat_white, Math.round(0.59 * 1.03 * 100) / 100); assert.equal(b.espresso, 0.4, "old changes are already in the starting figure");
});

// Twelve weeks of a made-up till: busy 8 to 10, quieter afternoons, market Saturdays 30% up.
function till() {
  const lines = ["Date,Time,Description,Gross Sales"]; const start = Date.UTC(2026, 8, 7);
  for (let d = 0; d < 84; d++) { const t = new Date(start + d * 864e5), dd = t.toISOString().slice(0, 10), dow = t.getUTCDay();
    const uk = `${String(t.getUTCDate()).padStart(2, "0")}/${String(t.getUTCMonth() + 1).padStart(2, "0")}/${t.getUTCFullYear()}`;
    for (let h = 8; h <= 15; h++) { const n = (h <= 9 ? 10 : 4) * (dow === 6 && d % 14 === 5 ? 1.3 : 1); for (let i = 0; i < Math.round(n); i++) lines.push(`${i % 2 ? uk : dd},${h}:${String(i * 5).padStart(2, "0")},"Flat white, oat",£3.40`); } }
  return lines.join("\n");
}
test("reading a till export and finding the pattern", () => {
  const r = P.readSales(till()); assert.ok(!r.error, r.error); assert.equal(r.skipped, 0);
  const p = P.salesPattern(r.rows);
  assert.equal(p.days.length, 84); assert.equal(p.avgSale, 3.4); assert.equal(p.best[0].hour === 8 || p.best[0].hour === 9, true);
  assert.ok(p.quiet.length === 0 || p.quiet[0].hour >= 10);
  const markets = []; for (let d = 5; d < 84; d += 14) markets.push(new Date(Date.UTC(2026, 8, 7) + d * 864e5).toISOString().slice(0, 10));
  const fx = P.salesVsCalendar(p, markets.map(x => ({ type: "event", title: "Farmers' market", start: x, end: x })));
  const m = fx.find(x => x.title === "Farmers' market"); assert.ok(m && m.pct >= 20 && m.pct <= 40, JSON.stringify(fx));
  const share = P.salesShare(p); assert.ok(!("days" in share && Array.isArray(share.days)), "shares totals, never single sales");
});
test("dates and amounts as tills write them", () => {
  assert.equal(P.parseWhen("03/11/2026 14:05").date, "2026-11-03"); assert.equal(P.parseWhen("2026-11-03T09:30:00Z").hour, 9);
  assert.equal(P.parseWhen("3/11/26", "2:15 PM").hour, 14); assert.equal(P.parseWhen("nonsense"), null);
  const r = P.readSales("When;Takings\n03/11/2026 09:00;\"1.234,50\"\n", { date: 0, amount: 1, time: -1 });
  assert.ok(r.rows.length === 1);
  assert.ok(P.readSales("a,b\n1,2").error);
});

test("price moves nearby: who raised, by how much, across two sweeps", () => {
  const vs = [{ id: "me", lat: 53.42, lng: -2.23 }].concat(Array.from({ length: 5 }, (_, i) => ({ id: "c" + i, lat: 53.42 + i * 0.001, lng: -2.23 })));
  const obs = [];
  vs.forEach((v, i) => { obs.push({ venueId: v.id, at: "2026-08-01", source: "menu", prices: { flat_white: 3.2 } });
    obs.push({ venueId: v.id, at: "2026-11-10", source: "menu", prices: { flat_white: v.id === "me" ? 3.2 : i < 4 ? 3.4 : 3.2 } }); });
  obs.push({ venueId: "c4", at: "2026-11-15", source: "delivery", prices: { flat_white: 3.9 } });
  obs.push({ venueId: "c0", at: "2026-11-09", source: "menu", prices: { latte: 3.5 } });
  const m = P.priceMoves(vs[0], vs, obs).find(x => x.k === "flat_white");
  assert.equal(m.n, 5); assert.equal(m.up, 3); assert.equal(m.same, 2); assert.equal(m.avgUp, 0.2); assert.equal(m.since, "2026-08-01"); assert.equal(m.mine.d, 0);
  assert.equal(P.priceMoves(vs[0], vs, obs).find(x => x.k === "latte"), undefined, "too few to say");
});
