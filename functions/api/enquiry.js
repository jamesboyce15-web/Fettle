// POST /api/enquiry {slug, source, answers}: the enquiry form on a Patch page, the moment the customer taps Send.
// Keeps only the answers the trade asks (never the customer's number: they send from their own WhatsApp). 20 a day per visitor.
import { json } from "../../lib/server.js";
import { anonRpc, publicEnv, allow } from "../../lib/supa.js";
import "../../public/patch-desk.js";

export async function onRequestPost({ request, env }) {
  const D = globalThis.PatchDesk; let b = {}; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const slug = String(b.slug || "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) return json({ error: "Bad request" }, 400);
  const E = publicEnv(env), m = await anonRpc(E, "member_public", { p_slug: slug, p_preview: null });
  if (!m) return json({ error: "No such page" }, 404);
  const { answers, ok } = D.cleanAnswers(m.trade, b.answers);
  if (!ok) return json({ error: "Missing answers" }, 400);
  // A light limit per visitor, without keeping their address: a daily hash. Only when the service key is set.
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const ip = request.headers.get("CF-Connecting-IP") || "", day = new Date().toISOString().slice(0, 10);
    const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`enq:${day}:${ip}`)))].slice(0, 8).map(x => x.toString(16).padStart(2, "0")).join("");
    if (!(await allow(env, "enq:" + h, 20))) return json({ status: "busy" }, 429);
  }
  const r = await anonRpc(E, "enquiry_add", { p_slug: slug, p_source: D.SOURCE[b.source] ? b.source : null, p_answers: answers });
  return json({ status: r || "error" }, r === "ok" ? 200 : 400);
}
