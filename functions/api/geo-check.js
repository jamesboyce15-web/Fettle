// POST /api/geo-check {prompts:[{q, theme}], venues:[names]} (admins only): asks AI assistants the questions people ask,
// and records which of the area's cafés each one recommends. Claude always (ANTHROPIC_API_KEY); ChatGPT if OPENAI_API_KEY is set.
// With GEO_WEB_SEARCH=1, Claude searches the web first (as ChatGPT, Perplexity and Google's AI answers do), and we keep the
// sites it read: those are the sites a business needs to be on. Without it, answers come from what the model already knows.
import { json, isAdmin, namesIn } from "../../lib/server.js";
import { claude, chatgpt } from "../../lib/ai.js";

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(env, request))) return json({ error: "Only Patch admins can run checks." }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "Add ANTHROPIC_API_KEY to the site's settings first." }, 400);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const prompts = (Array.isArray(b.prompts) ? b.prompts : []).slice(0, 12).filter(p => p && typeof p.q === "string" && p.q.length <= 200);
  const venues = (Array.isArray(b.venues) ? b.venues : []).slice(0, 600).map(String);
  if (!prompts.length) return json({ error: "Add at least one question." }, 400);
  const search = env.GEO_WEB_SEARCH === "1";
  const engines = [[search ? "Claude (web)" : "Claude", claude]].concat(env.OPENAI_API_KEY ? [["ChatGPT", chatgpt]] : []), answers = {}, sources = {}, errors = [];
  for (const p of prompts) for (const [name, fn] of engines) {
    try { const a = await fn(env, p.q, search); answers[p.q + "|" + name] = namesIn(a.text, venues); if (a.urls.length) sources[p.q + "|" + name] = a.urls; } catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  return json({ ok: true, geo: { at: new Date().toISOString().slice(0, 10), engines: engines.map(e => e[0]), prompts, answers, sources, web: search }, errors });
}
