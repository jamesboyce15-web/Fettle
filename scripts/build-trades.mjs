// Builds the trade pages (/dog-groomers, /nails-lashes-brows, /mobile-hairdressers) from the home page, so they can't drift
// apart: same layout, costs, fair play and sign-up; each with its own question, example answer, the questions its customers
// answer first, a sample enquiry, and its rebooking cycle. Static HTML, so search engines and AI assistants read it all.
//   node scripts/build-trades.mjs          writes the pages
//   node scripts/build-trades.mjs --check  fails if a page is out of date (run by the tests)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import "../public/patch-desk.js";
const K = globalThis.PatchDesk, PUB = fileURLToPath(new URL("../public/", import.meta.url)), ORIGIN = "https://getfettle.co.uk";

// Examples are made up. Postcodes are Stockport's, where Patch starts.
export const TRADES = [
  { slug: "dog-groomers", trade: "groomer", name: "Dog groomers", one: "groomer",
    title: "Patch for dog groomers: get found by AI, enquiries to your WhatsApp",
    desc: "For one-person and mobile dog groomers. Patch gets you found on ChatGPT and Google, sends enquiries to your WhatsApp with breed, size and coat already filled in, and reminds your regulars when they're due. Free setup, £4 an enquiry, no contract.",
    h1: "Dog groomers: get found by AI, and get enquiries that already say breed, size and coat.",
    lede: "When someone asks ChatGPT or Google for a groomer near them, Patch makes sure the answer can be you, with your prices and one tap to WhatsApp you. You keep your diary the way it is.",
    asks: [["dog groomer", "SK4", "Paws & Polish", "Heaton Moor. Mobile, good with cockapoos and nervous dogs. Full groom £45.", "Hi Paws & Polish, I found you on ChatGPT. Cockapoo, medium, a bit nervous. Full groom, Saturday morning? SK4.", "Amy"],
      ["cockapoo groomer", "SK2", "Bark & Bubble", "Edgeley. Teddy-bear cuts, one dog at a time. Full groom £44.", "Hi Bark & Bubble, I found you on Google. Cockapoo, 2 years, teddy-bear cut please. Any weekday? SK2.", "Ben"],
      ["mobile dog groomer", "SK7", "Scruffs to Fluffs", "Hazel Grove. Comes to your door in a fitted van. Full groom from £46.", "Hi Scruffs to Fluffs, I found you on ChatGPT. Springer spaniel, large, very muddy. Next Tuesday? SK7.", "Raj"]],
    sample: { business: "Paws & Polish", source: "chatgpt", answers: { breed: "Cockapoo", size: "Medium", age: "3 years", coat: "A bit matted", service: "Full groom, cockapoo or medium dog", when: "Saturday morning", district: "SK4", cname: "Amy" } },
    again: "each dog is due", prices: "full grooms, puppy intros and nail clips" },
  { slug: "nails-lashes-brows", trade: "nails", name: "Nail, lash and brow techs", one: "tech",
    title: "Patch for nail, lash and brow techs: get found by AI, enquiries to your WhatsApp",
    desc: "For home-studio and mobile nail, lash and brow techs. Patch gets you found on ChatGPT and Google, sends enquiries to your WhatsApp, and reminds clients when their infill or lift is due. Free setup, £4 an enquiry, no contract.",
    h1: "Nail, lash and brow techs: get found by AI, and fill your diary from WhatsApp.",
    lede: "When someone asks ChatGPT or Google for BIAB or a lash lift near them, Patch makes sure the answer can be you, with your prices and one tap to WhatsApp you. Keep working from your phone the way you do now.",
    asks: [["BIAB nail tech", "SK4", "Polished by Priya", "Heaton Moor. Home studio, BIAB £35, infills every 3 weeks.", "Hi Polished by Priya, I found you on Google. BIAB please, Thursday evening if you can. SK4.", "Jess"],
      ["lash tech", "SK3", "Lash Room SK3", "Edgeley. Lash lift and tint £45.", "Hi Lash Room SK3, I found you on ChatGPT. Lash lift and tint before a wedding on the 14th? SK3.", "Mia"],
      ["nail tech", "SK8", "Nailed It Cheadle", "Cheadle. Gel manicure £28, evenings and Saturdays.", "Hi Nailed It Cheadle, I found you on Gemini. Gel manicure, Saturday morning? SK8.", "Sophie"]],
    sample: { business: "Polished by Priya", source: "google", answers: { service: "BIAB", when: "Thursday evening", district: "SK4", notes: "Infill please, last done 3 weeks ago.", cname: "Jess" } },
    again: "each client's infill or lift is due", prices: "BIAB, gels, lifts and brows" },
  { slug: "mobile-hairdressers", trade: "hair", name: "Mobile hairdressers and barbers", one: "hairdresser",
    title: "Patch for mobile hairdressers and barbers: get found by AI, enquiries to your WhatsApp",
    desc: "For mobile and home-based hairdressers and barbers. Patch gets you found on ChatGPT and Google by people who want you to come to them, sends enquiries to your WhatsApp, and reminds clients when they're due. Free setup, £4 an enquiry, no contract.",
    h1: "Mobile hairdressers and barbers: get found by people who want you to come to them.",
    lede: "When someone asks ChatGPT or Google for a hairdresser who visits, Patch makes sure the answer can be you, with your prices and one tap to WhatsApp you. No salon software needed.",
    asks: [["mobile hairdresser", "SK4", "Cut Above at Home", "Heaton Moor. Comes to you. Cut and blow-dry £38.", "Hi Cut Above at Home, I found you on ChatGPT. Cut and blow-dry for my mum at home, a weekday? SK4.", "Kath"],
      ["home hairdresser", "SK6", "Hair by Hannah", "Marple. Cuts and colour at your kitchen table. Root colour £40.", "Hi Hair by Hannah, I found you on Google. Root colour and trim, a weekday morning? SK6.", "Liz"],
      ["mobile barber", "SK2", "Fade to You", "Edgeley. Skin fades at home, £22.", "Hi Fade to You, I found you on Gemini. Skin fade for me and my son, Saturday? SK2.", "Dan"]],
    sample: { business: "Hair by Hannah", source: "chatgpt", answers: { service: "Cut and blow-dry", hair: "Shoulder length, coloured", when: "A weekday morning", district: "SK6", cname: "Liz" } },
    again: "each client is due", prices: "cuts, colour and fades" },
];

const esc = K.esc, js = o => JSON.stringify(o).replace(/</g, "\\u003c");
function region(s, name, inner, wrap) {
  const re = wrap === "js" ? new RegExp(`/\\*T:${name}\\*/[\\s\\S]*?/\\*/T:${name}\\*/`) : new RegExp(`<!--T:${name}-->[\\s\\S]*?<!--/T:${name}-->`);
  if (!re.test(s)) throw new Error("Missing region " + name);
  return s.replace(re, () => wrap === "js" ? `/*T:${name}*/${inner}/*/T:${name}*/` : `<!--T:${name}-->${inner}<!--/T:${name}-->`);
}
export function build(home, t) {
  const T = K.trade(t.trade), [q0, pc0, n0, l0, m0] = t.asks[0], weeks = K.REBOOK[t.trade];
  const qs = T.questions.concat(K.COMMON_END).filter(q => q.k !== "cname" && q.k !== "notes");
  const msg = K.compose({ name: t.sample.business, trade: t.trade }, t.sample.answers, t.sample.source);
  const others = TRADES.filter(x => x !== t);
  let s = home;
  s = region(s, "head", `<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<link rel="canonical" href="${ORIGIN}/${t.slug}">
`);
  s = region(s, "hero", `<p class="ask" id="ask"><span class="sw">Who's a good <span id="q_trade">${esc(q0)}</span> near</span> <span class="pc sw" id="q_pc">${esc(pc0)}</span>?</p>
      <h1>${esc(t.h1)}</h1>`);
  s = region(s, "trade", `<section class="sec"><h2>Made for how ${esc(t.name.toLowerCase())} work</h2><p class="lede" style="margin-bottom:22px">${esc(t.lede)}</p><div class="fit">
    <div><h3>Every enquiry has what you'd ask first</h3><p>Before WhatsApp opens, your customer answers:</p>
      <ul class="qs">${qs.map(q => `<li>${esc(q.t.replace(/\?$/, ""))}</li>`).join("")}</ul></div>
    <div><p class="sm mute" style="margin:0 0 6px">What lands in your WhatsApp (an example):</p><div class="wall"><div class="bubble">${esc(msg)}<small>10:42</small></div></div></div>
    <div><h3>Regulars come back on time</h3><p>${weeks ? `Patch tells you when ${esc(t.again)} (every ${weeks} weeks unless you say otherwise) and writes the reminder. You tap send from your own phone, so it costs nothing and comes from you.` : "Patch tells you who's due back and writes the reminder; you send it from your own phone."}</p></div>
    <div><h3>Know what other ${esc(t.one)}s charge</h3><p>Once five ${esc(t.name.toLowerCase())} in your town are on Patch, you'll see the local range for ${esc(t.prices)}. Never another business's own prices, and never yours to them.</p></div></div>
    <p class="mute" style="margin-top:22px">Also for ${others.map(o => `<a href="${o.slug}">${esc(o.name.toLowerCase())}</a>`).join(" and ")}.</p></section>`);
  s = region(s, "asks", js(t.asks), "js");
  s = region(s, "pre", `<script>window.PATCH_TRADE = ${js(t.trade)};</script>`);
  return `<!-- Built from index.html by scripts/build-trades.mjs: edit those, not this file. -->\n` + s;
}
export function buildAll() { const home = readFileSync(PUB + "index.html", "utf8"); return TRADES.map(t => [PUB + t.slug + ".html", build(home, t)]); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check"); let stale = 0;
  for (const [f, html] of buildAll()) {
    if (check) { if (!existsSync(f) || readFileSync(f, "utf8") !== html) { console.log("Out of date: " + f); stale++; } }
    else { writeFileSync(f, html); console.log("Wrote " + f); }
  }
  if (stale) { console.log("Run: node scripts/build-trades.mjs"); process.exit(1); }
}
