// The free check: reading names out of AI answers, and the server route with the AI and database faked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { namesFrom, isNamed, hostOf } from "../lib/ai.js";
import { onRequestPost as freeCheck } from "../functions/api/free-check.js";

test("names come out of an AI answer cleanly", () => {
  const t = "Here are some options:\n1. **Bark & Bubble** – great reviews\n2. Happy Hounds Grooming (Reddish)\n- The Groom Room SK.\nNote: call ahead.";
  assert.deepEqual(namesFrom(t), ["Bark & Bubble", "Happy Hounds Grooming", "The Groom Room SK"]);
  assert.ok(isNamed(t, "the groom room sk")); assert.ok(isNamed("Try Bark and Bubble", "Bark & Bubble")); assert.ok(!isNamed(t, "Paws & Polish"));
  assert.ok(!isNamed("A dog", "Dog"), "too short a name never matches by accident");
  assert.equal(hostOf("https://www.yell.com/biz/x"), "yell.com");
});

const env = { SUPABASE_URL: "https://db.test", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "k" };
function fake(member, opts = {}) {
  const calls = []; globalThis.fetch = async (url, o) => { url = String(url); const body = o && o.body ? JSON.parse(o.body) : null; calls.push({ url, method: (o && o.method) || "GET", body });
    const res = (s, j) => new Response(JSON.stringify(j), { status: s, headers: { "Content-Type": "application/json" } });
    if (url.includes("/rest/v1/members?whatsapp")) return res(200, member ? [member] : []);
    if (url.includes("/rest/v1/rpc/bump_usage")) return res(200, opts.limit ? false : true);
    if (url.includes("/rest/v1/members?id")) return res(200, []);
    if (url.includes("api.anthropic.com")) { if (opts.noSearch && body.tools) return res(400, { error: "web search not enabled" });
      return res(200, { content: [{ type: "web_search_tool_result", content: [{ url: "https://www.yell.com/x" }] }, { type: "text", text: body.messages[0].content.includes("near SK4") ? "1. Paws & Polish\n2. Bark & Bubble" : "1. Bark & Bubble\n2. Happy Hounds" }] }); }
    return res(404, {}); };
  return calls;
}
const req = b => new Request("https://x.test/api/free-check", { method: "POST", body: JSON.stringify(b), headers: { "CF-Connecting-IP": "1.2.3.4" } });
const post = async b => (await freeCheck({ request: req(b), env })).json();
const M = { id: "m1", name: "Paws & Polish", trade: "groomer", town: "Stockport", districts: [], checks: [], listings: {} };

test("runs before sign-up: three customer questions, who was named, where the answers came from", async () => {
  const calls = fake(null), j = await post({ business: "Paws & Polish", trade: "groomer", town: "Stockport", district: "sk4" });
  assert.equal(j.status, "ok"); assert.equal(j.results.length, 3); assert.ok(j.sig);
  assert.deepEqual(j.results.map(r => r.q), ["dog groomer near SK4", "dog groomer in Stockport", "mobile dog groomer Stockport"]);
  assert.ok(j.results[0].named); assert.ok(!j.results[1].named); assert.deepEqual(j.results[1].names, ["Bark & Bubble", "Happy Hounds"]);
  assert.deepEqual(j.results[0].sources, ["yell.com"]); assert.equal(j.results[0].engine, "Claude (web)");
  assert.ok(!calls.some(c => c.url.includes("anthropic") && JSON.stringify(c.body).includes("Paws")), "the business's own name is never put in the question");
  assert.ok(!calls.some(c => c.method === "PATCH"), "nothing is saved before sign-up");
});
test("a postcode area alone is enough; bad input is refused", async () => {
  fake(null); let j = await post({ business: "Paws", trade: "groomer", district: "SK4" }); assert.equal(j.status, "ok"); assert.deepEqual(j.results.map(r => r.q), ["dog groomer near SK4", "dog groomer in SK4", "mobile dog groomer SK4"]);
  for (const b of [{ business: "", trade: "groomer", town: "Stockport" }, { business: "X", trade: "nope", town: "Stockport" }, { business: "X", trade: "other", town: "Stockport" }, { business: "X", trade: "groomer" }, { business: "X", trade: "groomer", town: "<script>" }])
    assert.equal((await freeCheck({ request: req(b), env })).status, 400, JSON.stringify(b));
});
test("after sign-up, the answers are kept, but only if they're the ones we ran", async () => {
  fake(null); const run = await post({ business: "Paws & Polish", trade: "groomer", town: "Stockport", district: "SK4" });
  const save = { business: "Paws & Polish", trade: "groomer", town: "Stockport", district: "SK4", results: run.results };
  let calls = fake(M); let j = await post({ whatsapp: "07700900123", save, sig: run.sig });
  assert.ok(j.saved); const p = calls.find(c => c.method === "PATCH"); assert.equal(p.body.checks.length, 3); assert.ok(p.body.listings.before); assert.deepEqual(p.body.districts, ["SK4"]);
  calls = fake(M); const forged = JSON.parse(JSON.stringify(save)); forged.results[1].named = true;
  assert.equal((await freeCheck({ request: req({ whatsapp: "07700900123", save: forged, sig: run.sig }), env })).status, 400, "changed answers are refused");
  assert.ok(!calls.some(c => c.method === "PATCH"));
  fake(null); assert.equal((await freeCheck({ request: req({ whatsapp: "07700900123", save, sig: run.sig }), env })).status, 404, "needs a real sign-up");
});
test("falls back to no web search if it isn't switched on, and says so; respects the limits", async () => {
  fake(null, { noSearch: true }); let j = await post({ business: "Paws", trade: "groomer", town: "Stockport" }); assert.equal(j.results[0].engine, "Claude");
  fake(null, { limit: true }); j = await post({ business: "Paws", trade: "groomer", town: "Stockport" }); assert.equal(j.status, "later");
  j = await (await freeCheck({ request: req({ business: "Paws", trade: "groomer", town: "Stockport" }), env: Object.assign({}, env, { ANTHROPIC_API_KEY: "" }) })).json(); assert.equal(j.status, "later");
  fake(Object.assign({}, M, { checks: [{ at: new Date().toISOString().slice(0, 10), free: true, q: "x", engine: "Claude", named: false }] }));
  j = await post({ whatsapp: "07700900123" }); assert.ok(j.cached);
  fake(M); j = await post({ whatsapp: "07700900123" }); assert.equal(j.status, "ok"); assert.equal(j.results.length, 3, "a sign-up with no check gets one run for it");
});
