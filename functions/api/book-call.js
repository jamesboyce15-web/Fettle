// POST /api/book-call  {booker_name, booker_email, booker_phone?, relation?, for_name?, for_age?, for_district?, lives_alone?,
//                       carers?, joining?, times?, notes?, source?, turnstile?}
// A family asks for a call. A robot check first (Cloudflare Turnstile, when TURNSTILE_SECRET is set), then the database
// allows up to 5 requests per internet connection a day. The connection is passed as a scrambled code that changes daily
// and can't be turned back into an address; it's cleared after 2 days. Nothing is charged and no email is sent from here:
// the request appears on the coordinator dashboard.
import { json, admin, hmacHex } from "../../lib/server.js";

const MSG = {
  bad: "Please check your name and email address, then try again.",
  robot: "We couldn't check this was a person. Please try again.",
  net: "We've had a few requests from this internet connection today. Please try again tomorrow, or email hello@getfettle.co.uk.",
  busy: "Lots of people are booking right now. Please try again in an hour.",
  fail: "That didn't send. Please try again, or email hello@getfettle.co.uk.",
};
const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const bool = v => (v === true || v === false ? v : null);

export async function onRequestPost({ request, env }) {
  let b = {}; try { b = await request.json(); } catch (e) {}
  const p = {
    booker_name: str(b.booker_name, 80), booker_email: str(b.booker_email, 120).toLowerCase(), booker_phone: str(b.booker_phone, 30),
    relation: str(b.relation, 40), for_name: str(b.for_name, 60), for_age: str(b.for_age, 20), for_district: str(b.for_district, 8),
    lives_alone: bool(b.lives_alone), carers: bool(b.carers), joining: str(b.joining, 300),
    times: Array.isArray(b.times) ? b.times.filter(t => typeof t === "string").slice(0, 6).map(t => t.slice(0, 30)) : [],
    notes: str(b.notes, 1000), source: str(b.source, 60),
  };
  if (!p.booker_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.booker_email)) return json({ error: MSG.bad }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "";

  if (env.TURNSTILE_SECRET) {
    const f = new FormData(); f.append("secret", env.TURNSTILE_SECRET); f.append("response", String(b.turnstile || "").slice(0, 2048)); if (ip) f.append("remoteip", ip);
    let v = {};
    try { const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: f }); v = r.ok ? await r.json() : {}; } catch (e) {}
    if (!v.success) return json({ error: MSG.robot }, 403);
  }

  const net = (await hmacHex(env.SUPABASE_SERVICE_ROLE_KEY, `call-net:${ip}:${new Date().toISOString().slice(0, 10)}`)).slice(0, 32);
  const r = await admin(env, "/rest/v1/rpc/book_call", { method: "POST", body: JSON.stringify({ p, p_net: net }) });
  if (!r.ok) { console.error("book-call", r.status, await r.text()); return json({ error: MSG.fail }, 500); }
  const res = await r.json();
  if (res === "ok") return json({ ok: true });
  return json({ error: MSG[res] || MSG.fail }, res === "bad" ? 400 : 429);
}
