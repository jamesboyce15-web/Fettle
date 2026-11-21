// Admin: email an owner the link to their report. Respects dry run (see lib/mail.js).
import { json, isAdmin } from "../../lib/server.js";
import { rest, hasService, isUuid } from "../../lib/supa.js";
import { sendEmail, dryRun } from "../../lib/mail.js";
import "../../public/patch-emails.js";

export async function onRequestPost({ request, env }) {
  if (!hasService(env)) return json({ error: "Email isn't set up yet" }, 503);
  if (!(await isAdmin(env, request))) return json({ error: "Admins only" }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ error: "Bad request" }, 400); }
  if (!isUuid(b.id)) return json({ error: "Bad request" }, 400);
  const [r] = await rest(env, `requests?id=eq.${b.id}&select=id,name,email,token,report,venue_id,venue_text,status`);
  if (!r) return json({ error: "No such request" }, 404);
  if (!r.report) return json({ error: "Save their report first" }, 409);
  const [v] = r.venue_id ? await rest(env, `venues?id=eq.${r.venue_id}&select=name`) : [];
  const base = new URL(request.url).origin, m = globalThis.PatchEmails.reportReady({ name: r.name, cafe: (v && v.name) || r.venue_text || "your café", reportUrl: `${base}/report?t=${r.token}`, brand: env.BRAND || "Patch", from: env.EMAIL_SIGNOFF || "James", foundingPrice: +env.FOUNDING_PRICE || 59 });
  const sent = await sendEmail(env, Object.assign({ to: r.email, kind: "report", requestId: r.id, key: "report-" + r.id + "-" + (b.again ? Date.now() : "1") }, m));
  if (sent.status === "sent" && r.status === "new") await rest(env, `requests?id=eq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "report_sent" }) });
  return json({ status: sent.status, error: sent.error, dryRun: dryRun(env), subject: m.subject, text: m.text });
}
