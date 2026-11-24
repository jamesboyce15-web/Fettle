# Patch

How an independent café compares with the cafés around it: prices, hygiene, opening hours and what customers find,
plus a calculator that shows where an owner could save on supplies or charge a little more and stay competitive.

- `public/index.html` the public area page, with one call to action: ask for a free report.
- `public/report.html?t=…` an owner's private report and margin calculator.
- `public/owner.html?t=…` the owner's home: this week's briefing, the week ahead (forecast, people on, prep), money (price changes and what they've made), and more (sales, reviews, posts, reminders, the area).
- `public/patch-ops.js` forecast, staffing, prep, price tracking, review themes and replies, posts, reminders, the Monday briefing (tested in `tests/ops.test.js`).
- `public/admin.html` requests, cafés, recording visits and menus, building reports, publishing the area page.
- `public/patch-kits.js` the "help me do it" kits on actions: review QR card (with `public/vendor/qrcode.js`, MIT), menu written out, structured data, title, address, a message for the web person, and reading dates and prices off renewals and certificates.
- `functions/api/owner-doc.js` stores owners' renewals and certificates in the private `owner-docs` bucket, checked against their secret link. Needs `SUPABASE_SERVICE_ROLE_KEY` in Cloudflare (James adds it).
- `public/patch-emails.js` the wording of every email (previewed in admin → Emails). `functions/api/cron.js` sends the daily round-up and Monday emails, called by `.github/workflows/daily.yml`. `functions/api/read-photo.js` has Claude read photographed invoices and paperwork.
- `public/sweep.html?s=…` a price sweep on a phone: the cafés to photograph, each board read by Claude as it's sent (`functions/api/sweep-photo.js`), skips with a reason, and what the sweeper has earned. Admin → Price sweeps makes the link, checks and approves each board, and updates every owner's comparison and "what's changed nearby".
- `public/visit.html` the visit form for a phone: Google details, photos (private `visit-photos` bucket), every score, prices, and where the visit ranks as you fill it in.
- `public/data/<area>-menus.json` prices found on cafés' delivery-app menus. Loaded from Cafés → "Load online menu prices" as `delivery` observations: shown to visitors as a guide, never used in benchmarks.
- `public/patch-core.js` every comparison and sum (tested in `tests/core.test.js`).
- `supabase/schema.sql` the database. Only admins can read data; the public can only call four functions.
- `tools/seed_from_fsa.py` builds an area's starting café list from the Food Standards Agency open data.

With `public/config.js` empty, every page runs a demo with made-up cafés, kept in the browser.

Tests: `npm test`, and `NODE_PATH=$(npm root -g) node tests/browser/demo.test.cjs`.

## Going live

Patch replaced Fettle in this repository, its Supabase project and its Cloudflare Pages site (November 2026).
Fettle's code is on the `fettle-archive` branch; its database tables are kept untouched in the private `fettle_archive` schema.

Done already: the database schema (`supabase/schema.sql`, applied as the `patch_schema` migration), James's accounts as admins,
and `public/config.js` pointing at the live database. Secrets go into Cloudflare's settings only, never into the code.

**Cloudflare Pages → fettle → Settings → Variables** (mark keys as secrets):
| Name | Needed for |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | all `/api` functions (Fettle had these already) |
| `SUPABASE_SERVICE_ROLE_KEY` (secret) | owners' documents, invoice photos, sweeps, emails, the daily job (Fettle had this already) |
| `ANTHROPIC_API_KEY` (secret) | reading photos and menu boards (`READ_CLAUDE_MODEL` optional), AI answer checks |
| `GEO_WEB_SEARCH` | `1` to have Claude search the web before answering the AI checks, and record which sites it read (turn on web search in the Anthropic Console first). Off: answers come from what the model already knows |
| `OPENAI_API_KEY` (secret, optional) | ChatGPT in the AI answer checks |
| `RESEND_API_KEY` (secret), `EMAIL_FROM` (or Fettle's `FROM_EMAIL`) | sending email, e.g. `Patch <hello@getfettle.co.uk>` |
| `EMAIL_REPLY_TO`, `EMAIL_SIGNOFF`, `ADMIN_EMAIL`, `SITE_URL` | where replies go, the sign-off name, your daily round-up, the site's address |
| `EMAIL_DRY_RUN` | leave unset (dry run: emails go to the log in admin → Emails). Set to `false` only once you've approved the wording |
| `CRON_SECRET` (secret) | the daily job. Also add it in GitHub as `PATCH_CRON_SECRET`, with `PATCH_URL` |

Fettle settings no longer used, safe to delete: `STRIPE_SECRET_KEY`, `TURNSTILE_SECRET`, `UNSUBSCRIBE_SECRET`, `PLUS_ON`, `ALERTS_DRY_RUN`, `ALERT_TEST_TO`, `ADMIN_ALERT_TO`.
Fettle's email worker (Workers → the reminders worker) should be deleted in Cloudflare: its tables are archived, so it would only error.

Then: sign in at `/admin`, Cafés → "Load the hygiene list", "Find missing locations", "Load online menu prices"; start a price sweep;
publish the area page once there are prices for at least 5 cafés.

Tests run on every push (`.github/workflows/test.yml`): `npm test`, then `npm run test:browser`.
