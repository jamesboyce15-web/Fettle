# Fettle

Fettle helps households find the gaps that could leave them vulnerable in an emergency, fix them, and measure what changed. A free household check, a free digital book, and (later) a paid printed book.

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
2. SQL Editor → New query → paste `supabase/schema.sql` → Run. Then do the same with `supabase/communities.sql` (organisations and worker accounts), then `supabase/reports.sql` (the anonymous count, start/finish counts and area reports). `reports.sql` is safe to run again whenever it's updated. Then `supabase/reminders.sql` (seasonal reminders, the workbook tools' counts, `fettle_reminder_signups()`), also safe to run again.
3. Authentication → Sign In / Providers → Email: turn **Confirm email off** for launch (people go straight from their check to their plan). Turn it back on later once the confirm flow is built.
4. Authentication → URL Configuration: set Site URL to `https://getfettle.co.uk`.
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

### 8. Set up a pilot organisation (Fettle for Communities)
Workers can only join with an invite code. Nobody can make themselves a member.
1. In the Supabase SQL editor, run (with your own name and wards):
   `select * from fettle_create_org('Rochdale Borough Council', array['Kingsway','Central Rochdale','Spotland and Falinge']);`
   It returns the organisation's id and a first **admin code**, like `K7QM-4XPA`. Leave the wards list empty (`'{}'`) if workers should type their own area.
2. Send the pilot lead the link `https://getfettle.co.uk/?join=K7QM-4XPA`. They choose a password and land on an empty caseload.
3. The pilot lead invites their team from the app ("Invite a colleague"). Each code works once and lasts 14 days. To make more codes yourself: `select fettle_invite('<organisation id>', 'worker', 'name@council.gov.uk');`
4. Residents' plans belong to the organisation, not the worker. Every member of that organisation can see and update them; nobody else can, including Fettle's public users. If a worker deletes their account, the plans stay.
5. Each case records who created it, each visit, each "checked on a visit" tick and each deletion (`case_events`). Deletions keep only the case reference.
6. Book orders: "Send order to print" opens an email to Fettle with the case references and languages. Nothing is charged automatically.

Before a pilot starts: a data sharing agreement with the organisation (they are the controller for their residents' plans), and a DPIA covering health data collected on visits.

## Winter test mode (now)
The first goal is evidence for a council pilot, not book sales. So for the winter test:
- **Free book:** `freeBook: true` in `public/config.js` makes the digital book free with a free account. Stripe isn't needed: skip setup steps 2, 4 and 6 until you want to charge. The free account is what makes the 30-day re-check and its reminder possible.
- **Anonymous area count:** on the results page, people without an account can "Add my answers" to their area's anonymous count. Stored: the council area, the 14 measures, open critical risks, the scenario answers and a few yes/no household flags. Never a name, email, postcode or free text. The table is insert-only from the website; nobody can read rows back. `select * from fettle_anon('Rochdale');` gives the area's first-check picture, leaving out anyone also counted through a saved plan, and hides anything under 5 households.
- **Start and finish counts:** the site records that a check was started or finished (with the area for finished ones). No ids, no cookies. `select * from fettle_funnel();` shows how many started and finished.
- **Focus on one council** (Rochdale first): reports hide anything under 5 households, so concentrated numbers matter more than total numbers.

## Could you cope? (scenarios)
Straight after who lives here, the check asks three everyday scenarios: a 3-day power cut on a winter evening, 3 days without tap water, and leaving home in 15 minutes. Homes with a baby on formula also get feeding the baby for 3 days. Each answer (Yes, easily / Just about / Not really / No) is followed by what it actually takes for that household (meals, litres, feeds), then "Still feel the same?".
- Results show each scenario as "You said" beside "Your answers show", with what's had and missing.
- When a step completes a scenario, Fettle asks how it feels now. The 30 and 90 day re-checks ask the scenarios again.
- Councils see confidence (self-reported) beside capability (worked out from the check), first and latest, plus how many felt less sure after seeing what it takes. Keep the wording and scale fixed, or the trend means nothing.
- The baby reveal needs the same clinical review as the rest of the feeding advice.

## Launch area: Greater Manchester and Cheshire
The postcode a household enters is looked up to find its council. That sets their local contacts:
- **Greater Manchester (10 boroughs):** Electricity North West and United Utilities, filled in automatically.
- **Warrington and Halton (Widnes, Runcorn):** SP Energy Networks and United Utilities, filled in automatically.
- **Cheshire East:** United Utilities. The electricity network is split (mostly SP Energy Networks; Macclesfield and Wilmslow are Electricity North West), so people choose, with a hint and the postcode finder.
- **Cheshire West and Chester:** people choose both. Around Chester the water is Severn Trent.
- **Everywhere else:** national routes (105, the network finder, the number on the water bill).

Before launch, check these against each company's own postcode checker, and check the phone numbers: SP Energy Networks register 0330 10 10 167, power cuts 105 or 0800 001 5400; Severn Trent stwater.co.uk/priority, emergencies 0800 783 4444.

## Getting people to act
After the check, people see **their next 3 steps**, not a long list: critical risks first, then quick wins, then the cheapest. For each step they choose **when** they'll do it (today, this weekend, next shop, or "I need help"), can add it to their phone calendar, and can say who's doing it. If the date passes, Fettle asks "Did you sort this?" and, if not, what got in the way (cost, time, not knowing what to buy, landlord, can't do it alone, not sure it matters), with help for each. The barriers follow the Cabinet Office's 2026 survey (cost 29%, things going out of date 25%, not knowing what to do 23%, stress 19%, no storage space 18%). People can also pick their own date, or say a step doesn't apply to them (never for critical risks; recorded with each check). The results show which situations the household is ready for (power cut, water going off, leaving in a hurry, someone getting hurt) and what's missing for the rest. When someone ticks a step, Fettle says what changed: a critical risk removed, a situation they're now ready for, things left going down. If cost is the problem, it offers cheaper ways to fix the same thing (never a shop link). If they say it's the landlord's job, it says whether it really is and gives them the exact words to send. Two weeks after a first check with nothing done, it checks in. The full plan is still there, folded underneath.

**North star metric:** the share of households that sort at least one priority gap (a "do first" job or a critical risk) within 30 days of their first check. It's in the Communities report, PDF and CSV, alongside how many set a date and how many kept it.

## Measuring impact (for councils)
- Every check saves a snapshot: date, readiness score, and 14 measures that match the Cabinet Office's 2026 preparedness survey (3 days of water, a plan, a grab bag, a radio, the Priority Services Register and so on).
- People re-check at 30 days, 90 days, then each season. That gives a before and after for each household.
- In Communities mode, the ward report shows before and after against the UK figures, and makes a one-page impact report.
- For households using the public site who ticked "Help your council plan", run this in the Supabase SQL editor:
  `select * from fettle_impact('Rochdale');`
  It returns each measure's first-check and latest percentages, and hides any measure with fewer than 5 households.
  `select * from fettle_outcomes('Rochdale');` gives the outcome counts: households assessed, critical risks found, sorted, and verified.
  `select * from fettle_groups('Rochdale');` splits the results by kind of household: social renters, private renters, homeowners, living alone, someone over 70, disability or long-term condition, young children. Tenure stands in for income. It also gives the headline: households that sorted a priority gap within 30 days.
  **The whole area in one go:** `select fettle_area_report('Rochdale');` returns everything above as one block of text. Open `tools/area-report.html` in a browser on your computer, paste it in, and choose Make report, then Print or save as PDF. "Show with sample data" shows what it looks like.
  `select * from fettle_confidence('Rochdale');` shows, for each scenario, how many said they'd cope and how many their answers show are ready, at the first check and the latest, and how many felt less sure after seeing what it takes.
  `select * from fettle_barriers('Rochdale');` shows what's getting in the way: for each reason (cost, no time, landlord and so on), how many households gave it, for how many steps, and how many of those steps they then sorted.
- Critical risks (like powered medical equipment with no backup, or no working smoke alarm) are saved with every check, so reports can say "X found, Y sorted, Z checked on a visit".
- Barriers: when people say why a step isn't done, the reason is saved. Workers can record it on a visit too ("What's stopping them?" on each case). The ward report, PDF and CSV show the totals, so a council sees *why* residents aren't ready, not just that they aren't.
- In Communities mode, workers tick "Checked on a visit" on any job the household has done. Households on their own can only report "done", never "verified".

## Live since 12 November 2026
getfettle.co.uk is live. No screen says "draft", "pilot", "preview" or "prototype" in live mode. Still to do:
- **Pay the ICO data protection fee** (ico.org.uk). It is required now the site collects personal data. Add the registration number to `public/privacy.html` once paid.
- The privacy notice and terms are filled in (James Boyce, trading as Fettle) but have not been checked by a lawyer.
- The health, fire safety and money content has not had its professional reviews yet (see below). The guides now carry plain safety notes instead of "Draft" banners.

## Reviews still to do
- **Source check done 12 November 2026:** every health, fire and money line in the guides, app and workbook was checked against official sources. 82 lines checked, 32 changed. The record is in `docs/evidence-review.md`, with what a professional should still look at. It does not replace the professional reviews below.
- The cheaper options shown when someone says "It costs too much" (`CHEAPER` in `src/fettle.html`) need the same review as the other safety content, especially filling water from the tap, carbon monoxide alarms and baby formula.
- Clinical (GP or nurse) and fire service review of the health and safety content.
- The guides on feeding a baby and on medicines carry a "General information, not medical advice" note (`flag="clinical"`). Keep it after review too.
- Translations need professional checking before the language menu is promoted. Launch in English first.

## Not built yet
- Printed book ordering (shown as "coming soon").
- Fettle Plus (a subscription) is parked and hidden. Only revisit it if people ask what they'd get from Fettle every month.
- Live alerts, check-in texts and household invites. These are hidden in live mode.
- Removing a worker from an organisation from inside the app. For now, delete their row in `org_members` in Supabase.
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

## Low income, social housing and support services

Fettle must work for people who can't spend anything. What's in place:

- **Check questions.** Tenure includes "Temporary or supported accommodation" (hostel, B&B, refuge, supported housing). "How do you pay for gas and electricity?" picks up prepayment meters. The budget question already allows £0.
- **Plan steps.** `prepay` (plan for the meter running out: emergency credit, top up before a storm, additional support credit, fuel vouchers), `moneyhelp` (crisis support by nation: Crisis and Resilience Fund in England, Scottish Welfare Fund, Discretionary Assistance Fund in Wales, Finance Support Service in Northern Ireland), `tempacc` (ask staff what happens in a fire or power cut, keep one bag ready). The evacuation step mentions Residential PEEPs in England. Steps with a `guide` slug link to the guide.
- **Barrier help.** "It costs too much" always points to council crisis support and the food bank. "It's my landlord's job" sends social tenants to the complaints process and the Housing Ombudsman (England), and people in temporary accommodation to their support worker or the placing council.
- **Guides** (category "Money and support", with a "Rules and amounts change" note): `tight-budget`, `prepayment-meters`, `help-you-can-get`, `social-housing`, `for-support-services`.
- **Reports.** "Who it reached" and `fettle_groups()` now split out temporary or supported accommodation, prepayment meters and households who can't spend anything. The anonymous count carries the same three flags. Groups under 5 stay hidden.

**Still to review:** the five guides and the three new steps need review by a welfare rights adviser (Citizens Advice or the council's welfare rights team). Scheme names, amounts and dates were checked on 11 November 2026 and will change. The Awaab's Law phase 2 date (30 November 2026) comes from one law-firm article and should be confirmed on GOV.UK. Translations of the new strings are not professionally checked.

## Landing page (November 2026)

Rewritten to convert: one question as the headline, one button, and a link for councils in the hero. About half the old length. The digital book is free everywhere (`freeBook` defaults to on; set `freeBook: false` in `config.js` to bring back the £5 Stripe checkout). Only the printed book is paid, and it is marked "coming soon" until Stripe and printing are set up. No screen says "prototype". The file opened without `config.js` is a preview copy: it says so only where nothing is really saved or sent.

## How to do each step

Every plan step carries up to three short instructions and one thing to tap (`HOW_STEPS`, `howActs`, `howHTML` in `src/fettle.html`): an official link, a printable sheet (`numbersSheet`, `shoppingList`, `packList`, `talkSheet`, `neighbourCard`), or a message ready to send (`msgText`, `sendMsg`). Messages to landlords and building managers are always sent in English. The instructions are open on the three next steps and folded in the full plan. `tests/browser/howto.test.cjs` checks every step has them. Check the outside links (fire safety check, Red Cross, GOV.UK council finder, Citizens Advice, Met Office) still work before launch.

## Workbook tools: /calc, /local, /remind
Each workbook QR code opens one quick job. Cloudflare Pages serves `index.html` for these paths (there is no 404.html), and the app picks the tool from the path, or from `?go=calc` when opened from disk.
- **/calc**: two questions (people, formula feeds a day) give the workbook's numbers: water, bottles, meals, snacks, feeds, cash, torches, blankets.
- **/local**: the first half of a postcode gives the power network, water company, council, crisis help (Rochdale's Crisis Payments by name), fire safety visits (GMFRS or Cheshire) and flood links.
- **/remind**: email only, no password. Sends a Supabase sign-in link; coming back turns reminders on. The area (never the postcode) and the "Help your council plan" tick are kept in the account's metadata.
- QR codes say which page they came from: `wb-start` (page 4), `wb-local` (12), `wb-calc` (13), `wb-score` (Part 3), `wb-shop` (weekly shopping plan), `wb-remind` (seasonal check), `wb-rescore` (How ready are we now?), `wb-end` (About Fettle), `wb-cover` (back cover). Guide QR codes say `workbook`, and the guide pages pass it on to the check and to /remind. `select * from fettle_funnel()` shows opens per tool and per QR code; `select * from fettle_reminder_signups()` shows reminder sign-ups per area (5 or more).
- Reminder emails (workers/reminders): day 30 and day 90 after a first check, then one each season (5 January, the day after the clocks go forward, 20 July, the day after the clocks go back) with the workbook's seasonal checklist. People with no saved check get the seasonal emails only, linking to the check.
