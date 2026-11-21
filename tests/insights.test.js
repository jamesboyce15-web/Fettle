// Suppliers, search, AI answers, ranking on visits, and the golden thread of actions.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const box = { module: { exports: {} } }; box.globalThis = box; box.window = box; vm.createContext(box);
const load = (f, name) => vm.runInContext(fs.readFileSync(new URL("../public/" + f, import.meta.url), "utf8").replace(`if (typeof module !== "undefined" && module.exports) module.exports = api; else root.${name} = api;`, `root.${name} = api;`), box);
load("patch-core.js", "PatchCore"); load("patch-ops.js", "PatchOps"); load("patch-insights.js", "PatchInsights");
const P = box.PatchCore, I = box.PatchInsights;

test("pack sizes and what each line is", () => {
  assert.equal(I.packSize("Whole Milk 4pt", "litre"), 4 * 0.568); assert.equal(I.packSize("Oatly Barista 6 x 1L", "litre"), 6);
  assert.equal(I.packSize("Espresso blend 1kg", "kg"), 1); assert.equal(I.packSize("House roast 500g", "kg"), 0.5);
  assert.equal(I.packSize("8oz ripple cups box of 1000", "cup"), 1000); assert.equal(I.packSize("Free range eggs x30", "egg"), 30);
  assert.equal(I.classify("Whole Milk 4pt"), "milk"); assert.equal(I.classify("Oatly Barista 6 x 1L"), "oat"); assert.equal(I.classify("8oz cup lids x1000"), "lids");
  assert.equal(I.classify("Chocolate milk 1L"), null);
});

test("the seeded price list: real product lines, a typical price for each, and price checks without invoices", () => {
  assert.ok(I.PRICE_BOOK.length >= 30); I.PRICE_BOOK.forEach(x => { assert.ok(/^https:\/\/www\.brake\.co\.uk\//.test(x.url), x.name); assert.ok(I.SUPPLY[x.k], x.k);
    assert.ok(Math.abs(I.packSize(x.pack, I.SUPPLY[x.k].unit) - x.size) < 0.01 || /about|loaves/.test(x.pack) || x.k === "bread", x.name + " pack " + x.pack); });
  Object.entries(I.SUPPLY).forEach(([k, c]) => assert.ok(c.bench > 0, k + " has a typical price"));
  assert.equal(I.SUPPLY.milk.bench, 1.0426); assert.equal(I.SUPPLY.beans.bench, 25.3); assert.equal(I.SUPPLY.tea.bench, 0.0329);
  assert.equal(I.packSize("Yorkshire Tea 2 x 1040", "bag"), 2080); assert.equal(I.packSize("Croissants 32 x 40g", "croissant"), 32); assert.equal(I.packSize("Eggs 15 dozen", "egg"), 180);
  assert.equal(I.packSize("Sausages 40 x 57g", "kg"), 40 * 0.057);
  ["Yorkshire Tea one cup 2 x 1040:tea", "Monin vanilla syrup 1L:syrup", "Sugar free caramel syrup 1L:syrup", "White sugar sachets box of 1000:sugar", "Delifrance croissant x32:croissant", "Back bacon 2.27kg:bacon", "Cadbury drinking chocolate 2kg:hotchoc", "Napkins 2ply box of 2000:napkins", "Sourdough bloomer x6:bread", "Baked beans 2.6kg:null"]
    .forEach(s => { const [d, k] = s.split(":"); assert.equal(String(I.classify(d)), k, d); });
  const f = I.supplierFindings([], null, { tea: { price: 90, pack: "2 x 1040", weekly: 150 }, cups: { price: 80, pack: "box of 1000" } });
  const tea = f.find(x => x.k === "tea"); assert.equal(tea.from, "check"); assert.ok(tea.perYear > 80 && tea.perYear < 90, String(tea.perYear));
  assert.equal(f.find(x => x.k === "cups").perYear, 0, "cups at about the usual price");
  const both = I.supplierFindings([{ desc: "Tea bags box of 1100", qty: 1, total: 30, date: "2026-11-01" }], null, { tea: { price: 90, pack: "2 x 1040" } });
  assert.equal(both.find(x => x.k === "tea").from, "invoices", "an invoice wins over a typed price");
  I.priceBook().forEach(g => assert.ok(g.ref && g.lines.length, g.k));
});

test("reading invoices from a CSV export and from PDF text", () => {
  const csv = "Date,Description,Qty,Unit Price,Line Total\n02/11/2026,Whole Milk 4pt,10,2.98,29.80\n09/11/2026,Whole Milk 4pt,10,2.98,29.80\n09/11/2026,Espresso blend 1kg,3,20.50,61.50\n09/11/2026,Napkins,1,4.00,4.00";
  const r = I.readInvoice(csv, "csv"); assert.equal(r.lines.length, 4);
  const f = I.supplierFindings(r.lines); const milk = f.find(x => x.k === "milk");
  assert.ok(milk.perUnit > 1.3 && milk.perUnit < 1.32, String(milk.perUnit)); assert.equal(milk.weeks, 2); assert.ok(milk.perYear > 280 && milk.perYear < 360, String(milk.perYear));
  assert.equal(f.find(x => x.k === "beans").perYear, 0, "beans at about the usual price");
  const pdf = I.readInvoice("Booker Wholesale  Invoice 12/11/2026\nOatly Barista 6 x 1L   2   13.20   26.40\nVAT 0.00\nTotal 26.40", "pdf");
  assert.equal(pdf.lines.length, 1); assert.equal(pdf.lines[0].date, "2026-11-12");
});

test("search score: weighted checks, biggest gaps first", () => {
  const s = I.seoScore({ gbp_hours: true, gbp_photos: false, gbp_reviews: false, site: true, https: true, mobile: true, title: false, menu: false, nap: true });
  assert.ok(s.score > 30 && s.score < 70, String(s.score)); assert.equal(s.fails[0].k, "gbp_reviews"); assert.equal(I.seoScore({}), null);
});

test("AI answers: share of mentions, rank, and the questions you're missing from", () => {
  const geo = { at: "2026-11-10", engines: ["ChatGPT", "Claude"], prompts: [{ q: "Best coffee in Elm Park", theme: "best coffee" }, { q: "Dog-friendly café in Elm Park", theme: "dog-friendly" }],
    answers: { "Best coffee in Elm Park|ChatGPT": ["Little Fig", "Oak & Oat"], "Best coffee in Elm Park|Claude": ["Oak & Oat"], "Dog-friendly café in Elm Park|ChatGPT": ["Bramble Café"], "Dog-friendly café in Elm Park|Claude": ["Bramble Café", "Oak & Oat"] } };
  const g = I.geoSummary(geo, "Little Fig"); assert.equal(g.share, 25); assert.equal(g.rank, 3); assert.equal(g.missing.length, 1); assert.equal(g.missing[0].top[0], "Bramble Café");
});

test("ranking on visits, and the trend since last time", () => {
  const vs = Array.from({ length: 6 }, (_, i) => ({ id: "v" + i, name: "C" + i, lat: 53.4 + i * 0.001, lng: -2.2, hygiene: "5" }));
  const obs = vs.map((v, i) => ({ venueId: v.id, at: "2026-10-01", source: "visit", scores: { wait: 3 + i, clean: 5 - (i % 2), friendly: 4, seats: 3 } }));
  obs.push({ venueId: "v0", at: "2026-11-05", source: "visit", scores: { wait: 9, clean: 3, friendly: 4, seats: 3 } });
  const r = I.rankTrend(vs[0], vs, obs); assert.equal(r.of, 6); assert.equal(r.before.rank, 1); assert.ok(r.rank > 1); assert.equal(r.weakest.k, "wait");
});

test("the golden thread: money first, every action says why and where to look", () => {
  const items = [{ k: "flat_white", t: "Flat white", mine: 3.1, median: 3.45, high: 3.6, diff: -0.35 }];
  const acts = I.goldenThread({ today: "2026-11-19", report: { items, quality: 0.9 }, suppliers: [{ k: "milk", t: "Milk", unit: "litre", perUnit: 1.31, bench: 1.1, overPct: 19, perYear: 420 }],
    seo: I.seoScore({ gbp_hours: false, site: true, menu: false }), geo: { missing: [{ q: "Dog-friendly café in Elm Park", theme: "dog-friendly", top: ["Bramble Café"] }] },
    visitRank: { at: "2026-11-05", weakest: { k: "wait", t: "Time to be served", rank: 5, of: 6 } }, state: { reviews: [{ id: "r1", rating: 2, text: "slow" }], actions: { "seo:gbp_hours": { status: "done", at: "2026-11-18" } } }, venue: {} });
  assert.equal([acts[0].area, acts[1].area].sort().join(), "Prices,Suppliers"); assert.ok(acts[0].value >= acts[1].value); const pr = acts.find(a => a.area === "Prices"); assert.ok(pr.value > 0 && pr.estimate, "estimated without item sales");
  ["Google", "AI answers", "Visit", "Reviews"].forEach(a => assert.ok(acts.some(x => x.area === a), a));
  assert.ok(acts.every(a => a.why && a.go && a.effort)); assert.equal(acts.find(a => a.key === "seo:gbp_hours").status, "done");
});

test("delivery-app prices are stored but never count as a café's price", () => {
  const obs = [{ venueId: "a", at: "2026-11-19", source: "delivery", prices: { latte: 3.9, brunch: 11.5 }, scores: {} }, { venueId: "a", at: "2026-10-01", source: "visit", prices: { latte: 3.4 }, scores: {} }];
  const l = P.latest(obs, "a"); assert.equal(l.prices.latte, 3.4); assert.equal(l.prices.brunch, undefined);
});

test("the saved online menus match cafés on the hygiene list, with sane prices", () => {
  const area = JSON.parse(fs.readFileSync(new URL("../public/data/didsbury-chorlton-withington.json", import.meta.url), "utf8"));
  const m = JSON.parse(fs.readFileSync(new URL("../public/data/didsbury-chorlton-withington-menus.json", import.meta.url), "utf8"));
  const ids = new Map(area.venues.map(v => [v.fsaId, v]));
  m.menus.forEach(x => { const v = ids.get(x.fsaId); assert.ok(v && v.postcode === x.postcode, x.name); assert.ok(/^https:\/\//.test(x.url));
    Object.entries(x.prices).forEach(([k, p]) => { assert.ok(P.ITEM[k], k); assert.ok(p > 0.2 && p < 25, x.name + " " + k); }); });
  m.checkOnVisit.forEach(c => assert.ok(ids.has(c.fsaId), c.name));
});

test("visit score: weighted, needs four answers, and 'didn't use' is left out", () => {
  assert.equal(I.visitScore({ coffee: 5, clean: 5 }), null);
  const all5 = I.visitScore({ welcome: 5, wait: 0, friendly: 5, coffee: 5, clean: 5, toilets: "na", accuracy: true }); assert.equal(all5.score, 100); assert.equal(all5.parts.toilets, undefined);
  const mixed = I.visitScore({ welcome: 3, wait: 5, friendly: 3, coffee: 1, clean: 5 }); assert.ok(mixed.score > 35 && mixed.score < 55, String(mixed.score));
});
