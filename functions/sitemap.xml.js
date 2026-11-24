// GET /sitemap.xml: the public pages, including every live Patch business page, so search engines (and the AI assistants
// that read them) find the pages without waiting for links.
import { publicEnv } from "../lib/supa.js";

export async function onRequestGet({ request, env }) {
  const o = new URL(request.url).origin, E = publicEnv(env), urls = [[o + "/", null], [o + "/prices", null], [o + "/price-check", null], [o + "/dog-groomers", null], [o + "/nails-lashes-brows", null], [o + "/mobile-hairdressers", null]];
  try {
    const r = await fetch(`${E.SUPABASE_URL}/rest/v1/rpc/members_live`, { method: "POST", headers: { apikey: E.SUPABASE_ANON_KEY, Authorization: `Bearer ${E.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }, body: "{}" });
    if (r.ok) (await r.json()).forEach(m => urls.push([`${o}/b/${m.slug}`, String(m.updated_at || "").slice(0, 10)]));
  } catch (e) {}
  const x = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${x(u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
