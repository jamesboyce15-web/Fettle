// Patch front desk: the logic for sole traders' pages, enquiries, bills and the WhatsApp messages, in one place.
// Used by the public business page (server-rendered at /b/<slug>, and b.html in the demo), admin (members.html) and tests.
(function (root) {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = n => n == null || n === "" || isNaN(+n) ? "" : "£" + (+n % 1 ? (+n).toFixed(2) : String(+n));
  const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n || 200);

  // Where customers said they found the business. Asked on every enquiry; reported as they said it.
  const SOURCES = [["chatgpt", "ChatGPT"], ["google", "Google or Google Maps"], ["gemini", "Gemini"], ["claude", "Claude"], ["other_ai", "Another AI assistant"],
    ["facebook", "Facebook"], ["instagram", "Instagram"], ["friend", "A friend or family"], ["other", "Somewhere else"]];
  const SOURCE = Object.fromEntries(SOURCES);
  const AI_SOURCES = ["chatgpt", "gemini", "claude", "other_ai"];

  // Each trade: the words used, the schema.org type, the questions an owner needs answered before they can reply,
  // starter services and FAQs (the owner's own answers replace these), and the searches to check in AI assistants.
  const COMMON_END = [{ k: "when", t: "When are you looking?", ph: "e.g. Saturday morning, or any weekday after 3" },
    { k: "district", t: "Your postcode area", ph: "e.g. SK4", short: true },
    { k: "notes", t: "Anything else?", long: true },
    { k: "cname", t: "Your first name (optional)", short: true }];
  const TRADES = {
    groomer: { t: "Dog groomer", one: "dog groomer", type: "LocalBusiness", icon: "dog",
      questions: [{ k: "breed", t: "Breed", ph: "e.g. Cockapoo", req: true }, { k: "size", t: "Size", opts: ["Small", "Medium", "Large", "Giant"] },
        { k: "age", t: "Age", ph: "e.g. 3 years, or 14 weeks", short: true }, { k: "coat", t: "Coat right now", opts: ["Normal", "A bit matted", "Very matted", "Not sure"] }, { k: "service", t: "What would you like?", service: true }],
      services: [["Full groom, small dog", 40], ["Full groom, medium dog", 45], ["Full groom, large dog", 55], ["Bath and tidy", 30], ["Puppy introduction", 25], ["Nail clip", 10]],
      faqs: [["Do you groom nervous or anxious dogs?", ""], ["Can you deal with a matted coat?", ""], ["How long does a full groom take?", ""], ["Do you collect and drop off?", ""], ["How often should my dog be groomed?", ""]],
      searches: ["dog groomer near {d}", "dog groomer in {t}", "{s} groomer in {t}", "mobile dog groomer {t}", "best dog groomer {t}"] },
    hair: { t: "Hairdresser", one: "hairdresser", type: "HairSalon", questions: [{ k: "service", t: "What would you like?", service: true }, { k: "hair", t: "Your hair now", ph: "e.g. shoulder length, coloured" }],
      services: [["Cut and blow-dry", 40], ["Dry cut", 26], ["Root colour", 40], ["Full head highlights", 85]], faqs: [["Do you do home visits?", ""], ["Do you need a skin test before colour?", ""], ["Do you cut curly hair?", ""]],
      searches: ["hairdresser near {d}", "hairdresser in {t}", "mobile hairdresser {t}", "{s} {t}", "best hairdresser {t}"] },
    barber: { t: "Barber", one: "barber", type: "HairSalon", questions: [{ k: "service", t: "What would you like?", service: true }],
      services: [["Haircut", 20], ["Skin fade", 22], ["Beard trim", 12], ["Cut and beard", 28]], faqs: [["Do you take walk-ins?", ""], ["Do you cut children's hair?", ""]],
      searches: ["barber near {d}", "barber in {t}", "skin fade {t}", "{s} {t}", "best barber {t}"] },
    nails: { t: "Nail technician", one: "nail technician", type: "NailSalon", questions: [{ k: "service", t: "What would you like?", service: true }],
      services: [["Gel manicure", 28], ["BIAB", 35], ["Gel removal", 10]], faqs: [["How long does BIAB last?", ""], ["Do you do home visits?", ""]],
      searches: ["nail technician near {d}", "BIAB nails {t}", "gel nails {t}", "{s} {t}", "best nails {t}"] },
    beauty: { t: "Beauty therapist", one: "beauty therapist", type: "BeautySalon", questions: [{ k: "service", t: "What would you like?", service: true }],
      services: [["Brow shape", 12], ["Lash lift", 45], ["Brow lamination", 38]], faqs: [["Do you need a patch test?", ""], ["Do you work from home or a salon?", ""]],
      searches: ["beauty therapist near {d}", "lash lift {t}", "brow lamination {t}", "{s} {t}", "best beauty salon {t}"] },
    valeting: { t: "Car valeter", one: "car valeter", type: "AutoWash", questions: [{ k: "car", t: "Make and model", ph: "e.g. Ford Focus", req: true }, { k: "service", t: "What would you like?", service: true }, { k: "where", t: "Where's the car?", opts: ["At my home", "At work", "I'll bring it"] }],
      services: [["Mini valet", 30], ["Full valet", 90], ["Interior only", 60]], faqs: [["Do you need water or power from me?", ""], ["Can you remove dog hair?", ""]],
      searches: ["mobile car valeting near {d}", "car valet {t}", "car detailing {t}", "{s} {t}", "best car valeting {t}"] },
    driving: { t: "Driving instructor", one: "driving instructor", type: "DrivingSchool", questions: [{ k: "gearbox", t: "Manual or automatic?", opts: ["Manual", "Automatic", "Not sure"] }, { k: "before", t: "Lessons so far", opts: ["None yet", "A few", "Lots, test soon"] }, { k: "service", t: "What would you like?", service: true }],
      services: [["1 hour lesson", 38], ["Block of 10 hours", 360], ["Test day", 80]], faqs: [["Do you pick up from home or college?", ""], ["What are your pass rates?", ""]],
      searches: ["driving instructor near {d}", "driving lessons {t}", "automatic driving lessons {t}", "{s} {t}", "best driving instructor {t}"] },
    tutor: { t: "Tutor", one: "tutor", type: "EducationalOrganization", questions: [{ k: "subject", t: "Subject", req: true }, { k: "level", t: "Year or level", ph: "e.g. Year 10, GCSE" }, { k: "service", t: "What would you like?", service: true }],
      services: [["1 hour lesson", 35], ["1 hour online", 30]], faqs: [["Do you teach online?", ""], ["Are you DBS checked?", ""]],
      searches: ["tutor near {d}", "maths tutor {t}", "GCSE tutor {t}", "{s} {t}", "best tutor {t}"] },
    other: { t: "Local business", one: "local business", type: "LocalBusiness", questions: [{ k: "service", t: "What would you like?", service: true }], services: [], faqs: [], searches: ["{s} near {d}", "{s} in {t}", "best {s} {t}"] },
  };
  const trade = k => TRADES[k] || TRADES.other;

  // A UK mobile or landline in international form without the plus: 07700 900123 -> 447700900123. Null if it can't be one.
  function waNumber(raw) {
    let s = String(raw || "").replace(/[^\d+]/g, "");
    if (s.startsWith("+")) s = s.slice(1); else if (s.startsWith("00")) s = s.slice(2); else if (s.startsWith("0")) s = "44" + s.slice(1);
    if (s.startsWith("440")) s = "44" + s.slice(3);
    return /^[1-9]\d{9,14}$/.test(s) ? s : null;
  }
  const waLink = (num, text) => `https://wa.me/${num}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  const slugify = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/['’‘`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  // Only what the business has said. Services: [{name, price, from, note}]; prices are numbers or empty.
  function services(m) { return (m.services || []).filter(s => s && clean(s.name)).map(s => ({ name: clean(s.name, 80), price: s.price === "" || s.price == null || isNaN(+s.price) ? null : +s.price, from: !!s.from, note: clean(s.note, 120) })); }
  function priceRange(m) { const p = services(m).map(s => s.price).filter(x => x != null && x > 0); if (!p.length) return null; const lo = Math.min(...p), hi = Math.max(...p); return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`; }
  const faqs = m => (m.faqs || []).filter(f => f && clean(f.q) && clean(f.a)).map(f => ({ q: clean(f.q, 160), a: clean(f.a, 600) }));
  const placeLine = m => { const T = trade(m.trade); const where = [m.locality, m.town].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(", "); return `${m.mobile ? "Mobile " + T.one : T.t}${where ? " in " + where : ""}`; };

  // The searches a customer would type, for this business. {d}=district, {t}=town, {s}=main specialism or trade word.
  function searches(m) {
    if (Array.isArray(m.searches) && m.searches.filter(Boolean).length) return m.searches.map(q => clean(q, 120)).filter(Boolean);
    const T = trade(m.trade), d = (m.districts || [])[0] || m.town || "", t = m.locality || m.town || "", s = (m.specialisms || [])[0] || T.one;
    return T.searches.map(q => q.replace("{d}", d).replace("{t}", t).replace("{s}", s).replace(/\s+/g, " ").trim()).filter((q, i, a) => q && a.indexOf(q) === i);
  }

  /* ---------- enquiries ---------- */
  // Keep only the answers this trade asks, trimmed; true if the required ones are there.
  function cleanAnswers(tradeKey, a) {
    const qs = trade(tradeKey).questions.concat(COMMON_END), out = {};
    qs.forEach(q => { const v = clean((a || {})[q.k], q.long ? 600 : 120); if (v) out[q.k] = v; });
    const ok = qs.filter(q => q.req).every(q => out[q.k]);
    return { answers: out, ok };
  }
  // The WhatsApp message the customer sends. Short, with everything the owner needs to reply.
  function compose(m, a, source) {
    const T = trade(m.trade), qs = T.questions, parts = [];
    const found = source && SOURCE[source] && source !== "other" && source !== "friend" ? ` I found you on ${SOURCE[source].replace(" or Google Maps", "")}.` : "";
    parts.push(`Hi ${clean(m.name, 80)},${found}`);
    if (a.service) parts.push(`I'd like: ${a.service}.`);
    const facts = qs.filter(q => q.k !== "service" && a[q.k]).map(q => (q.k === "breed" || q.k === "car" || q.k === "subject") ? a[q.k] : `${q.t.replace(/\?$/, "").toLowerCase()}: ${a[q.k]}`);
    if (facts.length) parts.push((m.trade === "groomer" ? "My dog: " : "") + facts.join(", ") + ".");
    if (a.when) parts.push(`When: ${a.when}.`);
    if (a.district) parts.push(`Area: ${a.district}.`);
    if (a.notes) parts.push(a.notes);
    if (a.cname) parts.push(`Thanks, ${a.cname}`);
    return parts.join("\n");
  }

  /* ---------- bills ---------- */
  // Fair-play rules: only enquiries sent through the Patch page count; voided ones never count; the first 3 ever are free;
  // then a fixed price each, never more than the monthly cap. Plus is a flat monthly price. month: "2026-11".
  const PRICES = { per: 4, cap: 29, founding_cap: 19, plus: 39, free: 3 };
  function bill(m, enquiries, month) {
    const mine = (enquiries || []).filter(e => e.member_id === m.id).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const counted = mine.filter(e => !e.voided), freeIds = new Set(counted.slice(0, PRICES.free).map(e => e.id));
    const inMonth = mine.filter(e => String(e.at).slice(0, 7) === month), live = inMonth.filter(e => !e.voided);
    const free = live.filter(e => freeIds.has(e.id)).length, charged = live.length - free;
    const per = m.per_enquiry != null ? +m.per_enquiry : PRICES.per, cap = m.cap != null ? +m.cap : (m.founding ? PRICES.founding_cap : PRICES.cap);
    const plus = m.plan === "plus";
    const amount = plus ? (m.plus_price != null ? +m.plus_price : PRICES.plus) : Math.min(charged * per, cap);
    const freeLeft = Math.max(0, PRICES.free - counted.length);
    return { month, total: inMonth.length, voided: inMonth.length - live.length, counted: live.length, free, charged, per, cap, plus, amount: Math.round(amount * 100) / 100, capped: !plus && charged * per > cap, freeLeft };
  }
  function bySource(list) { const o = {}; (list || []).filter(e => !e.voided).forEach(e => { const k = SOURCE[e.source] ? e.source : "other"; o[k] = (o[k] || 0) + 1; }); return o; }

  /* ---------- local prices, from businesses' own price lists ---------- */
  // The front desk's half of Patch's price data. Ranges are only shown from MIN_PEERS or more businesses (never one named
  // business's price to another), matching the area pages. Services match on their name, so starter lists keep names in line.
  const MIN_PEERS = 5;
  const svcKey = n => clean(n).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const median = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const pct = (a, q) => { const b = a.slice().sort((x, y) => x - y), i = (b.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return b[lo] + (b[hi] - b[lo]) * (i - lo); };
  function localPrices(members, tradeKey, town, exceptId) {
    const out = {}, t = svcKey(town);
    (members || []).filter(m => m && m.trade === tradeKey && svcKey(m.town) === t && m.id !== exceptId && ["live", "setup", "paused"].includes(m.status))
      .forEach(m => { const seen = new Set(); services(m).forEach(s => { if (s.price == null || s.price <= 0 || s.from) return; const k = svcKey(s.name); if (!k || seen.has(k)) return; seen.add(k); (out[k] = out[k] || { name: s.name, prices: [] }).prices.push(s.price); }); });
    Object.values(out).forEach(o => { o.n = o.prices.length; o.ok = o.n >= MIN_PEERS; if (o.ok) { o.median = median(o.prices); o.low = Math.round(pct(o.prices, 0.25)); o.high = Math.round(pct(o.prices, 0.75)); } delete o.prices; });
    return out;
  }
  // This business's services against the local figures: only where there are enough others.
  function compareLocal(m, members) {
    const L = localPrices(members, m.trade, m.town, m.id);
    return services(m).filter(s => s.price != null && !s.from).map(s => { const o = L[svcKey(s.name)]; return o && o.ok ? { name: s.name, mine: s.price, median: o.median, low: o.low, high: o.high, n: o.n } : null; }).filter(Boolean);
  }

  /* ---------- AI checks ---------- */
  // checks: [{at, engine, q, named, prices, contact, notes}]. The first day's checks are "before"; the latest day's are "now".
  function aiSummary(checks) {
    const list = (checks || []).filter(c => c && c.at && c.q).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    if (!list.length) return null;
    const days = [...new Set(list.map(c => String(c.at).slice(0, 10)))], f = d => { const c = list.filter(x => String(x.at).slice(0, 10) === d); return { at: d, n: c.length, named: c.filter(x => x.named).length, prices: c.filter(x => x.prices).length, contact: c.filter(x => x.contact).length, engines: [...new Set(c.map(x => x.engine))] }; };
    return { before: f(days[0]), now: f(days[days.length - 1]), days: days.length };
  }

  /* ---------- setup checklist ---------- */
  // What has to be true for AI to find, understand and contact the business. listings: {key: true|"date"}.
  const SETUP = [
    ["profile", "Owner approved the summary", "Send them the summary message and get a yes."],
    ["page", "Patch page live", "Status Live, page opens, enquiry form sends a test message."],
    ["gbp", "Google Business Profile in the owner's name", "Category, service area, every service with a price, hours, photos. Website or appointment link = the Patch page."],
    ["bing", "Bing Places", "Import from Google (bingplaces.com). ChatGPT leans on Bing."],
    ["apple", "Apple Business Connect", "Same name, phone, area and category."],
    ["yelp", "Yelp", "Free listing; Yelp licenses its data to ChatGPT. Link the Patch page."],
    ["facebook", "Facebook page points to the Patch page", "Button: Send WhatsApp message or Book now, with the Patch link. Prices in the About text, not only in photos."],
    ["instagram", "Instagram bio link", "If they use it."],
    ["reviews", "Review requests going out", "After every visit, the same WhatsApp to every customer with their Google review link. Not only happy ones, no suggested wording, nothing offered in return: Google and UK law ban all three."],
    ["before", "First AI check recorded", "The 'before' screenshots and named / not named, for the report."]];
  function setupProgress(m) { const l = m.listings || {}; const done = SETUP.filter(([k]) => l[k]).length; return { done, of: SETUP.length, next: (SETUP.find(([k]) => !l[k]) || [])[1] || null }; }

  /* ---------- WhatsApp messages James sends (copied, or opened in WhatsApp; never sent automatically) ---------- */
  const first = n => clean(n).split(/\s+/)[0] || "there";
  // The opener, after a free check: honest about what the check found.
  function openerMessage(m, checks, from) {
    const s = aiSummary(checks), T = trade(m.trade), q = (searches(m)[0] || `${T.one} near you`);
    const result = !s ? `I'll check what ChatGPT and Google say when someone asks for "${q}".` : s.now.named === 0
      ? `I asked AI assistants ${s.now.n} of the questions your customers ask, like "${q}". You weren't named in any of them.`
      : `I asked AI assistants ${s.now.n} of the questions your customers ask, like "${q}". You were named in ${s.now.named}.`;
    return `Hi ${first(m.owner_name)}, I'm ${clean(from) || "James"} from Patch, in ${clean(m.town) || "your area"}.\n\n${result}\n\nPatch gets small businesses found by AI, with enquiries going straight to your WhatsApp. Setup is free and takes 15 minutes. Your first 3 enquiries are free, then it's £${PRICES.per} each, never more than £${m.founding ? PRICES.founding_cap : PRICES.cap} a month. No contract.\n\nWant me to send you the screenshots?`;
  }
  // "Here's what we'll tell the world": the owner checks the facts before anything goes live.
  function summaryMessage(m) {
    const sv = services(m), T = trade(m.trade);
    return `Hi ${first(m.owner_name)}, here's what we'll put on Google, Bing, Apple, Yelp and your Patch page. Anything wrong, just reply with the change.\n\n${clean(m.name, 120)}: ${placeLine(m)}.\n`
      + (m.area_text ? `Area covered: ${clean(m.area_text, 200)}.\n` : "") + (m.specialisms && m.specialisms.length ? `Good at: ${m.specialisms.join(", ")}.\n` : "")
      + (sv.length ? `\n${sv.map(s => `• ${s.name}${s.price != null ? `: ${s.from ? "from " : ""}${money(s.price)}` : ""}`).join("\n")}\n` : "")
      + (m.hours ? `\nHours: ${clean(m.hours, 200)}\n` : "") + `\nEnquiries come to this WhatsApp number. Customers will be asked: ${T.questions.map(q => q.t.replace(/\?$/, "").toLowerCase()).join(", ")}, when, and their area.`;
  }
  // The monthly report: what came in, what AI says now, the bill, one thing to do.
  function reportMessage(m, enquiries, checks, month, members) {
    const b = bill(m, enquiries, month), src = bySource((enquiries || []).filter(e => e.member_id === m.id && String(e.at).slice(0, 7) === month)), s = aiSummary(checks);
    const label = new Date(month + "-15T12:00:00Z").toLocaleDateString("en-GB", { month: "long" });
    const srcTxt = Object.entries(src).sort((a, c) => c[1] - a[1]).map(([k, n]) => `${n} from ${SOURCE[k].replace("Google or Google Maps", "Google").replace("A friend or family", "friends").replace("Somewhere else", "elsewhere")}`).join(", ");
    const ai = s ? (s.days > 1 ? `AI assistants named you in ${s.now.named} of ${s.now.n} searches, up from ${s.before.named} of ${s.before.n} when we started.` : `AI assistants named you in ${s.now.named} of ${s.now.n} searches.`).replace("up from", s.now.named < s.before.named ? "down from" : s.now.named === s.before.named ? "the same as" : "up from") : "";
    const money2 = n => "£" + (+n).toFixed(2).replace(/\.00$/, "");
    const billTxt = b.plus ? `Bill: ${money2(b.amount)} (Plus).` : b.charged ? `Bill: ${money2(b.amount)} (${b.charged} at ${money2(b.per)}${b.capped ? `, capped at ${money2(b.cap)}` : ""}${b.free ? `, and ${b.free} free` : ""}).` : b.free ? `Bill: £0. ${b.free} of your free enquiries used, ${b.freeLeft} left.` : "Bill: £0.";
    const cmp = members ? compareLocal(m, members) : [], c0 = cmp.sort((a, c) => Math.abs(c.mine - c.median) / c.median - Math.abs(a.mine - a.median) / a.median)[0];
    const priceTxt = c0 ? `\nLocal prices: ${c0.name} is ${money(c0.mine)} with you; most ${trade(m.trade).one}s in ${clean(m.town)} charge ${money(c0.low)}–${money(c0.high)} (${c0.n} on Patch).\n` : "";
    // Review advice follows Google's rules and UK law: ask every customer the same way, one at a time after their visit;
    // never only the happy ones, never tell them what to write, never offer anything for it. The owner's own replies are theirs to word.
    const todo = (m.listings || {}).reviews ? "Reply to your newest Google reviews, saying in your own words what you did (\"Bella's first full groom\"). AI reads replies too." : "After every appointment, send that customer your Google review link, the same short message each time. Ask everyone, not just regulars.";
    return `Hi ${first(m.owner_name)}, your ${label} with Patch:\n\n${b.counted ? `${b.counted} enquir${b.counted === 1 ? "y" : "ies"}${srcTxt ? ` (${srcTxt})` : ""}.` : "No enquiries through Patch this month."}${b.voided ? ` ${b.voided} voided.` : ""}\n${ai ? ai + "\n" : ""}${priceTxt}${billTxt}\n\nOne thing to do: ${todo}\n\nReply VOID with the date to remove any enquiry that wasn't real. Reply STOP to leave at any time.`;
  }

  /* ---------- the public page ---------- */
  // schema.org for the business, its services and prices, its FAQs. Only what the owner has told us.
  function schema(m, url) {
    const T = trade(m.trade), sv = services(m), num = waNumber(m.whatsapp);
    const biz = { "@context": "https://schema.org", "@type": T.type, "@id": url + "#business", name: clean(m.name, 120), url, description: clean(m.about || placeLine(m), 600) };
    if (T.type === "LocalBusiness" && m.trade === "groomer") biz.additionalType = "https://en.wikipedia.org/wiki/Dog_grooming";
    if (num) biz.telephone = "+" + num;
    const pr = priceRange(m); if (pr) biz.priceRange = pr;
    if (!m.mobile && (m.postcode || m.town)) biz.address = Object.assign({ "@type": "PostalAddress", addressCountry: "GB" }, m.postcode ? { postalCode: clean(m.postcode, 10) } : {}, m.town ? { addressLocality: clean(m.locality || m.town, 60) } : {}, m.street ? { streetAddress: clean(m.street, 120) } : {});
    const areas = [].concat(m.districts || [], m.locality ? [m.locality] : [], m.town ? [m.town] : []).filter((x, i, a) => x && a.indexOf(x) === i);
    if (areas.length) biz.areaServed = areas.map(a => ({ "@type": "Place", name: clean(a, 60) }));
    if (m.hours_spec && m.hours_spec.length) biz.openingHoursSpecification = m.hours_spec;
    const same = [m.facebook, m.instagram, m.website, m.google_url].filter(u => /^https:\/\//.test(u || ""));
    if (same.length) biz.sameAs = same;
    if (m.specialisms && m.specialisms.length) biz.knowsAbout = m.specialisms.map(s => clean(s, 60));
    if (sv.length) biz.hasOfferCatalog = { "@type": "OfferCatalog", name: "Services and prices", itemListElement: sv.map(s => Object.assign({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name, description: s.note || undefined } },
      s.price != null ? (s.from ? { priceSpecification: { "@type": "PriceSpecification", minPrice: s.price, priceCurrency: "GBP" } } : { price: s.price, priceCurrency: "GBP" }) : {})) };
    biz.potentialAction = { "@type": "CommunicateAction", name: "Send an enquiry", target: url + "#enquire" };
    const out = [biz], fq = faqs(m);
    if (fq.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: fq.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
    return out;
  }
  const jsonLd = o => JSON.stringify(o).replace(/</g, "\\u003c");

  // The whole page, as HTML. opts: {url, preview, demo}. Plain words, real prices as text, no images needed: what AI reads.
  function pageHtml(m, opts) {
    opts = opts || {};
    const T = trade(m.trade), sv = services(m), fq = faqs(m), url = opts.url || "", num = waNumber(m.whatsapp), title = `${clean(m.name, 80)}: ${placeLine(m)}`;
    const desc = clean(`${placeLine(m)}.${m.specialisms && m.specialisms.length ? " " + m.specialisms.slice(0, 3).join(", ") + "." : ""}${priceRange(m) ? " Prices " + priceRange(m) + "." : ""} Send an enquiry on WhatsApp.`, 300);
    const updated = String(m.updated_at || m.live_at || "").slice(0, 10);
    const qs = T.questions.concat(COMMON_END), svcOpts = sv.map(s => s.name);
    const field = q => {
      const id = "q_" + q.k, req = q.req ? " required" : "", lab = `<label for="${id}">${esc(q.t)}${q.req ? "" : ""}</label>`;
      if (q.service) return svcOpts.length ? `<div class="fld">${lab}<select id="${id}" name="${q.k}"><option value="">Choose</option>${svcOpts.map(o => `<option>${esc(o)}</option>`).join("")}<option>Something else</option></select></div>` : `<div class="fld">${lab}<input id="${id}" name="${q.k}" maxlength="120"></div>`;
      if (q.opts) return `<div class="fld">${lab}<select id="${id}" name="${q.k}"${req}><option value="">Choose</option>${q.opts.map(o => `<option>${esc(o)}</option>`).join("")}</select></div>`;
      if (q.long) return `<div class="fld wide">${lab}<textarea id="${id}" name="${q.k}" maxlength="600" rows="3"></textarea></div>`;
      return `<div class="fld${q.short ? "" : ""}">${lab}<input id="${id}" name="${q.k}" maxlength="120"${q.ph ? ` placeholder="${esc(q.ph)}"` : ""}${req}${q.k === "cname" ? ' autocomplete="given-name"' : ""}></div>`;
    };
    const plain = num ? waLink(num, `Hi ${clean(m.name, 80)}, I'd like to ask about an appointment.`) : "";
    return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${url ? `<link rel="canonical" href="${esc(url)}">` : ""}
${opts.preview || m.status !== "live" ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="business.business">${url ? `<meta property="og:url" content="${esc(url)}">` : ""}
${schema(m, url).map(o => `<script type="application/ld+json">${jsonLd(o)}</script>`).join("")}
<style>
:root{--bg:#f6f4ef;--card:#fff;--ink:#1c2420;--mute:#5d6863;--line:#dfe3dc;--accent:#1f6b4f;--accent-ink:#fff;--wa:#128c4a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:20px max(16px,env(safe-area-inset-left)) 40px max(16px,env(safe-area-inset-right))}
h1{font-size:1.75rem;line-height:1.2;margin:8px 0 4px;text-wrap:balance}h2{font-size:1.15rem;margin:0 0 10px}
.sub{color:var(--mute);margin:0 0 14px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin:14px 0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none}.tags li{background:#e9f1ec;color:var(--accent);border-radius:999px;padding:3px 10px;font-size:.88rem}
table{width:100%;border-collapse:collapse}td{padding:8px 0;border-top:1px solid var(--line);vertical-align:top}td.p{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600;padding-left:12px}
td small{display:block;color:var(--mute)}dt{font-weight:600;margin-top:10px}dd{margin:2px 0 0;color:var(--ink)}
.cta{display:inline-flex;align-items:center;gap:8px;background:var(--wa);color:#fff;border:0;border-radius:12px;padding:13px 18px;font:600 1rem system-ui,sans-serif;text-decoration:none;cursor:pointer}
.cta.ghost{background:transparent;color:var(--accent);border:1px solid var(--line)}
form .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 14px}.fld{display:flex;flex-direction:column;gap:4px;min-width:0}.fld.wide{grid-column:1/-1}
label{font-size:.9rem;font-weight:600}input,select,textarea{font:inherit;padding:10px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);width:100%}
.note{font-size:.85rem;color:var(--mute)}.err{color:#a3261b;font-weight:600}.foot{font-size:.8rem;color:var(--mute);text-align:center;margin-top:24px}.foot a{color:inherit}
a{color:var(--accent)}.banner{background:#fff6d6;border:1px solid #ecd98a;border-radius:10px;padding:8px 12px;font-size:.9rem}
</style></head><body><main>
${opts.preview ? `<p class="banner"><b>Preview.</b> ${m.status === "live" ? "This page is live." : "Not live yet: only people with this link can see it, and search engines are told to skip it."}</p>` : ""}
${opts.demo ? `<p class="banner"><b>Demo.</b> A made-up business. Sending opens WhatsApp to a made-up number.</p>` : ""}
<header><p class="sub" style="margin:0">${esc(placeLine(m))}</p><h1>${esc(clean(m.name, 120))}</h1>
${m.about ? `<p>${esc(clean(m.about, 1200))}</p>` : ""}
${m.specialisms && m.specialisms.length ? `<ul class="tags" aria-label="Specialisms">${m.specialisms.map(s => `<li>${esc(clean(s, 60))}</li>`).join("")}</ul>` : ""}
<p style="margin:16px 0 0"><a class="cta" href="#enquire">Send an enquiry on WhatsApp</a></p></header>
${sv.length ? `<section class="card" id="prices"><h2>Services and prices</h2><table>${sv.map(s => `<tr><td>${esc(s.name)}${s.note ? `<small>${esc(s.note)}</small>` : ""}</td><td class="p">${s.price != null ? (s.from ? "from " : "") + esc(money(s.price)) : "Ask"}</td></tr>`).join("")}</table>${updated ? `<p class="note">Prices checked ${esc(new Date(updated + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}.</p>` : ""}</section>` : ""}
<section class="card"><h2>Where and when</h2><dl style="margin:0">
${m.area_text || (m.districts && m.districts.length) ? `<dt>Area covered</dt><dd>${esc(clean(m.area_text, 300) || m.districts.join(", "))}</dd>` : ""}
${!m.mobile && (m.street || m.postcode) ? `<dt>Address</dt><dd>${esc([m.street, m.locality || m.town, m.postcode].filter(Boolean).join(", "))}</dd>` : m.mobile ? `<dt>How it works</dt><dd>Mobile: comes to you.</dd>` : ""}
<dt>Hours</dt><dd>${esc(clean(m.hours, 300) || "By appointment")}</dd>
<dt>Contact</dt><dd>WhatsApp${num ? ` or call <a href="tel:+${num}">${esc(/^44\d{10}$/.test(num) ? "0" + num.slice(2, 6) + " " + num.slice(6) : "+" + num)}</a>` : ""}</dd></dl></section>
${fq.length ? `<section class="card"><h2>Questions people ask</h2><dl style="margin:0">${fq.map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl></section>` : ""}
<section class="card" id="enquire"><h2>Ask about an appointment</h2><p class="note" style="margin-top:0">Fill this in and tap Send. WhatsApp opens with your message written, ready to send to ${esc(first(m.owner_name) !== "there" ? first(m.owner_name) : clean(m.name, 80))}.</p>
<form id="enq" novalidate data-slug="${esc(m.slug)}" data-num="${esc(num || "")}"><div class="grid">${qs.map(field).join("")}
<div class="fld"><label for="q_source">Where did you find us?</label><select id="q_source" name="source"><option value="">Choose</option>${SOURCES.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join("")}</select></div></div>
<p class="err" id="enqErr" role="alert"></p><p><button class="cta" type="submit">Send on WhatsApp</button></p>
<p class="note">Your message goes from your own WhatsApp, so ${esc(clean(m.name, 80))} sees your number and replies there. Patch keeps a copy of your answers (not your number) so the business knows the page is working. <a href="/privacy">Privacy</a>.</p></form>
<noscript>${plain ? `<p><a class="cta" href="${esc(plain)}">Message on WhatsApp</a></p>` : ""}</noscript></section>
<p class="foot">${updated ? `Updated ${esc(updated)}. ` : ""}Page by <a href="/">Patch</a>, which helps small local businesses get found.</p></main>
<script src="${opts.base || "/"}patch-desk.js"></script><script>window.PATCH_MEMBER=${jsonLd(publicMember(m))};${ENQ_SCRIPT}</script></body></html>`;
  }
  // The page's only script: tidy the answers, record the enquiry (so it's counted before WhatsApp opens), open WhatsApp.
  const ENQ_SCRIPT = `(function(){var f=document.getElementById("enq");if(!f)return;var D=window.PatchDesk,e=document.getElementById("enqErr");
f.addEventListener("submit",function(ev){ev.preventDefault();var a={},src="";Array.prototype.forEach.call(f.elements,function(el){if(!el.name)return;if(el.name==="source")src=el.value;else if(el.value.trim())a[el.name]=el.value.trim();});
var need=Array.prototype.filter.call(f.querySelectorAll("[required]"),function(el){return!el.value.trim();});if(need.length){e.textContent="Please fill in: "+need.map(function(el){return f.querySelector('label[for="'+el.id+'"]').textContent;}).join(", ")+".";need[0].focus();return;}
e.textContent="";var M=window.PATCH_MEMBER,text=D.compose(M,a,src),num=f.getAttribute("data-num"),go=function(){location.href=D.waLink(num,text);};
if(!num){e.textContent="Sorry, this business hasn't added its WhatsApp number yet.";return;}
var body={slug:f.getAttribute("data-slug"),source:src,answers:a};
if(window.PatchDeskSend){Promise.resolve(window.PatchDeskSend(body)).then(go,go);return;}
try{fetch("/api/enquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),keepalive:true}).catch(function(){});}catch(x){}
setTimeout(go,150);});})();`;

  // What the page needs to compose messages in the browser: public fields only.
  function publicMember(m) { return { slug: m.slug, name: m.name, trade: m.trade, owner_name: first(m.owner_name) }; }

  const api = { SOURCES, SOURCE, AI_SOURCES, TRADES, trade, COMMON_END, PRICES, SETUP, waNumber, waLink, slugify, services, priceRange, faqs, placeLine, searches,
    cleanAnswers, compose, bill, bySource, MIN_PEERS, localPrices, compareLocal, aiSummary, setupProgress, openerMessage, summaryMessage, reportMessage, schema, pageHtml, publicMember, ENQ_SCRIPT, esc, money };
  root.PatchDesk = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
