// POST /api/free-check: the free check. Asks AI assistants three questions a business's customers would ask, with live web
// search where it's switched on, and says whether the business was named, who was, and which sites the answers came from.
//
//   {business, trade, town, district}          runs the check, before any sign-up. Returns the answers and a signature.
//   {whatsapp, save:{…the check…}, sig}         after sign-up: keeps those answers on the sign-up as its "before" record.
//   {whatsapp, district}                        after sign-up, with no check yet: runs it for the sign-up and keeps it.
//
// The business's name is never put in the question (it's only used to see whether the answer names it). Limits: 5 checks a
// day per visitor and FREE_CHECKS_PER_DAY across the site (default 100), so it can't run up a bill.
import { json } from "../../lib/server.js";
import { rest, hasService, allow } from "../../lib/supa.js";
import { claude, chatgpt, namesFrom, isNamed, hostOf } from "../../lib/ai.js";
import "../../public/patch-desk.js";

const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
async function sign(env, obj) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("free-check:" + (env.SUPABASE_SERVICE_ROLE_KEY || env.ANTHROPIC_API_KEY)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(JSON.stringify(obj))));
}
const TOWN = /^[A-Za-z][A-Za-z .'&-]{1,39}$/, AREA = /^[A-Z]{1,2}\d[A-Z\d]?$/;

async function ask(env, request, business, trade, town, district) {
  const K = globalThis.PatchDesk, today = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("CF-Connecting-IP") || "", h = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`fc:${today}:${ip}`))).slice(0, 16);
  if (!(await allow(env, "fc:" + h, 5)) || !(await allow(env, "fc:all", +(env.FREE_CHECKS_PER_DAY || 100)))) return null;
  const qs = K.searches({ trade, town: town || district, districts: district ? [district] : [] }).slice(0, 3); if (!qs.length) return null;
  let web = env.GEO_WEB_SEARCH !== "0";
  const askClaude = async q => { try { return await within(claude(env, q, web), 28000); } catch (e) { if (web && e.status === 400) { web = false; return within(claude(env, q, false), 15000); } throw e; } };
  const jobs = qs.flatMap(q => [["Claude", askClaude]].concat(env.OPENAI_API_KEY ? [["ChatGPT", x => within(chatgpt(env, x), 15000)]] : []).map(([engine, fn]) => fn(q).then(a => ({ q, engine, a }), () => null)));
  const got = (await Promise.all(jobs)).filter(Boolean);
  if (!got.length) return null;
  return got.map(({ q, engine, a }) => ({ at: today, free: true, engine: engine === "Claude" && web ? "Claude (web)" : engine, q, named: isNamed(a.text, business), names: namesFrom(a.text),
    sources: [...new Set(a.urls.map(hostOf).filter(Boolean))].slice(0, 5), prices: false, contact: false, notes: "Free check" }));
}
async function signup(env, num) {
  const rows = await rest(env, `members?whatsapp=eq.${num}&created_at=gte.${new Date(Date.now() - 864e5).toISOString()}&order=created_at.desc&limit=1&select=id,name,trade,town,districts,checks,listings`);
  return Array.isArray(rows) && rows[0] || null;
}
async function keep(env, m, results, district) {
  const listings = Object.assign({}, m.listings || {}); if (!listings.before) listings.before = results[0].at;
  await rest(env, `members?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify(Object.assign({ checks: (m.checks || []).concat(results), listings }, district && !(m.districts || []).length ? { districts: [district] } : {})) });
}

export async function onRequestPost({ request, env }) {
  const K = globalThis.PatchDesk; let b = {}; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  if (!hasService(env) || !env.ANTHROPIC_API_KEY) return json({ status: "later" });
  const area = v => AREA.test(String(v || "").trim().toUpperCase()) ? String(v).trim().toUpperCase() : null;

  // Before sign-up: run the check.
  if (!b.whatsapp) {
    const business = String(b.business || "").trim().slice(0, 120), trade = String(b.trade || ""), town = String(b.town || "").trim(), district = area(b.district);
    if (!business || !K.TRADES[trade] || trade === "other" || (town && !TOWN.test(town)) || (!town && !district)) return json({ error: "Bad request" }, 400);
    const results = await ask(env, request, business, trade, town, district);
    if (!results) return json({ status: "later" });
    return json({ status: "ok", results, sig: await sign(env, { business, trade, town, district, results }) });
  }

  const num = K.waNumber(b.whatsapp); if (!num) return json({ error: "Bad request" }, 400);
  const m = await signup(env, num); if (!m) return json({ error: "Sign up first" }, 404);
  const today = new Date().toISOString().slice(0, 10), done = (m.checks || []).filter(c => c.at === today && c.free);
  if (done.length) return json({ status: "ok", results: done, cached: true });

  // After sign-up, with a check already run: keep it, if it's genuinely the one we ran.
  if (b.save) {
    const s = b.save, body = { business: String(s.business || ""), trade: String(s.trade || ""), town: String(s.town || ""), district: s.district || null, results: s.results };
    if (!Array.isArray(s.results) || !s.results.length || typeof b.sig !== "string" || b.sig !== await sign(env, body)) return json({ error: "Not a check we ran" }, 400);
    try { await keep(env, m, s.results, body.district); } catch (e) { return json({ status: "later" }); }
    return json({ status: "ok", saved: true });
  }

  // After sign-up, no check yet: run it for the sign-up.
  if (!m.town || m.trade === "other") return json({ status: "later" });
  const district = area(b.district), results = await ask(env, request, m.name, m.trade, m.town, district || (m.districts || [])[0]);
  if (!results) return json({ status: "later" });
  try { await keep(env, m, results, district); } catch (e) {}
  return json({ status: "ok", results });
}
