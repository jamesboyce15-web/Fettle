// POST /api/stripe-webhook  (called by Stripe, not by the app)
// Records book purchases, and keeps Fettle Plus subscriptions in step. This is the only place either gets written.
import { json, admin, verifyStripe, isUuid } from "../../lib/server.js";

const SUB_EVENTS = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]);

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const ok = await verifyStripe(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Bad signature" }, 400);
  const event = JSON.parse(raw);

  if (SUB_EVENTS.has(event.type)) return saveSubscription(env, event.data.object, event.type === "customer.subscription.deleted");

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return json({ received: true });
  const s = event.data.object;
  if (s.mode === "subscription") return json({ received: true }); // recorded from the customer.subscription.* events
  if (s.payment_status !== "paid") return json({ received: true });
  const m = s.metadata || {};
  if (!isUuid(m.user_id) || !isUuid(m.household_id) || !m.product) return json({ error: "Missing metadata" }, 400);

  // Idempotent: the unique stripe_session_id means Stripe retries don't create duplicates.
  const r = await admin(env, "/rest/v1/purchases?on_conflict=stripe_session_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: m.user_id, household_id: m.household_id, product: m.product,
      stripe_session_id: s.id, amount_total: s.amount_total, currency: s.currency, livemode: !!s.livemode,
    }),
  });
  if (!r.ok) { console.error("supabase", await r.text()); return json({ error: "Could not record purchase" }, 500); } // Stripe will retry
  return json({ received: true });
}

async function saveSubscription(env, sub, deleted) {
  const m = sub.metadata || {};
  if (!isUuid(m.user_id) || !["plus", "post"].includes(m.plan) || !["month", "year"].includes(m.period)) return json({ received: true, ignored: "not a Fettle Plus subscription" });
  const end = sub.current_period_end || (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].current_period_end);
  const r = await admin(env, "/rest/v1/subscriptions?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: m.user_id, plan: m.plan, period: m.period, status: deleted ? "canceled" : String(sub.status || "active"),
      stripe_customer_id: sub.customer || null, stripe_subscription_id: sub.id,
      current_period_end: end ? new Date(end * 1000).toISOString() : null, cancel_at_period_end: !!sub.cancel_at_period_end,
      livemode: !!sub.livemode, updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) { console.error("supabase", await r.text()); return json({ error: "Could not record subscription" }, 500); }
  return json({ received: true });
}
