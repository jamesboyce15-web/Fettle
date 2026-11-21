// Admin: what's switched on for email and photo reading, without revealing any key.
import { json, isAdmin } from "../../lib/server.js";
import { dryRun, fromAddr } from "../../lib/mail.js";

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(env, request))) return json({ error: "Admins only" }, 403);
  return json({ dryRun: dryRun(env), resend: !!env.RESEND_API_KEY, from: fromAddr(env), admin: !!env.ADMIN_EMAIL, cron: !!env.CRON_SECRET, storage: !!env.SUPABASE_SERVICE_ROLE_KEY, reading: !!env.ANTHROPIC_API_KEY });
}
