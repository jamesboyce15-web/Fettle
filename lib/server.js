// Shared by the Pages functions. Admin-only checks verify the signed-in user against Supabase's is_admin().
export const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function isAdmin(env, request) {
  const auth = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth) || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return false;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: "POST", headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
    return r.ok && (await r.json()) === true;
  } catch (e) { return false; }
}

// Only public web addresses: no local or private networks, no odd ports.
export function safeUrl(u) {
  let x; try { x = new URL(/^https?:\/\//i.test(u) ? u : "https://" + u); } catch (e) { return null; }
  if (!/^https?:$/.test(x.protocol) || (x.port && !["80", "443"].includes(x.port))) return null;
  const h = x.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h) || h.includes(":") || !h.includes(".")) return null;
  return x;
}

// The website half of the search checks, from a page's HTML.
export function siteChecks(html, finalUrl, placeWords, sector) {
  const s = String(html || ""), low = s.toLowerCase(), text = low.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  const title = ((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(s) || [])[1] || "").trim();
  const places = (placeWords || []).map(w => String(w).toLowerCase()).filter(Boolean);
  const types = [...s.matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)].map(m => m[1]).join(" ");
  const salon = sector === "salon";
  const what = salon ? /hair|salon|barber|nail|beauty|brow|lash|aesthetic|skin|spa|stylist|colour|color/i : /caf[eé]|coffee|bakery|brunch|tea ?room|kitchen|deli/i;
  const out = {
    site: true,
    https: /^https:/i.test(finalUrl || ""),
    mobile: /<meta[^>]+name=["']viewport["'][^>]+width=device-width/i.test(s),
    title: title.length >= 12 && what.test(title) && (!places.length || places.some(p => title.toLowerCase().includes(p))),
    menu: salon ? /£\s?\d+/.test(text) && /(cut|colour|color|blow|nails?|gel|biab|brows?|lash|wax|facial|fade|beard|treatment)/.test(text) : /\bmenu\b/.test(text) && /£\s?\d+(\.\d{2})?/.test(text),
    schema: salon ? /HairSalon|BeautySalon|NailSalon|DaySpa|HealthAndBeautyBusiness|LocalBusiness/.test(types) : /CafeOrCoffeeShop|Restaurant|FoodEstablishment|Bakery|LocalBusiness/.test(types),
    nap: /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/.test(text) && /(\+44\s?|0)\d[\d\s]{8,12}\d/.test(text),
    title_text: title.slice(0, 120),
  };
  if (salon) out.booking = /fresha\.com|treatwell\.co|booksy\.com|setmore\.com|timely|phorest|vagaro|square\.site|squareup\.com\/appointments|salonized|slickhq|heygoldie|book\.|\/book(ing)?\b|book (now|online|an appointment)/i.test(s);
  return out;
}

// Which of the area's cafés an AI answer recommends. Names are compared without punctuation or "the", "café", "coffee".
export function namesIn(answer, venueNames) {
  const n = x => String(x).toLowerCase().replace(/&/g, "and").replace(/\b(the|cafe|café|coffee|co|ltd|limited)\b/g, "").replace(/[^a-z0-9]/g, "");
  const a = n(answer);
  return (venueNames || []).filter(v => { const k = n(v); return k.length >= 4 && a.includes(k); });
}
