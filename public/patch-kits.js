// Patch kits: the "help me do it" part of an action. Each kit turns advice into something ready to use:
// a QR card for reviews, the menu written out for a website, the snippet for a web person, the facts read off a renewal.
(function (root) {
  "use strict";

  /* ---------- Google reviews ---------- */
  // Owners get their review link from Google Business Profile ("Ask for reviews" > copy link): https://g.page/r/<code>/review.
  // We also accept a Place ID, or Google's own write-a-review link.
  function reviewLink(input) {
    const s = String(input || "").trim();
    if (!s) return { error: "Paste your review link first." };
    let m;
    if ((m = /^https?:\/\/g\.page\/r\/([A-Za-z0-9_-]{6,})(?:\/review)?\/?(?:\?.*)?$/.exec(s))) return { url: `https://g.page/r/${m[1]}/review` };
    if ((m = /^https?:\/\/search\.google\.com\/local\/writereview\?(?:.*&)?placeid=([A-Za-z0-9_-]{10,})/.exec(s))) return { url: `https://search.google.com/local/writereview?placeid=${m[1]}` };
    if ((m = /^(ChI[A-Za-z0-9_-]{10,})$/.exec(s))) return { url: `https://search.google.com/local/writereview?placeid=${m[1]}` };
    if (/^https?:\/\/(maps\.app\.goo\.gl|www\.google\.[a-z.]+\/maps|goo\.gl\/maps)/.test(s)) return { error: "That's a link to your place on Maps, not to the review form. In Google Business Profile, tap “Ask for reviews” and copy that link instead." };
    return { error: "That doesn't look like a Google review link. It usually starts https://g.page/r/" };
  }
  const reviewAsk = (name, url) => `Hi! Thanks for coming into ${name}. If you enjoyed it, a quick Google review really helps a small café like ours get found: ${url}\nThank you!`;

  /* ---------- photos ---------- */
  const PHOTO_SHOTS = [
    ["The front, from across the road", "So people recognise you when they arrive. Daylight, no cars in the way."],
    ["Inside, looking in from the door", "Shows the space and seating. Turn the main lights on."],
    ["Your best seat or window table", "The spot people would want. A drink on the table helps."],
    ["The counter with cakes out", "Mid-morning, when it's fullest."],
    ["Your signature drink, close up", "Top-down or at eye level, near a window. Clean cup, no clutter."],
    ["A flat white with latte art", "The drink most people search for."],
    ["Your most popular food", "Plated the way you serve it."],
    ["Breakfast or brunch, if you do it", "Weekend searches look for this."],
    ["The menu board", "Readable, straight on. Google uses it to answer “how much is…”."],
    ["Something only you have", "The dog bowl, the plants, the art, the bake of the week."],
  ];

  /* ---------- the menu, written out for a website ---------- */
  // items: [{t, mine}] from the owner's report, plus anything extra they add. Prices as charged.
  function menuText(name, items) {
    const rows = (items || []).filter(i => i && i.t && i.mine != null && !isNaN(+i.mine));
    const money = x => "£" + (+x).toFixed(2);
    const text = `${name} menu\n\n` + rows.map(i => `${i.t} ... ${money(i.mine)}`).join("\n");
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const html = `<section class="menu">\n  <h2>Our menu</h2>\n  <ul>\n${rows.map(i => `    <li><span>${esc(i.t)}</span> <span>${money(i.mine)}</span></li>`).join("\n")}\n  </ul>\n</section>`;
    return { text, html, n: rows.length };
  }

  /* ---------- structured data for search engines ---------- */
  const DAY = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  function schemaJson(c) {
    const o = { "@context": "https://schema.org", "@type": "CafeOrCoffeeShop", name: c.name };
    if (c.address || c.postcode) o.address = Object.assign({ "@type": "PostalAddress" }, c.address ? { streetAddress: c.address } : {}, c.town ? { addressLocality: c.town } : {}, c.postcode ? { postalCode: c.postcode } : {}, { addressCountry: "GB" });
    if (c.phone) o.telephone = c.phone;
    if (c.url) o.url = /^https?:\/\//.test(c.url) ? c.url : "https://" + c.url;
    if (c.menuUrl) o.hasMenu = c.menuUrl;
    if (c.lat != null && c.lng != null) o.geo = { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng };
    const h = c.hours || {}, spec = Object.keys(DAY).filter(d => Array.isArray(h[d]) && h[d][0] && h[d][1]).map(d => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY[d], opens: h[d][0], closes: h[d][1] }));
    if (spec.length) o.openingHoursSpecification = spec;
    o.servesCuisine = "Coffee";
    return `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`;
  }
  const titleFor = (name, kind, place) => `${name} | ${kind || "Independent café"} in ${place}`;
  function hoursText(hours) {
    const h = hours || {}; return Object.keys(DAY).map(d => `${DAY[d]}: ${h[d] === null ? "Closed" : Array.isArray(h[d]) ? h[d][0] + " to " + h[d][1] : "?"}`).join("\n");
  }
  // A message an owner can send to whoever does their website.
  function webBrief(name, site, fixes) {
    return `Hi,\n\nCould you make a few changes to the ${name} website${site ? " (" + site + ")" : ""}? They help us show up on Google and in AI tools like ChatGPT:\n\n${fixes.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nThanks!`;
  }

  /* ---------- renewals and certificates ---------- */
  // What each reminder's paperwork is, and which date on it matters.
  const DOCS = [
    { match: /insurance/i, kind: "insurance", label: "insurance renewal", every: 12, ask: "the renewal notice or schedule", value: true },
    { match: /fire/i, kind: "fire", label: "fire risk assessment", every: 12, ask: "the assessment" },
    { match: /gas/i, kind: "gas", label: "gas safety certificate", every: 12, ask: "the certificate" },
    { match: /pest/i, kind: "pest", label: "pest control report", every: 3, ask: "the visit report" },
    { match: /allergen/i, kind: "allergen", label: "allergen information", every: 6, ask: "your allergen sheet" },
    { match: /pavement/i, kind: "pavement", label: "pavement licence", every: 12, ask: "the licence" },
    { match: /eicr|electrical installation/i, kind: "eicr", label: "electrical installation report (EICR)", every: 60, ask: "the report" },
    { match: /portable|pat\b/i, kind: "pat", label: "PAT test record", every: 12, ask: "the test record" },
  ];
  const docFor = title => DOCS.find(d => d.match.test(title || "")) || { kind: "other", label: "document", every: 12, ask: "the document" };
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const pad = n => String(n).padStart(2, "0");
  // Every date in the text, with where it was found. UK order (day first).
  function datesIn(text) {
    const out = [], s = String(text || "");
    const push = (y, m, d, i) => { y = +y; if (y < 100) y += 2000; m = +m; d = +d; if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return; out.push({ iso: `${y}-${pad(m)}-${pad(d)}`, i }); };
    let m; const r1 = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g;
    while ((m = r1.exec(s))) push(m[3], m[2], m[1], m.index);
    const r2 = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/gi;
    while ((m = r2.exec(s))) push(m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, m[1], m.index);
    const r3 = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    while ((m = r3.exec(s))) push(m[1], m[2], m[3], m.index);
    return out.sort((a, b) => a.i - b.i);
  }
  const addMonths = (isoD, n) => { const d = new Date(isoD + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  // Reads the facts off a renewal or certificate: when the next one is due, and for insurance, the price and insurer.
  function docFacts(text, title, todayISO) {
    const s = String(text || "").replace(/\s+/g, " "), doc = docFor(title), dates = datesIn(s), out = { kind: doc.kind };
    const near = re => { let m, best = null; const g = new RegExp(re.source, "gi"); while ((m = g.exec(s))) { const d = dates.find(x => x.i > m.index && x.i - m.index < 90); if (d) { best = d.iso; break; } } return best; };
    // "Period of insurance: 01/12/2026 to 30/11/2027": the second date is the end.
    const period = /period of (?:insurance|cover)[^0-9]{0,30}(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\s+[a-z]+\s+\d{4})\s*(?:to|until|-|–)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}\s+[a-z]+\s+\d{4})/i.exec(s);
    const due = (period && datesIn(period[2])[0] && datesIn(period[2])[0].iso)
      || near(/(?:renewal date|renews on|expiry date|expires?(?: on)?|expiry|valid (?:until|to)|end date|next (?:inspection|test|service|visit|review|assessment)(?: due)?(?: date)?|due date|re-?test (?:date|due)|recommended date of next)/);
    const done = near(/(?:date of (?:inspection|test|assessment|service|visit|issue)|inspected on|tested on|carried out on|assessment date|visit date|issue date|start date|inception date|effective date)/);
    if (due) { out.due = due; out.dueFrom = "the document"; }
    else if (done) { out.due = addMonths(done, doc.every); out.dueFrom = `${doc.every} months after ${done}`; }
    else if (dates.length) { const later = dates.map(d => d.iso).filter(d => !todayISO || d > todayISO).sort(); if (later.length) { out.due = later[later.length - 1]; out.dueFrom = "the latest date on it (check it)"; } }
    if (done) out.done = done;
    if (doc.kind === "insurance") {
      const p = /(?:total (?:annual )?premium|annual premium|total (?:amount )?payable|amount payable|premium(?: inc(?:luding)? IPT)?|total cost|you pay)[^£0-9]{0,30}£\s?([0-9][0-9,]*(?:\.\d{2})?)/i.exec(s);
      if (p) out.premium = +p[1].replace(/,/g, "");
      const ins = /(?:[Ii]nsurer|[Uu]nderwritten by|[Ii]nsured with|[Pp]rovider)\s*:?\s*([A-Z][A-Za-z&'.\- ]{2,50}?)(?=\s{2,}|[,.;]|\s+(?:Limited|Ltd|plc|Policy|Period|Address|Registered)\b|$)/.exec(s);
      if (ins) out.insurer = ins[1].trim();
      const pol = /policy (?:number|no\.?|ref(?:erence)?)\s*:?\s*([A-Z0-9][A-Z0-9\/\-]{4,30})/i.exec(s);
      if (pol) out.policy = pol[1];
    }
    return out;
  }
  // What to do before the next one is due.
  function renewalSteps(kind, facts) {
    if (kind === "insurance") return [`Get two quotes about four weeks before it renews${facts && facts.premium ? `: you paid £${facts.premium.toLocaleString("en-GB")} last time` : ""}`, "Check the cover still fits: seats, takings, outside seating, staff numbers", "Don't let it auto-renew without comparing"];
    if (kind === "gas") return ["Book a Gas Safe registered engineer", "Keep the certificate where an inspector can see it"];
    if (kind === "eicr") return ["Book a qualified electrician (NICEIC or NAPIT)", "Fix anything marked C1 or C2 straight away"];
    if (kind === "fire") return ["Walk through it with whoever does it: exits, alarms, extinguishers, training", "Update it if anything changed: layout, equipment, staff"];
    if (kind === "pest") return ["Keep the report with your food safety records", "Fix anything they flagged before the next visit"];
    return ["Book it in before it's due", "Keep the paperwork with your records"];
  }

  const api = { reviewLink, reviewAsk, PHOTO_SHOTS, menuText, schemaJson, titleFor, hoursText, webBrief, DOCS, docFor, datesIn, docFacts, renewalSteps, addMonths };
  // Always on the global too, so the server bundle (where `module` exists) can share these between files.
  root.PatchKits = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
