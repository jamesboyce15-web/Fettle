// POST /api/delete-account  -> deletes the signed-in user and all their plans.
// Purchases stay for tax records but lose the link to the person (user_id set to null).
import { json, getUser, admin } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Please sign in again." }, 401);
  const r = await admin(env, `/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  if (!r.ok) { console.error("delete", await r.text()); return json({ error: "Could not delete" }, 500); }
  return json({ deleted: true });
}
