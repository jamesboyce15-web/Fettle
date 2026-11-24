import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const box = {}; box.globalThis = box; vm.createContext(box);
for (const f of ["patch-sectors.js", "patch-core.js"]) vm.runInContext(fs.readFileSync(new URL("../public/" + f, import.meta.url), "utf8"), box);
const S = box.PatchSectors, P = box.PatchCore;

test("salon menu lines are filed by the written rules", () => {
  const c = (name, kind, extra) => S.classify(Object.assign({ name, kind }, extra));
  assert.equal(c("Ladies - Wash, Trim & Blow Dry", "hair"), "w_cut_blow");
  assert.equal(c("Root Colour, Olaplex, Cut & Blowdry", "hair"), null, "colour bundles aren't a cut price");
  assert.equal(c("Stylist Haircut and finish", "barber"), "m_cut", "a barber's cut and finish is a men's cut");
  assert.equal(c("Haircut", "hair"), null, "a salon's men's cut must say so");
  assert.equal(c("Men - Haircuts", "hair"), "m_cut");
  assert.equal(c("Kids cut", "barber"), null);
  assert.equal(c("Haircut & beard", "barber"), "cut_beard");
  assert.equal(c("Skin / Taper Fade", "barber"), "skin_fade");
  assert.equal(c("Shellac toes", "nails"), "pedicure");
  assert.equal(c("Gel Polish Removal", "nails"), null);
  assert.equal(c("Builder Gel - New Set", "nails"), "biab");
  assert.equal(c("Dermapen 4 Microneedling", "aesthetics", { std: "Microneedling" }), "needling_clin");
  assert.equal(c("Microneedling Facial", "beauty", { std: "Microneedling" }), "needling");
  assert.equal(c("Balayage", "hair", { std: "Balayage", promo: "Normal" }), "balayage");
});

test("one entry price per business, normal prices only, and thin benchmarks marked", () => {
  const rows = [
    { venue: "a", kind: "barber", name: "Haircut", price: 20 }, { venue: "a", kind: "barber", name: "Scissor cut", price: 24 },
    { venue: "b", kind: "barber", name: "Haircut", price: 15, promo: "Offer" }, { venue: "b", kind: "barber", name: "Haircut", price: 18 },
    { venue: "c", kind: "barber", name: "Gents haircut", price: 22, from: true }, { venue: "d", kind: "barber", name: "Haircut", price: 25 },
  ];
  const E = S.entryPrices(rows); assert.equal(E.length, 4);
  assert.equal(E.find(e => e.venue === "a").price, 20); assert.equal(E.find(e => e.venue === "b").price, 18); assert.equal(E.find(e => e.venue === "c").from, true);
  const b = S.benchmarks(E).find(x => x.k === "m_cut"); assert.equal(b.n, 4); assert.equal(b.thin, true); assert.equal(b.median, 21);
  assert.equal(S.benchmarks(E.slice(0, 2)).find(x => x.k === "m_cut").median, undefined, "fewer than 3: no figure");
});

test("an area can switch between the café basket and salon services", () => {
  assert.equal(P.ITEMS[0].k, "espresso");
  P.useSector("salon"); assert.equal(P.SECTOR, "salon"); assert.ok(P.ITEM.m_cut); assert.equal(P.ITEM.espresso, undefined); assert.equal(P.MAX_PRICE, 600);
  const venues = ["a", "b", "c"].map(id => ({ id, name: id, included: true })), obs = venues.map((v, i) => ({ venueId: v.id, at: "2026-11-24", source: "platform", prices: { m_cut: 18 + i } }));
  const st = P.areaStats(venues, obs).prices.find(p => p.k === "m_cut"); assert.equal(st.median, 19); assert.equal(st.thin, true);
  P.useSector("cafe"); assert.equal(P.ITEMS[0].k, "espresso"); assert.equal(P.MIN_N, 5); assert.equal(P.WORDS.place, "café");
});
