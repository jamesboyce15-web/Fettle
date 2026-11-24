/* Patch search: how easy a business is to find on Google and in AI answers, turned into the next few moves and the
   difference each one makes. Plain functions over plain data, shared by the owner page, the weekly email and the tests.
   Needs PatchInsights (the checks and the score). */
(function (root) {
  "use strict";
  const I = () => root.PatchInsights;

  // Our check (admin, from their homepage and Google profile) and their own (ticks, and a website check they ran).
  // Their Google ticks win if newer; the newest website check wins. Returns {checks, at, by}.
  function mergeChecks(ours, own, sector) {
    const L = I().seoChecksFor(sector), out = {}, at = [];
    const o = (ours && ours.checks) || {}, ownG = (own && own.gbp) || {}, ownS = own && own.site;
    const gNewer = own && own.gbpAt && (!ours || !ours.at || own.gbpAt >= String(ours.at).slice(0, 10));
    const sNewer = ownS && ownS.at && (!ours || !ours.at || ownS.at >= String(ours.at).slice(0, 10));
    L.forEach(c => {
      if (c.src === "gbp") out[c.k] = gNewer && (ownG[c.k] === true || ownG[c.k] === false) ? ownG[c.k] : (o[c.k] ?? (ownG[c.k] ?? null));
      else out[c.k] = sNewer && ownS.checks && (ownS.checks[c.k] === true || ownS.checks[c.k] === false) ? ownS.checks[c.k] : (o[c.k] ?? null);
    });
    if (ours && ours.at) at.push(String(ours.at).slice(0, 10)); if (own && own.gbpAt) at.push(own.gbpAt); if (ownS && ownS.at) at.push(ownS.at);
    return { checks: out, at: at.sort().pop() || null };
  }

  // What the score would be with one more thing done: how many points each fix is worth to them, now.
  function pointsFor(checks, sector, k) {
    const a = I().seoScore(checks, sector), b = I().seoScore(Object.assign({}, checks, { [k]: true }), sector);
    return a && b ? b.score - a.score : null;
  }

  // The next few moves: things not done, biggest difference first, quick Google ones ahead of website work at the same
  // value. Unknown Google items come after, as "check this" moves, since they may already be done.
  function nextMoves(checks, sector, n) {
    const L = I().seoChecksFor(sector), sc = I().seoScore(checks, sector);
    const fails = L.filter(c => checks[c.k] === false).map(c => ({ c, pts: pointsFor(checks, sector, c.k), kind: "fix" }))
      .sort((a, b) => b.pts - a.pts || (a.c.src === "gbp" ? -1 : 1) - (b.c.src === "gbp" ? -1 : 1));
    const unknown = L.filter(c => checks[c.k] == null && c.src === "gbp").map(c => ({ c, pts: null, kind: "check" }));
    return { score: sc ? sc.score : null, moves: fails.concat(unknown).slice(0, n || 3) };
  }

  // A small record of how they're doing, one entry a day at most, kept to the last year. Returns true if it changed.
  function record(history, entry) {
    const h = history, last = h[h.length - 1];
    if (last && last.at === entry.at) { if (last.score === entry.score && last.ai === entry.ai) return false; Object.assign(last, entry); return true; }
    if (last && last.score === entry.score && last.ai === entry.ai) return false;
    h.push(entry); while (h.length > 60) h.shift(); return true;
  }
  // Since they started: first and latest score and AI mentions.
  function progress(history) {
    const h = (history || []).filter(x => x.score != null || x.ai != null); if (h.length < 2) return null;
    const f = h.find(x => x.score != null), l = [...h].reverse().find(x => x.score != null), fa = h.find(x => x.ai != null), la = [...h].reverse().find(x => x.ai != null);
    return { since: h[0].at, score: f && l ? { from: f.score, to: l.score, d: l.score - f.score } : null, ai: fa && la ? { from: fa.ai, to: la.ai, d: la.ai - fa.ai } : null };
  }

  /* ---------- AI answers ---------- */
  // Where AI assistants got their answers, when they searched the web: the sites to be on. Directories and lists we know
  // get a name and a "how to get on it"; their own site and Google are left out.
  const KNOWN = [
    [/(^|\.)google\./, null], [/tripadvisor\./, "Tripadvisor", "Claim your free listing and ask a few regulars to review you there"],
    [/treatwell\./, "Treatwell", "List your salon and services, with prices, and collect reviews there"], [/fresha\./, "Fresha", "Make sure your Fresha profile is public, with services, prices and photos"],
    [/booksy\./, "Booksy", "Fill in your Booksy profile: services, prices, photos"], [/yell\./, "Yell", "Claim your free Yell listing with the same name, address and phone as Google"],
    [/facebook\./, "Facebook", "Keep your Facebook page's hours, address and services up to date"], [/instagram\./, "Instagram", "Put what you do and where in your Instagram bio"],
    [/yelp\./, "Yelp", "Claim your free Yelp listing"], [/thefork\.|opentable\./, "Booking sites", "List on the table-booking site they use"],
    [/timeout\.|manchestereveningnews|\.co\.uk\/(news|whats-on)|visit/, "Local guides and news", "Pitch the writer: a short email with what makes you different and a photo"],
    [/threebestrated|top10|best-|bestof/, "\"Best of\" lists", "These lists often take submissions or go on reviews: ask how they choose"],
  ];
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return String(u || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; } };
  function aiSources(geo, mySite) {
    const me = mySite ? host(/^https?:/.test(mySite) ? mySite : "https://" + mySite) : null, count = {};
    Object.values((geo && geo.sources) || {}).forEach(list => (list || []).forEach(u => { const h = host(u); if (!h || h === me) return; count[h] = (count[h] || 0) + 1; }));
    const groups = {};
    Object.entries(count).forEach(([h, n]) => { const k = KNOWN.find(([re]) => re.test(h)); if (k && k[1] === null) return;
      const name = k ? k[1] : h, g = groups[name] || (groups[name] = { name, hosts: [], n: 0, how: k ? k[2] : "See if you can get a mention or a listing there" }); g.hosts.push(h); g.n += n; });
    return Object.values(groups).sort((a, b) => b.n - a.n).slice(0, 8);
  }

  // What to do to be named for a question's theme. Concrete, in order, for the theme they're missing.
  function themeSteps(theme, sector) {
    const t = String(theme || "").toLowerCase(), say = sector === "salon" ? "services" : "menu";
    const steps = [`Say it in words on your website: a line like “${t ? t[0].toUpperCase() + t.slice(1) : "What you're known for"} in ${"{place}"}”, on the homepage, not only in a photo`,
      `Say it on your Google profile: in the description, and in your ${say} or attributes where Google has a box for it`];
    if (/dog/.test(t)) steps.push("On Google, tick the “Dogs allowed” attribute if you can, and post a photo of a dog in");
    if (/work|laptop|quiet|wifi/.test(t)) steps.push("On Google, tick Wi-Fi, and mention plugs and quiet hours in your description");
    if (/vegan|vegetarian|gluten|allergen/.test(t)) steps.push("Mark the dishes on your website menu as text: AI reads the words, not the symbols");
    if (/brunch|breakfast|cake|coffee/.test(t)) steps.push(`Post a photo of it on Google with the word “${t}” in the caption`);
    if (sector === "salon") steps.push(`Add a photo of that work to Google and Instagram, captioned with the treatment's name and your area`);
    steps.push(`Ask happy ${sector === "salon" ? "clients" : "regulars"} to mention it in their review: AI assistants read reviews for exactly this`);
    return steps;
  }

  // The best questions to start with, for each kind of business.
  function defaultQuestions(sector, place) {
    if (sector === "salon") return [["Best hairdresser in " + place, "hair salon"], ["Good barber in " + place, "barber"], ["Where to get BIAB nails in " + place, "BIAB nails"],
      ["Best balayage salon in " + place, "balayage"], ["Eyebrow lamination in " + place, "brow lamination"], ["Affordable men's haircut in " + place, "men's haircut"]].map(([q, theme]) => ({ q, theme }));
    return [["Where's the best coffee in " + place + "?", "best coffee"], ["Good brunch in " + place, "brunch"], ["Dog-friendly café in " + place, "dog-friendly"],
      ["Quiet café to work from in " + place, "laptop-friendly"], ["Best cake in " + place, "cake"], ["Café with vegan options in " + place, "vegan options"]].map(([q, theme]) => ({ q, theme }));
  }

  const api = { mergeChecks, pointsFor, nextMoves, record, progress, aiSources, themeSteps, defaultQuestions, host };
  root.PatchSearch = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
