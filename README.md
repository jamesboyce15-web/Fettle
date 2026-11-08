# Fettle

Fettle helps households find the gaps that could leave them vulnerable in an emergency, fix them, and measure what changed. A free household check, a £5 digital book, and (later) a printed book.

- `public/` is the website. `index.html` is generated, so don't edit it by hand.
- `src/fettle.html` is the app source.
- `public/live.js` adds real accounts, saved plans and Stripe payment when `public/config.js` is filled in.
- `functions/api/` holds the server code (Cloudflare Pages Functions): `checkout`, `stripe-webhook`, `delete-account`.
- `supabase/schema.sql` is the database.
- `i18n/` holds the translations (Polish, Romanian, Panjabi, Urdu).
- `guides/content.py` holds the free guides. `public/guides/` is generated from it by `python3 tools/build_guides.py`, so edit the content file, not the HTML.

With `config.js` empty the site runs as the old prototype: nothing saved, nothing charged.

## Going live: one-time setup

Do these in order. Everything stays in **test mode** until step 6.

### 1. Supabase (accounts and database)
1. Create a project at supabase.com. **Region: West EU (London)**. Save the database password somewhere safe.
2. SQL Editor → New query → paste `supabase/schema.sql` → Run.
3. Authentication → Sign In / Providers → Email: turn **Confirm email off** for launch (people go straight from their check to their plan). Turn it back on later once the confirm flow is built.
4. Authentication → URL Configuration: set Site URL to your domain (e.g. `https://fettle.example`).
5. Project settings → API: copy the **Project URL**, the **anon public** key and the **service_role** key. The service_role key is secret: it only ever goes in Cloudflare (step 3), never in the code.
6. Put the Project URL and anon key in `public/config.js`.

### 2. Stripe (payments, test mode first)
1. Create the account at stripe.com and complete the business and bank checks.
2. Make sure **Test mode** is on.
3. Product catalogue → Add product: "The Fettle Book (digital)", one-off price **£5.00 GBP**. Copy the price ID (`price_...`).
4. Developers → API keys: copy the **Secret key** (`sk_test_...`).
5. The webhook is set up in step 4, once the site has an address.

### 3. Cloudflare Pages (hosting)
1. Workers & Pages → Create → Pages → Connect to Git → choose this repo.
2. Build settings: Framework **None**, build command **empty**, output directory **public**.
3. Settings → Variables and secrets, add these as **Secrets**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_BOOK_DIGITAL`
   - `STRIPE_WEBHOOK_SECRET` (from step 4)
   - `UNSUBSCRIBE_SECRET` (any long random string; the reminders Worker uses the same one)
4. Custom domains → add your domain.

### 4. Stripe webhook
Developers → Webhooks → Add endpoint:
- URL: `https://YOUR-DOMAIN/api/stripe-webhook`
- Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`

Copy the signing secret (`whsec_...`) into Cloudflare as `STRIPE_WEBHOOK_SECRET`, then redeploy.

### 5. Test the whole thing (test mode)
1. Do a check, create an account, then choose **Get The Fettle Book**.
2. Pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC).
3. You should come back to your book. In Supabase, a row should appear in `purchases`.
4. Also try: cancelling payment, signing out and in again, a password reset, and **Delete my account**.

### 6. Go live
Only after the checks in "Before you charge anyone" are done:
1. Switch Stripe to live mode and make the £5 product again in live mode.
2. Replace `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BOOK_DIGITAL` and `STRIPE_WEBHOOK_SECRET` in Cloudflare with the **live** values. Live mode needs its own webhook endpoint.
3. Redeploy.

### 7. Check-in reminders (optional, after launch)
People can tick "Remind me when my 30-day and 90-day checks are due". The emails come from a small scheduled Worker in `workers/reminders/`.
1. Make an account with an email sender. The code uses Resend (resend.com). Verify your domain there.
2. `cd workers/reminders`, set `SITE_URL` and `FROM_EMAIL` in `wrangler.toml`, then add the secrets: `npx wrangler secret put SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `UNSUBSCRIBE_SECRET`.
3. `npx wrangler deploy`. It runs daily but stays in **dry run** (logs who is due, sends nothing) until you set `DRY_RUN` to `false` in Cloudflare.
4. Every email has a one-click unsubscribe link (`/api/unsubscribe`).

## Measuring impact (for councils)
- Every check saves a snapshot: date, readiness score, and 14 measures that match the Cabinet Office's 2026 preparedness survey (3 days of water, a plan, a grab bag, a radio, the Priority Services Register and so on).
- People re-check at 30 days, 90 days, then each season. That gives a before and after for each household.
- In Communities mode, the ward report shows before and after against the UK figures, and makes a one-page impact report.
- For households using the public site who ticked "Help your council plan", run this in the Supabase SQL editor:
  `select * from fettle_impact('Rochdale');`
  It returns each measure's first-check and latest percentages, and hides any measure with fewer than 5 households.
  `select * from fettle_outcomes('Rochdale');` gives the outcome counts: households assessed, critical risks found, sorted, and verified.
- Critical risks (like powered medical equipment with no backup, or no working smoke alarm) are saved with every check, so reports can say "X found, Y sorted, Z checked on a visit".
- In Communities mode, workers tick "Checked on a visit" on any job the household has done. Households on their own can only report "done", never "verified".

## Before you charge anyone
- Register with the ICO (data protection fee).
- Finish and check `public/privacy.html` and `public/terms.html`. They are drafts.
- Clinical (GP or nurse) and fire service review of the health and safety content.
- Replace placeholders:
  - `hello@fettle.example`
  - the founder quote
  - the Amazon tag `YOURTAG-21`
  - "[name, role]" in the news section
- The guides on feeding a baby and on medicines are marked as drafts until an NHS professional has reviewed them. Remove `flag="clinical"` in `guides/content.py` once they have.
- Translations need professional checking before the language menu is promoted. Launch in English first.

## Not built yet
- Printed book ordering (shown as "coming soon").
- Fettle Plus (a subscription) is parked and hidden. Only revisit it if people ask what they'd get from Fettle every month.
- Live alerts, check-in texts and household invites. These are hidden in live mode.
- Professional accounts. The sample caseload stays as a demo, and pilots are set up by hand.
- Server-generated PDF. The book prints or saves as PDF from the browser.

## Updating the site
After editing `src/fettle.html` or the translations:

```
python3 i18n/build.py
python3 tools/build_site.py
```

Commit and push. Cloudflare deploys automatically.

## Local testing
```
cp .dev.vars.example .dev.vars   # fill in test keys
npx wrangler pages dev public
```
