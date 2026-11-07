// Sends check-in reminder emails to people who opted in ("Remind me by email when my checks are due").
// Who is due comes from the Supabase function fettle_recheck_due(). Each email is recorded in reminders_sent,
// so nobody gets the same reminder twice. With DRY_RUN="true" nothing is sent or recorded: it only logs.
import { unsubToken } from "../../../lib/server.js";

const TITLES = {
  day30: "Your 30-day Fettle check",
  day90: "Your 90-day Fettle check",
};
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buildEmail(row, env, unsubUrl) {
  const subject = TITLES[row.kind] || "Time for your seasonal Fettle check";
  const name = row.first_name ? `Hi ${row.first_name},` : "Hi,";
  const home = row.household_name && row.household_name !== "My household" ? row.household_name : "your home";
  const link = `${env.SITE_URL}/?recheck=1`;
  const text = `${name}

It's time for a quick check on ${home}. It takes about two minutes: tell us what you've got now, and see how far you've come since your first check (${row.first_score}%).

Start your check: ${link}

Fettle

You're getting this because you asked for check-in reminders. Turn them off: ${unsubUrl}`;
  const html = `<div style="font:16px/1.6 system-ui,sans-serif;color:#1c2522;max-width:520px">
<p>${esc(name)}</p>
<p>It's time for a quick check on ${esc(home)}. It takes about two minutes: tell us what you've got now, and see how far you've come since your first check (<b>${esc(row.first_score)}%</b>).</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#f2a900;color:#1c2522;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px">Start my check</a></p>
<p>Fettle</p>
<p style="font-size:13px;color:#5a6670">You're getting this because you asked for check-in reminders. <a href="${esc(unsubUrl)}" style="color:#5a6670">Turn them off</a>.</p></div>`;
  return { subject, text, html };
}

async function sb(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) } });
}

export async function run(env, fetchImpl = fetch) {
  const dry = env.DRY_RUN !== "false";
  const r = await sb(env, "/rest/v1/rpc/fettle_recheck_due", { method: "POST", body: "{}" });
  if (!r.ok) { console.error("due query failed", await r.text()); return { sent: 0, failed: 0, dry }; }
  const rows = await r.json();
  let sent = 0, failed = 0;
  for (const row of rows) {
    const unsub = `${env.SITE_URL}/api/unsubscribe?u=${row.user_id}&t=${await unsubToken(env.UNSUBSCRIBE_SECRET, row.user_id)}`;
    const mail = buildEmail(row, env, unsub);
    if (dry) { console.log("DRY RUN, would send", row.kind, "to household", row.household_id); continue; }
    const s = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: [row.email], subject: mail.subject, text: mail.text, html: mail.html,
        headers: { "List-Unsubscribe": `<${unsub}>` } }),
    });
    if (!s.ok) { failed++; console.error("send failed", row.household_id, await s.text()); continue; }
    await sb(env, "/rest/v1/reminders_sent", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ household_id: row.household_id, kind: row.kind }) });
    sent++;
  }
  console.log(`reminders: ${rows.length} due, ${sent} sent, ${failed} failed, dry run ${dry}`);
  return { due: rows.length, sent, failed, dry };
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
};
