// POST /api/geo-check {prompts:[{q, theme}], venues:[names]} (admins only): asks AI assistants the questions people ask,
// and records which of the area's cafés each one recommends. Claude always (ANTHROPIC_API_KEY); ChatGPT if OPENAI_API_KEY is set.
// With GEO_WEB_SEARCH=1, Claude searches the web first (as ChatGPT, Perplexity and Google's AI answers do), and we keep the
// sites it read: those are the sites a business needs to be on. Without it, answers come from what the model already knows.
import { json, isAdmin, namesIn } from "../../lib/server.js";

const ASK = q => `${q}\n\nRecommend up to 5 specific places by name. Reply with just the names, one per line.`;
async function claude(env, q, search) {
  const body = { model: env.GEO_CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: search ? 1200 : 300, messages: [{ role: "user", content: ASK(q) }] };
  if (search) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "GB" } }];
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("Claude " + r.status); const j = await r.json(), blocks = j.content || [], cited = new Set(), seen = new Set();
  // The pages it cited are what it relied on; if it cited none, the pages it read.
  blocks.forEach(c => { if (c.type === "web_search_tool_result" && Array.isArray(c.content)) c.content.forEach(x => x && x.url && seen.add(x.url));
    (c.citations || []).forEach(x => x && x.url && cited.add(x.url)); });
  return { text: blocks.filter(c => c.type === "text").map(c => c.text || "").join("\n"), urls: [...(cited.size ? cited : seen)].slice(0, 20) };
}
async function chatgpt(env, q) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.GEO_OPENAI_MODEL || "gpt-4o-mini", max_tokens: 300, messages: [{ role: "user", content: ASK(q) }] }) });
  if (!r.ok) throw new Error("ChatGPT " + r.status); const j = await r.json(); return { text: ((j.choices || [])[0] || {}).message?.content || "", urls: [] };
}

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
