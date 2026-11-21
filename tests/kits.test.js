// Kits: review links, the written menu, structured data, and facts read off renewals and certificates.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const box = {}; box.globalThis = box; box.window = box; vm.createContext(box);
vm.runInContext(fs.readFileSync(new URL("../public/patch-kits.js", import.meta.url), "utf8"), box);
const K = box.PatchKits;

test("review links: the Business Profile link, a Place ID, or Google's own form", () => {
  assert.equal(K.reviewLink("https://g.page/r/CbXyZ123abcEAE/review").url, "https://g.page/r/CbXyZ123abcEAE/review");
  assert.equal(K.reviewLink("https://g.page/r/CbXyZ123abcEAE").url, "https://g.page/r/CbXyZ123abcEAE/review");
  assert.equal(K.reviewLink("ChIJN1t_tDeuEmsRUsoyG83frY4").url, "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4");
  assert.match(K.reviewLink("https://maps.app.goo.gl/abc").error, /Ask for reviews/);
  assert.ok(K.reviewLink("javascript:alert(1)").error);
});

test("the menu written out, and structured data with hours", () => {
  const m = K.menuText("Little Fig", [{ t: "Flat white", mine: 3.4 }, { t: "Latte", mine: null }, { t: "Croissant", mine: 2.8 }]);
  assert.equal(m.n, 2); assert.match(m.text, /Flat white \.\.\. £3\.40/); assert.match(m.html, /<li><span>Croissant<\/span> <span>£2\.80<\/span><\/li>/);
  const j = K.schemaJson({ name: "Little Fig", postcode: "M20 2AA", url: "littlefig.co.uk", hours: { mon: ["08:00", "16:00"], sun: null } });
  const o = JSON.parse(j.replace(/<\/?script[^>]*>/g, ""));
  assert.equal(o["@type"], "CafeOrCoffeeShop"); assert.equal(o.url, "https://littlefig.co.uk"); assert.equal(o.openingHoursSpecification.length, 1);
});

test("an insurance renewal: the end of the period, the premium and the insurer", () => {
  const t = `RENEWAL SCHEDULE  Policy Number: SME/4471239  Insurer: Aviva Insurance Limited  Period of Insurance: 01/12/2026 to 30/11/2027  Total Premium including IPT £1,284.60  Payable by direct debit`;
  const f = K.docFacts(t, "Insurance renewal", "2026-11-20");
  assert.equal(f.due, "2027-11-30"); assert.equal(f.premium, 1284.6); assert.equal(f.insurer, "Aviva Insurance"); assert.equal(f.policy, "SME/4471239");
  const f2 = K.docFacts("Your cover renews on 14 March 2027. Annual premium: £960", "Insurance renewal", "2026-11-20");
  assert.equal(f2.due, "2027-03-14"); assert.equal(f2.premium, 960);
});

test("certificates: the next due date, or the inspection date plus the usual gap", () => {
  assert.equal(K.docFacts("Gas Safety Record. Date of inspection: 03/02/2026. Next inspection due: 02/02/2027", "Gas safety check").due, "2027-02-02");
  const e = K.docFacts("Electrical Installation Condition Report. Date of inspection 12/05/2025. Overall: Satisfactory", "Electrical installation check (EICR)");
  assert.equal(e.due, "2030-05-12"); assert.match(e.dueFrom, /60 months/);
  assert.equal(K.docFor("Pest control visit").every, 3);
});
