import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const box = {}; box.globalThis = box; vm.createContext(box);
for (const f of ["patch-kits.js", "patch-offers.js"]) vm.runInContext(fs.readFileSync(new URL("../public/" + f, import.meta.url), "utf8"), box);
const O = box.PatchOffers, K = box.PatchKits;
const today = "2026-11-24";
const OFFERS = [
  { id: "a", kind: "insurance", sectors: ["salon"], provider: "Salon Cover", live: true, rate_from: 300, rate_unit: "a year", checked_at: "2026-11-20" },
  { id: "b", kind: "insurance", sectors: ["cafe", "salon"], provider: "Old Price Ltd", live: true, rate_from: 200, rate_unit: "a year", checked_at: "2026-08-01" },
  { id: "c", kind: "insurance", sectors: ["cafe"], provider: "Café Only", live: true },
  { id: "d", kind: "energy", sectors: ["salon"], provider: "Off", live: false },
];

test("renewals find their kind of offer, by what the owner called them", () => {
  assert.equal(O.kindOf("Insurance renewal"), "insurance"); assert.equal(O.kindOf("Energy contract end"), "energy");
  assert.equal(O.kindOf("Card machine contract review"), "card"); assert.equal(O.kindOf("Gas safety check"), "gas");
  assert.equal(O.kindOf("Allergen information check"), null);
  assert.equal(K.docFor("Energy contract end").kind, "energy"); assert.equal(K.docFor("Gas safety check").kind, "gas");
});

test("only live offers for their kind of business; an old price is hidden, not shown", () => {
  const l = O.offersFor(OFFERS, "insurance", "salon", today);
  assert.deepEqual(l.map(o => o.id), ["a", "b"], "checked price first, then no price");
  assert.equal(l[0].rate.from, 300); assert.equal(l[1].rate, null, "checked in August: too old to show");
  assert.deepEqual(O.offersFor(OFFERS, "insurance", "cafe", today).map(o => o.id), ["c", "b"], "no price shown on either: by name");
  assert.equal(O.offersFor(OFFERS, "energy", "salon", today).length, 0, "not live");
});

test("what we say: what they paid, a saving only as 'could', and always the disclosure", () => {
  const [a] = O.offersFor(OFFERS, "insurance", "salon", today);
  const p = O.pitch(a, { premium: 412, insurer: "Hiscox" });
  assert.match(p.lines[0], /You paid £412 with Hiscox/); assert.equal(p.saving, 112); assert.match(p.lines.at(-1), /could be up to £112 less, if the cover matches/);
  assert.match(p.note, /don't give insurance advice/); assert.match(p.disclosure, /may be paid/);
  assert.equal(O.pitch(a, { premium: 250 }).saving, null, "no saving when they already pay less");
  assert.equal(O.pitch(a, null).saving, null, "no saving without what they paid");
});

test("salons are reminded of salon things", () => {
  const s = O.DEFAULTS.salon.map(x => x[0]).join("|");
  assert.match(s, /Treatment licence/); assert.doesNotMatch(s, /Pavement|Gas safety|Allergen/);
  assert.match(O.DEFAULTS.cafe.map(x => x[0]).join("|"), /Energy contract/);
});

test("search: owner ticks merge with ours, the next moves come with points, and progress is kept", async () => {
  const b2 = {}; b2.globalThis = b2; vm.createContext(b2);
  for (const f of ["patch-insights.js", "patch-search.js"]) vm.runInContext(fs.readFileSync(new URL("../public/" + f, import.meta.url), "utf8"), b2);
  const I = b2.PatchInsights, SR = b2.PatchSearch;
  const ours = { at: "2026-10-01", checks: { gbp_hours: false, gbp_booking: false, site: true, menu: false } };
  const m = SR.mergeChecks(ours, { gbp: { gbp_hours: true }, gbpAt: "2026-11-20" }, "salon");
  assert.equal(m.checks.gbp_hours, true, "their newer tick wins"); assert.equal(m.checks.gbp_booking, false); assert.equal(m.checks.menu, false);
  const nx = SR.nextMoves(m.checks, "salon", 3);
  assert.equal(nx.moves[0].c.k, "gbp_booking", "the booking button is worth most"); assert.ok(nx.moves[0].pts > 0);
  assert.ok(nx.moves.every(x => x.kind === "fix") || nx.moves.some(x => x.kind === "check"));
  assert.equal(I.seoChecksFor("salon").some(c => c.k === "gbp_booking"), true); assert.equal(I.seoChecksFor("cafe").some(c => c.k === "gbp_booking"), false);
  const h = []; SR.record(h, { at: "2026-10-01", score: 40, ai: 0 }); SR.record(h, { at: "2026-10-01", score: 40, ai: 0 }); SR.record(h, { at: "2026-11-01", score: 62, ai: 2 });
  assert.equal(h.length, 2); const pr = SR.progress(h); assert.equal(pr.score.d, 22); assert.equal(pr.ai.d, 2);
  const src = SR.aiSources({ sources: { a: ["https://www.treatwell.co.uk/x", "https://maps.google.com/y", "https://mysalon.co.uk/"], b: ["https://www.treatwell.co.uk/z"] } }, "mysalon.co.uk");
  assert.equal(JSON.stringify(src.map(x => x.name)), JSON.stringify(["Treatwell"]), "Google and their own site left out"); assert.equal(src[0].n, 2);
  assert.match(SR.themeSteps("dog-friendly", "cafe").join(" "), /Dogs allowed/);
});
