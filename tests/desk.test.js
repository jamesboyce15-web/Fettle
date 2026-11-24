// Front desk: numbers, the enquiry message, fair-play billing, the AI before-and-after, the page AI reads, and the server routes.
import { test } from "node:test";
import assert from "node:assert/strict";
import "../public/patch-desk.js";
import { onRequestGet as bPage } from "../functions/b/[slug].js";
import { onRequestPost as enquiry } from "../functions/api/enquiry.js";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";
const K = globalThis.PatchDesk;
const M = { id: "m1", slug: "paws-and-polish", status: "live", name: "Paws & Polish", trade: "groomer", owner_name: "Sarah", whatsapp: "447700900123", town: "Stockport", locality: "Heaton Moor", districts: ["SK4"], mobile: true,
  specialisms: ["Cockapoos", "Nervous dogs"], services: [{ name: "Full groom, medium dog", price: 45 }, { name: "Large dog", price: 55, from: true }, { name: "Ask me", price: null }], faqs: [{ q: "Do you collect?", a: "Yes, SK4 and SK5." }, { q: "No answer yet", a: "" }], updated_at: "2026-11-20T10:00:00Z" };

test("phone numbers become WhatsApp numbers, or nothing", () => {
  assert.equal(K.waNumber("07700 900123"), "447700900123"); assert.equal(K.waNumber("+44 (0)7700-900123"), "447700900123"); assert.equal(K.waNumber("0044 7700 900123"), "447700900123");
  assert.equal(K.waNumber("12345"), null); assert.equal(K.waNumber(""), null);
  assert.equal(K.waLink("447700900123", "Hi & bye"), "https://wa.me/447700900123?text=Hi%20%26%20bye");
});

test("answers are trimmed to what the trade asks, and the message has what the owner needs", () => {
  const { answers, ok } = K.cleanAnswers("groomer", { breed: " Cockapoo ", size: "Medium", when: "Sat", district: "SK4", junk: "<script>", notes: "x".repeat(900) });
  assert.ok(ok); assert.equal(answers.breed, "Cockapoo"); assert.ok(!("junk" in answers)); assert.equal(answers.notes.length, 600);
  assert.equal(K.cleanAnswers("groomer", { size: "Small" }).ok, false, "breed is required for a groomer");
  const t = K.compose(M, { breed: "Cockapoo", size: "Medium", service: "Full groom, medium dog", when: "Saturday", district: "SK4", cname: "Amy" }, "chatgpt");
  assert.match(t, /^Hi Paws & Polish, I found you on ChatGPT\./); assert.match(t, /Cockapoo/); assert.match(t, /When: Saturday/); assert.match(t, /Thanks, Amy$/);
  assert.doesNotMatch(K.compose(M, { breed: "Pug" }, "friend"), /found you on/, "only says where it was found when that's useful to the owner");
});

test("bills follow the fair-play rules", () => {
  const E = (n, extra) => Array.from({ length: n }, (_, i) => Object.assign({ id: "e" + i, member_id: "m1", at: `2026-11-${String(i + 1).padStart(2, "0")}T09:00:00Z`, source: "google", voided: false }, (extra || {})[i] || {}));
  let b = K.bill(M, E(3), "2026-11"); assert.equal(b.amount, 0); assert.equal(b.free, 3); assert.equal(b.freeLeft, 0);
  b = K.bill(M, E(5, { 1: { voided: true } }), "2026-11"); assert.equal(b.counted, 4); assert.equal(b.free, 3, "a voided one doesn't use a free one"); assert.equal(b.amount, 4);
  b = K.bill(M, E(20), "2026-11"); assert.equal(b.amount, 29); assert.ok(b.capped);
  assert.equal(K.bill(Object.assign({}, M, { founding: true }), E(20), "2026-11").amount, 19);
  assert.equal(K.bill(Object.assign({}, M, { plan: "plus" }), E(20), "2026-11").amount, 39);
  const two = E(6).map((e, i) => Object.assign(e, { at: i < 4 ? "2026-10-1" + i + "T09:00:00Z" : "2026-11-0" + i + "T09:00:00Z" }));
  b = K.bill(M, two, "2026-11"); assert.equal(b.free, 0, "free ones were used last month"); assert.equal(b.amount, 8);
  assert.equal(K.bill(M, E(5).map(e => Object.assign(e, { member_id: "other" })), "2026-11").total, 0, "only this business's enquiries");
});

test("the AI before-and-after, and the messages James sends", () => {
  const checks = [{ at: "2026-10-01", engine: "ChatGPT", q: "a", named: false }, { at: "2026-10-01", engine: "Google AI", q: "a", named: false }, { at: "2026-11-20", engine: "ChatGPT", q: "a", named: true, prices: true }, { at: "2026-11-20", engine: "Google AI", q: "a", named: false }];
  const s = K.aiSummary(checks); assert.deepEqual([s.before.named, s.before.n, s.now.named, s.now.n, s.now.prices], [0, 2, 1, 2, 1]); assert.equal(K.aiSummary([]), null);
  const enq = [{ id: "1", member_id: "m1", at: "2026-11-03T10:00:00Z", source: "chatgpt" }, { id: "2", member_id: "m1", at: "2026-11-04T10:00:00Z", source: "google", voided: true }];
  const r = K.reportMessage(M, enq, checks, "2026-11");
  assert.match(r, /^Hi Sarah, your November with Patch/); assert.doesNotMatch(r, /happiest|mention/i, "review advice never targets happy customers or suggests wording"); assert.match(r, /1 enquiry \(1 from ChatGPT\)\. 1 voided\./); assert.match(r, /named you in 1 of 2 searches, up from 0 of 2/); assert.match(r, /Bill: £0\. 1 of your free/); assert.match(r, /STOP/);
  assert.match(K.openerMessage(M, checks, "James"), /You were named in 1/); assert.match(K.openerMessage(M, [], "Jo"), /I'm Jo from Patch/);
  const sm = K.summaryMessage(M); assert.match(sm, /Full groom, medium dog: £45/); assert.match(sm, /Large dog: from £55/); assert.match(sm, /breed, size/);
  assert.deepEqual(K.searches(M).slice(0, 2), ["dog groomer near SK4", "dog groomer in Heaton Moor"]); assert.deepEqual(K.searches(Object.assign({}, M, { searches: ["my own"] })), ["my own"]);
  assert.equal(K.setupProgress({ listings: { gbp: "2026-11-01" } }).done, 1);
});

test("the page AI reads: real prices as text, schema.org, FAQs with answers only, safe from what owners type", () => {
  const h = K.pageHtml(Object.assign({}, M, { about: "</script><b>hi</b>" }), { url: "https://x.test/b/paws-and-polish" });
  assert.match(h, /<h1>Paws &amp; Polish<\/h1>/); assert.match(h, /£45/); assert.match(h, /from £55/); assert.match(h, />Ask</);
  assert.ok(!h.includes("<b>hi</b>") && h.includes("&lt;/script&gt;"), "owner text is escaped");
  assert.doesNotMatch(h, /noindex/, "a live page can be indexed"); assert.match(K.pageHtml(Object.assign({}, M, { status: "setup" }), {}), /noindex/);
  const raw = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x => x[1]), ld = raw.map(x => JSON.parse(x));
  const biz = ld[0], faq = ld[1];
  assert.equal(biz.name, "Paws & Polish"); assert.equal(biz.telephone, "+447700900123"); assert.equal(biz.priceRange, "£45–£55"); assert.ok(!biz.address, "a mobile business doesn't publish an address");
  assert.deepEqual(biz.areaServed.map(a => a.name), ["SK4", "Heaton Moor", "Stockport"]);
  const offers = biz.hasOfferCatalog.itemListElement; assert.equal(offers[0].price, 45); assert.equal(offers[1].priceSpecification.minPrice, 55); assert.equal(offers[2].price, undefined);
  assert.equal(faq["@type"], "FAQPage"); assert.equal(faq.mainEntity.length, 1, "unanswered questions are left out");
  assert.ok(raw.every(x => !x.includes("<")), "schema can't break out of its tag"); assert.equal(ld[0].description, "</script><b>hi</b>");
});

test("local prices come from businesses' own lists, and only show from five", () => {
  const mk = (i, p, extra) => Object.assign({ id: "g" + i, status: "live", trade: "groomer", town: "Stockport", services: [{ name: "Full groom, medium dog", price: p }, { name: "Large", price: 60, from: true }] }, extra || {});
  const four = [40, 42, 45, 50].map((p, i) => mk(i, p));
  let L = K.localPrices(four, "groomer", "stockport");
  assert.equal(L["full groom medium dog"].n, 4); assert.equal(L["full groom medium dog"].ok, false); assert.equal(L["full groom medium dog"].median, undefined, "no figures from four");
  assert.ok(!L["large"], "'from' prices aren't used");
  const all = four.concat([mk(4, 48), mk(5, 99, { town: "Leeds" }), mk(6, 99, { trade: "barber" }), mk(7, 99, { status: "lead" })]);
  L = K.localPrices(all, "groomer", "Stockport"); const o = L["full groom medium dog"];
  assert.equal(o.n, 5, "other towns, trades and sign-ups not counted"); assert.ok(o.ok); assert.equal(o.median, 45); assert.equal(o.low, 42); assert.equal(o.high, 48);
  const me = mk(9, 55); const c = K.compareLocal(me, all.concat([me]));
  assert.equal(c.length, 1); assert.equal(c[0].mine, 55); assert.equal(c[0].n, 5, "a business isn't compared with itself");
  assert.match(K.reportMessage(Object.assign(me, { owner_name: "Sam" }), [], [], "2026-11", all), /most dog groomers in Stockport charge £42–£48 \(5 on Patch\)/);
});

test("bookings: who's due back, who to ask for a review, and the month's figures", () => {
  const m = { id: "m1", name: "Paws & Polish", trade: "groomer", owner_name: "Sarah", rebook_weeks: null, review_url: "https://g.page/r/x/review" };
  const T = "2026-11-24", B = [
    { id: "a", member_id: "m1", source: "enquiry", on_date: "2026-10-15", label: "Amy · Cockapoo" },                  // due 26 Nov (6 weeks): in the next week
    { id: "b", member_id: "m1", source: "owner", on_date: "2026-09-01", label: "Tom · Pug", rebook_weeks: 6 },          // due 13 Oct: too long ago
    { id: "c", member_id: "m1", source: "owner", on_date: "2026-10-01", label: "Mel", rebook_weeks: 6 },                // rebooked below, so not due
    { id: "c2", member_id: "m1", source: "rebook", parent_id: "c", on_date: "2026-11-23", label: "Mel", rebook_weeks: 6 },
    { id: "d", member_id: "m1", source: "owner", on_date: "2026-10-14", label: "Jo", rebook_weeks: 6, reminded_at: "2026-11-20" },
    { id: "e", member_id: "m1", source: "owner", on_date: "2026-11-01", label: "Sue", rebook_weeks: 3 },                // due 22 Nov: 2 days overdue
    { id: "x", member_id: "other", source: "owner", on_date: "2026-10-15", label: "Not mine" }];
  const due = K.dueReminders(m, B, T); assert.deepEqual(due.map(b => b.id), ["e", "a"], "soonest first, rebooked and reminded ones left out");
  assert.equal(due[1].due, "2026-11-26"); assert.equal(K.REBOOK.groomer, 6); assert.equal(K.weeksFor({ trade: "driving" }, null), null, "no reminders unless it fits the trade");
  const rt = K.reminderText(m, due[1]); assert.match(rt, /^Hi Amy, just a reminder that your cockapoo's next groom is due around Thursday 26 November/); assert.match(rt, /Reply STOP/); assert.match(rt, /Sarah, Paws & Polish/);
  assert.deepEqual(K.dueReviews(m, B, T).map(b => b.id), ["c2"], "everyone who came in the last 3 days");
  const rv = K.reviewText(m); assert.match(rv, /g\.page\/r\/x\/review/); assert.doesNotMatch(rv, /5|star|mention|happy|discount|free/i, "no rating, wording or reward suggested");
  assert.equal(K.reviewText(Object.assign({}, m, { name: "Other" })).replace("Other", "Paws & Polish"), rv, "the same message for every customer");
  assert.match(K.waShare("Hi & bye"), /^https:\/\/wa\.me\/\?text=Hi%20%26%20bye$/, "the owner picks the chat: no number needed");
  const E = [{ id: "1", member_id: "m1", at: "2026-11-02T10:00:00Z", outcome: "booked" }, { id: "2", member_id: "m1", at: "2026-11-03T10:00:00Z", outcome: "not_booked" }, { id: "3", member_id: "m1", at: "2026-11-04T10:00:00Z" }, { id: "4", member_id: "m1", at: "2026-11-05T10:00:00Z", voided: true }];
  const st = K.bookingStats(m, E, B, "2026-11"); assert.deepEqual([st.enquiries, st.booked, st.conversion, st.rebooked, st.visits, st.reminded], [3, 1, 50, 1, 2, 1]);
  assert.deepEqual(K.toMark(m, E, T).map(e => e.id), ["3"]);
  assert.match(K.reportMessage(Object.assign({ id: "m1" }, m), E, [], "2026-11", null, B), /1 became booking, and 1 customer rebooked after a reminder\./);
});

// The server routes, with the database faked.
function fakeDb(handler) { const calls = []; globalThis.fetch = async (url, o) => { calls.push({ url: String(url), body: o && o.body ? JSON.parse(o.body) : null }); const r = handler(String(url), o && o.body ? JSON.parse(o.body) : null); return new Response(JSON.stringify(r), { status: 200, headers: { "Content-Type": "application/json" } }); }; return calls; }
const env = { SUPABASE_URL: "https://db.test", SUPABASE_ANON_KEY: "anon", ASSETS: { fetch: async () => new Response("<h1>404</h1>") } };

test("/b/<slug> serves the page for a live business, 404 otherwise", async () => {
  fakeDb(url => /member_public/.test(url) ? M : null);
  let r = await bPage({ params: { slug: "paws-and-polish" }, request: new Request("https://x.test/b/paws-and-polish"), env });
  assert.equal(r.status, 200); assert.match(r.headers.get("Cache-Control"), /public/); assert.match(await r.text(), /Send on WhatsApp/);
  fakeDb(() => null); r = await bPage({ params: { slug: "nope" }, request: new Request("https://x.test/b/nope"), env }); assert.equal(r.status, 404);
  r = await bPage({ params: { slug: "../etc" }, request: new Request("https://x.test/b/x"), env }); assert.equal(r.status, 404);
});

test("/api/enquiry keeps only the trade's answers and records it", async () => {
  const calls = fakeDb(url => /member_public/.test(url) ? M : /enquiry_add/.test(url) ? "ok" : null);
  let r = await enquiry({ request: new Request("https://x.test/api/enquiry", { method: "POST", body: JSON.stringify({ slug: "paws-and-polish", source: "chatgpt", answers: { breed: "Pug", phone: "07700900999", when: "Fri" } }) }), env });
  assert.equal(r.status, 200); const add = calls.find(c => /enquiry_add/.test(c.url)).body;
  assert.deepEqual(add.p_answers, { breed: "Pug", when: "Fri" }, "a phone number typed in isn't kept"); assert.equal(add.p_source, "chatgpt");
  r = await enquiry({ request: new Request("https://x.test/api/enquiry", { method: "POST", body: JSON.stringify({ slug: "paws-and-polish", answers: { size: "Small" } }) }), env }); assert.equal(r.status, 400, "breed missing");
});

test("the sitemap lists live business pages", async () => {
  fakeDb(() => [{ slug: "paws-and-polish", updated_at: "2026-11-20T10:00:00Z" }]);
  const t = await (await sitemap({ request: new Request("https://x.test/sitemap.xml"), env })).text();
  assert.match(t, /<loc>https:\/\/x.test\/b\/paws-and-polish<\/loc><lastmod>2026-11-20<\/lastmod>/); assert.match(t, /\/prices</);
});
