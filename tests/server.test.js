import { test } from "node:test";
import assert from "node:assert/strict";
import { siteChecks, namesIn, safeUrl } from "../lib/server.js";
import { onRequestPost as seo } from "../functions/api/seo-check.js";

test("website checks", () => {
  const html = `<html><head><title>Little Fig | café and bakery in Elm Park</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"CafeOrCoffeeShop","name":"Little Fig"}</script></head>
    <body><h2>Menu</h2><p>Flat white £3.40</p><p>12 High Street, Elm Park EP1 2AB · 0161 555 0100</p></body></html>`;
  const c = siteChecks(html, "https://littlefig.example/", ["Elm Park"]);
  assert.deepEqual([c.https, c.mobile, c.title, c.menu, c.schema, c.nap], [true, true, true, true, true, true]);
  const bare = siteChecks("<title>Home</title><p>Welcome</p>", "http://x.example/", ["Elm Park"]);
  assert.deepEqual([bare.https, bare.mobile, bare.title, bare.menu, bare.schema, bare.nap], [false, false, false, false, false, false]);
});
test("names in an AI answer", () => {
  assert.deepEqual(namesIn("1. Oak and Oat\n2. The Little Fig Café\n3. Somewhere Else", ["Little Fig", "Oak & Oat", "Bramble Café"]), ["Little Fig", "Oak & Oat"]);
});
test("only public web addresses", () => {
  assert.ok(safeUrl("littlefig.co.uk")); ["http://localhost", "http://10.0.0.5", "http://192.168.1.1", "file:///etc/passwd", "http://x.example:8080", "http://[::1]"].forEach(u => assert.equal(safeUrl(u), null, u));
});
test("checks are for admins only", async () => {
  const r = await seo({ request: new Request("https://p.test/api/seo-check", { method: "POST", body: "{}" }), env: {} });
  assert.equal(r.status, 403);
});

test("salon website checks: services with prices, and a booking link", () => {
  const html = `<title>Mane, hair salon in Heaton Moor</title><meta name="viewport" content="width=device-width"><p>Cut and blow-dry £45. Balayage from £120.</p><a href="https://www.fresha.com/a/mane">Book now</a><p>12 Shaw Rd, SK4 4AE · 0161 123 4567</p><script type="application/ld+json">{"@type":"HairSalon"}</script>`;
  const c = siteChecks(html, "https://mane.example/", ["Heaton Moor"], "salon");
  assert.equal(c.title, true); assert.equal(c.menu, true); assert.equal(c.booking, true); assert.equal(c.schema, true); assert.equal(c.nap, true);
  const cafe = siteChecks(html, "https://mane.example/", ["Heaton Moor"], "cafe"); assert.equal(cafe.title, false, "a salon title isn't a café title"); assert.equal(cafe.booking, undefined);
});
