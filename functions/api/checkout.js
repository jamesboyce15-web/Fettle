// POST /api/checkout  { householdId, product }  -> { url }
// Creates a Stripe Checkout session for a signed-in user's own plan.
import { json, isUuid, getUser } from "../../lib/server.js";

const PRODUCTS = { book_digital: "STRIPE_PRICE_BOOK_DIGITAL" }; // printed book and Fettle Plus come later

export async function onRequestPost({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ error: "Please sign in again." }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const { householdId, product } = body || {};
  const priceVar = PRODUCTS[product];
  if (!priceVar || !env[priceVar]) return json({ error: "Unknown product" }, 400);
  if (!isUuid(householdId)) return json({ error: "Plan not found" }, 404);

  // The user's own token is used here, so row-level security proves the plan is theirs.
  const own = await fetch(`${env.SUPABASE_URL}/rest/v1/households?id=eq.${householdId}&select=id`, {
    headers: { Authorization: request.headers.get("Authorization"), apikey: env.SUPABASE_ANON_KEY },
  });
  const rows = own.ok ? await own.json() : [];
  if (!rows.length) return json({ error: "Plan not found" }, 404);

  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": env[priceVar],
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    customer_email: user.email,
    "metadata[user_id]": user.id,
    "metadata[household_id]": householdId,
    "metadata[product]": product,
    "payment_intent_data[metadata][household_id]": householdId,
    // Digital content: the customer must agree that supply starts now, which ends the 14-day cancellation right
    // (Consumer Contracts Regulations 2013). Shown next to the Pay button.
    "custom_text[submit][message]": "Your book is ready as soon as you pay. By paying, you ask us to supply it straight away and you understand you then lose the 14-day right to cancel. Problems? Email us and we'll put it right.",
    success_url: `${origin}/?checkout=success&hh=${householdId}`,
    cancel_url: `${origin}/?checkout=cancelled&hh=${householdId}`,
  });
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const session = await r.json();
  if (!r.ok) { console.error("stripe", session); return json({ error: "Payment setup failed" }, 502); }
  return json({ url: session.url });
}
