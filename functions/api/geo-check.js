// POST /api/geo-check {prompts:[{q, theme}], venues:[names]} (admins only): asks AI assistants the questions people ask,
// and records which of the area's cafés each one recommends. Claude always (ANTHROPIC_API_KEY); ChatGPT if OPENAI_API_KEY is set.
// These answers come from each model's own knowledge, without live web search, so they show what the models already "know".
import { json, isAdmin, namesIn } from "../../lib/server.js";

const ASK = q => `${q}\n\nRecommend up to 5 specific places by name. Reply with just the names, one per line.`;
async function claude(env, q) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.GEO_CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: 300, messages: [{ role: "user", content: ASK(q) }] }) });
  if (!r.ok) throw new Error("Claude " + r.status); const j = await r.json(); return (j.content || []).map(c => c.text || "").join("\n");
}
async function chatgpt(env, q) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.GEO_OPENAI_MODEL || "gpt-4o-mini", max_tokens: 300, messages: [{ role: "user", content: ASK(q) }] }) });
  if (!r.ok) throw new Error("ChatGPT " + r.status); const j = await r.json(); return ((j.choices || [])[0] || {}).message?.content || "";
}

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(env, request))) return json({ error: "Only Patch admins can run checks." }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "Add ANTHROPIC_API_KEY to the site's settings first." }, 400);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const prompts = (Array.isArray(b.prompts) ? b.prompts : []).slice(0, 12).filter(p => p && typeof p.q === "string" && p.q.length <= 200);
  const venues = (Array.isArray(b.venues) ? b.venues : []).slice(0, 600).map(String);
  if (!prompts.length) return json({ error: "Add at least one question." }, 400);
  const engines = [["Claude", claude]].concat(env.OPENAI_API_KEY ? [["ChatGPT", chatgpt]] : []), answers = {}, errors = [];
  for (const p of prompts) for (const [name, fn] of engines) {
    try { answers[p.q + "|" + name] = namesIn(await fn(env, p.q), venues); } catch (e) { errors.push(`${name}: ${e.message}`); }
  }
  return json({ ok: true, geo: { at: new Date().toISOString().slice(0, 10), engines: engines.map(e => e[0]), prompts, answers }, errors });
}
