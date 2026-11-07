import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyStripe, unsubToken, checkUnsubToken } from "../lib/server.js";
import { onRequestGet as unsubscribe } from "../functions/api/unsubscribe.js";
import { run as runReminders, buildEmail } from "../workers/reminders/src/index.js";
import { onRequestPost as checkout } from "../functions/api/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";

const env = { SUPABASE_URL: "https://sb.test", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "svc", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_BOOK_DIGITAL: "price_1", STRIPE_WEBHOOK_SECRET: "whsec_test" };
const UID = "11111111-1111-4111-8111-111111111111", HID = "22222222-2222-4222-8222-222222222222";

async function sign(body, secret, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("")}`;
}
function mockFetch(handler) { const calls = []; globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); return handler(String(url), init); }; return calls; }
const res = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("stripe signature: valid, wrong secret, tampered, stale", async () => {
  const body = '{"a":1}';
  assert.equal(await verifyStripe(body, await sign(body, "whsec_test"), "whsec_test"), true);
  assert.equal(await verifyStripe(body, await sign(body, "other"), "whsec_test"), false);
  assert.equal(await verifyStripe('{"a":2}', await sign(body, "whsec_test"), "whsec_test"), false);
  assert.equal(await verifyStripe(body, await sign(body, "whsec_test", 1000), "whsec_test"), false);
  assert.equal(await verifyStripe(body, null, "whsec_test"), false);
});

test("checkout: rejects signed-out users", async () => {
  mockFetch(() => res({}, 401));
  const r = await checkout({ request: new Request("https://f.test/api/checkout", { method: "POST", body: "{}" }), env });
  assert.equal(r.status, 401);
});

test("checkout: rejects someone else's plan", async () => {
  mockFetch(url => url.includes("/auth/v1/user") ? res({ id: UID, email: "a@b.co" }) : res([]));
  const r = await checkout({ request: new Request("https://f.test/api/checkout", { method: "POST", headers: { Authorization: "Bearer tok" }, body: JSON.stringify({ householdId: HID, product: "book_digital" }) }), env });
  assert.equal(r.status, 404);
});

test("checkout: unknown product and bad id", async () => {
  mockFetch(url => url.includes("/auth/v1/user") ? res({ id: UID, email: "a@b.co" }) : res([{ id: HID }]));
  const mk = b => new Request("https://f.test/api/checkout", { method: "POST", headers: { Authorization: "Bearer tok" }, body: JSON.stringify(b) });
  assert.equal((await checkout({ request: mk({ householdId: HID, product: "free_money" }), env })).status, 400);
  assert.equal((await checkout({ request: mk({ householdId: "1 or 1=1", product: "book_digital" }), env })).status, 404);
});

test("checkout: creates a Stripe session with the right details", async () => {
  const calls = mockFetch(url => url.includes("/auth/v1/user") ? res({ id: UID, email: "a@b.co" }) : url.includes("/rest/v1/households") ? res([{ id: HID }]) : res({ url: "https://checkout.stripe.com/c/x" }));
  const r = await checkout({ request: new Request("https://f.test/api/checkout", { method: "POST", headers: { Authorization: "Bearer tok" }, body: JSON.stringify({ householdId: HID, product: "book_digital" }) }), env });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).url, "https://checkout.stripe.com/c/x");
  const s = calls.find(c => c.url.includes("api.stripe.com"));
  const f = new URLSearchParams(s.init.body);
  assert.equal(f.get("line_items[0][price]"), "price_1");
  assert.equal(f.get("metadata[household_id]"), HID);
  assert.equal(f.get("metadata[user_id]"), UID);
  assert.equal(f.get("success_url"), `https://f.test/?checkout=success&hh=${HID}`);
  assert.match(f.get("custom_text[submit][message]"), /14-day/);
  assert.equal(s.init.headers.Authorization, "Bearer sk_test_x");
});

test("webhook: bad signature is rejected and nothing is written", async () => {
  const calls = mockFetch(() => res({}));
  const r = await webhook({ request: new Request("https://f.test/api/stripe-webhook", { method: "POST", headers: { "Stripe-Signature": "t=1,v1=00" }, body: "{}" }), env });
  assert.equal(r.status, 400); assert.equal(calls.length, 0);
});

test("webhook: paid checkout records one purchase", async () => {
  const calls = mockFetch(() => new Response(null, { status: 201 }));
  const ev = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", amount_total: 500, currency: "gbp", livemode: false, metadata: { user_id: UID, household_id: HID, product: "book_digital" } } } });
  const r = await webhook({ request: new Request("https://f.test/api/stripe-webhook", { method: "POST", headers: { "Stripe-Signature": await sign(ev, "whsec_test") }, body: ev }), env });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/purchases\?on_conflict=stripe_session_id/);
  const row = JSON.parse(calls[0].init.body);
  assert.deepEqual([row.household_id, row.product, row.amount_total, row.stripe_session_id], [HID, "book_digital", 500, "cs_test_1"]);
  assert.equal(calls[0].init.headers.Authorization, "Bearer svc");
});

test("webhook: unpaid or other events are ignored", async () => {
  const calls = mockFetch(() => res({}));
  for (const ev of [{ type: "payment_intent.created", data: { object: {} } }, { type: "checkout.session.completed", data: { object: { payment_status: "unpaid", metadata: {} } } }]) {
    const b = JSON.stringify(ev);
    const r = await webhook({ request: new Request("https://f.test/x", { method: "POST", headers: { "Stripe-Signature": await sign(b, "whsec_test") }, body: b }), env });
    assert.equal(r.status, 200);
  }
  assert.equal(calls.length, 0);
});

test("unsubscribe: token only works for its own user", async () => {
  const t = await unsubToken("sec", UID);
  assert.equal(await checkUnsubToken("sec", UID, t), true);
  assert.equal(await checkUnsubToken("sec", HID, t), false);
  assert.equal(await checkUnsubToken("other", UID, t), false);
  assert.equal(await checkUnsubToken("", UID, t), false);
});

test("unsubscribe: bad token changes nothing; good token turns reminders off and keeps other settings", async () => {
  const e = { ...env, UNSUBSCRIBE_SECRET: "sec" };
  let calls = mockFetch(() => res({}));
  let r = await unsubscribe({ request: new Request(`https://x/api/unsubscribe?u=${UID}&t=nope`), env: e });
  assert.equal(r.status, 400); assert.equal(calls.length, 0);
  calls = mockFetch((url, init) => init.method === "PUT" ? res({}) : res({ id: UID, user_metadata: { first_name: "Ann", weekly_emails: true, remind_emails: true } }));
  r = await unsubscribe({ request: new Request(`https://x/api/unsubscribe?u=${UID}&t=${await unsubToken("sec", UID)}`), env: e });
  assert.equal(r.status, 200);
  const put = calls.find(c => c.init.method === "PUT");
  assert.deepEqual(JSON.parse(put.init.body).user_metadata, { first_name: "Ann", weekly_emails: true, remind_emails: false });
});

test("reminders: dry run sends and records nothing", async () => {
  const e = { ...env, UNSUBSCRIBE_SECRET: "sec", DRY_RUN: "true", SITE_URL: "https://f.test", FROM_EMAIL: "F <a@f.test>", RESEND_API_KEY: "re_x" };
  const calls = mockFetch(url => url.includes("/rpc/") ? res([{ household_id: HID, user_id: UID, email: "a@b.c", first_name: "Ann", household_name: "My household", kind: "day30", first_score: 34, last_score: 34 }]) : res({}));
  const out = await runReminders(e);
  assert.equal(out.dry, true); assert.equal(calls.length, 1);
});

test("reminders: live run sends once per row with an unsubscribe link, then records it", async () => {
  const e = { ...env, UNSUBSCRIBE_SECRET: "sec", DRY_RUN: "false", SITE_URL: "https://f.test", FROM_EMAIL: "F <a@f.test>", RESEND_API_KEY: "re_x" };
  const calls = mockFetch(url => url.includes("/rpc/") ? res([{ household_id: HID, user_id: UID, email: "a@b.c", first_name: "Ann", household_name: "Mum", kind: "day90", first_score: 20, last_score: 55 }]) : res({ id: "m1" }));
  const out = await runReminders(e);
  assert.equal(out.sent, 1);
  const send = calls.find(c => c.url.includes("resend.com"));
  const body = JSON.parse(send.init.body);
  assert.equal(body.to[0], "a@b.c"); assert.match(body.subject, /90-day/); assert.match(body.text, /Mum/);
  assert.match(body.headers["List-Unsubscribe"], /api\/unsubscribe\?u=/);
  const rec = calls.find(c => c.url.includes("/reminders_sent"));
  assert.deepEqual(JSON.parse(rec.init.body), { household_id: HID, kind: "day90" });
});

test("reminders: email escapes names", () => {
  const m = buildEmail({ first_name: "<b>x</b>", household_name: "My household", kind: "day30", first_score: 10 }, { SITE_URL: "https://f.test" }, "https://u");
  assert.doesNotMatch(m.html, /<b>x<\/b>/);
});
