/* Sample families for the coordinator dashboard's demo mode (coordinator.html?demo=1), the family plan's demo
   (plan.html?demo=1) and the tests. Made-up people and places: nothing here is real. */
(function (root) {
  "use strict";
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
  const iso = n => day(n).toISOString();
  const date = n => day(n).toISOString().slice(0, 10);
  const at = (n, h) => { const d = day(n); d.setHours(h, 0, 0, 0); return d.toISOString(); };

  const geo = { LA1: { lat: 54.047, lng: -2.801 }, LA2: { lat: 54.066, lng: -2.762 }, B15: { lat: 52.462, lng: -1.931 },
    OL11: { lat: 53.603, lng: -2.163 }, OL12: { lat: 53.633, lng: -2.152 }, M14: { lat: 53.448, lng: -2.221 }, M20: { lat: 53.418, lng: -2.231 }, SK4: { lat: 53.420, lng: -2.180 } };

  const ME = { user_id: "c-demo", name: "Alex", phone: "0161 555 0100", email: "hello@getfettle.co.uk", patch: "Greater Manchester and Lancashire", role: "admin", active: true };

  const hughes = {
    id: "cl-hughes", request_id: "rq-hughes", coordinator_id: "c-demo", family_name: "Hughes", status: "plan_sent", share_token: "demo-hughes",
    sent_at: iso(-6), next_review: date(359), created_at: iso(-8), updated_at: iso(-1),
    private: { notes: "Tom worries most about Red. Margaret is sharp but won't ask for help." },
    data: {
      geo, booker: { name: "Tom Hughes", email: "tom@example.com", phone: "07700 900111", relation: "Son" },
      consent: { person: true, share: true, recorded: false, at: date(-7) },
      call: { scheduledAt: at(-7, 18), doneAt: iso(-7) },
      homes: [{ id: "h1", label: "Margaret's home", district: "LA1", type: "bungalow", floor: 0, flood: false,
        people: [{ id: "p1", name: "Margaret", age: "75 to 84", alone: true, vuln: true }],
        a: { heat: "gas", warmRoom: true, phone: "digital", phoneBackup: "no", alarm: true, signal: "poor", equip: [], water: "mains", highWater: false,
          cook: "electric", foodCold: true, stairs: false, canLeave: "yes", medsDays: 5, fridgeMeds: false, memory: false, hearing: true,
          cash: true, keysafe: true, keyHolders: "Claire, Pat", co: false, candles: true, carers: true, agency: "Bayside Care", agencyListed: "unknown", pets: "Cat (Mabel)" },
        kit: { has: { torch: true, food: true, warmth: true }, tier: "red", medical: true, status: "delivered", payer: "Tom" } }],
      helpers: [
        { id: "x1", name: "Tom", role: "family", district: "B15", car: true, kids: true },
        { id: "x2", name: "Claire", role: "family", district: "LA2", miles: 4, car: true, essential: true, key: true },
        { id: "x3", name: "Pat", role: "neighbour", district: "LA1", miles: 0.1, older: true, key: true },
        { id: "x4", name: "Ian", role: "volunteer", district: "LA1", miles: 0.6, car: false, status: "agreed" },
        { id: "x5", name: "St Paul's befriending", role: "partner", district: "LA1", miles: 1.2, status: "asked" },
      ],
      outcomes: { psrElec: { done: true, at: date(-7) }, psrWater: { done: true, at: date(-7) }, alerts: { done: true, at: date(-7) }, texts: { done: true, at: date(-7) },
        keys: { done: true, at: date(-7) }, kit: { done: true, at: date(-5) }, book: { done: true, at: date(-3) }, review: { done: true, at: date(-7) } },
      alerts: { numbers: "Tom 07700 900111, Claire 07700 900222" },
      resources: [{ title: "Warm space at Lancaster Library, weekdays 10 to 4", band: "a", source: "", added: date(-2) }],
    },
  };

  const okafor = {
    id: "cl-okafor", request_id: "rq-okafor", coordinator_id: "c-demo", family_name: "Okafor", status: "call", share_token: "demo-okafor",
    sent_at: null, next_review: null, created_at: iso(-1), updated_at: iso(0), private: {},
    data: {
      geo, booker: { name: "Grace Okafor", email: "grace@example.com", phone: "07700 900333", relation: "Daughter" },
      consent: {}, call: { scheduledAt: at(0, 19) },
      homes: [{ id: "h1", label: "Dad's flat", district: "OL11", type: "flat", floor: 3, flood: false,
        people: [{ id: "p1", name: "Emmanuel", age: "75 to 84", alone: true, vuln: true }],
        a: { heat: "electric", phone: "mobile", equip: ["oxygen"], equipHours: 4, highWater: true, stairs: true, canLeave: "help", carers: true }, kit: { has: {} } }],
      helpers: [{ id: "x1", name: "Grace", role: "family", district: "OL12", car: true, kids: true }],
      outcomes: {},
    },
  };

  const patel = {
    id: "cl-patel", request_id: null, coordinator_id: "c-demo", family_name: "Patel", status: "active", share_token: "demo-patel",
    sent_at: iso(-40), next_review: date(20), created_at: iso(-45), updated_at: iso(-10), private: {},
    data: {
      geo, booker: { name: "Ravi Patel", email: "ravi@example.com", phone: "07700 900444", relation: "Son" },
      consent: { person: true, share: true, at: date(-44) }, call: { doneAt: iso(-44) },
      homes: [{ id: "h1", label: "Family home", district: "M14", type: "house", floor: 0, flood: true,
        people: [{ id: "p1", name: "Kamala", age: "85 or over", alone: false, vuln: true }, { id: "p2", name: "Ravi", age: "18 to 64" }],
        a: { heat: "gas", warmRoom: true, phone: "copper", water: "mains", cook: "gas", medsDays: 14, fridgeMeds: true, cash: true, keysafe: true, co: true },
        kit: { has: { torch: true, radio: true, water: true, food: true, co: true, warmth: true }, tier: "amber", medical: true, status: "delivered", payer: "Ravi" } }],
      helpers: [
        { id: "x1", name: "Ravi", role: "home", district: "M14", miles: 0, car: true },
        { id: "x2", name: "Priya", role: "family", district: "M20", car: true },
        { id: "x3", name: "Mr Ahmed", role: "neighbour", district: "M14", miles: 0.1 },
      ],
      outcomes: { psrElec: { done: true }, psrWater: { done: true }, alerts: { done: true }, texts: { done: true }, floodline: { done: true }, keys: { done: true },
        kit: { done: true }, book: { done: true }, review: { done: true } },
    },
  };

  const requests = [
    { id: "rq-new1", created_at: iso(0), status: "new", booker_name: "Helen Brookes", booker_email: "helen@example.com", booker_phone: "07700 900555", relation: "Daughter",
      for_name: "Joan", for_age: "85 or over", for_district: "SK4", lives_alone: true, carers: false, joining: "Me, my brother Mark (Leeds)", times: ["Weekday evening", "Weekend"], notes: "Mum is very deaf, phone calls are hard." },
    { id: "rq-new2", created_at: iso(-1), status: "contacted", booker_name: "Sam Taylor", booker_email: "sam@example.com", relation: "Grandson",
      for_name: "Bill and Rose", for_age: "75 to 84", for_district: "M20", lives_alone: false, carers: true, joining: "Me and Mum", times: ["Weekday daytime"], notes: "" },
    { id: "rq-okafor", created_at: iso(-2), status: "scheduled", booker_name: "Grace Okafor", booker_email: "grace@example.com", booker_phone: "07700 900333", relation: "Daughter",
      for_name: "Emmanuel", for_age: "75 to 84", for_district: "OL11", lives_alone: true, carers: true, joining: "Me, Dad", times: ["Weekday evening"], scheduled_at: at(0, 19), coordinator_id: "c-demo", client_id: "cl-okafor" },
    { id: "rq-hughes", created_at: iso(-10), status: "done", booker_name: "Tom Hughes", booker_email: "tom@example.com", relation: "Son", for_name: "Margaret", for_age: "75 to 84",
      for_district: "LA1", lives_alone: true, carers: true, scheduled_at: at(-7, 18), coordinator_id: "c-demo", client_id: "cl-hughes" },
  ];

  const messages = [
    { id: "m1", client_id: "cl-patel", at: iso(-1), kind: "family", body: "Mum's been prescribed insulin now, it lives in the fridge.", author: "Ravi", seen: false },
    { id: "m2", client_id: "cl-hughes", at: iso(-6), kind: "system", body: "Plan sent to Tom.", author: "Alex", seen: true },
  ];

  const events = [
    { id: "ev1", created_at: iso(0), created_by: "c-demo", title: "Amber wind warning: Lancashire and Greater Manchester, Saturday", kind: "weather", band: "a",
      districts: ["LA1", "LA2", "OL11", "OL12", "M14", "M20"], source: "https://weather.metoffice.gov.uk/warnings-and-advice/uk-warnings", starts: date(2), ends: date(3), contacted: {}, closed: false },
  ];

  root.FettleDemo = { ME, coordinators: [ME], clients: [hughes, okafor, patel], requests, messages, events, geo,
    plan: c => ({ family_name: c.family_name, status: c.status, sent_at: c.sent_at, next_review: c.next_review, updated_at: c.updated_at, data: c.data,
      coordinator: { name: ME.name, phone: ME.phone, email: ME.email } }) };
})(typeof window !== "undefined" ? window : globalThis);
