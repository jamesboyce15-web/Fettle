// Claude reads a photographed (or scanned) invoice, renewal, certificate or menu board that an owner has already stored,
// and returns the lines, dates or prices as data. The owner checks what comes back before anything is saved.
// Needs ANTHROPIC_API_KEY (James adds it). READ_CLAUDE_MODEL is optional. Each owner can have 40 reads a day.
import { json } from "../../lib/server.js";
import { hasService, folderFor, pathPattern, allow } from "../../lib/supa.js";
import { readStored } from "../../lib/reader.js";
export { clean, firstJson, PROMPTS } from "../../lib/reader.js";

export async function onRequestPost({ request, env }) {
  if (!hasService(env) || !env.ANTHROPIC_API_KEY) return json({ error: "Reading photos isn't switched on yet" }, 503);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const kind = ["doc", "menu"].includes(b.kind) ? b.kind : "invoice", folder = await folderFor(env, b.t);
  if (!folder) return json({ error: "That link isn't valid" }, 403);
  if (!pathPattern(folder).test(String(b.path || ""))) return json({ error: "Not yours" }, 403);
  if (!(await allow(env, "read:" + folder, 40))) return json({ error: "That's a lot of photos for one day: we'll read the rest tomorrow" }, 429);
  return json(await readStored(env, "owner-docs", b.path, kind, b.title));
}
