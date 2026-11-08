// POST /api/join-org  {code, jobTitle?}  -> adds the signed-in user to an organisation using an invite code.
// Codes are single use, expire after 14 days, and can be locked to one email address.
import { json, getUser, admin } from "../../lib/server.js";

const clean = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^(.{4})(.{4})$/, "$1-$2");

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Please sign in again." }, 401);
  let body = {}; try { body = await request.json(); } catch (e) {}
  const code = clean(body.code), jobTitle = String(body.jobTitle || "").slice(0, 80);
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json({ error: "That code doesn't look right. It's 8 letters and numbers, like ABCD-2345." }, 400);

  // Already in an organisation?
  const mine = await admin(env, `/rest/v1/org_members?user_id=eq.${user.id}&select=org_id`);
  if (mine.ok && (await mine.json()).length) return json({ error: "Your account is already part of an organisation. Use a different email for another one." }, 409);

  const r = await admin(env, `/rest/v1/org_invites?code=eq.${encodeURIComponent(code)}&select=code,org_id,role,email,expires_at,used_at`);
  const inv = r.ok ? (await r.json())[0] : null;
  if (!inv || inv.used_at || new Date(inv.expires_at) < new Date()) return json({ error: "That code isn't valid. It may have been used already or expired. Ask for a new one." }, 400);
  if (inv.email && inv.email.toLowerCase() !== String(user.email || "").toLowerCase()) return json({ error: "That code was made for a different email address." }, 403);

  // Claim the code first, so it can only be used once even if two people try at the same moment.
  const claim = await admin(env, `/rest/v1/org_invites?code=eq.${encodeURIComponent(code)}&used_at=is.null`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ used_at: new Date().toISOString(), used_by: user.id }) });
  if (!claim.ok || !(await claim.json()).length) return json({ error: "That code has just been used. Ask for a new one." }, 409);

  const add = await admin(env, "/rest/v1/org_members", { method: "POST", body: JSON.stringify({ org_id: inv.org_id, user_id: user.id, role: inv.role, job_title: jobTitle || null }) });
  if (!add.ok) {
    await admin(env, `/rest/v1/org_invites?code=eq.${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify({ used_at: null, used_by: null }) });
    console.error("join-org", await add.text()); return json({ error: "Something went wrong. Please try again." }, 500);
  }
  const o = await admin(env, `/rest/v1/organisations?id=eq.${inv.org_id}&select=name`);
  const org = o.ok ? (await o.json())[0] : null;
  return json({ orgId: inv.org_id, name: org ? org.name : "", role: inv.role });
}
