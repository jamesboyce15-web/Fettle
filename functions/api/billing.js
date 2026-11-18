// POST /api/billing  -> { url }
// Opens Stripe's billing page for a Fettle Plus member: change plan, update the card or address, or cancel.
import { json, getUser, admin } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Please sign in again." }, 401);
  const r = await admin(env, `/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id`);
  const rows = r.ok ? await r.json() : [];
  const cust = rows[0] && rows[0].stripe_customer_id;
  if (!cust) return json({ error: "We couldn't find a Fettle Plus subscription on this account." }, 404);
  const s = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer: cust, return_url: `${new URL(request.url).origin}/?plus=manage` }),
  });
  const p = await s.json();
  if (!s.ok) { console.error("stripe portal", p); return json({ error: "That didn't open. Please try again." }, 502); }
  return json({ url: p.url });
}
