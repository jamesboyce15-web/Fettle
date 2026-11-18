import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMetOffice, moRegion, moCovers, findAlerts, runAlerts, buildAlertEmail, daytime } from "../workers/reminders/src/alerts.js";
import { onRequestGet as unsubscribe } from "../functions/api/unsubscribe.js";
import { unsubToken } from "../lib/server.js";

const res = (body, status = 200) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
const RSS = `<?xml version="1.0"?><rss><channel><title>Met Office warnings</title>
<item><title>Yellow warning of wind affecting North West England</title><link>https://weather.metoffice.gov.uk/w/1</link>
<description>Yellow warning of wind affecting North West England: Cumbria, Lancashire valid from 0600 Thu 19 Nov to 2100 Thu 19 Nov</description><guid>mo-wind-1</guid></item>
<item><title>Amber warning of rain affecting North West England</title><link>https://weather.metoffice.gov.uk/w/2</link>
<description><![CDATA[Amber warning of rain affecting North West England: Cumbria valid from 0000 Fri 20 Nov to 1200 Fri 20 Nov]]></description><guid>mo-rain-2</guid></item>
</channel></rss>`;
const LANCS = { country: "England", region: "North West", admin_district: "Lancaster", admin_county: "Lancashire" };
// 12:00 UTC in November is midday in the UK; 23:30 UTC is night.
const DAY = new Date("2026-11-19T12:00:00Z"), NIGHT = new Date("2026-11-19T23:30:00Z");

function agencies({ flood = true, cold = "Yellow" } = {}) {
  const calls = [];
  const f = async (url) => {
    url = String(url); calls.push(url);
    if (url.includes("postcodes.io")) return res({ result: [LANCS] });
    if (url.includes("/id/floods?min-severity")) return res({ items: flood ? [{ severityLevel: 2 }] : [] });
    if (url.includes("/id/floods?lat")) return res({ items: flood ? [{ severityLevel: 2, floodAreaID: "012WAFLU", description: "River Lune at Caton" }, { severityLevel: 3, floodAreaID: "012WALUNE" }] : [] });
    if (url.includes("WarningsRSS/Region/nw")) return res(RSS);
    if (url.includes("/alerts/v1/cold/E12000002")) return res({ status: cold, geography_name: "North West", period_start: "2026-11-18T09:00:00Z", period_end: "2026-11-23T09:00:00Z" });
    if (url.includes("/alerts/v1/heat/")) return res({ status: "Green" });
    return res({}, 404);
  };
  return { f, calls };
}

test("Met Office feed: colour, hazard, places and times", () => {
  const W = parseMetOffice(RSS);
  assert.equal(W.length, 2);
  assert.deepEqual([W[0].colour, W[0].hazard, W[0].places, W[0].from, W[0].to], ["yellow", "wind", ["Cumbria", "Lancashire"], "0600 Thu 19 Nov", "2100 Thu 19 Nov"]);
  assert.equal(W[1].colour, "amber"); assert.equal(W[1].id, "mo-rain-2");
  assert.equal(moCovers(W[0], LANCS), true); assert.equal(moCovers(W[1], LANCS), false);
});

test("regions: England, Scotland by council, Wales, Northern Ireland", () => {
  assert.equal(moRegion(LANCS), "nw");
  assert.equal(moRegion({ country: "England", region: "London" }), "se");
  assert.equal(moRegion({ country: "Scotland", admin_district: "Fife" }), "ta");
  assert.equal(moRegion({ country: "Scotland", admin_district: "Glasgow City" }), "st");
  assert.equal(moRegion({ country: "Wales" }), "wl");
  assert.equal(moRegion({ country: "Northern Ireland" }), "ni");
  assert.equal(moRegion(null), null);
});

test("daytime is UK time", () => { assert.equal(daytime(DAY), true); assert.equal(daytime(NIGHT), false); });

test("finds flood, weather and health warnings for the right homes", async () => {
  const { f } = agencies();
  const homes = [{ household_id: "a", lat: 54.05, lng: -2.8, vulnerable: true }, { household_id: "b", lat: 54.051, lng: -2.801, vulnerable: false }];
  const A = await findAlerts(homes, f, DAY);
  const of = id => A.filter(a => a.home.household_id === id).map(a => a.kind).sort();
  assert.deepEqual(of("a"), ["cold", "flood", "weather"]);
  assert.deepEqual(of("b"), ["flood", "weather"], "yellow cold-health alert only for homes more at risk");
  assert.ok(A.every(a => a.key !== "ea:012WALUNE:3"), "flood alerts (level 3) are not emailed");
  assert.ok(!A.some(a => a.key === "mo:mo-rain-2"), "amber rain for Cumbria doesn't cover Lancaster");
});

test("at night, yellow weather warnings wait until morning; flood warnings don't", async () => {
  const { f } = agencies();
  const A = await findAlerts([{ household_id: "a", lat: 54.05, lng: -2.8, vulnerable: false }], f, NIGHT);
  assert.deepEqual(A.map(a => a.kind), ["flood"]);
});

test("no flood anywhere: no home-by-home flood lookups", async () => {
  const { f, calls } = agencies({ flood: false, cold: "Green" });
  await findAlerts([{ household_id: "a", lat: 54.05, lng: -2.8 }], f, DAY);
  assert.ok(!calls.some(u => u.includes("/id/floods?lat")));
});

const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "svc", UNSUBSCRIBE_SECRET: "sec", SITE_URL: "https://f.test", FROM_EMAIL: "F <a@f.test>", RESEND_API_KEY: "re_x" };
const TARGETS = [
  { user_id: "u1", email: "james@x.test", first_name: "James", household_id: "h-me", owner: true, vulnerable: false, data: { lat: 54.05, lng: -2.8, other: false } },
  { user_id: "u1", email: "james@x.test", first_name: "James", household_id: "h-mum", owner: true, vulnerable: true, data: { lat: 54.06, lng: -2.81, other: true, name: "Mum" } },
  { user_id: "u2", email: "sarah@x.test", first_name: "Sarah", household_id: "h-mum", owner: false, vulnerable: true, data: { lat: 54.06, lng: -2.81, other: true, name: "Mum" } },
];
function world(sent = []) {
  const { f: ag } = agencies(), calls = [];
  globalThis.fetch = async (url, init = {}) => {
    url = String(url); calls.push({ url, init });
    if (url.includes("/rpc/fettle_alert_targets")) return res(TARGETS);
    if (url.includes("/alerts_sent?select")) return res(sent);
    if (url.includes("/alerts_sent")) return res({}, 201);
    return res({});
  };
  const f = async (url, init = {}) => { calls.push({ url: String(url), init }); return String(url).includes("resend.com") ? res({ id: "m" }) : ag(url, init); };
  return { f, calls };
}

test("alerts: dry run sends and records nothing", async () => {
  const { f, calls } = world();
  const out = await runAlerts({ ...env, ALERTS_DRY_RUN: "true" }, f, DAY);
  assert.equal(out.dry, true); assert.equal(out.people, 2); assert.equal(out.sent, 0);
  assert.ok(!calls.some(c => c.url.includes("resend.com") || (c.url.includes("/alerts_sent") && c.init.method === "POST")));
});

test("alerts: one email per person, covering every home they're in; recorded so it isn't sent twice", async () => {
  const { f, calls } = world();
  const out = await runAlerts({ ...env, ALERTS_DRY_RUN: "false" }, f, DAY);
  assert.equal(out.sent, 2);
  const mails = calls.filter(c => c.url.includes("resend.com")).map(c => JSON.parse(c.init.body));
  const james = mails.find(m => m.to[0] === "james@x.test"), sarah = mails.find(m => m.to[0] === "sarah@x.test");
  assert.match(james.subject, /warnings near your family's homes/);
  assert.match(james.text, /Mum's home/); assert.match(james.text, /Your home/); assert.match(james.text, /family emergency mode/);
  assert.match(james.text, /call 999/); assert.match(james.text, /isn't an official warning service/);
  assert.match(james.headers["List-Unsubscribe"], /k=alerts/);
  assert.match(sarah.text, /Mum's home/); assert.doesNotMatch(sarah.text, /Your home/, "Sarah only hears about the homes she's in");
  const rec = calls.filter(c => c.url.endsWith("/alerts_sent") && c.init.method === "POST");
  assert.equal(rec.length, 2);
  // Next run: everything already sent
  const again = world(JSON.parse(rec[0].init.body).map(x => ({ user_id: "u1", alert_key: x.alert_key })).concat(JSON.parse(rec[1].init.body).map(x => ({ user_id: "u2", alert_key: x.alert_key }))));
  const out2 = await runAlerts({ ...env, ALERTS_DRY_RUN: "false" }, again.f, DAY);
  assert.equal(out2.sent, 0);
});

test("alerts: a test address gets every email, marked [TEST], and nothing is recorded", async () => {
  const { f, calls } = world();
  const out = await runAlerts({ ...env, ALERTS_DRY_RUN: "true", ALERT_TEST_TO: "me@x.test" }, f, DAY);
  assert.equal(out.sent, 2);
  const mails = calls.filter(c => c.url.includes("resend.com")).map(c => JSON.parse(c.init.body));
  assert.ok(mails.every(m => m.to[0] === "me@x.test" && m.subject.startsWith("[TEST] ")));
  assert.ok(!calls.some(c => c.url.endsWith("/alerts_sent") && c.init.method === "POST"));
});

test("alert email: severe flood warning says to leave if told to", () => {
  const m = buildAlertEmail({ first_name: null, homes: 1 }, [{ kind: "flood", sev: 1, key: "k", where: "River Lune", link: "https://l", home: { household_id: "a", owner: true } }], { SITE_URL: "https://f.test" }, "https://u");
  assert.match(m.subject, /^Severe flood warning: danger to life, near your home$/);
  assert.match(m.text, /If you're told to leave, go/); assert.match(m.html, /Open Fettle/);
});

test("unsubscribe with k=alerts turns off warnings only", async () => {
  const UID = "11111111-1111-4111-8111-111111111111", calls = [];
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); return init.method === "PUT" ? res({}) : res({ id: UID, user_metadata: { remind_emails: true, alert_emails: true } }); };
  const r = await unsubscribe({ request: new Request(`https://x/api/unsubscribe?u=${UID}&t=${await unsubToken("sec", UID)}&k=alerts`), env: { ...env, SUPABASE_ANON_KEY: "a" } });
  assert.equal(r.status, 200); assert.match(await r.text(), /Warnings turned off/);
  assert.deepEqual(JSON.parse(calls.find(c => c.init.method === "PUT").init.body).user_metadata, { remind_emails: true, alert_emails: false });
});
