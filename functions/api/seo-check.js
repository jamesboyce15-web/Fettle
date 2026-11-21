// POST /api/seo-check {url, places:[...]} (admins only): reads a café's homepage and returns the website search checks.
// The Google profile checks are entered by the admin from the café's profile.
import { json, isAdmin, safeUrl, siteChecks } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  if (!(await isAdmin(env, request))) return json({ error: "Only Patch admins can run checks." }, 403);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const u = safeUrl(String(b.url || "")); if (!u) return json({ error: "That isn't a website address we can check." }, 400);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(u.href, { redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "PatchSiteCheck/1.0 (+https://getpatch.example)", Accept: "text/html" } });
    clearTimeout(t);
    if (!safeUrl(r.url)) return json({ error: "The site redirected somewhere we can't check." }, 400);
    const html = (await r.text()).slice(0, 1500000);
    return json({ ok: true, at: new Date().toISOString(), url: r.url, status: r.status, checks: siteChecks(html, r.url, Array.isArray(b.places) ? b.places.slice(0, 6) : []) });
  } catch (e) { return json({ ok: true, at: new Date().toISOString(), url: u.href, checks: { site: false }, note: "The site didn't answer." }); }
}
