// Admin: read a menu photo already uploaded to the visit-photos bucket (from the Record page), and return the prices.
import { json, isAdmin } from "../../lib/server.js";
import { hasService } from "../../lib/supa.js";
import { readStored } from "../../lib/reader.js";

export async function onRequestPost({ request, env }) {
  if (!hasService(env) || !env.ANTHROPIC_API_KEY) return json({ error: "Reading photos isn't switched on yet" }, 503);
  if (!(await isAdmin(env, request))) return json({ error: "Admins only" }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  const bucket = b.bucket === "sweep-photos" ? "sweep-photos" : "visit-photos";
  if (!/^[0-9a-zA-Z/_.-]{10,200}$/.test(String(b.path || "")) || b.path.includes("..")) return json({ error: "Bad path" }, 400);
  return json(await readStored(env, bucket, b.path, "menu"));
}
