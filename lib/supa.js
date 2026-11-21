// Server-side Supabase helpers. The service role key never leaves Cloudflare; these run only in Pages functions.
export const svcHeaders = env => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` });
export const hasService = env => !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY);

// REST call as the service role. `path` is after /rest/v1/.
export async function rest(env, path, opts = {}) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, Object.assign({}, opts, { headers: Object.assign({ "Content-Type": "application/json" }, svcHeaders(env), opts.headers || {}) }));
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
  if (!r.ok) throw new Error(`Database ${r.status}: ${(j && j.message) || t}`.slice(0, 300));
  return j;
}
// An RPC as the public (anon) role, the same as a browser would make it.
export async function anonRpc(env, fn, body) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) return null; return r.json();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = s => UUID.test(String(s || ""));
// An owner's private storage folder: a hash of their secret link, only if the link is valid.
export async function folderFor(env, token) {
  if (!isUuid(token)) return null;
  if (!(await anonRpc(env, "owner_get", { p_token: token }))) return null;
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("patch-docs:" + String(token).toLowerCase()));
  return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}
export const pathPattern = folder => new RegExp(`^${folder}/[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9a-f-]{36}\\.(pdf|jpg|png|webp|heic)$`);

// A daily allowance per owner for anything that costs money (reading photos). True if this one is allowed.
export async function allow(env, who, max) {
  try { return (await rest(env, "rpc/bump_usage", { method: "POST", body: JSON.stringify({ p_who: who, p_max: max }) })) === true; } catch (e) { return false; }
}
