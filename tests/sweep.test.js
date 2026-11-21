// Sweeps: reading a menu board, and the sweeper's photo upload.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clean, PROMPTS } from "../lib/reader.js";
import { onRequestPost as sweepPhoto } from "../functions/api/sweep-photo.js";

test("menu readings keep only our items, at sensible prices", () => {
  const m = clean("menu", { prices: { flat_white: "3.40", latte: 3.6, oat_extra: 0.45, smoothie: 4.5, cake: 400, croissant: 0.1 }, seen: { flat_white: "Flat White £3.40" }, legible: "good", notes: null });
  assert.deepEqual(m.prices, { flat_white: 3.4, latte: 3.6, oat_extra: 0.45 }); assert.equal(m.seen.flat_white, "Flat White £3.40"); assert.equal(m.legible, "good");
  assert.match(PROMPTS.menu(), /never guess/); assert.match(PROMPTS.menu(), /flat_white: a flat white/);
});

const env = { SUPABASE_URL: "https://x", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "k" };
const SW = "11111111-2222-3333-4444-555555555555", IT = "aaaaaaaa-2222-3333-4444-555555555555";
const form = (s, item, file) => { const fd = new FormData(); fd.append("s", s); fd.append("item", item); if (file) fd.append("file", file); return new Request("https://p/api/sweep-photo", { method: "POST", body: fd }); };
test("a sweeper's photo is stored, read straight away, and the item marked sent", async () => {
  const calls = [];
  globalThis.fetch = async (u, o = {}) => { u = String(u); calls.push({ u, m: o.method || "GET", body: o.body });
    if (u.includes("/rest/v1/sweeps?token=eq." + SW)) return new Response(JSON.stringify([{ id: "sw1" }]));
    if (u.includes("/rest/v1/sweep_items?id=eq." + IT + "&sweep_id")) return new Response(JSON.stringify([{ id: IT, status: "todo" }]));
    if (u.includes("/rpc/bump_usage")) return new Response("true");
    if (u.includes("/storage/v1/object/sweep-photos/") && o.method === "POST") return new Response("{}");
    if (u.includes("/storage/v1/object/sweep-photos/")) return new Response(new Uint8Array([1, 2, 3]));
    if (u.includes("api.anthropic.com")) return new Response(JSON.stringify({ content: [{ type: "text", text: '{"prices":{"flat_white":3.4,"latte":3.6,"tea":2.5,"croissant":2.9},"legible":"good"}' }] }));
    return new Response("[]"); };
  const r = await sweepPhoto({ request: form(SW, IT, new File([new Uint8Array([1])], "b.jpg", { type: "image/jpeg" })), env }), j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.found, 4); assert.equal(j.legible, "good");
  const patch = calls.find(c => c.m === "PATCH"); const body = JSON.parse(patch.body);
  assert.equal(body.status, "sent"); assert.match(body.photo_path, /^sw1\/aaaaaaaa-.*\.jpg$/); assert.equal(body.read.prices.flat_white, 3.4);
});
test("a closed sweep, a bad link or a non-photo is refused", async () => {
  globalThis.fetch = async u => new Response("[]");
  assert.equal((await sweepPhoto({ request: form(SW, IT, new File(["x"], "b.jpg", { type: "image/jpeg" })), env })).status, 403);
  assert.equal((await sweepPhoto({ request: form("nope", IT, new File(["x"], "b.jpg", { type: "image/jpeg" })), env })).status, 403);
  assert.equal((await sweepPhoto({ request: form(SW, IT, new File(["x"], "b.pdf", { type: "application/pdf" })), env })).status, 415);
});
