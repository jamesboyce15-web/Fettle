"""Build the starting café list for an area from a Food Standards Agency open data file.
Usage: python3 -I tools/seed_from_fsa.py <fsa.xml> <slug> "<Area name>" <district> [<district>...]
Writes public/data/<slug>.json (every food business in those districts; likely cafés included, the rest available to add)."""
import sys, re, json, xml.etree.ElementTree as ET
src, slug, name, districts = sys.argv[1], sys.argv[2], sys.argv[3], [d.upper() for d in sys.argv[4:]]
TYPES = {"Restaurant/Cafe/Canteen", "Takeaway/sandwich shop", "Other catering premises", "Retailers - other", "Pub/bar/nightclub"}
KW = re.compile(r"caf[eé]|caff[eè]|coffee|tea ?rooms?|tea ?shop|espresso|roast|barista|brunch|patisserie|bakehouse|bakery|deli\b|kaffe|kafe", re.I)
CHAIN = re.compile(r"costa|starbucks|caff[eè] ?nero|cafe nero|pret\b|greggs|200 degrees|92 degrees|black sheep|coffee ?#?1\b|esquires|gail'?s|joe ?& ?the juice|blank street|boston tea party|tesco|sainsbury|morrisons|asda|m ?& ?s|waitrose|subway|mcdonald", re.I)
NOT = re.compile(r"school|academy|nursery|hospital|canteen|catering|university|college|care home|church hall|\bgym\b|leisure centre", re.I)
out = []
for e in ET.parse(src).getroot().iter("EstablishmentDetail"):
    g = lambda k: (e.findtext(k) or "").strip()
    pc = g("PostCode").upper()
    if not pc or pc.split()[0] not in districts or g("BusinessType") not in TYPES: continue
    n = g("BusinessName")
    lat, lng = e.findtext("Geocode/Latitude"), e.findtext("Geocode/Longitude")
    likely = bool(KW.search(n)) and not (NOT.search(n) and not re.search(r"caf[eé]|coffee", n, re.I)) and g("BusinessType") != "Pub/bar/nightclub"
    out.append({"fsaId": int(g("FHRSID")), "name": n, "address": ", ".join(x for x in [g("AddressLine1"), g("AddressLine2"), g("AddressLine3")] if x),
        "postcode": pc, "lat": float(lat) if lat else None, "lng": float(lng) if lng else None, "kind": "chain" if CHAIN.search(n) else "independent",
        "included": likely, "hygiene": g("RatingValue"), "hygieneDate": g("RatingDate")[:10] or None, "fsaType": g("BusinessType")})
out.sort(key=lambda v: (not v["included"], v["name"].lower()))
json.dump({"slug": slug, "name": name, "districts": districts, "source": "Food Standards Agency food hygiene rating data", "venues": out}, open(f"public/data/{slug}.json", "w"), indent=0, ensure_ascii=False)
print(len(out), "food businesses,", sum(v["included"] for v in out), "likely cafés")
