// Claude reading a stored photo or scan: invoices, renewals and menu boards. Everything it returns is cleaned before use.
import "../public/patch-core.js";
import { svcHeaders } from "./supa.js";

const MEDIA = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function b64(buf) { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
export const firstJson = t => { const s = String(t || ""), a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; } };

// What we mean by each item, so a board's own names map onto ours.
const MEANS = { espresso: "a single espresso", americano: "a regular americano", flat_white: "a flat white", latte: "a regular latte", cappuccino: "a regular cappuccino",
  tea: "a pot or cup of standard breakfast tea", hot_choc: "a regular hot chocolate", oat_extra: "the extra charge for oat or other plant milk (just the extra, not the drink)",
  croissant: "a plain butter croissant", cake: "a typical slice of cake (if several, the most common price)", toastie: "the cheapest toastie, panini or grilled sandwich",
  brunch: "a full English breakfast, or the main brunch dish if there's no full English" };
export const PROMPTS = {
  invoice: () => `This is a supplier invoice for a café, as a photo or a scan. Read it and reply with JSON only, no other text:
{"supplier": string or null, "date": "YYYY-MM-DD" or null, "lines": [{"desc": string, "qty": number, "total": number}]}
- desc: the product exactly as printed, including the pack size (for example "Whole Milk 4pt" or "Oatly Barista 6 x 1L").
- qty: how many of that pack were bought. total: the line total in pounds, before VAT if the invoice shows it.
- Leave out delivery charges, deposits, credits, VAT lines and totals.
If it isn't an invoice or you can't read it, reply {"error": "a short reason"}.`,
  doc: title => `This is a café's "${String(title || "document").slice(0, 80)}" paperwork, as a photo or a scan. Read it and reply with JSON only, no other text:
{"due": "YYYY-MM-DD" or null, "done": "YYYY-MM-DD" or null, "premium": number or null, "insurer": string or null, "policy": string or null}
- due: when the next one is due: the renewal, expiry, end of the period of insurance, or next inspection date.
- done: when this one was carried out or started.
- premium, insurer, policy: for insurance only. premium is the total price for the year in pounds.
Dates on UK paperwork are day first. If you can't read it, reply {"error": "a short reason"}.`,
  menu: () => `This is a photo of a UK café's menu board or printed menu. Find the price of each of these, as charged (VAT included):
${Object.entries(MEANS).map(([k, t]) => `- ${k}: ${t}`).join("\n")}
Rules: if there are sizes, use the regular or smallest standard size. If eat-in and takeaway differ, use eat-in. Only give a price you can actually read on the board: never guess.
Reply with JSON only, no other text:
{"prices": {"flat_white": 3.4, ...}, "seen": {"flat_white": "Flat White £3.40", ...}, "legible": "good" or "partly" or "poor", "notes": string or null}
Leave out anything not on the board or not readable. If it isn't a menu, reply {"error": "a short reason"}.`,
};
export function clean(kind, o) {
  if (!o || typeof o !== "object") return { error: "We couldn't read it" };
  if (o.error) return { error: String(o.error).slice(0, 200) };
  if (kind === "invoice") {
    const lines = (Array.isArray(o.lines) ? o.lines : []).slice(0, 300).map(l => ({ desc: String(l.desc || "").trim().slice(0, 200), qty: +l.qty > 0 && +l.qty < 10000 ? +l.qty : 1, total: Math.round(+l.total * 100) / 100 }))
      .filter(l => l.desc && l.total > 0 && l.total < 100000);
    return { supplier: o.supplier ? String(o.supplier).slice(0, 120) : null, date: ISO.test(o.date) ? o.date : null, lines };
  }
  if (kind === "menu") {
    const ITEM = globalThis.PatchCore.ITEM, prices = {}, seen = {};
    Object.entries(o.prices || {}).forEach(([k, v]) => { const x = Math.round(+v * 100) / 100; if (ITEM[k] && x >= (k === "oat_extra" ? 0.05 : 0.5) && x <= 40) { prices[k] = x; if (o.seen && o.seen[k]) seen[k] = String(o.seen[k]).slice(0, 80); } });
    return { prices, seen, legible: ["good", "partly", "poor"].includes(o.legible) ? o.legible : null, notes: o.notes ? String(o.notes).slice(0, 300) : null };
  }
  return { due: ISO.test(o.due) ? o.due : null, done: ISO.test(o.done) ? o.done : null, premium: +o.premium > 0 && +o.premium < 1e6 ? Math.round(+o.premium * 100) / 100 : null,
    insurer: o.insurer ? String(o.insurer).slice(0, 80) : null, policy: o.policy ? String(o.policy).slice(0, 40) : null };
}
// Fetch a stored file and have Claude read it. Returns cleaned data, or {error}.
export async function readStored(env, bucket, path, kind, title) {
  const ext = String(path).split(".").pop(), media = MEDIA[ext]; if (!media) return { error: "We can read PDFs, JPEG, PNG and WebP photos" };
  const f = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, { headers: svcHeaders(env) });
  if (!f.ok) return { error: "Couldn't find the file" };
  const data = b64(await f.arrayBuffer());
  const part = media === "application/pdf" ? { type: "document", source: { type: "base64", media_type: media, data } } : { type: "image", source: { type: "base64", media_type: media, data } };
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.READ_CLAUDE_MODEL || "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content: [part, { type: "text", text: PROMPTS[kind](title) }] }] }) });
  if (!r.ok) return { error: "The reader is busy. Try again in a minute." };
  const j = await r.json(); return clean(kind, firstJson((j.content || []).filter(c => c.type === "text").map(c => c.text).join("")));
}
