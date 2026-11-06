// POST /api/stripe-webhook  (called by Stripe, not by the app)
// Records a purchase when Checkout completes. This is the only place a book gets marked as paid.
import { json, admin, verifyStripe, isUuid } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const ok = await verifyStripe(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Bad signature" }, 400);

  const event = JSON.parse(raw);
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return json({ received: true });

  const s = event.data.object;
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
