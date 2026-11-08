// POST /api/org-invite  {role?, email?}  -> an organisation admin makes an invite code for a colleague.
import { json, getUser, admin } from "../../lib/server.js";

function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = crypto.getRandomValues(new Uint8Array(8));
  const s = [...b].map(x => A[x % A.length]).join("");
  return s.slice(0, 4) + "-" + s.slice(4);
}

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Please sign in again." }, 401);
  let body = {}; try { body = await request.json(); } catch (e) {}
  const role = body.role === "admin" ? "admin" : "worker";
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter an email address like name@example.org, or leave it blank." }, 400);

  const m = await admin(env, `/rest/v1/org_members?user_id=eq.${user.id}&role=eq.admin&select=org_id`);
  const mem = m.ok ? (await m.json())[0] : null;
  if (!mem) return json({ error: "Only an admin for your organisation can invite colleagues." }, 403);

  for (let i = 0; i < 3; i++) {
    const code = newCode();
    const r = await admin(env, "/rest/v1/org_invites", { method: "POST", body: JSON.stringify({ code, org_id: mem.org_id, role, email, created_by: user.id }) });
    if (r.ok) return json({ code, role, email, expiresInDays: 14 });
  }
  return json({ error: "Something went wrong. Please try again." }, 500);
}
