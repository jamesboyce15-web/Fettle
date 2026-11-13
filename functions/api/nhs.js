// GET /api/nhs?type=gp|pharmacy&q=<name, town or postcode>&pc=<first half of their postcode>
// Finds GP surgeries and pharmacies in the NHS Organisation Data Service (open data, no key, England and Wales),
// so people can pick theirs instead of typing the name, number and address. Nothing about the person is stored or sent
// on: only the search words and the first half of the postcode go to the NHS.
const ORD = "https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations";
const ROLE = { gp: { primary: "RO177", need: "RO76" }, pharmacy: { primary: "RO182", need: null } };
const OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/, POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const SMALL = new Set(["and", "of", "the", "on", "in", "at", "upon", "by"]);

export const title = s => String(s || "").toLowerCase().replace(/\b([a-z])([a-z']*)/g, (m, a, b, i) => (i && SMALL.has(m) ? m : a.toUpperCase() + b)).replace(/\bNhs\b/g, "NHS").replace(/\bGp\b/g, "GP");
const asList = x => (Array.isArray(x) ? x : x ? [x] : []);

export function shape(org) {
  const o = org && org.Organisation; if (!o) return null;
  const L = (o.GeoLoc && o.GeoLoc.Location) || {};
  const tel = asList(o.Contacts && o.Contacts.Contact).find(c => String(c.type).toLowerCase() === "tel");
  const roles = asList(o.Roles && o.Roles.Role).map(r => r.id);
  const addr = [L.AddrLn1, L.AddrLn2, L.AddrLn3, L.Town].filter(Boolean).map(title).join(", ");
  return { name: title(o.Name), tel: tel ? String(tel.value).trim() : "", addr: [addr, L.PostCode].filter(Boolean).join(", "), postcode: L.PostCode || "", town: title(L.Town), roles, active: o.Status === "Active" };
}

async function ordSearch(params, fetchFn) {
  const u = new URL(ORD); Object.entries({ Status: "Active", Limit: "30", ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetchFn(u.toString(), { headers: { Accept: "application/json" } });
  if (!r.ok) return [];
  const j = await r.json();
  return asList(j.Organisations).map(o => o.OrgId).filter(Boolean);
}
async function details(ids, fetchFn) {
  const out = [];
  for (let i = 0; i < ids.length; i += 3) { // the NHS asks for under 5 requests a second
    const got = await Promise.all(ids.slice(i, i + 3).map(id => fetchFn(`${ORD}/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } }).then(r => (r.ok ? r.json() : null)).catch(() => null)));
    out.push(...got.map(shape).filter(Boolean));
  }
  return out;
}

export async function find({ type, q, pc }, fetchFn = fetch) {
  const role = ROLE[type]; if (!role) return { error: "type" };
  q = String(q || "").trim().replace(/\s+/g, " ").slice(0, 40); pc = String(pc || "").toUpperCase().replace(/\s+/g, "");
  if (q && !/^[\p{L}\d .,'&-]+$/u.test(q)) return { results: [] };
  if (pc && !OUTCODE.test(pc)) pc = "";
  const qpc = q.toUpperCase().replace(/\s+/g, "");
  let ids = [], filter = null;
  if (q && (POSTCODE.test(qpc) || OUTCODE.test(qpc))) ids = await ordSearch({ PrimaryRoleId: role.primary, PostCode: qpc }, fetchFn);
  else if (q) {
    ids = await ordSearch({ PrimaryRoleId: role.primary, Name: q }, fetchFn);
    if (!ids.length && pc) { ids = await ordSearch({ PrimaryRoleId: role.primary, PostCode: pc }, fetchFn); filter = q.toLowerCase(); } // a town: look nearby
  } else if (pc) ids = await ordSearch({ PrimaryRoleId: role.primary, PostCode: pc }, fetchFn);
  let res = await details(ids.slice(0, filter ? 30 : 12), fetchFn);
  res = res.filter(x => x.active && (!role.need || x.roles.includes(role.need)));
  if (filter) res = res.filter(x => (x.name + " " + x.addr).toLowerCase().includes(filter));
  return { results: res.slice(0, 8).map(({ name, tel, addr }) => ({ name, tel, addr })) };
}

export async function onRequestGet({ request }) {
  const cache = caches.default, key = new Request(request.url, { method: "GET" });
  const hit = await cache.match(key); if (hit) return hit;
  const p = new URL(request.url).searchParams;
  let body, status = 200;
  try { body = await find({ type: p.get("type"), q: p.get("q"), pc: p.get("pc") }); if (body.error) status = 400; }
  catch (e) { console.error("nhs", e); body = { error: "unavailable" }; status = 502; }
  const res = new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": status === 200 ? "public, max-age=86400" : "no-store" } });
  if (status === 200) await cache.put(key, res.clone());
  return res;
}
