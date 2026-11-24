// POST /api/free-check {whatsapp, district}: the free check, run the moment someone signs up. Asks AI assistants three questions
// their customers would ask, with live web search where it's switched on, and says whether the business was named, who was,
// and which sites the answers came from. The results are saved on the sign-up as the "before" record.
// Only for a sign-up made in the last day; once per number per day (repeat visits get the saved answers); 5 a day per visitor,
// and a daily cap across the site (FREE_CHECKS_PER_DAY, default 100) so it can't run up a bill.
import { json } from "../../lib/server.js";
import { rest, hasService, allow } from "../../lib/supa.js";
import { claude, chatgpt, namesFrom, isNamed, hostOf } from "../../lib/ai.js";
import "../../public/patch-desk.js";

const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);

export async function onRequestPost({ request, env }) {
  const K = globalThis.PatchDesk; let b = {}; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const num = K.waNumber(b.whatsapp), district = /^[A-Z]{1,2}\d[A-Z\d]?$/i.test(String(b.district || "").trim()) ? String(b.district).trim().toUpperCase() : null;
  if (!num) return json({ error: "Bad request" }, 400);
  if (!hasService(env) || !env.ANTHROPIC_API_KEY) return json({ status: "later" });
  const rows = await rest(env, `members?whatsapp=eq.${num}&created_at=gte.${new Date(Date.now() - 864e5).toISOString()}&order=created_at.desc&limit=1&select=id,name,trade,town,districts,checks,listings`);
  const m = Array.isArray(rows) && rows[0]; if (!m) return json({ error: "Sign up first" }, 404);
  if (!m.town || m.trade === "other") return json({ status: "later" });
  const today = new Date().toISOString().slice(0, 10), done = (m.checks || []).filter(c => c.at === today && c.free);
  if (done.length) return json({ status: "ok", results: done, cached: true });
  const ip = request.headers.get("CF-Connecting-IP") || "", h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`fc:${today}:${ip}`)))].slice(0, 8).map(x => x.toString(16).padStart(2, "0")).join("");
  if (!(await allow(env, "fc:" + h, 5)) || !(await allow(env, "fc:all", +(env.FREE_CHECKS_PER_DAY || 100)))) return json({ status: "later" });

  const districts = district ? [district] : (m.districts || []), qs = K.searches({ trade: m.trade, town: m.town, districts }).slice(0, 3);
  let web = env.GEO_WEB_SEARCH !== "0";
  const askClaude = async q => { try { return await within(claude(env, q, web), 28000); } catch (e) { if (web && e.status === 400) { web = false; return within(claude(env, q, false), 15000); } throw e; } };
  const jobs = qs.flatMap(q => [["Claude", askClaude]].concat(env.OPENAI_API_KEY ? [["ChatGPT", (x) => within(chatgpt(env, x), 15000)]] : []).map(([engine, fn]) => fn(q).then(a => ({ q, engine, a }), () => null)));
  const got = (await Promise.all(jobs)).filter(Boolean);
  if (!got.length) return json({ status: "later" });
  const results = got.map(({ q, engine, a }) => ({ at: today, free: true, engine: engine === "Claude" && web ? "Claude (web)" : engine, q, named: isNamed(a.text, m.name), names: namesFrom(a.text),
    sources: [...new Set(a.urls.map(hostOf).filter(Boolean))].slice(0, 5), prices: false, contact: false, notes: "Free check" }));
  // Save as the "before" record (and the postcode area, if they gave one).
  const listings = Object.assign({}, m.listings || {}); if (!listings.before) listings.before = today;
  try { await rest(env, `members?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify(Object.assign({ checks: (m.checks || []).concat(results), listings }, district && !(m.districts || []).length ? { districts: [district] } : {})) }); } catch (e) {}
  return json({ status: "ok", results, web });
}
