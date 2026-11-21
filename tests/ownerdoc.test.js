// Owners' documents: only a valid owner link can store or open a file, and only inside its own folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost, onRequestGet } from "../functions/api/owner-doc.js";

const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "svc" };
const GOOD = "11111111-2222-3333-4444-555555555555";
function fake() { const calls = []; globalThis.fetch = async (url, o) => { calls.push({ url: String(url), o });
  if (String(url).endsWith("/rpc/owner_get")) return new Response(JSON.parse(o.body).p_token === GOOD ? '{"name":"x"}' : "null", { status: 200 });
  if (String(url).includes("/object/sign/")) return new Response('{"signedURL":"/object/sign/owner-docs/a?token=z"}', { status: 200 });
  return new Response("{}", { status: 200 }); }; return calls; }
const post = (t, file) => { const fd = new FormData(); fd.append("t", t); if (file) fd.append("file", file); return onRequestPost({ request: new Request("https://p/api/owner-doc", { method: "POST", body: fd }), env }); };

test("stores a PDF for a valid link, in a folder named from the link", async () => {
  const calls = fake(), r = await post(GOOD, new File(["%PDF-1.4"], "renewal.pdf", { type: "application/pdf" })), j = await r.json();
  assert.equal(r.status, 200); assert.match(j.path, /^[0-9a-f]{24}\/\d{4}-\d{2}-\d{2}-[0-9a-f-]{36}\.pdf$/);
  const up = calls.find(c => c.url.includes("/storage/v1/object/owner-docs/")); assert.equal(up.o.headers.Authorization, "Bearer svc");
});
test("refuses a bad link, the wrong type, and storage that isn't set up", async () => {
  fake();
  assert.equal((await post("99999999-2222-3333-4444-555555555555", new File(["x"], "a.pdf", { type: "application/pdf" }))).status, 403);
  assert.equal((await post(GOOD, new File(["x"], "a.exe", { type: "application/x-msdownload" }))).status, 415);
  const r = await onRequestPost({ request: new Request("https://p/", { method: "POST", body: new FormData() }), env: {} }); assert.equal(r.status, 503);
});
test("opens only files in the owner's own folder", async () => {
  fake(); const j = await (await post(GOOD, new File(["%PDF"], "r.pdf", { type: "application/pdf" }))).json();
  const ok = await onRequestGet({ request: new Request(`https://p/api/owner-doc?t=${GOOD}&path=${encodeURIComponent(j.path)}`), env });
  assert.equal(ok.status, 200); assert.match((await ok.json()).url, /^https:\/\/x\.supabase\.co\/storage\/v1\/object\/sign\//);
  const other = await onRequestGet({ request: new Request(`https://p/api/owner-doc?t=${GOOD}&path=${encodeURIComponent("abcdefabcdefabcdefabcdef/2026-11-20-11111111-2222-3333-4444-555555555555.pdf")}`), env });
  assert.equal(other.status, 403);
});
