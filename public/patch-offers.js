/* Patch offers: when a renewal or contract comes up, a better deal we can point to, from a partner who pays us for the
   introduction. Plain functions over plain data, so the owner page, the admin page and the tests agree.

   offer: {id, kind, sectors: ["cafe","salon"], provider, headline, live, rate_from, rate_unit, rate_note, checked_at, regulator_note}
   An offer shows only when it's live and has its link (the link itself stays on the server until they click).
   A price shows only if someone checked it in the last RATE_DAYS days: an old price is worse than none.

   The rules we hold ourselves to:
   - Every offer says we may be paid for the introduction, and that it doesn't change their price.
   - Insurance: no advice and no "this is the best cover". We say what they paid, say compare like for like, and link to
     the insurer or broker, who is authorised by the FCA and does the arranging. Their own quote is the "live rate".
   - Energy: brokers' commission sits inside the unit rate; Ofgem makes brokers say how much before you sign. We say so.
   - Never claim a saving we can't see. A saving shows only when we have what they paid and a checked "from" price for
     the same kind of thing, and it's worded as "could", with the like-for-like warning. */
(function (root) {
  "use strict";

  const RATE_DAYS = 45;
  const KINDS = {
    insurance: { t: "Insurance", verb: "Compare quotes", unit: "a year" },
    energy: { t: "Energy", verb: "Compare energy prices", unit: "a year" },
    card: { t: "Card payments", verb: "Compare card fees", unit: "of takings" },
    waste: { t: "Waste collection", verb: "Get a waste quote", unit: "a month" },
    pat: { t: "PAT testing", verb: "Book a PAT test", unit: "a visit" },
    eicr: { t: "Electrical check (EICR)", verb: "Book an EICR", unit: "a visit" },
    fire: { t: "Fire risk assessment", verb: "Book an assessment", unit: "a visit" },
    gas: { t: "Gas safety", verb: "Book a gas safety check", unit: "a visit" },
    pest: { t: "Pest control", verb: "Get a pest control quote", unit: "a year" },
  };
  const DISCLOSURE = "We may be paid by them if you buy. It doesn't change what you pay, and we only show deals we'd point a friend to.";
  const NOTES = {
    insurance: "We don't give insurance advice. They arrange the cover and are authorised by the Financial Conduct Authority. Check the cover matches what you have now, not just the price.",
    energy: "Energy brokers are paid a commission inside the price you pay per unit. By Ofgem's rules they must tell you how much before you sign, and you get 14 days to change your mind.",
    card: "Check the monthly fee, the rate per transaction and any contract length or exit fee, not just the headline rate.",
  };

  // Each renewal or contract they track, and which offers belong to it. Kinds come from PatchKits.docFor where it knows them.
  const KIND_OF = [[/insurance/i, "insurance"], [/energy|electric|gas (and|&) electric|gas supply/i, "energy"], [/card (machine|payment)|payments contract|merchant/i, "card"],
    [/waste|bin/i, "waste"], [/portable|pat\b/i, "pat"], [/eicr|electrical installation/i, "eicr"], [/fire/i, "fire"], [/gas safety|gas check/i, "gas"], [/pest/i, "pest"]];
  const kindOf = title => (KIND_OF.find(([re]) => re.test(title || "")) || [])[1] || null;

  // The renewals and contracts each kind of business is reminded of from the start: [title, every n months].
  const DEFAULTS = {
    cafe: [["Insurance renewal", 12], ["Energy contract end", 12], ["Card machine contract review", 12], ["Waste collection contract", 12], ["Fire risk assessment review", 12],
      ["Gas safety check", 12], ["Pest control visit", 3], ["Allergen information check", 6], ["Pavement licence renewal", 12], ["Electrical installation check (EICR)", 60], ["Portable appliance testing", 12]],
    salon: [["Insurance renewal", 12], ["Energy contract end", 12], ["Card machine contract review", 12], ["Waste collection contract", 12], ["Fire risk assessment review", 12],
      ["Treatment licence or skin piercing registration", 12], ["Electrical installation check (EICR)", 60], ["Portable appliance testing", 12], ["Patch test and consultation records check", 6]],
  };

  const days = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  const fresh = (o, today) => o.rate_from != null && o.checked_at && days(o.checked_at, today) <= RATE_DAYS && days(o.checked_at, today) >= 0;

  // Live offers for this kind of renewal, for this kind of business. Stale prices are dropped, not shown.
  function offersFor(offers, kind, sector, today) {
    return (offers || []).filter(o => o.live && o.kind === kind && (!o.sectors || !o.sectors.length || o.sectors.includes(sector || "cafe")))
      .map(o => Object.assign({}, o, { rate: fresh(o, today) ? { from: +o.rate_from, unit: o.rate_unit || (KINDS[kind] || {}).unit || "", note: o.rate_note || "", checked: o.checked_at } : null }))
      .sort((a, b) => (a.rate ? a.rate.from : Infinity) - (b.rate ? b.rate.from : Infinity) || String(a.provider).localeCompare(String(b.provider)));
  }

  // What we say beside an offer. last: what they paid last time, read off their renewal ({premium, insurer}).
  function pitch(o, last) {
    const K = KINDS[o.kind] || { verb: "See the deal", unit: "" }, lines = [];
    const paid = last && +last.premium > 0 ? +last.premium : null;
    if (paid && o.kind === "insurance") lines.push(`You paid £${Math.round(paid).toLocaleString("en-GB")}${last.insurer ? " with " + last.insurer : ""} last time. Insurers often put the price up at renewal for people who don't shop around.`);
    if (o.rate) lines.push(`${o.headline ? o.headline + ". " : ""}From £${o.rate.from.toLocaleString("en-GB")} ${o.rate.unit}${o.rate.note ? " (" + o.rate.note + ")" : ""}, checked ${new Date(o.rate.checked + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`);
    else if (o.headline) lines.push(o.headline + ".");
    let saving = null;
    if (paid && o.rate && o.rate.unit === "a year" && o.rate.from < paid) { saving = Math.round(paid - o.rate.from); lines.push(`That could be up to £${saving.toLocaleString("en-GB")} less, if the cover matches.`); }
    return { verb: K.verb, lines, saving, note: o.regulator_note || NOTES[o.kind] || "", disclosure: DISCLOSURE };
  }

  // For the admin page: clicks per offer, and a rough idea of what they're worth.
  function clickSummary(offers, clicks, sinceISO) {
    return (offers || []).map(o => { const c = (clicks || []).filter(x => x.offer_id === o.id && (!sinceISO || String(x.at) >= sinceISO));
      return { id: o.id, provider: o.provider, kind: o.kind, clicks: c.length, owners: new Set(c.map(x => x.request_id).filter(Boolean)).size }; });
  }

  const api = { RATE_DAYS, KINDS, DISCLOSURE, NOTES, DEFAULTS, kindOf, offersFor, pitch, clickSummary };
  root.PatchOffers = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
