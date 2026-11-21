// The Monday email for one owner, worked out on the server with the same code the owner's page uses.
import "../public/patch-core.js";
import "../public/patch-ops.js";
import "../public/patch-insights.js";
import "../public/patch-emails.js";

const G = globalThis;
// Today's date in London, and whether it's Monday there.
export function londonToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now).map(x => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, monday: p.weekday === "Mon" };
}
export function weeklyFor(r, venue, area, today, base, brand) {
  const O = G.PatchOps, I = G.PatchInsights, E = G.PatchEmails, S = r.owner_state || {};
  const v = { name: venue.name, postcode: venue.postcode, hygiene: venue.hygiene, hygieneDate: venue.hygiene_date };
  const rank = area.rankings && area.rankings[venue.id];
  const ctx = { district: (venue.postcode || "").split(" ")[0], cafe: venue.name, calendar: area.calendar || [], newNearby: [], venue: v, moves: (rank && rank.moves) || [] };
  const items = O.briefing(S, ctx, today);
  const lines = (S.invoices || []).filter(x => x.at >= O.addD(today, -120)).flatMap(x => x.lines || []);
  const suppliers = I.supplierFindings(lines, area.supply_bench, S.priceCheck), seo = I.seoScore(venue.seo && venue.seo.checks), geo = I.geoSummary(area.geo, venue.name);
  const report = rank && rank.prices && rank.prices.length ? Object.assign({}, r.report || {}, { items: rank.prices }) : r.report;
  const thread = I.goldenThread({ today, report, suppliers, seo, geo, visitRank: rank && rank.visit, moves: rank && rank.moves, state: S, venue: v });
  const open = thread.filter(a => a.status !== "done" && a.status !== "skip");
  const t = encodeURIComponent(r.token);
  return E.weekly({ name: r.name, cafe: venue.name, items, brand, ownerUrl: `${base}/owner?t=${t}`, unsubUrl: `${base}/api/unsubscribe?t=${t}`, actions: { n: open.length, value: open.reduce((s, a) => s + (a.value || 0), 0) } });
}
