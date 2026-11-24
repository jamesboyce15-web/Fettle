// Runs every morning (GitHub Actions calls it with CRON_SECRET; see .github/workflows/daily.yml).
// - To James (ADMIN_EMAIL): new report requests and founding-member interest, only when there's something new.
// - On Mondays (London time), to each owner using Patch: their week, unless they've turned it off.
// Everything goes through sendEmail, so dry run applies.
import { json } from "../../lib/server.js";
import { rest, hasService } from "../../lib/supa.js";
import { sendEmail } from "../../lib/mail.js";
import { londonToday, weeklyFor } from "../../lib/weekly.js";

export async function onRequestPost({ request, env }) {
  if (!env.CRON_SECRET || request.headers.get("x-cron-secret") !== env.CRON_SECRET) return json({ error: "No" }, 403);
  if (!hasService(env)) return json({ error: "Not set up" }, 503);
  const base = env.SITE_URL || new URL(request.url).origin, brand = env.BRAND || "Patch", day = londonToday(), out = { digest: null, weekly: [] };
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  // admin digest
  if (env.ADMIN_EMAIL) {
    const fresh = await rest(env, `requests?created_at=gte.${since}&select=id,name,role,venue_id,venue_text&order=created_at`);
    const founding = await rest(env, `requests?founding_interest=eq.true&status=neq.founding&status=neq.not_now&select=id,name,role,venue_id,venue_text,founding_message`);
    if (fresh.length || founding.length) {
      const ids = [...new Set(fresh.concat(founding).map(r => r.venue_id).filter(Boolean))], vs = ids.length ? await rest(env, `venues?id=in.(${ids.join(",")})&select=id,name`) : [];
      const name = r => (vs.find(v => v.id === r.venue_id) || {}).name || r.venue_text;
      const m = globalThis.PatchEmails.adminDigest({ adminUrl: `${base}/admin`, requests: fresh.map(r => ({ name: r.name, role: r.role, cafe: name(r) })), founding: founding.map(r => ({ name: r.name, role: r.role, cafe: name(r), message: r.founding_message })) });
      out.digest = (await sendEmail(env, Object.assign({ to: env.ADMIN_EMAIL, kind: "digest", key: "digest-" + day.iso }, m))).status;
    }
  }
  // Monday emails
  if (day.monday || new URL(request.url).searchParams.get("force") === "weekly") {
    const week = new Date(Date.now() - 5 * 24 * 3600e3).toISOString();
    const rs = await rest(env, `requests?venue_id=not.is.null&owner_state=not.is.null&status=neq.not_now&briefing_off=is.false&or=(last_briefing_at.is.null,last_briefing_at.lt.${week})&select=id,name,email,token,venue_id,area_id,report,owner_state&limit=500`);
    if (rs.length) {
      const vs = await rest(env, `venues?id=in.(${[...new Set(rs.map(r => r.venue_id))].join(",")})&select=id,name,postcode,hygiene,hygiene_date,seo`);
      const as = await rest(env, `areas?id=in.(${[...new Set(rs.map(r => r.area_id).filter(Boolean))].join(",")})&select=id,sector,calendar,geo,rankings,supply_bench`);
      for (const r of rs) {
        const v = vs.find(x => x.id === r.venue_id), a = as.find(x => x.id === r.area_id) || {}; if (!v) continue;
        try { const m = weeklyFor(r, v, a, day.iso, base, brand);
          const s = await sendEmail(env, Object.assign({ to: r.email, kind: "weekly", requestId: r.id, key: `weekly-${r.id}-${day.iso}`, headers: { "List-Unsubscribe": `<${base}/api/unsubscribe?t=${r.token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }, m));
          if (s.status === "sent") await rest(env, `requests?id=eq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_briefing_at: new Date().toISOString() }) });
          out.weekly.push(s.status);
        } catch (e) { out.weekly.push("error"); }
      }
    }
  }
  return json(out);
}
