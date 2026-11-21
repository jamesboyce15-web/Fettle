// Emails: the wording, dry run by default, photo reading's checks, and the daily job.
import { test } from "node:test";
import assert from "node:assert/strict";
import "../public/patch-emails.js";
import { sendEmail, dryRun } from "../lib/mail.js";
import { clean, firstJson, PROMPTS, onRequestPost as readPhoto } from "../functions/api/read-photo.js";
import { onRequestPost as cron } from "../functions/api/cron.js";
import { londonToday } from "../lib/weekly.js";
const E = globalThis.PatchEmails;

test("the emails say the right things and escape what owners typed", () => {
  const r = E.reportReady({ name: "Jess <b>Patel</b>", cafe: "Fig & Co", reportUrl: "https://p/report?t=abc", foundingPrice: 59 });
  assert.equal(r.subject, "Your Patch report for Fig & Co"); assert.match(r.text, /^Hi Jess,/); assert.match(r.text, /https:\/\/p\/report\?t=abc/); assert.match(r.text, /£59 a month/);
  assert.ok(r.html.includes("Fig &amp; Co") && !r.html.includes("<b>Patel"));
  const w = E.weekly({ name: "Jess", cafe: "Little Fig", items: [{ t: "About £6,850 expected this week", s: "Busiest: Saturday." }], ownerUrl: "https://p/owner?t=x", unsubUrl: "https://p/api/unsubscribe?t=x", actions: { n: 3, value: 1200 } });
  assert.match(w.subject, /This week at Little Fig: About £6,850/); assert.match(w.text, /Stop these emails: https:\/\/p\/api\/unsubscribe\?t=x/); assert.match(w.text, /£1,200 a year/);
  for (const k of Object.keys(E.SAMPLES)) { const m = E.SAMPLES[k](); assert.ok(m.subject && m.text && m.html.startsWith("<!doctype html>"), k); }
});

test("dry run unless switched off on purpose, with everything set up", async () => {
  assert.equal(dryRun({}), true); assert.equal(dryRun({ EMAIL_DRY_RUN: "false" }), true);
  assert.equal(dryRun({ EMAIL_DRY_RUN: "no", RESEND_API_KEY: "k", EMAIL_FROM: "a@b" }), true);
  assert.equal(dryRun({ EMAIL_DRY_RUN: "false", RESEND_API_KEY: "k", EMAIL_FROM: "a@b" }), false);
  const calls = []; globalThis.fetch = async (u, o) => { calls.push(String(u)); return new Response("{}", { status: 201 }); };
  const s = await sendEmail({ SUPABASE_URL: "https://x", SUPABASE_SERVICE_ROLE_KEY: "s", RESEND_API_KEY: "k", EMAIL_FROM: "a@b" }, { to: "o@c", kind: "report", subject: "Hi", text: "t", html: "h" });
  assert.equal(s.status, "dry-run"); assert.ok(!calls.some(u => u.includes("resend")), "nothing sent"); assert.ok(calls.some(u => u.endsWith("/rest/v1/email_log")), "but logged");
});

test("what Claude reads from a photo is checked before it's used", () => {
  assert.deepEqual(firstJson('Here you go: {"a":1} thanks'), { a: 1 }); assert.equal(firstJson("no json"), null);
  const inv = clean("invoice", { supplier: "Valley Dairy", date: "2026-11-02", lines: [{ desc: "Whole Milk 4pt", qty: 12, total: 35.76 }, { desc: "", qty: 1, total: 4 }, { desc: "Delivery", qty: 1, total: -2 }, { desc: "Oat 6 x 1L", qty: "x", total: "11.4" }] });
  assert.equal(inv.lines.length, 2); assert.equal(inv.lines[1].qty, 1); assert.equal(inv.lines[1].total, 11.4);
  assert.deepEqual(clean("doc", { due: "30/11/2027", done: "2026-12-01", premium: "1284.6", insurer: "Aviva" }), { due: null, done: "2026-12-01", premium: 1284.6, insurer: "Aviva", policy: null });
  assert.match(PROMPTS.doc("Insurance renewal"), /Insurance renewal/); assert.match(clean("invoice", { error: "blurry" }).error, /blurry/);
});

test("photo reading is off until set up, and only for the owner's own files", async () => {
  const req = b => new Request("https://p/api/read-photo", { method: "POST", body: JSON.stringify(b) });
  assert.equal((await readPhoto({ request: req({}), env: {} })).status, 503);
  globalThis.fetch = async (u, o) => new Response(String(u).endsWith("/rpc/owner_get") ? "null" : "{}", { status: 200 });
  const env = { SUPABASE_URL: "https://x", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "k" };
  assert.equal((await readPhoto({ request: req({ t: "11111111-2222-3333-4444-555555555555", path: "x" }), env })).status, 403);
});

test("the daily job: a secret is needed, and Monday emails are worked out from the owner's data", async () => {
  assert.equal((await cron({ request: new Request("https://p/api/cron", { method: "POST" }), env: { CRON_SECRET: "s" } })).status, 403);
  assert.equal(londonToday(new Date("2026-11-23T07:00:00Z")).monday, true); assert.equal(londonToday(new Date("2026-11-22T23:30:00Z")).iso, "2026-11-22");
  const sent = [], logged = [];
  globalThis.fetch = async (u, o) => { u = String(u);
    if (u.includes("/rest/v1/requests?created_at")) return new Response("[]");
    if (u.includes("/rest/v1/requests?founding_interest")) return new Response("[]");
    if (u.includes("/rest/v1/requests?venue_id")) return new Response(JSON.stringify([{ id: "r1", name: "Jess Patel", email: "jess@example.com", token: "11111111-2222-3333-4444-555555555555", venue_id: "v1", area_id: "a1", report: null,
      owner_state: { reminders: [{ id: "m1", t: "Insurance renewal", every: 12, due: "2026-11-30" }], settings: {} } }]));
    if (u.includes("/rest/v1/venues")) return new Response(JSON.stringify([{ id: "v1", name: "Little Fig", postcode: "M20 2AA", hygiene: "5" }]));
    if (u.includes("/rest/v1/areas")) return new Response(JSON.stringify([{ id: "a1", calendar: [] }]));
    if (u.endsWith("/rest/v1/email_log")) { logged.push(JSON.parse(o.body)); return new Response("", { status: 201 }); }
    if (u.includes("resend")) { sent.push(JSON.parse(o.body)); return new Response('{"id":"e1"}'); }
    return new Response("[]"); };
  const env = { CRON_SECRET: "s", SUPABASE_URL: "https://x", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "k", ADMIN_EMAIL: "james@example.com" };
  const r = await (await cron({ request: new Request("https://p/api/cron?force=weekly", { method: "POST", headers: { "x-cron-secret": "s" } }), env })).json();
  assert.deepEqual(r.weekly, ["dry-run"]); assert.equal(r.digest, null, "no digest when nothing is new");
  assert.equal(sent.length, 0); assert.equal(logged[0].kind, "weekly"); assert.match(logged[0].body_text, /Insurance renewal/); assert.match(logged[0].body_text, /api\/unsubscribe\?t=/);
});
