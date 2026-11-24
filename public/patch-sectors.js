// Patch sectors: what Patch compares, per kind of business. Cafés compare a basket of drinks and food; salons compare a
// basket of standard services. Each salon service says which published menu lines count, so every area is compared the
// same way: the rules are written down here, not decided by whoever collected the prices.
(function (root) {
  "use strict";

  // How a salon price counts:
  // - Normal prices only: no "last minute", off-peak, "was £x" or special-offer prices.
  // - One price per business per service: the entry price, the cheapest standard version (junior stylist, short hair,
  //   plain colour). That's the price a new customer sees first, and the one owners set against each other.
  // - Standalone services only, unless the service is itself a bundle (a cut and blow-dry). A highlight "with cut & style"
  //   doesn't count as a highlight price.
  // - No courses, children's, seniors', students' or add-on prices.
  // - "From" prices count at the "from" figure, marked as such.
  // - Clinical microneedling (Dermapen, SkinPen, RF) is kept apart from salon facial needling: they are different treatments.
  const NOT = /child|kid|junior|under ?1\d|u1\d|girl|boy|senior|oap|student|course|removal|consult|patch test|add.?on|upgrade/i;
  const SALON_ITEMS = [
    { k: "w_cut_blow", say: /(cut|trim).*(blow|finish)|cut (&|and) blow|cut blow/i, t: "Women's cut and blow-dry", g: "Hair", std: ["Women's cut and blow-dry"], bundle: true, not: /restyle|curly|dry cut|no blow|colou?r|tint|olaplex|highlight|balayage/i },
    { k: "w_dry_cut", say: /dry (hair)?cut|dry\/wet cut|wet (hair)?cut/i, t: "Women's dry cut", g: "Hair", std: ["Women's haircut (no blow-dry)"], not: /below|long|fringe/i },
    { k: "blow_dry", say: /blow ?dry|blowdry|blow wave/i, t: "Blow-dry", g: "Hair", std: ["Blow-dry"], not: /curly|long|med|occasion|up\b|cut|trim|extension|pin/i },
    { k: "root_tint", say: /root (tint|colou?r|touch)|regrowth/i, t: "Root tint", g: "Hair", std: ["Root tint"], solo: true, not: /bleach|tone|cut|blow|style|finish/i },
    { k: "full_colour", say: /full (head )?(colou?r|tint)/i, solo: true, t: "Full head colour", g: "Hair", std: ["Full head colour"], not: /semi|cut|style|blow/i },
    { k: "half_hl", say: /half head (high|foil)/i, solo: true, t: "Half head highlights", g: "Hair", std: ["Half head highlights"], not: /cut|style|toner/i },
    { k: "full_hl", say: /full head (high|foil)/i, solo: true, t: "Full head highlights", g: "Hair", std: ["Full head highlights"], not: /cut|style|toner/i },
    { k: "balayage", say: /balayage/i, t: "Balayage", g: "Hair", std: ["Balayage"] },
    { k: "m_cut", say: /hair ?cut|\bcut\b|scissor/i, solo: true, t: "Men's haircut", g: "Barber", std: ["Standard haircut", "Men's haircut", "Scissor cut"], not: /crew|clipper|buzz|wash|beard|package|dads|restyle|fade|fringe/i },
    { k: "skin_fade", say: /skin fade|taper fade|skin \/ taper/i, t: "Skin fade", g: "Barber", std: ["Skin fade"], not: /beard|crew/i },
    { k: "beard", say: /beard (trim|shap|groom)/i, t: "Beard trim", g: "Barber", std: ["Beard trim"], not: /hair|cut|fade/i },
    { k: "cut_beard", say: /(hair|cut).*(&|and|\+).*beard/i, t: "Haircut and beard", g: "Barber", std: ["Hair and beard package"], bundle: true, not: /fade|full package|design/i },
    { k: "gel_mani", say: /gel (polish|mani|nails)|shellac|file (&|and) gel/i, t: "Gel manicure (hands)", g: "Nails", std: ["Gel manicure"], not: /hands (&|and) feet|toes|feet|pedi|biab|builder|extension|hard gel|art/i },
    { k: "biab", say: /biab|builder gel/i, t: "BIAB overlay", g: "Nails", std: ["BIAB"], not: /extension|french/i },
    { k: "acrylic_full", say: /acrylic.*(full|new) set|full set acrylic/i, t: "Acrylic full set", g: "Nails", std: ["Acrylic extensions"], not: /french|overlay/i },
    { k: "pedicure", say: /(gel|shellac).*(toe|pedi)/i, t: "Gel pedicure (toes)", g: "Nails", std: ["Pedicure"], match: /gel|shellac/i, not: /deluxe|luxury|without|removal/i },
    { k: "brow_shape", say: /eye ?brow (wax|thread|shap)/i, t: "Eyebrow wax or thread", g: "Brows and lashes", std: ["Eyebrow shaping"], not: /tint|hd|permanent|hair stroke|lamination/i },
    { k: "brow_lam", say: /brow lamination/i, t: "Brow lamination", g: "Brows and lashes", std: ["Brow lamination"] },
    { k: "lash_lift", say: /lash lift/i, t: "Lash lift", g: "Brows and lashes", std: ["Lash lift"], not: /lower|brow/i },
    { k: "lash_classic", say: /classic.*lash|lash extension/i, t: "Lash extensions, full set", g: "Brows and lashes", std: ["Eyelash extensions"], not: /russian|volume|hybrid|2 hour|infill|refill/i },
    { k: "leg_wax", say: /full leg/i, t: "Full leg wax", g: "Beauty", std: ["Waxing"], match: /full leg/i },
    { k: "facial", say: /^(standard |classic |signature )?facial\b/i, t: "Facial (standard)", g: "Beauty", std: ["Standard facial"] },
    { k: "massage", say: /full body massage|massage.*(60|1 ?h)/i, t: "Full body massage (1 hour)", g: "Beauty", std: ["Body treatments"], match: /full body|60 ?min|1 ?h/i, not: /hot stone|30 ?min|spray|tan/i },
    { k: "needling", say: /micro ?needl/i, t: "Microneedling (salon facial)", g: "Skin", std: ["Microneedling"], not: /dermapen|skinpen|radio|rf\b|dermaplaning/i },
    { k: "needling_clin", say: /micro ?needl|dermapen|skinpen/i, t: "Microneedling (clinical device)", g: "Skin", std: ["Microneedling", "Dermapen 4™ Microneedling"], match: /dermapen|skinpen|radio|rf\b/i },
  ];
  const ITEM = Object.fromEntries(SALON_ITEMS.map(i => [i.k, i]));

  // Which of our services a published menu line is, or null. `row` has std (the collector's standard name), name
  // (as published), bundle (package or standalone) and promo (Normal or the offer).
  // With no collector's name (a sweep, an owner's own menu, a booking page), the published name decides, and the kind of
  // business keeps women's and men's services apart: a barber's "cut and finish" is a men's cut; a salon's men's cut must say so.
  const MEN = /(^|[^o])men'?s?\b|\bgents?\b|\bmale\b/i, LADIES = /ladies|women|\bgirl/i;
  function classify(row) {
    const name = String(row.name || ""), std = String(row.std || ""), barber = row.kind === "barber";
    for (const i of SALON_ITEMS) {
      if (std) { if (!i.std.includes(std)) continue; }
      else {
        if (!i.say || !i.say.test(name)) continue;
        if (i.g === "Barber" && !barber && !MEN.test(name)) continue;
        if (i.g === "Hair" && /cut|blow/.test(i.k) && (barber ? !LADIES.test(name) : MEN.test(name))) continue;
      }
      if (i.match && !i.match.test(name)) continue;
      if (i.not && i.not.test(name)) continue;
      if (NOT.test(name)) continue;
      if (i.solo && /package/i.test(row.bundle || "")) continue;
      return i.k;
    }
    return null;
  }
  const normal = row => /^normal$/i.test(String(row.promo || "Normal").trim());

  // One entry price per business per service, from published menu lines.
  function entryPrices(rows) {
    const out = {};
    rows.forEach(r => { if (!normal(r)) return; const k = classify(r); if (!k) return; const p = +r.price; if (!(p > 0)) return;
      const key = r.venue + "|" + k, cur = out[key];
      if (!cur || p < cur.price) out[key] = { venue: r.venue, k, price: p, from: !!r.from, mins: +r.mins || null, name: r.name, url: r.url, at: r.at }; });
    return Object.values(out);
  }
  const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return Math.round((s[lo] + (s[hi] - s[lo]) * (i - lo)) * 100) / 100; };
  // The area's spread for each service. Fewer than 3 businesses: nothing. Fewer than 5: shown, marked thin.
  function benchmarks(entries) {
    return SALON_ITEMS.map(i => {
      const e = entries.filter(x => x.k === i.k), xs = e.map(x => x.price), hr = e.filter(x => x.mins).map(x => x.price / x.mins * 60);
      if (e.length < 3) return { k: i.k, t: i.t, g: i.g, n: e.length };
      return { k: i.k, t: i.t, g: i.g, n: e.length, thin: e.length < 5, low: Math.min(...xs), p25: q(xs, 0.25), median: q(xs, 0.5), p75: q(xs, 0.75), high: Math.max(...xs),
        perHour: hr.length >= 3 ? q(hr, 0.5) : null, nHour: hr.length };
    });
  }

  const api = { SALON_ITEMS, ITEM, classify, entryPrices, benchmarks, normal };
  root.PatchSectors = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
