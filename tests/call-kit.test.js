// The family call's planning rules (public/call-kit.js): who can realistically help in each band, gaps, kit, outcomes.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const box = { module: { exports: {} } }; box.globalThis = box;
vm.runInNewContext(fs.readFileSync(new URL("../public/call-kit.js", import.meta.url), "utf8"), box);
const K = box.module.exports;

// The worked example from the design: Mum, 82, alone. Son 150 miles away with two children. Sister 20 minutes away, NHS.
// Neighbour Pat, 79, two doors down.
const plan = () => ({
  homes: [{ id: "h1", label: "Mum's", district: "LA1", people: [{ id: "p1", name: "Mum", age: "75 to 84", alone: true, vuln: true }],
    a: { heat: "gas", phone: "digital", phoneBackup: "no", keysafe: false, co: false, medsDays: 4 }, kit: { has: { torch: true } } }],
  helpers: [
    { id: "s", name: "James", role: "family", miles: 150, car: true, kids: true },
    { id: "d", name: "Sarah", role: "family", miles: 12, car: true, essential: true },
    { id: "n", name: "Pat", role: "neighbour", miles: 0.1, older: true },
  ],
});

test("worked example: covered in Green only by the sister, gaps in Amber and Red", () => {
  const c = K.coverage(plan())[0].bands;
  assert.equal(c.g.main.name, "Sarah"); assert.equal(c.g.status, "thin");
  assert.equal(c.a.status, "gap"); assert.equal(c.r.status, "gap");
  assert.equal(K.gaps(plan()).map(g => g.band + g.status).join(), "gthin,agap,rgap");
});

test("the rules, band by band", () => {
  const h = (o) => Object.assign({ name: "X", car: true }, o);
  assert.equal(K.canHelp(h({}), "g", 30).ok, true);
  assert.equal(K.canHelp(h({}), "g", 60).ok, false);
  assert.equal(K.canHelp(h({ kids: true }), "g", 5).ok, false);
  assert.equal(K.canHelp(h({ kids: true, otherAdult: true }), "g", 5).ok, true);
  assert.equal(K.canHelp(h({ essential: true }), "g", 5).ok, true);
  assert.equal(K.canHelp(h({ essential: true }), "a", 5).ok, false);
  assert.equal(K.canHelp(h({}), "a", 8).ok, true);
  assert.equal(K.canHelp(h({ car: false }), "a", 8).ok, false);
  assert.equal(K.canHelp(h({ car: false }), "a", 1.5).ok, true);
  assert.equal(K.canHelp(h({ kids: true, otherAdult: true }), "r", 1).ok, false);
  assert.equal(K.canHelp(h({}), "r", 3).ok, false);
  assert.equal(K.canHelp(h({}), "r", 1).ok, true);
  assert.equal(K.canHelp(h({ older: true }), "g", 0).ok, false);
  assert.equal(K.canHelp(h({}), "a", null).ok, false, "unknown distance never counts");
});

test("a local check-in fills the Red gap once they've agreed", () => {
  const p = plan(); p.helpers.push({ id: "v", name: "Ann", role: "volunteer", miles: 0.5, status: "asked" });
  assert.equal(K.coverage(p)[0].bands.r.status, "gap", "asked is not agreed");
  p.helpers[3].status = "agreed"; p.helpers.push({ id: "v2", name: "Bob", role: "neighbour", miles: 0.3 });
  const c = K.coverage(p)[0].bands.r; assert.equal(c.status, "ok"); assert.equal(c.main.name, "Bob");
});

test("a helper is main for one person per band", () => {
  const p = plan(); p.homes[0].people.push({ id: "p2", name: "Dad", vuln: true });
  p.helpers.push({ id: "b", name: "Bob", miles: 0.3 });
  const c = K.coverage(p);
  assert.equal(c[0].bands.r.main.name, "Bob"); assert.equal(c[1].bands.r.main, null);
});

test("distance from postcode districts, and a typed figure wins", () => {
  const geo = { LA1: { lat: 54.047, lng: -2.801 }, M1: { lat: 53.479, lng: -2.236 } };
  const m = K.helperMiles({ district: "m1" }, { district: "LA1" }, geo);
  assert.ok(m > 40 && m < 50, String(m));
  assert.equal(K.helperMiles({ district: "LA1" }, { district: "LA1" }, geo), 2);
  assert.equal(K.helperMiles({ district: "M1", miles: "3" }, { district: "LA1" }, geo), 3);
});

test("findings, kit and outcomes follow the answers", () => {
  const p = plan(), f = K.findings(p.homes[0]).map(x => x.id);
  ["heat", "phone", "keys", "co", "meds"].forEach(id => assert.ok(f.includes(id), id));
  const k = K.kitFor(p.homes[0], K.coverage(p));
  assert.equal(k.tier, "red"); assert.equal(k.medical, false); assert.equal(k.total, 329);
  assert.ok(k.missing.some(x => x.k === "radio")); assert.ok(!k.missing.some(x => x.k === "torch"));
  const o = K.outcomesFor(p).map(x => x.k);
  ["psrElec", "phoneBackup", "keys", "meds", "checkin", "kit"].forEach(id => assert.ok(o.includes(id), id));
  assert.ok(!o.includes("floodline"));
  const s = K.score(p); assert.equal(s.gaps, 2); assert.equal(s.people, 1);
});

test("band steps change with the home", () => {
  const p = plan(); p.homes[0].a.equip = ["oxygen"]; p.homes[0].a.equipHours = 3;
  const g = K.bandSteps(p.homes[0], "g", []).join(" ");
  assert.match(g, /oxygen concentrator to battery/); assert.match(g, /landline won't work/);
  assert.match(K.bandSteps(p.homes[0], "r", []).join(" "), /999/);
  const w = K.whoComes(K.coverage(p), "a"); assert.equal(w[0].gap, true);
});
