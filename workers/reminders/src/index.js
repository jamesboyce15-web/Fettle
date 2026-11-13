// Sends reminder emails to people who opted in: from their plan ("Remind me by email…") or at /remind, the workbook's QR code.
// Who is due comes from the Supabase function fettle_recheck_due(). Each email is recorded in reminders_sent,
// so nobody gets the same reminder twice. With DRY_RUN="true" nothing is sent or recorded: it only logs.
import { unsubToken } from "../../../lib/server.js";

const TITLES = {
  day30: "Your 30-day Fettle check",
  day90: "Your 90-day Fettle check",
};
// The workbook's seasonal check (book/content3.py, SEAS), so the email and the page match.
const SEASON_CHECKS = [
  "Check the dates on water and food. Eat and replace anything close to its date.",
  "Test the torch and radio. Check the batteries haven't leaked.",
  "Charge the power bank.",
  "Press the test button on the smoke and carbon monoxide alarms.",
  "Check medicines and the first aid kit.",
  "Check the grab bag. Do the clothes still fit the children?",
  "Check your important numbers are still right.",
  "Check the cash is still there.",
];
const SEASON_NAME = { "01": "New year", "03": "Spring", "07": "Summer", "10": "Autumn", "11": "Autumn" };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buildEmail(row, env, unsubUrl) {
  const season = String(row.kind || "").startsWith("season");
  const subject = TITLES[row.kind] || `${SEASON_NAME[String(row.kind).slice(-2)] || "Seasonal"} check: 10 minutes to keep your home ready`;
  const name = row.first_name ? `Hi ${row.first_name},` : "Hi,";
  const home = row.household_name && row.household_name !== "My household" ? row.household_name : "your home";
  const hasCheck = !!row.household_id;
  const link = hasCheck ? `${env.SITE_URL}/?recheck=1&src=reminder` : `${env.SITE_URL}/?src=reminder#check`;
  const lead = !season
    ? `It's time for a quick check on ${home}. It takes about two minutes: tell us what you've got now, and see how far you've come since your first check (${row.first_score}%).`
    : `It's a new season, so it's time for your 10-minute check. Tick these off, or use the seasonal check page in your workbook:`;
  const after = !season ? "" : hasCheck
    ? `Then see how far you've come since your first check (${row.first_score}%). It takes about two minutes.`
    : `Want to know how ready your home is? The free online check takes about 4 minutes and gives you a plan.`;
  const button = !season ? "Start my check" : hasCheck ? "Update my check" : "Do the free check";
  const list = season ? SEASON_CHECKS : [];
  const text = `${name}

${lead}
${list.map(x => `- ${x}`).join("\n")}${list.length ? "\n\n" : ""}${after ? after + "\n\n" : ""}${button}: ${link}

Fettle

You're getting this because you asked for reminders. Turn them off: ${unsubUrl}`;
  const html = `<div style="font:16px/1.6 system-ui,sans-serif;color:#1c2522;max-width:520px">
<p>${esc(name)}</p>
<p>${esc(lead)}</p>${list.length ? `<ul style="padding-left:20px">${list.map(x => `<li style="margin:4px 0">${esc(x)}</li>`).join("")}</ul>` : ""}${after ? `<p>${esc(after)}</p>` : ""}
<p><a href="${esc(link)}" style="display:inline-block;background:#f2a900;color:#1c2522;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px">${esc(button)}</a></p>
<p>Fettle</p>
<p style="font-size:13px;color:#5a6670">You're getting this because you asked for reminders. <a href="${esc(unsubUrl)}" style="color:#5a6670">Turn them off</a>.</p></div>`;
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
    if (dry) { console.log("DRY RUN, would send", row.kind, row.household_id ? "to household " + row.household_id : "to a reminder-only account"); continue; }
    const s = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: [row.email], subject: mail.subject, text: mail.text, html: mail.html,
        headers: { "List-Unsubscribe": `<${unsub}>` } }),
    });
    if (!s.ok) { failed++; console.error("send failed", row.household_id, await s.text()); continue; }
    if (row.household_id) await sb(env, "/rest/v1/reminders_sent", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ household_id: row.household_id, kind: row.kind }) });
    else await sb(env, "/rest/v1/reminders_sent_user", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ user_id: row.user_id, kind: row.kind }) });
    sent++;
  }
  console.log(`reminders: ${rows.length} due, ${sent} sent, ${failed} failed, dry run ${dry}`);
  return { due: rows.length, sent, failed, dry };
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
};
