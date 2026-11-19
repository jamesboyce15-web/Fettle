/* Fettle family call: the planning rules shared by the coordinator dashboard (coordinator.html) and the family's
   plan page (plan.html). No network, no DOM: plain functions over the plan data, so the tests can run them in Node.

   Plan data (call_clients.data):
   { homes:[{id,label,district,type,floor,flood,people:[{id,name,age,alone,vuln}],a:{...answers},kit:{has:{...},tier,medical,status,payer}}],
     helpers:[{id,name,role,district,miles,car,kids,cares,otherAdult,essential,older,key,status}],
     outcomes:{key:{done,at,due}}, consent:{...}, call:{...}, resources:[...], coordinator:{...} } */
(function (root) {
  "use strict";

  const BANDS = [
    { k: "g", name: "Green", what: "A short power cut", long: "Up to about 5 hours. Help can still reach you." },
    { k: "a", name: "Amber", what: "Severe local disruption", long: "A storm, flood, snow or water outage for 1 to 3 days. Only people close by can get to you." },
    { k: "r", name: "Red", what: "A national emergency", long: "A national power outage for 5 to 7 days. Only people within walking distance can come." },
  ];
  const BAND = Object.fromEntries(BANDS.map(b => [b.k, b]));

  // Rough reach by band, in miles from the home. From the Fettle Family Call design.
  const REACH = { g: 40, aCar: 10, walk: 2 };

  const AGE = ["Under 5", "5 to 17", "18 to 64", "65 to 74", "75 to 84", "85 or over"];
  const ROLES = { family: "Family", friend: "Friend", neighbour: "Neighbour", volunteer: "Fettle volunteer", partner: "Local partner", home: "Lives there" };

  /* ---------- distance ---------- */
  function milesBetween(p, q) {
    if (!p || !q || p.lat == null || q.lat == null) return null;
    const R = 3958.8, rad = x => x * Math.PI / 180;
    const dLat = rad(q.lat - p.lat), dLng = rad(q.lng - p.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
  }
  const normDistrict = d => String(d || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

  // How far a helper is from a home. A typed figure wins; otherwise the two postcode districts' centres (geo: {OL11:{lat,lng}}).
  // Same district with no typed figure: treated as 2 miles, close enough to walk, which the coordinator should confirm.
  function helperMiles(h, home, geo) {
    if (h.miles !== "" && h.miles != null && !isNaN(+h.miles)) return +h.miles;
    const a = normDistrict(h.district), b = normDistrict(home && home.district);
    if (!a || !b) return null;
    if (a === b) return 2;
    return milesBetween(geo && geo[a], geo && geo[b]);
  }

  /* ---------- who can realistically help ---------- */
  // Returns {ok, why}. why says, in a few words, what stops them.
  function canHelp(h, band, miles) {
    const m = miles == null ? Infinity : miles;
    const tied = (h.kids || h.cares) && !h.otherAdult;
    if (h.older) return { ok: false, why: band === "g" ? "Checks in by phone (over 75 or in poor health)" : "Check on each other, not a carer" };
    if (band === "g") {
      if (m > REACH.g) return { ok: false, why: m === Infinity ? "Distance not known yet" : "More than about an hour away" };
      if (tied) return { ok: false, why: "Children or someone to care for, and no other adult at home" };
      return { ok: true, why: "" };
    }
    if (band === "a") {
      if (h.essential) return { ok: false, why: "Essential job: likely called in" };
      if (m === Infinity) return { ok: false, why: "Distance not known yet" };
      if (!(m <= REACH.walk || (h.car && m <= REACH.aCar))) return { ok: false, why: m > REACH.aCar ? "More than 10 miles away" : "No car, and too far to walk" };
      if (tied) return { ok: false, why: "Children or someone to care for, and no other adult at home" };
      return { ok: true, why: "" };
    }
    if (h.essential) return { ok: false, why: "Essential job: likely called in" };
    if (h.kids || h.cares) return { ok: false, why: "Children or someone else to care for" };
    if (m === Infinity) return { ok: false, why: "Distance not known yet" };
    if (m > REACH.walk) return { ok: false, why: "Not within walking distance" };
    return { ok: true, why: "" };
  }

  const vulnPeople = plan => (plan.homes || []).flatMap(home => (home.people || []).filter(p => p.vuln).map(p => ({ person: p, home })));
  const activeHelpers = plan => (plan.helpers || []).filter(h => h.name && h.status !== "declined");

  // For every person who needs someone, in every band: a main helper and a backup.
  // A helper is main for one person per band at most ("counts once"); they can still be someone else's backup.
  // Local check-ins only count once they've agreed. status: "ok" (main and backup), "thin" (main only), "gap" (nobody).
  function coverage(plan, geo) {
    const people = vulnPeople(plan), helpers = activeHelpers(plan).filter(h => h.status !== "asked");
    const out = people.map(({ person, home }) => ({ person, home, bands: {} }));
    BANDS.forEach(({ k }) => {
      const used = new Set();
      out.forEach(row => {
        const elig = helpers.map(h => ({ h, miles: helperMiles(h, row.home, geo) }))
          .filter(x => !(x.h.for && x.h.for.length && !x.h.for.includes(row.person.id)))
          .map(x => Object.assign(x, canHelp(x.h, k, x.miles)))
          .filter(x => x.ok).sort((p, q) => (p.miles ?? 99) - (q.miles ?? 99));
        const main = elig.find(x => !used.has(x.h.id)) || null;
        if (main) used.add(main.h.id);
        const backup = elig.find(x => !main || x.h.id !== main.h.id) || null;
        row.bands[k] = { main: main && main.h, backup: backup && backup.h, status: main && backup ? "ok" : main ? "thin" : "gap" };
      });
    });
    return out;
  }

  // Why each helper does or doesn't count, for the coordinator's grid.
  function helperReasons(plan, geo) {
    const homes = plan.homes || [];
    return activeHelpers(plan).map(h => {
      const home = homes.find(x => (x.people || []).some(p => p.vuln)) || homes[0];
      const miles = helperMiles(h, home, geo);
      return { h, miles, bands: Object.fromEntries(BANDS.map(({ k }) => [k, canHelp(h, k, miles)])) };
    });
  }

  function gaps(plan, geo) {
    const g = [];
    coverage(plan, geo).forEach(row => BANDS.forEach(({ k }) => {
      const c = row.bands[k];
      if (c.status !== "ok") g.push({ band: k, person: row.person, home: row.home, status: c.status,
        text: `${row.person.name || "Someone"}: ${c.status === "gap" ? "nobody can get there" : "no backup"} in ${BAND[k].name}` });
    }));
    return g;
  }

  /* ---------- what breaks at each home ---------- */
  const needsPower = heat => ["gas", "electric", "oil", "heatpump"].includes(heat);
  const EQUIP = { oxygen: "Oxygen concentrator", nebuliser: "Nebuliser", hoist: "Hoist", bed: "Electric bed", stairlift: "Stairlift", pump: "Feeding or medicine pump", wheelchair: "Electric wheelchair", dialysis: "Home dialysis", other: "Other equipment" };

  // Each finding: {id, bands, level ("high"|"med"), title, fix, outcome?}
  function findings(home) {
    const a = home.a || {}, f = [], all = ["g", "a", "r"], ar = ["a", "r"];
    const add = (id, bands, level, title, fix, outcome) => f.push({ id, bands, level, title, fix, outcome });
    const equip = a.equip || [];
    if (needsPower(a.heat)) add("heat", all, a.warmRoom ? "med" : "high", "Heating stops in a power cut", a.warmRoom ? "Use the warm room you picked: doors shut, layers, blankets, hot water bottles." : "Pick one room to keep warm: doors shut, layers, blankets, hot water bottles.");
    if (a.phone === "digital" && a.phoneBackup !== "yes") add("phone", all, "high", "The landline stops when the power goes", "Ask the phone provider for a free battery backup. They must offer one to people who rely on their landline.", "phoneBackup");
    if (a.alarm) add("alarm", all, a.phone === "digital" ? "high" : "med", "The pendant alarm may stop working", "Tell the alarm provider about the plan and check its battery backup.", "alarm");
    if (a.signal === "poor" || a.signal === "none") add("signal", all, "med", "Weak mobile signal at home", "Agree a door-knock check, not just a phone call.");
    if (equip.length) add("equip", all, (a.equipHours != null && a.equipHours !== "" && +a.equipHours < 5) ? "high" : "med", `${equip.map(e => EQUIP[e] || e).join(", ")} needs power`, `Battery lasts ${a.equipHours ? a.equipHours + " hours" : "an unknown time"}. Ask the supplier about backup batteries or cylinders, and register on the Priority Services Register.`, "supplier");
    if (a.fridgeMeds) add("fridge", all, "high", "Medicine kept in the fridge", "Keep a cool pouch ready, and ask the pharmacist how long the medicine keeps out of the fridge.");
    if (a.medsDays !== "" && a.medsDays != null && +a.medsDays < 7) add("meds", ar, "high", `Only ${+a.medsDays} days of medicine in hand`, "Ask the GP or pharmacy about ordering repeats a week earlier.", "meds");
    if (a.water === "private") add("water", all, "high", "Private water supply needs power for the pump", "Store water: 3 litres a person a day, for at least 3 days.");
    else if (a.highWater) add("water", ar, "med", "Water may stop in a long outage", "Upper floors and homes on high ground lose water pressure first. Store water: 3 litres a person a day.");
    if (a.canLeave === "no" || (a.stairs && a.canLeave === "help")) add("leave", ar, "high", "Can't get out without help", "Name who would help them leave, and make sure the Priority Services Register knows.");
    if (home.flood) add("flood", ar, "high", "The home is in a flood risk area", "Sign up to Floodline (0345 988 1188) and keep a flood bag by the door.", "floodline");
    if (a.memory) add("memory", all, "high", "May not understand a warning on their own", "A helper needs to visit, not just phone.");
    if (a.hearing) add("hearing", all, "med", "May not hear a knock or a radio", "Agree a way in, such as a key safe, so a helper doesn't rely on the door being answered.");
    if (a.cook === "electric" && !a.foodCold) add("cook", ar, "med", "Can't cook without power", "Keep food they'll eat without cooking. A camping stove only by an open window, never indoors with the door shut.");
    if (a.cash === false) add("cash", ["r"], "med", "No cash at home", "Keep about £50 in small notes. Cards and cash machines fail in a national outage.");
    if (a.keysafe === false) add("keys", all, "high", "No way in unless the door is answered", "Fit a key safe or give a spare key to the helpers.", "keys");
    if (a.co === false) add("co", all, "high", "No carbon monoxide alarm", "Fit one. It's in every Amber and Red kit.");
    if (a.candles) add("candles", all, "med", "Uses candles for light", "Swap to LED lanterns. Candles cause house fires in power cuts.");
    if (a.indoorFuel) add("fuel", all, "high", "Uses a gas heater, barbecue or generator indoors", "Never indoors: they can kill with carbon monoxide.");
    if (a.carers && a.agencyListed !== "yes") add("agency", ar, "med", "May not be on the care agency's emergency list", "With their permission, send the plan to the agency so it can put them on its list.", "agency");
    return f.sort((p, q) => (p.level === "high" ? 0 : 1) - (q.level === "high" ? 0 : 1));
  }

  /* ---------- the plan for each band ---------- */
  // Steps for one home in one band. who: coverage rows for people at this home.
  function bandSteps(home, band, who) {
    const a = home.a || {}, s = [], equip = a.equip || [];
    const names = rows => rows.map(r => r.person.name).filter(Boolean).join(" and ") || "everyone";
    if (band === "g") {
      s.push("Check it's not just your home: look at the street lights, or call 105 to report the power cut.");
      if (equip.length) s.push(`Switch the ${equip.map(e => (EQUIP[e] || e).toLowerCase()).join(" and ")} to battery. It lasts ${a.equipHours ? "about " + a.equipHours + " hours" : "a limited time"}.`);
      if (a.phone === "digital") s.push(a.phoneBackup === "yes" ? "The landline runs on its backup battery for an hour or more. Use the mobile after that." : "The landline won't work. Use the mobile.");
      if (needsPower(a.heat)) s.push(a.warmRoom ? "Heating stops: go to the warm room and shut the door." : "Heating stops: pick one room, shut the door and add layers.");
      s.push("Keep the fridge and freezer shut. Food stays cold for about 4 hours in the fridge and a day in a full freezer.");
      s.push("Use torches or LED lanterns, not candles.");
    } else if (band === "a") {
      s.push("Expect 1 to 3 days. Listen to local radio for updates.");
      s.push("Fill the water carriers now if there's still water: 3 litres a person a day.");
      if (a.medsDays !== "" && a.medsDays != null) s.push(`Count medicines: there are about ${a.medsDays} days in hand.`);
      if (a.fridgeMeds) s.push("Move fridge medicines to the cool pouch if the power is off for more than a few hours.");
      if (needsPower(a.heat)) s.push("Keep to the warm room. Eat hot food or drinks if you can heat them safely.");
      if (a.cook === "electric") s.push(a.foodCold ? "Eat the food that needs no cooking first." : "Use the camping stove by an open window, or eat cold food.");
      s.push("Report a power cut on 105. For water, call your water company (the number is on the bill).");
    } else {
      s.push(`Stay at home unless you're told to leave. Plan for ${names(who)} to manage for 5 to 7 days.`);
      s.push("Listen to the radio (BBC Radio 4 on 198 long wave, or local radio) for official updates.");
      s.push("Use stored water first. Then boil, or use the purification tablets, if the water company says so.");
      if (a.cash !== false) s.push("Use cash: cards and cash machines may not work.");
      s.push("Don't wait for family from far away. They may not be able to travel.");
      if (equip.length) s.push("If the equipment's battery runs out and life is at risk, call 999.");
      s.push("Never use a barbecue, camping stove, gas heater or generator indoors with the doors shut.");
    }
    return s;
  }

  // "Who comes" lines for one home in one band.
  function whoComes(rows, band) {
    return rows.map(r => {
      const c = r.bands[band], n = r.person.name || "Someone";
      if (c.status === "gap") return { person: n, text: "We're arranging someone local who can get there.", gap: true };
      return { person: n, text: c.backup ? `${c.main.name} comes, or ${c.backup.name} if they can't.` : `${c.main.name} comes. We're finding a backup.`, gap: c.status !== "ok" };
    });
  }

  /* ---------- kit ---------- */
  const KIT_ITEMS = [
    ["torch", "Torches or LED lanterns"], ["radio", "Wind-up or battery radio"], ["batteries", "Spare batteries"], ["powerbank", "Power bank for phones"],
    ["water", "Water for 3 days (or carriers to fill)"], ["food", "Food that needs no cooking"], ["stove", "Camping stove and gas"], ["co", "Carbon monoxide alarm"],
    ["firstaid", "First aid kit"], ["warmth", "Blankets and hot water bottles"],
  ];
  const KITS = {
    green: { name: "Green kit: power cut", price: 99 },
    amber: { name: "Amber kit: 3 days", price: 199 },
    red: { name: "Red kit: 7 days", price: 329 },
  };
  const MEDICAL = { name: "Medical add-on", price: 39 };

  function kitMissing(home) {
    const has = (home.kit && home.kit.has) || {};
    return KIT_ITEMS.filter(([k]) => !has[k]).map(([k, t]) => ({ k, t }));
  }
  // The kit that fills this home's gaps. Red where anyone needing help lives alone or has nobody in Red; Amber where
  // anyone needs help; Green otherwise. Medical add-on for fridge medicines, equipment or hearing aids.
  function kitFor(home, cov) {
    const rows = (cov || []).filter(r => r.home.id === home.id), a = home.a || {};
    const missing = kitMissing(home);
    let tier = "green";
    if (rows.length) tier = rows.some(r => r.person.alone || r.bands.r.status === "gap") ? "red" : "amber";
    else if (missing.length > 4) tier = "amber";
    const medical = !!(a.fridgeMeds || (a.equip || []).length || a.hearing);
    const chosen = (home.kit && home.kit.tier) || tier;
    const none = chosen === "none";
    const total = none ? 0 : (KITS[chosen].price + ((home.kit && home.kit.medical != null ? home.kit.medical : medical) ? MEDICAL.price : 0));
    return { suggested: tier, tier: chosen, medicalSuggested: medical, medical: home.kit && home.kit.medical != null ? home.kit.medical : medical, missing, total };
  }

  /* ---------- outcomes ---------- */
  const OUTCOMES = [
    ["psrElec", "Priority Services Register: electricity", "call"],
    ["psrWater", "Priority Services Register: water", "call"],
    ["alerts", "Warnings switched on for each home", "call"],
    ["texts", "Text warnings switched on", "call"],
    ["floodline", "Floodline sign-up", "call"],
    ["keys", "Key access shared with the helpers", "call"],
    ["phoneBackup", "Landline battery backup asked for", "week"],
    ["supplier", "Equipment supplier asked about backup", "week"],
    ["meds", "Spare medicines asked about", "week"],
    ["agency", "Plan sent to the care agency", "week"],
    ["kit", "Kit ordered", "48h"],
    ["book", "Book and fridge sheet posted", "week"],
    ["checkin", "Local check-ins arranged", "2weeks"],
    ["review", "Yearly review booked", "call"],
  ];
  const OUTCOME = Object.fromEntries(OUTCOMES.map(([k, t, w]) => [k, { t, w }]));
  const WHEN = { call: "On the call", "48h": "Within 48 hours", week: "Within a week", "2weeks": "Within 2 weeks" };

  // Which outcomes apply to this plan: the always-on ones, plus those that a finding or answer calls for.
  function outcomesFor(plan, geo) {
    const homes = plan.homes || [], f = homes.flatMap(findings), need = new Set(["psrElec", "psrWater", "alerts", "texts", "book", "review"]);
    f.forEach(x => x.outcome && OUTCOME[x.outcome] && need.add(x.outcome));
    if (homes.some(h => h.flood)) need.add("floodline");
    if (homes.some(h => (h.a || {}).keysafe)) need.add("keys");
    if (homes.some(h => (h.kit || {}).tier !== "none")) need.add("kit");
    if (gaps(plan, geo).length || (plan.helpers || []).some(h => ["neighbour", "volunteer", "partner"].includes(h.role))) need.add("checkin");
    const done = plan.outcomes || {};
    return OUTCOMES.filter(([k]) => need.has(k)).map(([k, t, w]) => ({ k, t, when: WHEN[w], done: !!(done[k] && done[k].done), at: done[k] && done[k].at }));
  }

  // How much is left to do, for the dashboard: open gaps, outcomes not done, high findings.
  function score(plan, geo) {
    const g = gaps(plan, geo), o = outcomesFor(plan, geo), f = (plan.homes || []).flatMap(findings);
    return { gaps: g.filter(x => x.status === "gap").length, thin: g.filter(x => x.status === "thin").length,
      todo: o.filter(x => !x.done).length, done: o.filter(x => x.done).length, high: f.filter(x => x.level === "high").length,
      people: vulnPeople(plan).length };
  }

  // Risk for a watch event: who to call first. Higher = sooner.
  function eventRisk(plan, band, geo) {
    const cov = coverage(plan, geo), f = (plan.homes || []).flatMap(findings);
    let r = 0;
    cov.forEach(row => { const c = row.bands[band] || row.bands.a; r += c.status === "gap" ? 10 : c.status === "thin" ? 4 : 0; if (row.person.alone) r += 3; });
    r += f.filter(x => x.level === "high" && x.bands.includes(band)).length * 2;
    return r;
  }

  const api = { BANDS, BAND, REACH, AGE, ROLES, EQUIP, KIT_ITEMS, KITS, MEDICAL, OUTCOMES, OUTCOME, WHEN,
    milesBetween, normDistrict, helperMiles, canHelp, coverage, helperReasons, gaps, findings, bandSteps, whoComes, kitMissing, kitFor, outcomesFor, score, eventRisk, vulnPeople };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FettleCall = api;
})(typeof window !== "undefined" ? window : globalThis);
