// "Time to refresh" emails: water, food, batteries and the rest, when the dates the plan set come round.
// The plan works out each date (h.refresh, from when the thing was ticked off) so the email never disagrees with it.
// Starts as a DRY RUN (REFRESH_DRY_RUN not "false"): logs who would get one, sends nothing, records nothing.
// With ALERT_TEST_TO set, every refresh email goes only to that address, marked [TEST], and nothing is recorded.
import { unsubToken, plusMembers } from "../../../lib/server.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Same advice as the plan (REFRESH in src/fettle.html).
export const REFRESH_ACTION = {
  water: "Check the dates on the bottles. Use the oldest and replace them.",
  food: "Eat the oldest food in normal meals and replace it.",
  torch: "Test the torch. Replace the batteries if they're weak or have leaked.",
  radio: "Test the radio, and the batteries if it uses them.",
  power: "Recharge the power bank.",
  firstaid: "Replace anything used or out of date.",
  rtf: "Check the dates on the formula and replace it before it goes out of date.",
  babykit: "Check the nappies are still the right size.",
  pets: "Check the dates on the pet food.",
  hygiene: "Check the wipes haven't dried out.",
  grabbag: "Check the grab bag: medicines in date, clothes still fit, phone numbers right.",
  co: "Press the test button on the alarm.",
};

export function buildRefreshEmail(row, env, unsubUrl, test = false) {
  const items = (row.items || []).filter(x => x && x.t);
  const home = row.household_name && row.household_name !== "My household" ? row.household_name : "your home";
  const name = row.first_name ? `Hi ${row.first_name},` : "Hi,";
  const subject = `${test ? "[TEST] " : ""}${items.length === 1 ? `Time to refresh: ${items[0].t}` : `Time to refresh ${items.length} things`}`;
  const lead = `Some of the supplies for ${home} are due a check. It takes about 10 minutes.`;
  const link = `${env.SITE_URL}/?src=refresh`;
  const lines = items.map(x => ({ t: x.t, a: REFRESH_ACTION[x.id] || "" }));
  const text = `${name}

${lead}

${lines.map(x => `- ${x.t}: ${x.a}`).join("\n")}

When you've done it, tick it off on your plan and we'll remind you next time: ${link}

Fettle

You're getting this because you asked for reminders. Turn them off: ${unsubUrl}`;
  const html = `<div style="font:16px/1.6 system-ui,sans-serif;color:#1c2522;max-width:520px">
<p>${esc(name)}</p><p>${esc(lead)}</p>
<ul style="padding-left:20px">${lines.map(x => `<li style="margin:6px 0"><b>${esc(x.t)}</b><br>${esc(x.a)}</li>`).join("")}</ul>
<p>When you've done it, tick it off on your plan and we'll remind you next time.</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#f2a900;color:#1c2522;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px">Open my plan</a></p>
<p>Fettle</p>
<p style="font-size:13px;color:#5a6670">You're getting this because you asked for reminders. <a href="${esc(unsubUrl)}" style="color:#5a6670">Turn them off</a>.</p></div>`;
  return { subject, text, html };
}

async function sb(env, path, init = {}, f = fetch) {
  return f(`${env.SUPABASE_URL}${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) } });
}

export async function runRefresh(env, fetchImpl = fetch) {
  const dry = env.REFRESH_DRY_RUN !== "false", test = !!env.ALERT_TEST_TO;
  const r = await sb(env, "/rest/v1/rpc/fettle_refresh_due", { method: "POST", body: "{}" }, fetchImpl);
  if (!r.ok) { console.error("refresh query failed", await r.text()); return { due: 0, sent: 0, dry }; }
  let rows = await r.json(); let sent = 0;
  const members = await plusMembers(env, fetchImpl); if (members) rows = rows.filter(x => members.has(x.user_id));
  for (const row of rows) {
    if (dry && !test) { console.log("DRY RUN, would send a refresh email to household", row.household_id, (row.items || []).map(x => x.id).join(",")); continue; }
    const unsub = `${env.SITE_URL}/api/unsubscribe?u=${row.user_id}&t=${await unsubToken(env.UNSUBSCRIBE_SECRET, row.user_id)}`;
    const mail = buildRefreshEmail(row, env, unsub, test);
    const s = await fetchImpl("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: [test ? env.ALERT_TEST_TO : row.email], subject: mail.subject, text: mail.text, html: mail.html, headers: { "List-Unsubscribe": `<${unsub}>` } }) });
    if (!s.ok) { console.error("refresh send failed", row.household_id, await s.text()); continue; }
    sent++;
    if (!test) await sb(env, "/rest/v1/reminders_sent", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ household_id: row.household_id, kind: row.kind }) }, fetchImpl);
  }
  console.log(`refresh: ${rows.length} due, ${sent} sent, dry run ${dry}, test ${test}`);
  return { due: rows.length, sent, dry, test };
}
