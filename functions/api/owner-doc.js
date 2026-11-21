// Owners' renewals, certificates and invoice photos. The owner's secret link is the key: we check it with owner_get, then
// store the file in the private owner-docs bucket under a folder named from a hash of the link, so one owner can't reach
// another's. Needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (James adds the last one in Cloudflare).
import { json } from "../../lib/server.js";
import { svcHeaders, hasService, folderFor, pathPattern } from "../../lib/supa.js";

export const TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const MAX = 8 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  if (!hasService(env)) return json({ error: "Document storage isn't switched on yet" }, 503);
  let form; try { form = await request.formData(); } catch (e) { return json({ error: "Send the file as a form" }, 400); }
  const token = String(form.get("t") || ""), file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "No file" }, 400);
  const ext = TYPES[file.type]; if (!ext) return json({ error: "PDFs and photos only" }, 415);
  if (file.size > MAX) return json({ error: "That's over 8MB" }, 413);
  const folder = await folderFor(env, token); if (!folder) return json({ error: "That link isn't valid" }, 403);
  const path = `${folder}/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${ext}`;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/owner-docs/${path}`, { method: "POST", headers: Object.assign({ "Content-Type": file.type, "x-upsert": "false" }, svcHeaders(env)), body: file.stream(), duplex: "half" });
  if (!r.ok) return json({ error: "Couldn't store it. Try again." }, 502);
  return json({ path });
}

export async function onRequestGet({ request, env }) {
  if (!hasService(env)) return json({ error: "Document storage isn't switched on yet" }, 503);
  const u = new URL(request.url), token = u.searchParams.get("t") || "", path = u.searchParams.get("path") || "";
  const folder = await folderFor(env, token); if (!folder) return json({ error: "That link isn't valid" }, 403);
  if (!pathPattern(folder).test(path)) return json({ error: "Not yours" }, 403);
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sign/owner-docs/${path}`, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, svcHeaders(env)), body: JSON.stringify({ expiresIn: 300 }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.signedURL) return json({ error: "Couldn't open it" }, 502);
  return json({ url: `${env.SUPABASE_URL}/storage/v1${j.signedURL}` });
}
