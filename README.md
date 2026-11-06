# Fettle

Household resilience plans: a free readiness check, a £5 digital book, and (later) a printed book and Fettle Plus.

- `public/` is the website. `index.html` is generated, so don't edit it by hand.
- `src/fettle.html` is the app source.
- `public/live.js` adds real accounts, saved plans and Stripe payment when `public/config.js` is filled in.
- `functions/api/` holds the server code (Cloudflare Pages Functions): `checkout`, `stripe-webhook`, `delete-account`.
- `supabase/schema.sql` is the database.
- `i18n/` holds the translations (Polish, Romanian, Panjabi, Urdu).

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

## Before you charge anyone
- Register with the ICO (data protection fee).
- Finish and check `public/privacy.html` and `public/terms.html`. They are drafts.
- Clinical (GP or nurse) and fire service review of the health and safety content.
- Replace placeholders:
  - `hello@fettle.example`
  - the founder quote
  - the Amazon tag `YOURTAG-21`
  - "[name, role]" in the news section
- Translations need professional checking before the language menu is promoted. Launch in English first.

## Not built yet
- Printed book ordering and Fettle Plus (shown as "coming soon").
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
