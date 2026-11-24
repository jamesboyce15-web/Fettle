// POST /api/owner-seo {t, url, places, sector}: an owner checks their own website from Patch, as often as they like
// (up to 20 a day). Their secret link is the key. Reads only the homepage; nothing is stored here: the page keeps the result.
import { json, safeUrl, siteChecks } from "../../lib/server.js";
import { anonRpc, isUuid, hasService, allow } from "../../lib/supa.js";

export async function onRequestPost({ request, env }) {
  let b = {}; try { b = await request.json(); } catch (e) {}
  const token = String(b.t || "");
  if (!isUuid(token) || !(await anonRpc(env, "owner_get", { p_token: token }))) return json({ error: "That link isn't valid" }, 403);
  if (hasService(env) && !(await allow(env, "seo:" + token, 20))) return json({ error: "That's a lot of checks today. Try again tomorrow." }, 429);
  const u = safeUrl(String(b.url || "").replace(/^(?!https?:\/\/)/i, "https://")); if (!u) return json({ error: "That doesn't look like a website address." }, 400);
  const places = (Array.isArray(b.places) ? b.places : []).slice(0, 6).map(x => String(x).slice(0, 60));
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(u.href, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "PatchSiteCheck/1.0", Accept: "text/html" } });
    clearTimeout(t);
    if (!safeUrl(r.url)) return json({ error: "Your site sent us somewhere we can't check." }, 400);
    if (!r.ok) return json({ ok: true, at: new Date().toISOString().slice(0, 10), url: r.url, checks: { site: false }, note: `Your site answered with an error (${r.status}).` });
    const html = (await r.text()).slice(0, 1500000);
    return json({ ok: true, at: new Date().toISOString().slice(0, 10), url: r.url, checks: siteChecks(html, r.url, places, b.sector === "salon" ? "salon" : "cafe") });
  } catch (e) { return json({ ok: true, at: new Date().toISOString().slice(0, 10), url: u.href, checks: { site: false }, note: "Your site didn't answer. Is the address right?" }); }
}
