/* Patch insights: supplier invoices, search and AI visibility, ranking on visits, and the golden thread that turns every
   finding into one ranked list of actions. Needs patch-core.js and patch-ops.js first. Plain functions, tested in tests/insights.test.js. */
(function (root) {
  "use strict";
  const K = () => root.PatchCore, O = () => root.PatchOps;
  const pp = x => (x < 1 ? (Math.round(x * 1000) / 10).toString().replace(/\.0$/, "") + "p" : "£" + x.toFixed(2));
  const round2 = x => Math.round(x * 100) / 100;
  const num = v => { const x = parseFloat(String(v ?? "").replace(/[£,\s]/g, "")); return isNaN(x) ? null : x; };

  /* ================= suppliers ================= */
  // What cafés buy, per base unit. Order matters: the first match wins, so oat milk, syrups and tea come before milk, sugar and cups.
  // `wk` is a rough weekly amount for a café selling about 1,500 drinks a week: only used when an owner checks a price without
  // uploading invoices, and they can change it.
  const SUPPLY = {
    oat: { t: "Oat milk", unit: "litre", wk: 15, match: /\boat\b|oatly|alpro.*barista|minor figures/i },
    hotchoc: { t: "Hot chocolate", unit: "kg", wk: 1.5, match: /hot choc|drinking choc|chocolate powder/i },
    syrup: { t: "Syrups", unit: "litre", wk: 1, match: /syrup/i },
    tea: { t: "Tea bags", unit: "bag", pl: "bags", wk: 150, match: /\btea\b|teabags?/i, not: /towel|spoon|pot\b|cake/i },
    milk: { t: "Milk", unit: "litre", wk: 60, match: /\bmilk\b/i, not: /oat|soy|soya|almond|coconut|choc|powder|condensed|butter/i },
    beans: { t: "Coffee beans", unit: "kg", wk: 5, match: /coffee|beans|espresso|blend|roast/i, not: /cup|lid|filter paper|decaf sachet|machine|clean|butter beans|baked beans/i },
    lids: { t: "Lids", unit: "lid", wk: 400, match: /\blids?\b/i },
    cups: { t: "Takeaway cups", unit: "cup", wk: 400, match: /\bcups?\b/i, not: /lid|cupcake/i },
    sugar: { t: "Sugar sachets", unit: "sachet", wk: 300, match: /sugar/i, not: /free|icing|caster.*kg|syrup/i },
    napkins: { t: "Napkins", unit: "napkin", wk: 600, match: /napkin|serviette/i },
    croissant: { t: "Croissants", unit: "croissant", wk: 60, match: /croissant|pain au/i },
    bread: { t: "Bread", unit: "loaf", pl: "loaves", wk: 15, match: /bread|loaf|bloomer|sourdough/i, not: /croissant|crumb/i },
    butter: { t: "Butter", unit: "kg", wk: 2, match: /butter/i, not: /croissant|cookie|biscuit|peanut|beans|milk/i },
    cheese: { t: "Cheese", unit: "kg", wk: 3, match: /cheddar|cheese|mozzarella|halloumi|feta/i },
    eggs: { t: "Eggs", unit: "egg", wk: 120, match: /\beggs?\b/i },
    bacon: { t: "Bacon", unit: "kg", wk: 3, match: /bacon/i },
    sausage: { t: "Sausages", unit: "kg", wk: 3, match: /sausage/i },
    avocado: { t: "Avocados", unit: "avocado", wk: 25, match: /avocado/i, not: /guac/i },
  };
  const COUNT = u => u !== "litre" && u !== "kg";

  // A starting price list, so there's a benchmark before any café has shared an invoice. Each line is a real product page,
  // read on the date shown. Brakes shows these prices to anyone not logged in, "based on an average customer discount", so a café
  // with an account may pay a little more or less, and a cash-and-carry can be cheaper. `size` is how many base units the pack holds.
  const PRICE_BOOK_AT = "2026-11-19";
  const PRICE_BOOK_NOTE = "Brakes' public trade prices, read 19 November 2026. Brakes says these are indicative, based on an average customer discount. Food is mostly zero-rated for VAT; cups, napkins and syrups carry VAT on top.";
  const B = "https://www.brake.co.uk";
  const PRICE_BOOK = [
    { k: "milk", name: "Wholesome Farms fresh British whole milk", pack: "6 x 2.27L", price: 14.20, size: 13.62, url: B + "/dairy/milk/fresh" },
    { k: "milk", name: "Wholesome Farms fresh British semi-skimmed milk", pack: "6 x 2.27L", price: 13.67, size: 13.62, url: B + "/dairy/milk/fresh" },
    { k: "milk", name: "Wholesome Farms fresh British whole milk, single", pack: "1 x 2.27L", price: 3.41, size: 2.27, url: B + "/dairy/milk/fresh/bulk-whole/wholesome-farms-fresh-british-whole-milk/p/70219" },
    { k: "oat", name: "Oatly Barista Edition, long life", pack: "6 x 1L", price: 13.06, size: 6, url: B + "/dairy/milk/uht/milk-alternatives/oatly-oat-drink-barista-edition-long-life-1-litre/p/128306" },
    { k: "oat", name: "Alpro Oat Barista", pack: "12 x 1L", price: 23.48, size: 12, url: B + "/dairy/milk/uht/milk-alternatives/alpro-oat-barista-gluten-free/p/132776" },
    { k: "beans", name: "Cafédirect Fairtrade house espresso beans", pack: "1kg", price: 16.41, size: 1, url: B + "/drinks-snacks/hot-beverages/coffee/whole-beans/cafedirect-ft-house-espresso-bean-1x1kg/p/5024487" },
    { k: "beans", name: "Douwe Egberts Espresso Classic beans", pack: "1kg", price: 25.30, size: 1, url: B + "/drinks-snacks/hot-beverages/coffee/whole-beans/douwe-egberts-espresso-classic-whole-coffee-beans-1kg/p/5000135" },
    { k: "beans", name: "Grumpy Mule Top Notch organic beans", pack: "1kg", price: 25.60, size: 1, url: B + "/drinks-snacks/hot-beverages/coffee/whole-beans/grumpy-mule-wb-top-notch-organic-coffee-beans/p/135013" },
    { k: "cups", name: "Huhtamaki single wall hot cups, 12oz", pack: "box of 1000", price: 82.83, size: 1000, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids/huhtamaki-speciality-single-wall-hot-cups-12oz/p/132754" },
    { k: "cups", name: "Edenware single wall white hot cups, 8oz", pack: "box of 1000", price: 82.83, size: 1000, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids" },
    { k: "cups", name: "Vegware single wall white hot cups, 12oz (compostable)", pack: "box of 1000", price: 89.67, size: 1000, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids" },
    { k: "cups", name: "4Aces double wall kraft ripple cups, 12oz", pack: "box of 500", price: 52.89, size: 500, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids" },
    { k: "lids", name: "Huhtamaki sip-through lids, 12/16oz", pack: "box of 1000", price: 42.25, size: 1000, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids" },
    { k: "lids", name: "Huhtamaki sip-through lids, 8/9oz", pack: "box of 1000", price: 42.25, size: 1000, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids/huhtamaki-sip-through-hot-cup-lids-8oz-9oz/p/21649" },
    { k: "lids", name: "Edenware sip-through lids, 12/16oz (on offer)", pack: "box of 1000", price: 52.99, size: 1000, url: B + "/catering-supplies/food-packaging-disposables/disposables/hot-cups-lids" },
    { k: "hotchoc", name: "Cadbury Original drinking hot chocolate", pack: "2kg", price: 17.24, size: 2, url: B + "/drinks-snacks/hot-beverages/chocolate-beef-extract/add-milk/cadbury-original-drinking-hot-chocolate-large-tub-2kg/p/509" },
    { k: "syrup", name: "Monin Premium vanilla syrup", pack: "1L", price: 9.87, size: 1, url: B + "/dry-store/sugar-sweeteners/other-sugar/other-sugar/monin-premium-vanilla-syrup-1ltr/p/148641" },
    { k: "tea", name: "Yorkshire Tea one-cup tea bags", pack: "2 x 1040", price: 68.47, size: 2080, url: B + "/drinks-snacks/hot-beverages/tea/catering/yorkshire-tea-1-cup-teabags/p/27546" },
    { k: "sugar", name: "Brakes white sugar sachets", pack: "box of 1000", price: 9.80, size: 1000, url: B + "/dry-store/sugar-sweeteners/individual-portions/sugar-sticks-sachets/brakes-white-sugar-sachets/p/33720" },
    { k: "napkins", name: "White napkins, 2 ply, 33cm", pack: "box of 2000", price: 51.90, size: 2000, url: B + "/catering-supplies/napkins-tablecovers/napkins/33cm-napkins/white-napkins-2-ply-33cm/p/84811" },
    { k: "croissant", name: "Delifrance all butter croissants, frozen, 40g", pack: "box of 32", price: 27.73, size: 32, url: B + "/bakery/sweet-bakery/viennoiserie/croissants/delifrance-all-butter-croissant-x32/p/67597" },
    { k: "bread", name: "Kingsmill Professional white sliced bloomer with sourdough, 700g", pack: "6 loaves", price: 14.36, size: 6, url: B + "/bakery/bread/loaves/bloomer/kingsmill-professional-great-white-sliced-bloomer-with-sourdough/p/151768" },
    { k: "butter", name: "Brakes salted butter", pack: "40 x 250g", price: 63.79, size: 10, url: B + "/dairy/butter-spread-fat/butter" },
    { k: "butter", name: "Brakes salted butter", pack: "20 x 250g", price: 40.80, size: 5, url: B + "/dairy/butter-spread-fat/butter" },
    { k: "butter", name: "Lurpak unsalted butter", pack: "20 x 200g", price: 39.59, size: 4, url: B + "/dairy/butter-spread-fat/butter" },
    { k: "cheese", name: "Sysco Classic mature white cheddar block", pack: "about 4.75kg", price: 32.99, size: 4.75, url: B + "/dairy/block-grated-cheese/cheddar/block/sysco-classic-mature-white-cheddar-cheese/p/71144" },
    { k: "eggs", name: "Wholesome Farms British free range large eggs", pack: "15 dozen", price: 66.04, size: 180, url: B + "/dairy/eggs/shell/free-range/brakes-15-dozen-british-fresh-free-range-large-eggs/p/105674" },
    { k: "bacon", name: "British Red Tractor unsmoked back bacon", pack: "2.27kg", price: 16.79, size: 2.27, url: B + "/meat-poultry/chilled-processed-meat/bacon/back-bacon/prime-meats-british-back-bacon/p/16481" },
    { k: "sausage", name: "Brakes 32% catering sausages, frozen", pack: "80 x 57g", price: 14.13, size: 4.56, url: B + "/meat-poultry/frozen-processed-meat/sausages/butchers-style" },
    { k: "sausage", name: "Brakes 65% Cumberland sausages, frozen", pack: "40 x 57g", price: 19.14, size: 2.28, url: B + "/meat-poultry/frozen-processed-meat/sausages/butchers-style" },
    { k: "sausage", name: "Brakes Red Tractor 85% Cumberland sausages, frozen", pack: "30 x 76g", price: 33.81, size: 2.28, url: B + "/meat-poultry/frozen-processed-meat/sausages/butchers-style" },
    { k: "avocado", name: "Avocados, 14s/16s", pack: "box of 14", price: 36.59, size: 14, url: B + "/fresh-produce/salad-herbs/avocados/standard/avocado-14-s-16-s/p/114201" },
  ].map(x => Object.assign(x, { per: Math.round((x.price / x.size) * 10000) / 10000, supplier: "Brakes", at: PRICE_BOOK_AT }));
  const med = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  // The typical price for each thing is the middle of the price list; the admin can override it per area.
  Object.entries(SUPPLY).forEach(([k, c]) => { const ps = PRICE_BOOK.filter(x => x.k === k).map(x => x.per); c.bench = Math.round(med(ps) * 10000) / 10000; c.pl = c.pl || c.unit + "s"; });
  // The pack to show an owner who wants to check a price: the line closest to the typical price.
  const refPack = k => PRICE_BOOK.filter(x => x.k === k).sort((a, b) => Math.abs(a.per - SUPPLY[k].bench) - Math.abs(b.per - SUPPLY[k].bench))[0];

  // How much of the base unit one line holds: "12 x 1L", "2 litre", "4pt", "1kg", "500g", "box of 1000", "x30", "2 x 1040", "32 x 40g".
  function packSize(desc, unit) {
    const s = String(desc).toLowerCase().replace(/,/g, "");
    let m;
    if (COUNT(unit)) {
      if ((m = /(\d+)\s*[x×]\s*(\d+)(?![\d.]*\s*(?:g|kg|ml|l|ltr|cl|oz)\b)\b/.exec(s))) return +m[1] * +m[2];
      if ((m = /(\d+)\s*[x×]\s*\d+(?:\.\d+)?\s*(?:g|kg|ml|cl|l|ltr)\b/.exec(s))) return +m[1];
      if ((m = /(\d+)\s*dozen/.exec(s))) return +m[1] * 12;
    } else {
      if ((m = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(l|ltr|litre|liter|ml|kg|g|pt|pint)\b/.exec(s))) return +m[1] * conv(+m[2], m[3], unit);
      if ((m = /(\d+(?:\.\d+)?)\s*(l|ltr|litres?|liters?|ml|kg|g|pt|pints?)\b/.exec(s))) return conv(+m[1], m[2], unit);
    }
    if ((m = /(?:box|case|pack|sleeve|tray|pk)\s*(?:of)?\s*(\d+)|(\d+)\s*(?:pk|pack|per case|cups|lids|eggs|bags|sachets|napkins|loaves|croissants)\b|[x×]\s*(\d+)\b/.exec(s))) return +(m[1] || m[2] || m[3]);
    return null;
  }
  function conv(n, u, unit) {
    u = u.replace(/s$/, "");
    if (unit === "litre") return u === "ml" ? n / 1000 : u === "pt" || u === "pint" ? n * 0.568 : n;
    if (unit === "kg") return u === "g" ? n / 1000 : n;
    return n;
  }
  const classify = desc => { for (const [k, c] of Object.entries(SUPPLY)) if (c.match.test(desc) && !(c.not && c.not.test(desc))) return k; return null; };

  // Reads supplier lines from a CSV export or from text pulled out of a PDF. Returns {lines:[{desc, qty, total, date, supplier}], skipped}.
  function readInvoice(text, kind, meta) {
    const lines = [], m0 = meta || {};
    if (kind === "csv") {
      const rows = K().parseCSV(text); if (rows.length < 2) return { lines, skipped: 0, error: "That file looks empty." };
      const low = rows[0].map(h => String(h).toLowerCase().trim()), f = res => { for (const re of res) { const i = low.findIndex(h => re.test(h)); if (i >= 0) return i; } return -1; };
      const c = { desc: f([/description/, /product/, /item/, /name/]), qty: f([/^qty$/, /quantity/, /qty/, /units/]), unit: f([/unit price/, /price each/, /^price$/, /price/]), total: f([/line total/, /net/, /^total$/, /total/, /amount|value/]), date: f([/date/]), supplier: f([/supplier/, /vendor/]) };
      if (c.desc < 0 || (c.total < 0 && c.unit < 0)) return { lines, skipped: rows.length - 1, error: "We couldn't find the description and price columns." };
      let skipped = 0;
      rows.slice(1).forEach(r => { const q = num(r[c.qty]) ?? 1, tot = c.total >= 0 ? num(r[c.total]) : null, u = c.unit >= 0 ? num(r[c.unit]) : null;
        const total = tot ?? (u != null ? u * q : null); if (!r[c.desc] || total == null) { skipped++; return; }
        lines.push({ desc: String(r[c.desc]).trim(), qty: q, total, date: c.date >= 0 ? (K().parseWhen(r[c.date]) || {}).date || m0.date : m0.date, supplier: c.supplier >= 0 ? r[c.supplier] : m0.supplier }); });
      return { lines, skipped };
    }
    // text from a PDF: "Whole milk 4pt   6   1.85   11.10" — a description, a quantity, a unit price and a line total
    const dm = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(text), date = m0.date || (dm ? (K().parseWhen(dm[0]) || {}).date : null);
    let skipped = 0;
    String(text).split(/\n/).forEach(l => { const m = /^\s*(.{3,80}?)\s+(\d+(?:\.\d+)?)\s+£?(\d+\.\d{2})\s+£?(\d+\.\d{2})\s*$/.exec(l);
      if (m && Math.abs(+m[2] * +m[3] - +m[4]) < 0.05 + +m[4] * 0.01) lines.push({ desc: m[1].trim(), qty: +m[2], total: +m[4], date, supplier: m0.supplier }); else if (/\d+\.\d{2}\s*$/.test(l)) skipped++; });
    return { lines, skipped };
  }
  // What they pay per litre, kg or cup for each thing we track, against typical, and what the gap costs a year.
  // `checks` are prices an owner typed in without an invoice: {k: {price, pack, weekly}}. Invoices win where both exist.
  function supplierFindings(invoiceLines, bench, checks) {
    const B = Object.assign({}, ...Object.entries(SUPPLY).map(([k, c]) => ({ [k]: c.bench })), bench || {});
    const g = {}, alld = (invoiceLines || []).map(l => l.date).filter(Boolean).sort();
    // weeks the invoices cover, all together: a monthly cup order isn't a week's worth
    const span = alld.length ? Math.max(1, Math.round(((new Date(alld[alld.length - 1]) - new Date(alld[0])) / 864e5 + 7) / 7)) : 1;
    (invoiceLines || []).forEach(l => { const k = classify(l.desc); if (!k) return; const size = packSize(l.desc, SUPPLY[k].unit); if (!size) return;
      const units = size * (l.qty || 1); const x = g[k] = g[k] || { k, units: 0, spend: 0, lines: 0 };
      x.units += units; x.spend += l.total; x.lines++; });
    const row = (k, per, weekly, from) => { const c = SUPPLY[k], b = B[k], over = per / b - 1;
      return { k, t: c.t, unit: c.unit, units: c.pl, perUnit: Math.round(per * 10000) / 10000, bench: b, overPct: Math.round(over * 100), weekly: weekly >= 10 ? Math.round(weekly) : Math.round(weekly * 10) / 10,
        perYear: over > 0.05 ? Math.round((per - b) * weekly * 52) : 0, spendYear: Math.round(per * weekly * 52), from, weeks: from === "invoices" ? span : null }; };
    const out = Object.values(g).map(x => row(x.k, x.spend / x.units, x.units / span, "invoices"));
    Object.entries(checks || {}).forEach(([k, ch]) => { if (!SUPPLY[k] || g[k] || !ch) return; const price = num(ch.price), size = packSize(ch.pack || "", SUPPLY[k].unit);
      if (!price || !size) return; out.push(row(k, price / size, num(ch.weekly) || SUPPLY[k].wk, "check")); });
    return out.sort((a, b) => b.perYear - a.perYear);
  }
  // The price list, grouped: for each thing, the typical price, the pack to compare against, and every line with its source.
  function priceBook(bench) {
    return Object.entries(SUPPLY).map(([k, c]) => ({ k, t: c.t, unit: c.unit, units: c.pl, wk: c.wk, bench: (bench && bench[k]) || c.bench, startBench: c.bench, ref: refPack(k),
      lines: PRICE_BOOK.filter(x => x.k === k) }));
  }

  /* ================= search (SEO) ================= */
  // What makes a café easy to find on Google. Weights add up to 100. "site" checks come from reading their website; "gbp" from their Google profile.
  // What makes a business easy to find on Google and for AI assistants. w: how much it counts. src: "gbp" is their Google
  // Business Profile (checked by eye, by us or by them), "site" is read off their homepage. Each sector has its own list.
  // why: the outcome, in their terms. how: where to look on Google to tick it.
  const SEO_CHECKS = [
    { k: "gbp_hours", t: "Opening hours on Google", w: 12, src: "gbp", fix: "Add your opening hours to your Google Business Profile, including bank holidays.", why: "Wrong or missing hours is the top reason people walk past or ring and give up.", how: "Search your name on Google: are your hours there, and right?" },
    { k: "gbp_photos", t: "At least 10 recent photos on Google", w: 8, src: "gbp", fix: "Add photos of your food, drinks and inside: cafés with more photos get more clicks.", why: "Profiles with photos get far more requests for directions and website clicks.", how: "On your Google profile, tap Photos: are there 10 or more from this year?" },
    { k: "gbp_reviews", t: "At least 50 Google reviews", w: 10, src: "gbp", fix: "Ask happy regulars for a Google review: a small card by the till with a QR code works.", why: "Review count is one of the biggest things Google and AI assistants use to pick who to suggest.", how: "The number next to your stars on Google." },
    { k: "gbp_replies", t: "Replies to reviews", w: 6, src: "gbp", fix: "Reply to your reviews, good and bad. Patch drafts the replies for you.", why: "Replies show new customers you care, and Google notices active profiles.", how: "Have you replied to most reviews from the last three months?" },
    { k: "gbp_category", t: "Main category set to café or coffee shop", w: 6, src: "gbp", fix: "Set your Google main category to Café or Coffee shop, and add extras like Breakfast restaurant.", why: "Your main category decides which searches you can show up for at all.", how: "Under your name on Google it says what you are. Is it Café or Coffee shop?" },
    { k: "site", t: "Has a website", w: 10, src: "site", fix: "Even a one-page site with your menu, hours and address helps you show up.", why: "Google and AI assistants read websites to decide what you're good for." },
    { k: "https", t: "Website is secure (https)", w: 4, src: "site", fix: "Turn on https with your website host: it's usually free.", why: "Browsers warn people off sites that aren't secure." },
    { k: "mobile", t: "Website works on phones", w: 8, src: "site", fix: "Most people look you up on their phone. Ask your web person to make the site mobile-friendly.", why: "Most people looking for somewhere nearby are on their phone." },
    { k: "title", t: "Page title says what and where", w: 8, src: "site", fix: "Make your homepage title say what you are and where, like “Little Fig, café and bakery in Elm Park”.", why: "It's the blue link people see on Google: what and where wins the click." },
    { k: "menu", t: "Menu on the website, as text", w: 10, src: "site", fix: "Put your menu on your website as text, not just a photo, so Google and AI tools can read it.", why: "When someone asks for “good brunch near me”, AI can only suggest you if it can read that you do brunch." },
    { k: "schema", t: "Café details marked up for search engines", w: 8, src: "site", fix: "Add “structured data” for a café (name, address, hours) to your site. Patch can give your web person the snippet.", why: "It hands Google and AI your name, address and hours in a form they can't misread." },
    { k: "nap", t: "Address and phone on the website", w: 10, src: "site", fix: "Put your full address and phone number on every page, the same as on Google.", why: "Matching details everywhere tell Google you're the same, trustworthy business." },
  ];
  const SEO_SALON = [
    { k: "gbp_hours", t: "Opening hours on Google", w: 10, src: "gbp", fix: "Add your opening hours to your Google Business Profile, including late nights and bank holidays.", why: "People book around work: wrong hours send them to the salon that shows theirs.", how: "Search your name on Google: are your hours there, and right?" },
    { k: "gbp_booking", t: "Book button on Google goes to your booking page", w: 12, src: "gbp", fix: "Add your booking link to your Google profile, so people can book straight from the search.", why: "Every step between finding you and booking loses customers. A Book button removes most of them.", how: "On your Google profile, is there a Book or Book online button? Does it open your booking page?" },
    { k: "gbp_services", t: "Services and prices on Google", w: 8, src: "gbp", fix: "List your main services with prices on your Google profile.", why: "People compare prices before they book. Showing yours wins the ones who'd otherwise not ask.", how: "On your Google profile, tap Services: are your main ones listed with prices?" },
    { k: "gbp_photos", t: "At least 10 recent photos of your work", w: 8, src: "gbp", fix: "Add photos of your work and your salon: before and afters, nails, colour, the space.", why: "For hair, nails and brows, photos of the work are what people choose on.", how: "On your Google profile, tap Photos: are there 10 or more from this year?" },
    { k: "gbp_reviews", t: "At least 50 Google reviews", w: 10, src: "gbp", fix: "Ask happy clients for a Google review as they pay: a card by the till with a QR code works.", why: "Review count is one of the biggest things Google and AI assistants use to pick who to suggest.", how: "The number next to your stars on Google." },
    { k: "gbp_replies", t: "Replies to reviews", w: 5, src: "gbp", fix: "Reply to your reviews, good and bad. Patch drafts the replies for you.", why: "Replies show new clients you care, and Google notices active profiles.", how: "Have you replied to most reviews from the last three months?" },
    { k: "gbp_category", t: "Main category set to what you do", w: 6, src: "gbp", fix: "Set your Google main category to Hair salon, Barber shop, Nail salon or Beauty salon, and add the others you do.", why: "Your main category decides which searches you can show up for at all.", how: "Under your name on Google it says what you are. Is it right?" },
    { k: "site", t: "Has a website", w: 8, src: "site", fix: "Even a one-page site with your services, prices, hours and booking link helps you show up.", why: "Google and AI assistants read websites to decide what you're good for." },
    { k: "https", t: "Website is secure (https)", w: 3, src: "site", fix: "Turn on https with your website host: it's usually free.", why: "Browsers warn people off sites that aren't secure." },
    { k: "mobile", t: "Website works on phones", w: 6, src: "site", fix: "Most people look you up on their phone. Ask your web person to make the site mobile-friendly.", why: "Most people looking for a salon nearby are on their phone." },
    { k: "title", t: "Page title says what and where", w: 6, src: "site", fix: "Make your homepage title say what you do and where, like “Mane, hair salon in Heaton Moor”.", why: "It's the blue link people see on Google: what and where wins the click." },
    { k: "menu", t: "Services and prices on the website, as text", w: 8, src: "site", fix: "Put your services and prices on your website as text, not just a photo or a booking widget.", why: "When someone asks for “balayage near me”, AI can only suggest you if it can read that you do balayage." },
    { k: "booking", t: "Online booking link on the website", w: 6, src: "site", fix: "Put your Fresha, Treatwell, Booksy or other booking link on your homepage.", why: "People who can't book on the spot often don't come back." },
    { k: "schema", t: "Salon details marked up for search engines", w: 4, src: "site", fix: "Add “structured data” for a salon (name, address, hours) to your site. Patch can give your web person the snippet.", why: "It hands Google and AI your name, address and hours in a form they can't misread." },
    { k: "nap", t: "Address and phone on the website", w: 6, src: "site", fix: "Put your full address and phone number on every page, the same as on Google.", why: "Matching details everywhere tell Google you're the same, trustworthy business." },
  ];
  const seoChecksFor = sector => sector === "salon" ? SEO_SALON : SEO_CHECKS;
  function seoScore(checks, sector) {
    if (!checks) return null; const L = seoChecksFor(sector);
    const known = L.filter(c => checks[c.k] === true || checks[c.k] === false);
    if (!known.length) return null;
    const score = Math.round(L.reduce((t, c) => t + (checks[c.k] === true ? c.w : 0), 0) / known.reduce((t, c) => t + c.w, 0) * 100);
    return { score, passed: known.filter(c => checks[c.k] === true).length, of: known.length, fails: L.filter(c => checks[c.k] === false).sort((a, b) => b.w - a.w), unknown: L.filter(c => checks[c.k] == null) };
  }

  /* ================= AI answers (GEO) ================= */
  // geo: {at, prompts:[{q, theme}], engines:["ChatGPT","Claude",...], answers:{ "<q>|<engine>": ["Venue name", ...] }}
  function geoSummary(geo, myName, peerNames) {
    if (!geo || !geo.prompts || !geo.prompts.length) return null;
    const n = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""), me = n(myName);
    let total = 0, mine = 0; const byPrompt = [], rivals = {};
    geo.prompts.forEach(p => { let hit = 0, asked = 0; const who = {};
      (geo.engines || []).forEach(e => { const a = (geo.answers || {})[p.q + "|" + e]; if (!a) return; asked++; total++;
        if (a.some(x => n(x) === me)) { hit++; mine++; }
        a.forEach(x => { if (n(x) !== me) { who[x] = (who[x] || 0) + 1; rivals[x] = (rivals[x] || 0) + 1; } }); });
      byPrompt.push({ q: p.q, theme: p.theme, mentioned: hit, asked, top: Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k) }); });
    const peers = Object.entries(rivals).sort((a, b) => b[1] - a[1]);
    const rank = 1 + peers.filter(([, c]) => c > mine).length;
    return { at: geo.at, engines: geo.engines, share: total ? Math.round((mine / total) * 100) : 0, mentions: mine, answers: total, rank, of: peers.length + 1,
      byPrompt, missing: byPrompt.filter(p => p.asked && !p.mentioned && p.top.length), leaders: peers.slice(0, 3).map(([k, c]) => ({ name: k, share: Math.round((c / total) * 100) })) };
  }

  /* ================= ranking on visits ================= */
  // Where a café sits among its nearest neighbours that we've visited, overall and on each thing we score. asOf ranks on visits up to that date.
  /* ================= the visit form ================= */
  // Everything a visitor records, in the order they meet it. "scale" is 1 to 5, "minutes" is lower-is-better, "yn" is a fact.
  // Scales and minutes are scored and ranked; facts are shown but never ranked.
  const VISIT = [
    { g: "Arriving", items: [
      { k: "welcome", t: "Welcome", type: "scale", w: 1, lo: "Ignored", hi: "Straight away, warmly" },
      { k: "wait", t: "Time to order", type: "minutes", w: 1.5, cap: 10, help: "From joining the queue to ordering" },
      { k: "queue", t: "People ahead of you", type: "count" } ] },
    { g: "Service", items: [
      { k: "friendly", t: "Friendliness", type: "scale", w: 1.5, lo: "Cold", hi: "Genuinely friendly" },
      { k: "knowledge", t: "Knew the menu", type: "scale", w: 0.5, lo: "Couldn't answer", hi: "Helpful, suggested something" },
      { k: "drink_wait", t: "Time for the drink", type: "minutes", w: 1, cap: 8, help: "From paying to having it" },
      { k: "accuracy", t: "Order right first time", type: "yn", w: 1, scored: true } ] },
    { g: "What you had", items: [
      { k: "coffee", t: "Coffee", type: "scale", w: 2, lo: "Poor", hi: "Excellent: taste, temperature, milk" },
      { k: "food", t: "Food and display", type: "scale", w: 1, lo: "Tired", hi: "Fresh and tempting" },
      { k: "value", t: "Value for money", type: "scale", w: 1, lo: "Poor", hi: "Great" } ] },
    { g: "The place", items: [
      { k: "clean", t: "Cleanliness", type: "scale", w: 1.5, lo: "Dirty", hi: "Spotless" },
      { k: "toilets", t: "Toilets", type: "scale", w: 0.5, na: true, lo: "Dirty", hi: "Spotless" },
      { k: "seats", t: "Seats free", type: "scale", w: 0.5, lo: "Full", hi: "Plenty" },
      { k: "ambience", t: "Feel of the place", type: "scale", w: 1, lo: "Unwelcoming", hi: "Somewhere you'd stay" } ] },
    { g: "Facts", items: [
      { k: "wifi", t: "Wifi", type: "yn" }, { k: "plugs", t: "Plugs at tables", type: "yn" }, { k: "card_only", t: "Cards only", type: "yn" },
      { k: "dog", t: "Dogs welcome", type: "yn" }, { k: "step_free", t: "Step-free way in", type: "yn" }, { k: "baby", t: "Baby changing", type: "yn" },
      { k: "prices_shown", t: "Prices clearly shown", type: "yn" }, { k: "oat_charge", t: "Charges extra for oat milk", type: "yn" }, { k: "loyalty", t: "Loyalty card or app", type: "yn" } ] },
  ];
  const VFIELDS = VISIT.flatMap(g => g.items), VF = Object.fromEntries(VFIELDS.map(f => [f.k, f]));
  // What each answer is worth, 0 to 1. Missing or "not applicable" answers are left out rather than counted as zero.
  function part(f, v) {
    if (v == null || v === "" || v === "na") return null;
    if (f.type === "scale") { const x = +v; return x >= 1 && x <= 5 ? (x - 1) / 4 : null; }
    if (f.type === "minutes") { const x = +v; return isNaN(x) || x < 0 ? null : Math.max(0, 1 - x / f.cap); }
    if (f.type === "yn" && f.scored) return v === true || v === "true" ? 1 : v === false || v === "false" ? 0 : null;
    return null;
  }
  // A score out of 100 for one visit. Needs at least 4 scored answers, so a half-done visit doesn't count.
  function visitScore(scores) {
    let t = 0, w = 0, n = 0; const parts = {};
    VFIELDS.forEach(f => { if (!f.w) return; const p = part(f, (scores || {})[f.k]); if (p == null) return; parts[f.k] = p; t += p * f.w; w += f.w; n++; });
    return n >= 4 ? { score: Math.round((t / w) * 100), parts, n } : null;
  }
  const VDIMS = VFIELDS.filter(f => f.w && f.type !== "yn").map(f => ({ k: f.k, t: f.t, lower: f.type === "minutes" }));
  // Where a visit would sit among the latest visits to the cafés nearest it (n of them), before it's saved.
  function visitPlace(scores, venue, venues, observations, n) {
    const me = visitScore(scores); if (!me) return null;
    const near = K().nearest(venue, venues, n || 10).map(x => x.v);
    const others = near.map(v => observations.filter(o => o.venueId === v.id && o.source === "visit").sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]).filter(Boolean)
      .map(o => visitScore(o.scores)).filter(Boolean).map(x => x.score);
    const dims = VDIMS.map(d => { const mine = (scores || {})[d.k]; if (part(VF[d.k], mine) == null) return null;
      const vals = near.map(v => observations.filter(o => o.venueId === v.id && o.source === "visit").sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]).filter(o => o && part(VF[d.k], o.scores[d.k]) != null).map(o => +o.scores[d.k]);
      return { k: d.k, t: d.t, mine: +mine, middle: vals.length ? K().median(vals) : null, n: vals.length }; }).filter(Boolean);
    return { score: me.score, rank: 1 + others.filter(x => x > me.score).length, of: others.length + 1, middle: others.length ? K().median(others) : null, dims };
  }
  function rankOnVisits(venue, venues, observations, asOf, n) {
    const P = K(), obs = asOf ? observations.filter(o => o.at <= asOf) : observations;
    const near = P.nearest(venue, venues, n || 10).map(x => x.v), group = [venue].concat(near);
    const latestVisit = v => obs.filter(o => o.venueId === v.id && o.source === "visit").sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
    const rows = group.map(v => ({ v, o: latestVisit(v) })).filter(x => x.o && x.o.scores);
    const me = rows.find(x => x.v.id === venue.id); if (!me || rows.length < 4) return null;
    const dims = VDIMS.map(d => { const vals = rows.map(x => ({ id: x.v.id, s: +x.o.scores[d.k] })).filter(x => !isNaN(x.s));
      const mine = vals.find(x => x.id === venue.id); if (!mine || vals.length < 4) return null;
      const better = vals.filter(x => (d.lower ? x.s < mine.s : x.s > mine.s)).length;
      return { k: d.k, t: d.t, mine: mine.s, rank: better + 1, of: vals.length, middle: P.median(vals.map(x => x.s)) }; }).filter(Boolean);
    // overall: the visit score (0 to 1), with the food hygiene rating counting for a sixth when we have it
    const score = x => { const v = visitScore(x.o.scores), h = +x.v.hygiene; const vs = v ? v.score / 100 : 0; return isNaN(h) ? vs : vs * (5 / 6) + (h / 5) * (1 / 6); };
    const scored = rows.map(x => ({ id: x.v.id, s: score(x) })).sort((a, b) => b.s - a.s);
    return { rank: scored.findIndex(x => x.id === venue.id) + 1, of: scored.length, at: me.o.at, dims, weakest: dims.slice().sort((a, b) => b.rank / b.of - a.rank / a.of)[0], strongest: dims.slice().sort((a, b) => a.rank / a.of - b.rank / b.of)[0] };
  }
  function rankTrend(venue, venues, observations) {
    const now = rankOnVisits(venue, venues, observations); if (!now) return null;
    const prevVisit = observations.filter(o => o.venueId === venue.id && o.source === "visit" && o.at < now.at).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
    const before = prevVisit ? rankOnVisits(venue, venues, observations.filter(o => !(o.venueId === venue.id && o.at > prevVisit.at)), null) : null;
    return Object.assign(now, { before: before ? { rank: before.rank, of: before.of, at: prevVisit.at } : null });
  }

  /* ================= the golden thread ================= */
  // Every finding, from every part of Patch, becomes at most one action: what to do, why (the evidence), what it's worth,
  // how long it takes, and where to see the detail. Sorted by money first, then quick wins. Status lives in state.actions.
  // A typical small café's weekly sales of each item, used only until their own item sales are in (marked as estimates).
  const TYPICAL_WEEK = { espresso: 25, americano: 60, flat_white: 90, latte: 80, cappuccino: 50, tea: 40, hot_choc: 25, oat_extra: 45, croissant: 35, cake: 40, toastie: 25, brunch: 18 };
  const EFFORT = { quick: "Under an hour", medium: "A morning", bigger: "A few days" };
  function goldenThread(c) {
    const out = [], P = K(), Op = O(), st = c.state || {}, today = c.today;
    const add = a => out.push(Object.assign({ value: 0, effort: "quick" }, a));
    // prices: from the report, valued with their own item sales where we have them
    const items = (c.report && c.report.items) || [], daysWithItems = Object.keys((st.sales || {}).items || {}).sort().slice(-28);
    const perWeek = k => { const name = (P.ITEM[k] || {}).t; if (!name || !daysWithItems.length) return null; let n = 0; daysWithItems.forEach(d => Object.entries(st.sales.items[d]).forEach(([it, q]) => { if (it.includes(name.toLowerCase()) || name.toLowerCase().includes(it)) n += q; })); return n ? Math.round((n / daysWithItems.length) * 7) : null; };
    items.filter(i => i.mine != null && i.median != null && (!(st.changes || []).some(ch => ch.k === i.k) || (st.actions || {})["price:" + i.k])).forEach(i => {
      const wk = perWeek(i.k), lev = P.levers({ k: i.k, price: i.mine, cost: null, perWeek: wk || TYPICAL_WEEK[i.k] || 30 }, i, c.report.quality, null);
      const mv = (c.moves || []).find(m => m.k === i.k && m.up >= 2), mvText = mv ? ` ${mv.up} of ${mv.n} cafés nearby have put theirs up since ${new Date(mv.since + "T12:00:00Z").toLocaleDateString("en-GB", { month: "long" })}.` : "";
      if (lev.price) add({ key: "price:" + i.k, area: "Prices", t: `Raise your ${i.t.toLowerCase()} to ${P.money(lev.price.to)}`, why: `You charge ${P.money(i.mine)}. ${lev.price.text}${mvText}`, value: lev.price.perYear, estimate: !wk, effort: "quick", go: "insights:prices", done: "logprice", prefill: { k: i.k, item: i.t, from: i.mine, to: lev.price.to } });
    });
    // suppliers
    (c.suppliers || []).filter(s => s.perYear >= 50).forEach(s => add({ key: "supply:" + s.k, area: "Suppliers", t: `Get a better price on ${s.t.toLowerCase()}`, why: `You pay about ${pp(s.perUnit)} ${/^[aeiou]/.test(s.unit) ? "an" : "a"} ${s.unit}${s.from === "check" ? " (from the price you checked)" : ""}. Cafés like yours pay about ${pp(s.bench)}: you pay ${s.overPct}% more. That's at about ${s.weekly} ${s.units} a week.`, value: s.perYear, estimate: s.from === "check", effort: "medium", go: "insights:suppliers", steps: ["Ask your supplier to match the price, or get two quotes", "Upload the next invoice and we'll check it"] }));
    // visits
    const vr = c.visitRank;
    if (vr && vr.weakest && vr.weakest.rank > Math.ceil(vr.weakest.of / 2)) {
      const w = vr.weakest, tip = { wait: "Look at who's on at your busiest hour: the Plan tab shows when you need another pair of hands", clean: "A quick tables-and-floor check every hour, on a list by the till", friendly: "A hello within 10 seconds of the door opening, from whoever's nearest", seats: "Check the layout at your busy time: could two more seats fit?" }[w.k];
      add({ key: "visit:" + w.k + ":" + vr.at, area: "Visit", t: `Improve ${w.t.toLowerCase()}: you were ${ord(w.rank)} of ${w.of} nearby`, why: `On our last visit (${fmt(vr.at)}). ${tip}.`, effort: "medium", go: "insights:ranking" });
    }
    // search
    (c.seo && c.seo.fails || []).slice(0, 4).forEach(f => add({ key: "seo:" + f.k, area: "Google", t: f.fix.split(":")[0].split(".")[0], why: `${f.t}: not yet. ${f.fix}`, effort: f.src === "gbp" ? "quick" : "medium", weight: f.w, go: "insights:search" }));
    // AI answers
    (c.geo && c.geo.missing || []).slice(0, 2).forEach(m => add({ key: "geo:" + m.q, area: "AI answers", t: `Get recommended for “${m.theme || m.q}”`, why: `When people ask AI assistants “${m.q}”, they suggest ${m.top.slice(0, 2).join(" and ")}, not you. Say it clearly on your website and Google profile, and ask regulars to mention it in reviews.`, effort: "medium", go: "insights:search" }));
    // reviews
    const unreplied = (st.reviews || []).filter(r => +r.rating <= 3 && !r.replied);
    if (unreplied.length) add({ key: "rev:" + unreplied.map(r => r.id).join(","), area: "Reviews", t: `Reply to ${unreplied.length} review${unreplied.length > 1 ? "s" : ""}`, why: "Replies show new customers you care. We've drafted them for you.", effort: "quick", go: "insights:reviews" });
    // quiet hours, from their sales
    const days = Op.salesDays(st).slice(-56);
    if (days.length >= 21) { const pat = P.salesPattern(days.flatMap(d => Object.entries(d.h).map(([h, v]) => ({ date: d.date, dow: d.dow, hour: +h, amount: v })))), q = pat.quiet[0];
      if (q) add({ key: "quiet:" + q.dow + ":" + q.hour, area: "Sales", t: `Do something with ${P.DOW[q.dow]} ${hourName(q.hour)}`, why: `It takes about ${P.money(q.v)} on average, a quarter of your best hour. Try an offer for that hour, a regular group, or use it for prep and baking.`, effort: "medium", go: "plan" }); }
    // opening hours against neighbours
    const g = c.report && c.report.gaps, hrs = c.report && c.report.venue && c.report.venue.hours;
    if (g && g.before8 <= 30 && !(hrs && hrs.mon && hrs.mon[0] && hrs.mon[0] <= "08:00")) add({ key: "hours:early", area: "Opening hours", t: "Try opening at 7.30 on weekdays", why: `Only ${g.before8}% of cafés near you open before 8am. Commuters and school runs have few places to go.`, effort: "bigger", go: "insights:area" });
    // reminders
    Op.remindersDue(st, c.venue, today, 21).slice(0, 2).forEach(r => { const last = (st.docs || []).filter(d => d.rid === r.id && d.premium).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
      add({ key: "rem:" + r.key, area: "Admin", t: r.t, why: `Due ${fmt(r.due)}.${r.note ? " " + r.note : ""}${last ? ` Last time you paid £${Math.round(last.premium).toLocaleString("en-GB")}${last.insurer ? " with " + last.insurer : ""}: get two quotes before it renews.` : ""} Upload the new paperwork and we'll set next year's reminder.`, effort: "quick", go: "more:reminders" }); });
    const S = st.actions || {};
    const rankE = { quick: 0, medium: 1, bigger: 2 };
    return out.map(a => Object.assign(a, { status: (S[a.key] || {}).status || "todo", doneAt: (S[a.key] || {}).at }))
      .sort((a, b) => (b.value || 0) - (a.value || 0) || (b.weight || 0) - (a.weight || 0) || rankE[a.effort] - rankE[b.effort]);
  }
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");
  const fmt = s => new Date(s + (String(s).length === 10 ? "T12:00:00Z" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const hourName = h => (h < 12 ? h + "am" : h === 12 ? "12pm" : h - 12 + "pm");

  const api = { VISIT, VFIELDS, visitScore, visitPlace, SUPPLY, PRICE_BOOK, PRICE_BOOK_AT, PRICE_BOOK_NOTE, priceBook, packSize, classify, readInvoice, supplierFindings, SEO_CHECKS, SEO_SALON, seoChecksFor, seoScore, geoSummary, VDIMS, rankOnVisits, rankTrend, EFFORT, goldenThread, ord };
  // Always on the global too, so the server bundle (where `module` exists) can share these between files.
  root.PatchInsights = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
