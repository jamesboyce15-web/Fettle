// Asking AI assistants the questions customers ask. Used by admin's AI checks (/api/geo-check) and the free check (/api/free-check).
// Claude with live web search where it's switched on for the account (as ChatGPT, Perplexity and Google's AI answers search),
// falling back to what the model already knows; ChatGPT too if OPENAI_API_KEY is set.
export const ASK = q => `${q}\n\nRecommend up to 5 specific local businesses by name. Reply with just the names, one per line.`;

export async function claude(env, q, search) {
  const body = { model: env.GEO_CLAUDE_MODEL || "claude-haiku-5-5", max_tokens: search ? 1200 : 300, messages: [{ role: "user", content: ASK(q) }] };
  if (search) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "GB" } }];
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) { const e = new Error("Claude " + r.status); e.status = r.status; throw e; }
  const j = await r.json(), blocks = j.content || [], cited = new Set(), seen = new Set();
  // The pages it cited are what it relied on; if it cited none, the pages it read.
  blocks.forEach(c => { if (c.type === "web_search_tool_result" && Array.isArray(c.content)) c.content.forEach(x => x && x.url && seen.add(x.url));
    (c.citations || []).forEach(x => x && x.url && cited.add(x.url)); });
  return { text: blocks.filter(c => c.type === "text").map(c => c.text || "").join("\n"), urls: [...(cited.size ? cited : seen)].slice(0, 20) };
}
export async function chatgpt(env, q) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.GEO_OPENAI_MODEL || "gpt-4o-mini", max_tokens: 300, messages: [{ role: "user", content: ASK(q) }] }) });
  if (!r.ok) throw new Error("ChatGPT " + r.status); const j = await r.json(); return { text: ((j.choices || [])[0] || {}).message?.content || "", urls: [] };
}
// The business names in an answer: one per line, without numbering, bullets, bold or trailing notes.
export function namesFrom(text) {
  return String(text || "").split(/\n+/).map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "").replace(/\s+[–—-]\s+.*$/, "").replace(/\s*\(.*?\)\s*$/, "").replace(/[.:]$/, "").trim())
    .filter(l => l && l.length <= 80 && !/^(here|sure|i |i'm|based on|these|note|unfortunately|sorry|recommend)/i.test(l) && l.split(/\s+/).length <= 9).slice(0, 5);
}
// Is this business one of them? Compared without punctuation, "the", "ltd" and similar.
export function isNamed(text, business) {
  const n = x => String(x).toLowerCase().replace(/&/g, "and").replace(/\b(the|ltd|limited|co)\b/g, "").replace(/[^a-z0-9]/g, "");
  const k = n(business); return k.length >= 4 && n(text).includes(k);
}
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
