// POST /api/community-join  {slug, token, data, named?, contact?, turnstile?}
// Adds a new home to a community's anonymous totals. This is the only way in for a new home, so the totals can't be
// filled with made-up answers: a robot check (Cloudflare Turnstile, when TURNSTILE_SECRET is set), then the database
// limits new homes per internet connection per day. The connection is passed as a scrambled code that changes daily
// and can't be turned back into an address; the database deletes it after 2 days. It isn't stored with the answers.
import { json, admin, isUuid, hmacHex } from "../../lib/server.js";

const MSG = {
  bad: "That didn't save. Please try again.",
  robot: "We couldn't check this was a person. Please try again.",
  missing: "We couldn't find that community.",
  net: "A lot of homes have joined from this internet connection today. Please try again tomorrow, or use mobile data.",
  busy: "Lots of homes are joining right now. Please try again in an hour.",
};

export async function onRequestPost({ request, env }) {
  let b = {}; try { b = await request.json(); } catch (e) {}
  const slug = String(b.slug || "").toLowerCase();
  const data = b.data;
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug) || !isUuid(b.token) || !data || typeof data !== "object" || Array.isArray(data) || JSON.stringify(data).length > 1900)
    return json({ error: MSG.bad }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "";

  if (env.TURNSTILE_SECRET) {
    const f = new FormData(); f.append("secret", env.TURNSTILE_SECRET); f.append("response", String(b.turnstile || "").slice(0, 2048)); if (ip) f.append("remoteip", ip);
    let v = {};
    try { const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: f }); v = r.ok ? await r.json() : {}; } catch (e) {}
    if (!v.success) return json({ error: MSG.robot }, 403);
  }

  const net = (await hmacHex(env.SUPABASE_SERVICE_ROLE_KEY, `community-net:${ip}:${new Date().toISOString().slice(0, 10)}`)).slice(0, 32);
  const r = await admin(env, "/rest/v1/rpc/community_join", { method: "POST", body: JSON.stringify({
    p_slug: slug, p_token: b.token, p_data: data, p_named: String(b.named || "").slice(0, 60), p_contact: String(b.contact || "").slice(0, 120), p_net: net }) });
  if (!r.ok) { console.error("community-join", r.status, await r.text()); return json({ error: MSG.bad }, 500); }
  const res = await r.json();
  if (res === "ok") return json({ ok: true });
  return json({ error: MSG[res] || MSG.bad }, res === "missing" ? 404 : 429);
}
