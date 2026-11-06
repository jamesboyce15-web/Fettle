import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyStripe } from "../lib/server.js";
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
