// GET /b/<slug>: a sole trader's Patch page, rendered on the server so search engines and AI assistants read it in full:
// services and prices as text, schema.org data, FAQs, and the enquiry form that opens the owner's WhatsApp.
// ?p=<preview token> shows a page that isn't live yet (never indexed).
import { anonRpc, publicEnv, isUuid } from "../../lib/supa.js";
import "../../public/patch-desk.js";

const page = (status, html, cache) => new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": cache || "no-store", "X-Robots-Tag": status === 200 && cache ? "index, follow" : "noindex" } });

export async function onRequestGet({ params, request, env }) {
  const D = globalThis.PatchDesk, slug = String(params.slug || "").toLowerCase(), u = new URL(request.url), p = u.searchParams.get("p");
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) return notFound(env, request);
  const preview = isUuid(p) ? p : null;
  let m = null; try { m = await anonRpc(publicEnv(env), "member_public", { p_slug: slug, p_preview: preview }); } catch (e) { m = null; }
  if (!m) return notFound(env, request);
  const url = `${u.origin}/b/${m.slug}`, isPreview = !!preview;
  return page(200, D.pageHtml(m, { url, preview: isPreview }), isPreview || m.status !== "live" ? "no-store" : "public, max-age=300");
}
async function notFound(env, request) {
  try { const r = await env.ASSETS.fetch(new URL("/404.html", request.url)); return new Response(r.body, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }); } catch (e) { return page(404, "<h1>Not found</h1>"); }
}
