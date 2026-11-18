// Postcode alerts: emails people who turned on "Email me warnings for my homes" when an official warning covers one of
// their homes, or a family home they've been invited to.
//
// Sources (all free, no key):
//   Environment Agency flood warnings (England)   https://environment.data.gov.uk/flood-monitoring/id/floods
//   Met Office weather warnings (UK), by region    https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/<code>
//   UKHSA cold- and heat-health alerts (England)   https://ukhsa-dashboard.data.gov.uk/api/proxy/alerts/v1/<cold|heat>/<region>
//   postcodes.io, to turn a home's location into its region, county and council.
//
// Who gets what:
//   Flood warnings and severe flood warnings: everyone, any time.
//   Met Office amber and red: everyone, any time. Yellow: everyone, but only between 7am and 9pm UK time.
//   UKHSA amber and red: everyone. Yellow: only homes with someone over 70, a child under 5, health needs or carer visits.
// Each person gets each warning once (alerts_sent). With ALERTS_DRY_RUN not "false", nothing is sent or recorded.
// ALERT_TEST_TO, if set, sends every email to that one address instead, and records nothing: for checking the wording.
import { unsubToken } from "../../../lib/server.js";

const EA = "https://environment.data.gov.uk/flood-monitoring";
const MO = "https://weather.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/";
const UKHSA = "https://ukhsa-dashboard.data.gov.uk/api/proxy/alerts/v1/";
const PC = "https://api.postcodes.io/postcodes";

// Met Office warning regions. England by ONS region; Scotland by council; Wales and Northern Ireland whole.
export const MO_ENGLAND = { "North West": "nw", "North East": "ne", "Yorkshire and The Humber": "yh", "West Midlands": "wm", "East Midlands": "em",
  "East of England": "ee", "South West": "sw", "London": "se", "South East": "se" };
export const MO_SCOTLAND = {
  os: ["Orkney Islands", "Shetland Islands"],
  he: ["Highland", "Na h-Eileanan Siar"],
  gr: ["Aberdeen City", "Aberdeenshire", "Moray"],
  st: ["Argyll and Bute", "East Dunbartonshire", "West Dunbartonshire", "Glasgow City", "Inverclyde", "North Lanarkshire", "South Lanarkshire",
       "East Renfrewshire", "Renfrewshire", "East Ayrshire", "North Ayrshire", "South Ayrshire"],
  ta: ["Angus", "Dundee City", "Perth and Kinross", "Fife", "Stirling", "Falkirk", "Clackmannanshire"],
  dg: ["Dumfries and Galloway", "Scottish Borders", "City of Edinburgh", "East Lothian", "Midlothian", "West Lothian"],
};
export const UKHSA_REGION = { "North East": "E12000001", "North West": "E12000002", "Yorkshire and The Humber": "E12000003", "East Midlands": "E12000004",
  "West Midlands": "E12000005", "East of England": "E12000006", "London": "E12000007", "South East": "E12000008", "South West": "E12000009" };

export function moRegion(p) {
  if (!p) return null;
  if (p.country === "Wales") return "wl";
  if (p.country === "Northern Ireland") return "ni";
  if (p.country === "Scotland") return Object.keys(MO_SCOTLAND).find(k => MO_SCOTLAND[k].includes(p.admin_district)) || null;
  return MO_ENGLAND[p.region] || null;
}

const strip = s => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? strip(m[1]) : ""; };

// "Yellow warning of wind affecting North West England: Cumbria, Lancashire valid from 0600 Thu 19 Nov to 2100 Thu 19 Nov"
export function parseMetOffice(xml) {
  return [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const title = tag(it, "title"), desc = tag(it, "description"), text = desc || title;
    const colour = ((text.match(/^(yellow|amber|red)/i) || title.match(/(yellow|amber|red)/i) || [])[1] || "").toLowerCase();
    const hazard = ((text.match(/warning of (.+?) affecting/i) || title.match(/warning of (.+?)( affecting|$)/i) || [])[1] || "").toLowerCase();
    const places = ((text.match(/affecting [^:]+:\s*(.+?)\s+valid from/i) || [])[1] || "").split(/,\s*/).map(s => s.trim()).filter(Boolean);
    const valid = text.match(/valid from (.+?) to (.+?)$/i);
    return { id: tag(it, "guid") || tag(it, "link") || title, title, colour, hazard, places, from: valid ? valid[1] : "", to: valid ? valid[2] : "", link: tag(it, "link") };
  }).filter(w => w.colour);
}
// A Met Office warning names the counties and councils it covers. Match the home's county or council when it does.
export function moCovers(w, p) {
  if (!w.places.length) return true;
  const mine = [p.admin_district, p.admin_county].filter(Boolean).map(s => s.toLowerCase());
  return w.places.some(x => mine.some(m => x.toLowerCase().includes(m) || m.includes(x.toLowerCase())));
}
const ukHour = d => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/London" }).format(d));
export const daytime = (d = new Date()) => { const h = ukHour(d); return h >= 7 && h < 21; };

async function getJSON(f, url) { try { const r = await f(url, { headers: { Accept: "application/json" } }); return r.ok ? await r.json() : null; } catch (e) { console.error("fetch", url, e); return null; } }
async function getText(f, url) { try { const r = await f(url); return r.ok ? await r.text() : null; } catch (e) { console.error("fetch", url, e); return null; } }

// Where each home is: region, county, council. One postcodes.io call per distinct location.
async function places(f, homes) {
  const out = new Map();
  for (const h of homes) {
    const k = `${(+h.lat).toFixed(3)},${(+h.lng).toFixed(3)}`;
    if (out.has(k)) { h._p = out.get(k); continue; }
    const j = await getJSON(f, `${PC}?lon=${h.lng}&lat=${h.lat}&limit=1&radius=2000`);
    const p = j && j.result && j.result[0] ? j.result[0] : null;
    out.set(k, p); h._p = p;
  }
}

// Gather every current warning that covers each home. Returns [{home, key, kind, ...}].
export async function findAlerts(homes, f = fetch, now = new Date()) {
  const found = [];
  if (!homes.length) return found;
  await places(f, homes);
  // Environment Agency: only look home by home if anything is in force anywhere.
  const eng = homes.filter(h => !h._p || h._p.country === "England");
  const all = eng.length ? await getJSON(f, `${EA}/id/floods?min-severity=2`) : null;
  if (all && (all.items || []).some(x => x.severityLevel <= 2)) {
    const seen = new Map();
    for (const h of eng) {
      const k = `${(+h.lat).toFixed(3)},${(+h.lng).toFixed(3)}`;
      if (!seen.has(k)) seen.set(k, await getJSON(f, `${EA}/id/floods?lat=${h.lat}&long=${h.lng}&dist=3`));
      for (const x of ((seen.get(k) || {}).items || []).filter(x => x.severityLevel && x.severityLevel <= 2)) {
        const area = x.floodAreaID || (x.floodArea && x.floodArea.notation) || "";
        found.push({ home: h, kind: "flood", sev: x.severityLevel, key: `ea:${area}:${x.severityLevel}`, where: x.description || x.eaAreaName || "",
          link: area ? `https://check-for-flooding.service.gov.uk/target-area/${area}` : "https://check-for-flooding.service.gov.uk/" });
      }
    }
  }
  // Met Office, one feed per region needed.
  const regions = new Map();
  for (const h of homes) { const r = moRegion(h._p); if (r) { if (!regions.has(r)) regions.set(r, []); regions.get(r).push(h); } }
  const day = daytime(now);
  for (const [r, H] of regions) {
    const xml = await getText(f, MO + r); if (!xml) continue;
    for (const w of parseMetOffice(xml)) {
      if (w.colour === "yellow" && !day) continue;
      for (const h of H) if (moCovers(w, h._p))
        found.push({ home: h, kind: "weather", colour: w.colour, hazard: w.hazard, key: `mo:${w.id}`, where: w.places.join(", "), from: w.from, to: w.to,
          link: "https://weather.metoffice.gov.uk/warnings-and-advice/uk-warnings" });
    }
  }
  // UKHSA cold- and heat-health alerts, England by region.
  const uk = new Map();
  for (const h of homes) { const c = h._p && h._p.country === "England" ? UKHSA_REGION[h._p.region] : null; if (c) { if (!uk.has(c)) uk.set(c, []); uk.get(c).push(h); } }
  for (const [c, H] of uk) for (const type of ["cold", "heat"]) {
    const a = await getJSON(f, `${UKHSA}${type}/${c}`);
    const status = String((a && a.status) || "").toLowerCase();
    if (!["yellow", "amber", "red"].includes(status)) continue;
    for (const h of H) {
      if (status === "yellow" && !h.vulnerable) continue;
      found.push({ home: h, kind: type, colour: status, key: `ukhsa:${type}:${c}:${status}:${a.period_start || ""}`, where: a.geography_name || "",
        from: a.period_start || "", to: a.period_end || "", link: `https://ukhsa-dashboard.data.gov.uk/weather-health-alerts/${type}` });
    }
  }
  return found;
}

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
export function homeLabel(h) {
  if (h.other && h.name) return `${h.name}'s home`;
  if (h.owner) return "your home";
  return h.surname ? `the ${h.surname} household` : "a family home";
}
export function headline(a) {
  if (a.kind === "flood") return a.sev === 1 ? "Severe flood warning: danger to life" : "Flood warning: flooding is expected";
  if (a.kind === "weather") return `${cap(a.colour)} weather warning: ${a.hazard || "severe weather"}`;
  return `${cap(a.colour)} ${a.kind}-health alert`;
}
export function actions(a) {
  if (a.kind === "flood") return [
    ...(a.sev === 1 ? ["Follow the emergency services' advice. If you're told to leave, go."] : []),
    "Move people, pets, medicines and documents upstairs or somewhere high.",
    "Turn off gas and electricity if it's safe. Never touch a switch while standing in water.",
    "Never walk or drive through floodwater. 30cm of flowing water can float a car."];
  if (a.kind === "cold") return ["Heat the main room to at least 18°C if you can, and wear layers.", "Check on older relatives and neighbours, especially anyone living alone.", "Have food, medicines and a way to keep warm in case it's hard to get out."];
  if (a.kind === "heat") return ["Keep out of the sun between 11am and 3pm, and keep curtains closed in sunny rooms.", "Drink plenty of water, and check on older relatives and neighbours.", "Know the signs of heat exhaustion: headache, dizziness, feeling sick, very thirsty."];
  const hz = a.hazard || "";
  if (/snow|ice/.test(hz)) return ["Avoid travel if you can.", "Keep warm: one warm room, layers and hats.", "Check on anyone who lives alone, and charge phones and power banks."];
  if (/heat/.test(hz)) return ["Keep out of the sun between 11am and 3pm, and drink plenty of water.", "Check on older relatives and neighbours."];
  return ["Charge phones and power banks now, and check your torch works.", "Bring in or tie down anything that could blow away.", "Check on anyone who lives alone. If the power goes, report it on 105."];
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buildAlertEmail(person, alerts, env, unsubUrl) {
  const many = alerts.length > 1, homesN = new Set(alerts.map(a => a.home.household_id)).size;
  const first = alerts[0];
  const subject = many ? `${alerts.length} warnings near ${homesN > 1 ? "your family's homes" : homeLabel(first.home)}` : `${headline(first)}, near ${homeLabel(first.home)}`;
  const hi = person.first_name ? `Hi ${person.first_name},` : "Hi,";
  const link = `${env.SITE_URL}/?src=alert`;
  const family = person.homes > 1;
  const blocks = alerts.map(a => ({
    h: `${headline(a)}`, home: cap(homeLabel(a.home)),
    where: [a.where, a.from && a.to ? `from ${a.from} to ${a.to}` : ""].filter(Boolean).join(", "),
    acts: actions(a), link: a.link }));
  const text = `${hi}

${many ? "There are official warnings near homes in your Fettle plan." : "There's an official warning near a home in your Fettle plan."} If anyone's life is at risk, call 999.

${blocks.map(b => `${b.h}
${b.home}${b.where ? `: ${b.where}` : ""}
${b.acts.map(x => `- ${x}`).join("\n")}
Official details: ${b.link}`).join("\n\n")}

${family ? "Open Fettle to check on everyone. If it gets serious, start family emergency mode so everyone can see who's OK and who's doing what." : "Open Fettle to see your plan for this."}
${link}

Fettle isn't an official warning service. Sign up for free flood warnings at https://www.gov.uk/sign-up-for-flood-warnings and follow what the emergency services tell you.

You're getting this because you turned on warnings for your homes. Turn them off: ${unsubUrl}`;
  const html = `<div style="font:16px/1.6 system-ui,sans-serif;color:#1c2522;max-width:520px">
<p>${esc(hi)}</p>
<p>${many ? "There are official warnings near homes in your Fettle plan." : "There's an official warning near a home in your Fettle plan."} <b>If anyone's life is at risk, call 999.</b></p>
${blocks.map(b => `<div style="border-left:4px solid #b4442c;padding:4px 0 4px 14px;margin:18px 0"><p style="margin:0;font-weight:700;font-size:17px">${esc(b.h)}</p>
<p style="margin:2px 0 8px;color:#5a6670">${esc(b.home)}${b.where ? `: ${esc(b.where)}` : ""}</p>
<ul style="padding-left:20px;margin:0">${b.acts.map(x => `<li style="margin:4px 0">${esc(x)}</li>`).join("")}</ul>
<p style="margin:8px 0 0"><a href="${esc(b.link)}" style="color:#1a5c8c">Official details</a></p></div>`).join("")}
<p>${family ? "Check on everyone. If it gets serious, start family emergency mode so everyone can see who's OK and who's doing what." : "Your plan has what to do."}</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#f2a900;color:#1c2522;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:8px">Open Fettle</a></p>
<p style="font-size:13px;color:#5a6670">Fettle isn't an official warning service. <a href="https://www.gov.uk/sign-up-for-flood-warnings" style="color:#5a6670">Sign up for free flood warnings</a> and follow what the emergency services tell you.</p>
<p style="font-size:13px;color:#5a6670">You're getting this because you turned on warnings for your homes. <a href="${esc(unsubUrl)}" style="color:#5a6670">Turn them off</a>.</p></div>`;
  return { subject, text, html };
}

async function sb(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) } });
}

export async function runAlerts(env, f = fetch, now = new Date()) {
  const dry = env.ALERTS_DRY_RUN !== "false", test = env.ALERT_TEST_TO || "";
  const r = await sb(env, "/rest/v1/rpc/fettle_alert_targets", { method: "POST", body: "{}" });
  if (!r.ok) { console.error("alert targets failed", await r.text()); return { sent: 0, dry }; }
  const rows = await r.json();
  // One entry per home (several people can share one), each knowing who to tell.
  const homes = new Map();
  for (const row of rows) {
    const d = row.data || {};
    if (d.lat == null || d.lng == null) continue;
    if (!homes.has(row.household_id)) homes.set(row.household_id, { household_id: row.household_id, lat: d.lat, lng: d.lng, other: !!d.other, name: d.name, surname: d.surname, vulnerable: !!row.vulnerable, people: [] });
    homes.get(row.household_id).people.push(row);
  }
  const alerts = await findAlerts([...homes.values()], f, now);
  const sentKeys = new Set();
  if (alerts.length) {
    const ids = [...new Set(rows.map(x => x.user_id))];
    const s = await sb(env, `/rest/v1/alerts_sent?select=user_id,alert_key&user_id=in.(${ids.join(",")})&sent_at=gte.${new Date(now - 14 * 864e5).toISOString()}`);
    if (s.ok) (await s.json()).forEach(x => sentKeys.add(`${x.user_id}|${x.alert_key}`));
  }
  const perUser = new Map(), homesPerUser = new Map();
  rows.forEach(x => homesPerUser.set(x.user_id, (homesPerUser.get(x.user_id) || 0) + 1));
  for (const a of alerts) for (const p of a.home.people) {
    if (sentKeys.has(`${p.user_id}|${a.key}`)) continue;
    if (!perUser.has(p.user_id)) perUser.set(p.user_id, { person: p, list: [] });
    const home = { ...a.home, owner: p.owner };
    if (!perUser.get(p.user_id).list.some(x => x.key === a.key && x.home.household_id === home.household_id)) perUser.get(p.user_id).list.push({ ...a, home });
  }
  let sent = 0, failed = 0;
  for (const [uid, { person, list }] of perUser) {
    const sev = list.sort((x, y) => (x.kind === "flood" ? 0 : 1) - (y.kind === "flood" ? 0 : 1));
    const unsub = `${env.SITE_URL}/api/unsubscribe?u=${uid}&t=${await unsubToken(env.UNSUBSCRIBE_SECRET, uid)}&k=alerts`;
    const mail = buildAlertEmail({ first_name: person.first_name, homes: homesPerUser.get(uid) }, sev, env, unsub);
    if (dry && !test) { console.log("ALERTS DRY RUN, would send:", mail.subject, `(${sev.length} warnings)`); continue; }
    const s = await f("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: [test || person.email], subject: (test ? "[TEST] " : "") + mail.subject, text: mail.text, html: mail.html, headers: { "List-Unsubscribe": `<${unsub}>` } }) });
    if (!s.ok) { failed++; console.error("alert send failed", await s.text()); continue; }
    sent++;
    if (!test) await sb(env, "/rest/v1/alerts_sent", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(sev.map(a => ({ user_id: uid, alert_key: a.key }))) });
  }
  if (now.getUTCHours() === 3 && now.getUTCMinutes() < 15) await sb(env, "/rest/v1/rpc/fettle_prune_alerts", { method: "POST", body: "{}" });
  console.log(`alerts: ${homes.size} homes, ${alerts.length} warnings, ${perUser.size} people to tell, ${sent} sent, ${failed} failed, dry run ${dry}${test ? ", test address" : ""}`);
  return { homes: homes.size, warnings: alerts.length, people: perUser.size, sent, failed, dry };
}
