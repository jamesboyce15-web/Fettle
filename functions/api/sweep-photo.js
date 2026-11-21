// A sweeper sends the photo of one café's menu board, from their private sweep link. We store it, have Claude read the
// prices straight away, and tell them how it went so they can retake a blurry one while they're still outside.
import { json } from "../../lib/server.js";
import { rest, svcHeaders, hasService, isUuid, allow } from "../../lib/supa.js";
import { readStored } from "../../lib/reader.js";

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export async function onRequestPost({ request, env }) {
  if (!hasService(env)) return json({ error: "Sweeps aren't switched on yet" }, 503);
  let form; try { form = await request.formData(); } catch (e) { return json({ error: "Send the photo as a form" }, 400); }
  const token = String(form.get("s") || ""), item = String(form.get("item") || ""), file = form.get("file");
  if (!isUuid(token) || !isUuid(item)) return json({ error: "That link isn't valid" }, 403);
  if (!file || typeof file === "string") return json({ error: "No photo" }, 400);
  const ext = TYPES[file.type]; if (!ext) return json({ error: "Photos only (JPEG, PNG or WebP)" }, 415);
  if (file.size > 8 * 1024 * 1024) return json({ error: "That photo is over 8MB" }, 413);
  const [sw] = await rest(env, `sweeps?token=eq.${token}&status=eq.open&select=id`); if (!sw) return json({ error: "This sweep is closed" }, 403);
  const [it] = await rest(env, `sweep_items?id=eq.${item}&sweep_id=eq.${sw.id}&select=id,status`); if (!it) return json({ error: "That café isn't on this sweep" }, 404);
  if (it.status === "approved") return json({ error: "That one's already done" }, 409);
  const path = `${sw.id}/${item}-${crypto.randomUUID()}.${ext}`;
  const up = await fetch(`${env.SUPABASE_URL}/storage/v1/object/sweep-photos/${path}`, { method: "POST", headers: Object.assign({ "Content-Type": file.type, "x-upsert": "false" }, svcHeaders(env)), body: file.stream(), duplex: "half" });
  if (!up.ok) return json({ error: "Couldn't store it. Try again." }, 502);
  let read = null;
  if (env.ANTHROPIC_API_KEY && (await allow(env, "sweep:" + sw.id, 400))) { try { read = await readStored(env, "sweep-photos", path, "menu"); } catch (e) { read = { error: "Couldn't read it" }; } }
  await rest(env, `sweep_items?id=eq.${item}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "sent", photo_path: path, taken_at: new Date().toISOString(), read, note: null }) });
  const n = read && read.prices ? Object.keys(read.prices).length : 0;
  return json({ found: n, legible: read && read.legible, error: read && read.error, read: !!read });
}
