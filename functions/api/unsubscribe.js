// GET /api/unsubscribe?u=<user id>&t=<signed token>  -> turns off check-in reminder emails for that person.
// The link is in every reminder email. The token is an HMAC of the user id, so links can't be guessed.
import { admin, checkUnsubToken } from "../../lib/server.js";

const page = (title, text, status = 200) => new Response(
  `<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Fettle</title>
<body style="font:18px/1.6 system-ui,sans-serif;background:#f6f7f4;color:#1c2522;margin:0;padding:48px 16px"><main style="max-width:520px;margin:0 auto">
<h1 style="font-size:1.6rem">${title}</h1><p>${text}</p><p><a href="/" style="color:#1a5c8c">Go to Fettle</a></p></main></body></html>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams, u = q.get("u"), t = q.get("t");
  if (!(await checkUnsubToken(env.UNSUBSCRIBE_SECRET, u, t)))
    return page("That link didn't work", "Sign in to Fettle and untick check-in reminders on your home page, or email us and we'll do it for you.", 400);
  const r = await admin(env, `/auth/v1/admin/users/${u}`);
  if (!r.ok) return page("That link didn't work", "We couldn't find your account. It may already have been deleted.", 404);
  const user = await r.json();
  const meta = { ...(user.user_metadata || {}), remind_emails: false };
  const w = await admin(env, `/auth/v1/admin/users/${u}`, { method: "PUT", body: JSON.stringify({ user_metadata: meta }) });
  if (!w.ok) { console.error("unsubscribe", await w.text()); return page("Sorry, something went wrong", "Please try again later, or email us and we'll turn reminders off for you.", 500); }
  return page("Reminders turned off", "You won't get any more check-in reminders from Fettle. Your plan is still saved, and you can turn reminders back on from your home page.");
}
