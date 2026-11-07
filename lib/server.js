// Shared helpers for the Cloudflare Pages Functions in /functions.
// Secrets come from Cloudflare environment variables (see README), never from this repo.

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = v => typeof v === "string" && UUID.test(v);

// Checks the user's Supabase access token and returns the user, or null.
export async function getUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: env.SUPABASE_ANON_KEY } });
  if (!r.ok) return null;
  return r.json();
}

// Calls the Supabase REST API as the service role (bypasses row-level security). Server-side only.
export function admin(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

// Verifies a Stripe webhook signature (Stripe-Signature header, HMAC-SHA256, 5-minute tolerance).
export async function verifyStripe(rawBody, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")).filter(p => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const sigs = header.split(",").filter(p => p.trim().startsWith("v1=")).map(p => p.trim().slice(3));
  const t = parseInt(parts.t, 10);
  if (!t || !sigs.length || Math.abs(now - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
  return sigs.some(s => timingSafeEqual(s, hex));
}
// Signs and checks unsubscribe links, so only the person emailed can turn their reminders off.
async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const unsubToken = (secret, userId) => hmacHex(secret, `unsub:${userId}`);
export async function checkUnsubToken(secret, userId, token) {
  if (!secret || !isUuid(userId) || typeof token !== "string") return false;
  return timingSafeEqual(token, await unsubToken(secret, userId));
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
