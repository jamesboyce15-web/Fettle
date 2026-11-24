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
const M = { id: "m1", name: "Paws & Polish", trade: "groomer", town: "Stockport", districts: [], checks: [], listings: {} };

test("asks three customer questions, says who was named, and saves it as the 'before'", async () => {
  const calls = fake(M), j = await (await freeCheck({ request: req({ whatsapp: "07700 900123", district: "sk4" }), env })).json();
  assert.equal(j.status, "ok"); assert.equal(j.results.length, 3);
  assert.equal(j.results[0].q, "dog groomer near SK4"); assert.ok(j.results[0].named); assert.ok(!j.results[1].named);
  assert.deepEqual(j.results[1].names, ["Bark & Bubble", "Happy Hounds"]); assert.deepEqual(j.results[0].sources, ["yell.com"]); assert.equal(j.results[0].engine, "Claude (web)");
  const save = calls.find(c => c.method === "PATCH"); assert.equal(save.body.checks.length, 3); assert.ok(save.body.listings.before); assert.deepEqual(save.body.districts, ["SK4"]);
  assert.ok(!calls.some(c => c.url.includes("anthropic") && JSON.stringify(c.body).includes("Paws")), "the business's own name is never put in the question");
});
test("falls back to no web search if it isn't switched on, and says so", async () => {
  fake(M, { noSearch: true }); const j = await (await freeCheck({ request: req({ whatsapp: "07700900123" }), env })).json();
  assert.equal(j.status, "ok"); assert.equal(j.results[0].engine, "Claude");
});
test("only for a real sign-up, once a day, within limits", async () => {
  fake(null); assert.equal((await freeCheck({ request: req({ whatsapp: "07700900123" }), env })).status, 404);
  fake(Object.assign({}, M, { checks: [{ at: new Date().toISOString().slice(0, 10), free: true, q: "x", engine: "Claude", named: false }] }));
  let j = await (await freeCheck({ request: req({ whatsapp: "07700900123" }), env })).json(); assert.ok(j.cached); assert.equal(j.results.length, 1);
  fake(M, { limit: true }); j = await (await freeCheck({ request: req({ whatsapp: "07700900123" }), env })).json(); assert.equal(j.status, "later");
  fake(Object.assign({}, M, { trade: "other" })); j = await (await freeCheck({ request: req({ whatsapp: "07700900123" }), env })).json(); assert.equal(j.status, "later");
  assert.equal((await freeCheck({ request: req({ whatsapp: "123" }), env })).status, 400);
  j = await (await freeCheck({ request: req({ whatsapp: "07700900123" }), env: Object.assign({}, env, { ANTHROPIC_API_KEY: "" }) })).json(); assert.equal(j.status, "later");
});
