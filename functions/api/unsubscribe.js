// Stop the Monday email. A link opens a page with a button (so email scanners following links don't unsubscribe anyone);
// mail apps' one-click unsubscribe posts here directly.
import { anonRpc, isUuid } from "../../lib/supa.js";

const page = (title, body) => new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font:16px/1.55 system-ui,sans-serif;background:#f3f5f3;color:#14201b;margin:0;padding:12vh 16px}main{max-width:420px;margin:auto;background:#fff;border:1px solid #dce2de;border-radius:14px;padding:24px}button{background:#1f58a8;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:1rem;cursor:pointer}</style></head><body><main>${body}</main></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

export async function onRequestGet({ request }) {
  const t = new URL(request.url).searchParams.get("t") || "";
  if (!isUuid(t)) return page("Patch", "<h1>That link doesn't work</h1><p>Reply to any Patch email and we'll stop them for you.</p>");
  return page("Stop the Monday email", `<h1>Stop the Monday email?</h1><p>You can still open Patch whenever you like, and turn it back on in Upload, then Settings.</p><form method="post" action="?t=${encodeURIComponent(t)}"><button>Stop the emails</button></form>`);
}
export async function onRequestPost({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "";
  const ok = isUuid(t) && (await anonRpc(env, "owner_email_pref", { p_token: t, p_on: false })) === true;
  return ok ? page("Done", "<h1>Done</h1><p>No more Monday emails. Thanks for trying Patch.</p>") : page("Patch", "<h1>That didn't work</h1><p>Reply to any Patch email and we'll stop them for you.</p>");
}
