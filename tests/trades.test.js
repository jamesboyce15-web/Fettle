// The trade pages are built from the home page: they must be up to date, and each must carry its own trade.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TRADES, buildAll } from "../scripts/build-trades.mjs";

test("trade pages are up to date with the home page (run scripts/build-trades.mjs if not)", () => {
  for (const [file, html] of buildAll()) assert.equal(readFileSync(file, "utf8"), html, file + " is out of date");
});

test("each trade page has its own question, sample enquiry, sign-up preset and canonical address", () => {
  const home = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  for (const [file, html] of buildAll()) {
    const t = TRADES.find(x => file.endsWith(x.slug + ".html"));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://getfettle.co.uk/${t.slug}">`));
    assert.match(html, new RegExp(`window.PATCH_TRADE = "${t.trade}"`));
    assert.ok(html.includes(t.asks[0][0]), "hero question"); assert.ok(html.includes("class=\"bubble\""), "sample enquiry");
    assert.equal((html.match(/Get your free check<\/a>/g) || []).length, (home.match(/Get your free check<\/a>/g) || []).length, "one main button, like the home page");
    assert.equal((html.match(/<div/g) || []).length, (html.match(/<\/div>/g) || []).length, "balanced divs");
    assert.doesNotMatch(html, /Made for one-person trades/, "the home page's trade list is replaced");
    for (const o of TRADES.filter(x => x !== t)) assert.ok(html.includes(`href="${o.slug}"`), "links to the other trades");
  }
  assert.match(readFileSync(new URL("../public/dog-groomers.html", import.meta.url), "utf8"), /My dog: Cockapoo, medium, 3 years, coat a bit matted\./);
  for (const t of TRADES) assert.ok(home.includes(`href="${t.slug}"`), "home links to " + t.slug);
});
