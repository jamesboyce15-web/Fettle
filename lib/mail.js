// Sending email through Resend. Dry run is the default: unless EMAIL_DRY_RUN is set to exactly "false" (James does this in
// Cloudflare once he's approved the wording), nothing is sent: the email is written to the log for him to read instead.
import { rest } from "./supa.js";

// EMAIL_FROM, or FROM_EMAIL (the name the Fettle site used, so an existing setting carries over).
export const fromAddr = env => env.EMAIL_FROM || env.FROM_EMAIL || null;
export const dryRun = env => env.EMAIL_DRY_RUN !== "false" || !env.RESEND_API_KEY || !fromAddr(env);

export async function sendEmail(env, m) {
  const dry = dryRun(env); let status = dry ? "dry-run" : "sent", providerId = null, error = null;
  if (!dry) {
    try {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": m.key || crypto.randomUUID() },
        body: JSON.stringify({ from: fromAddr(env), to: [m.to], reply_to: env.EMAIL_REPLY_TO || undefined, subject: m.subject, html: m.html, text: m.text, headers: m.headers || undefined }) });
      const j = await r.json().catch(() => ({})); if (r.ok) providerId = j.id || null; else { status = "failed"; error = (j.message || `Resend ${r.status}`).slice(0, 300); }
    } catch (e) { status = "failed"; error = String(e.message || e).slice(0, 300); }
  }
  try { await rest(env, "email_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ to_email: m.to, kind: m.kind, subject: m.subject, status, request_id: m.requestId || null, provider_id: providerId, error, body_text: String(m.text || "").slice(0, 20000) }) }); } catch (e) { /* logging must never stop a send */ }
  return { status, error };
}
