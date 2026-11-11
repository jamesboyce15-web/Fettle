"""Build the free guides into public/guides/ from guides/content.py.

    python3 tools/build_guides.py
"""
import os, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "guides"))
from content import GUIDES, CATS, S, CHECKED  # noqa: E402

OUT = os.path.join(ROOT, "public", "guides")
os.makedirs(OUT, exist_ok=True)
CATNAME = dict(CATS)
e = html.escape

LOGO = ('<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#173f35"/>'
        '<path d="M8 15.5 16 9l8 6.5V24a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="none" stroke="#f6f7f4" stroke-width="2" stroke-linejoin="round"/>'
        '<path d="M16 14.5c1.9 1.7 2.8 3.2 2.8 4.6a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.9 2.8-4.6z" fill="#f2a900"/></svg>')

CSS = """
:root{--page:#f6f7f4;--surface:#fff;--ink:#1c2522;--mute:#5a6670;--line:#d9dfe3;--line2:#b9c3ca;--hivis:#f2a900;--brand:#173f35;--brand-ink:#fff;--tint:#e3ece7;--link:#1a5c8c;--red:#b42318;
--sans:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;--serif:"Source Serif 4",Georgia,serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--page:#0f1418;--surface:#172027;--ink:#e7ecef;--mute:#9eabb5;--line:#2a353d;--line2:#3c4954;--link:#8cc3ea;--brand:#8fd1b4;--brand-ink:#0f1915;--tint:#1d2c26;--red:#ff8a7a}}
:root[data-theme="dark"]{--page:#0f1418;--surface:#172027;--ink:#e7ecef;--mute:#9eabb5;--line:#2a353d;--line2:#3c4954;--link:#8cc3ea;--brand:#8fd1b4;--brand-ink:#0f1915;--tint:#1d2c26;--red:#ff8a7a}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:400 18px/1.6 var(--sans)}
a{color:var(--link)} :focus-visible{outline:3px solid var(--link);outline-offset:2px}
.top{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--surface)}
.brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--ink);font-weight:700;font-size:1.25rem}
.top nav{margin-inline-start:auto;display:flex;gap:16px;font-size:.95rem}
.top nav a{color:var(--ink);text-decoration:none;font-weight:700} .top nav a[aria-current]{text-decoration:underline;text-underline-offset:4px}
.wrap{max-width:720px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:clamp(1.8rem,6vw,2.5rem);line-height:1.15;margin:6px 0 12px;letter-spacing:-.01em}
h2{font-size:1.35rem;line-height:1.25;margin:34px 0 10px}
h3{font-size:1.08rem;margin:0 0 4px}
p{margin:0 0 14px} ul,ol{margin:0 0 16px;padding-inline-start:24px} li{margin:0 0 7px}
.kick{font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:0}
.meta{font-size:.9rem;color:var(--mute);margin-bottom:22px}
.lede{font-family:var(--serif);font-size:1.2rem;line-height:1.5}
.tip,.flag{border-radius:12px;padding:14px 16px;margin:18px 0}
.tip{background:var(--tint)}
.flag{border:2px solid var(--hivis);background:var(--surface);font-size:.95rem}
ol.todo{list-style:none;padding:0;counter-reset:t}
ol.todo li{counter-increment:t;position:relative;padding:12px 14px 12px 50px;background:var(--surface);border:1px solid var(--line);border-radius:10px}
ol.todo li::before{content:counter(t);position:absolute;left:12px;top:11px;width:26px;height:26px;border-radius:50%;background:var(--brand);color:var(--brand-ink);font-weight:700;font-size:.9rem;display:grid;place-items:center}
ul.check{list-style:none;padding:0} ul.check li{padding-left:30px;position:relative}
ul.check li::before{content:"";position:absolute;left:2px;top:5px;width:16px;height:16px;border:2px solid var(--line2);border-radius:4px}
ul.cols{columns:2 240px;column-gap:28px}
.recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:18px 0}
.recipe{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px}
.recipe ul{font-size:.95rem;padding-inline-start:20px} .recipe p{font-size:.95rem;margin:0}
.rs{font-size:.85rem;color:var(--mute);margin:0 0 8px!important}
.numbers{background:var(--surface);border:2px solid var(--brand);border-radius:12px;padding:16px;margin:30px 0}
.numbers h2{margin-top:0} .numbers dl{margin:0} .numbers div{display:flex;flex-wrap:wrap;gap:4px 12px;padding:8px 0;border-top:1px solid var(--line)}
.numbers dt{font-weight:700;min-width:170px} .numbers dd{margin:0}
.cta{background:var(--brand);color:var(--brand-ink);border-radius:14px;padding:22px 20px;margin:36px 0}
.cta h2{margin:0 0 8px;color:inherit} .cta p{margin:0 0 14px}
.btn{display:inline-block;background:var(--hivis);color:#1c2522;font-weight:700;text-decoration:none;padding:13px 20px;border-radius:10px;font-size:1.05rem}
.btn2{font:inherit;font-size:.95rem;font-weight:700;background:none;border:1.5px solid var(--line2);color:var(--ink);border-radius:10px;padding:9px 14px;cursor:pointer}
.sources{font-size:.9rem;color:var(--mute);border-top:1px solid var(--line);padding-top:18px;margin-top:30px}
.sources h2{font-size:1rem;margin:0 0 8px;color:var(--ink)} .sources li{margin-bottom:5px}
.more{display:grid;gap:10px;margin:10px 0 0;padding:0;list-style:none}
.sm{font-size:.9rem;color:var(--mute)}
.disc{font-size:.85rem;color:var(--mute);margin-top:22px}
footer{border-top:1px solid var(--line);padding:20px 16px;font-size:.85rem;color:var(--mute);text-align:center}
/* hub */
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 22px}
.chips button{font:inherit;font-size:.92rem;font-weight:700;border:1.5px solid var(--line2);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 14px;cursor:pointer}
.chips button[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:var(--brand-ink)}
.cards{display:grid;gap:12px;list-style:none;padding:0;margin:0}
.card{display:block;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px 18px;text-decoration:none;color:var(--ink)}
.card:hover{border-color:var(--brand)} .card h3{font-size:1.12rem;margin:2px 0 6px;color:var(--link)} .card p{margin:0;font-size:.95rem;color:var(--mute)}
.card .cm{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mute)}
.start{background:var(--tint);border-radius:14px;padding:18px 20px;margin:8px 0 26px}
.start h2{margin:0 0 6px;font-size:1.15rem}
@media print{.top nav,.cta,.noprint,footer{display:none!important}body{background:#fff;color:#000;font-size:12pt}.wrap{max-width:none;padding:0}a{color:#000}ol.todo li,.recipe,.numbers{break-inside:avoid}}
"""

ICON = __import__("urllib.parse").parse.quote(LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">')


def page(title, desc, body, current, canon):
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:type" content="article">
<link rel="icon" href="data:image/svg+xml,{ICON}">
{FONTS}
<style>{CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="../">{LOGO}<span>fettle</span></a>
  <nav><a href="./"{' aria-current="page"' if current == 'hub' else ''}>Guides</a><a href="../#check">Free check</a></nav>
</header>
<main class="wrap">
{body}
</main>
<footer>
  <p>Fettle gives general guidance based on official UK sources. It isn't medical advice and doesn't replace official warnings. In an emergency, follow official alerts and call 999 if life is at risk.</p>
  <p><a href="../">Fettle</a> · <a href="./">Guides</a> · <a href="../privacy.html">Privacy</a> · <a href="../terms.html">Terms</a></p>
</footer>
</body>
</html>
"""


CTA = """<div class="cta">
  <h2>Get a plan for your home, free</h2>
  <p>Answer a few plain questions about your home and who lives there. We'll tell you exactly what you need, how much of it, and what to do first. Free. About 4 minutes.</p>
  <a class="btn" href="../#check">Check my household</a>
</div>"""

FLAGS = {
    "advice": '<div class="flag"><b>Draft.</b> Rules and amounts change, and this guide is waiting for review by a welfare rights adviser. Check with Citizens Advice or the official pages linked below before you rely on it.</div>',
    "clinical": '<div class="flag"><b>Draft.</b> This guide is waiting for review by an NHS professional. Always follow advice from your midwife, health visitor, GP or pharmacist, and the official guidance linked below.</div>',
}

by_slug = {g["slug"]: g for g in GUIDES}

for g in GUIDES:
    srcs = "".join(f'<li><a href="{e(S[k][1])}" target="_blank" rel="noopener">{e(S[k][0])}</a></li>' for k in g["sources"])
    related = [x for x in GUIDES if x["slug"] != g["slug"] and x["cat"] == g["cat"]][:2]
    related += [x for x in GUIDES if x not in related and x["slug"] != g["slug"]][: 3 - len(related)]
    rel = "".join(f'<li><a class="card" href="{x["slug"]}.html"><h3>{e(x["title"])}</h3><p>{e(x["summary"])}</p></a></li>' for x in related)
    body = f"""<article>
<p class="kick"><a href="./" style="color:inherit">Guides</a> · {e(CATNAME[g['cat']])}</p>
<h1>{e(g['title'])}</h1>
<p class="meta">{g['mins']} minute read · Last checked {CHECKED} · <button class="btn2 noprint" onclick="print()">Print this guide</button></p>
{FLAGS.get(g['flag'], '')}
{g['body']}
{CTA}
<div class="sources"><h2>Sources</h2><ul>{srcs}</ul>
<p class="disc">Checked against these sources on {CHECKED}. Official advice changes: if anything here differs from what your council, water or power company, or emergency services tell you, follow them.</p></div>
</article>
<section class="noprint"><h2>More guides</h2><ul class="more">{rel}</ul></section>"""
    open(os.path.join(OUT, g["slug"] + ".html"), "w", encoding="utf8").write(
        page(g["title"] + " | Fettle guides", g["summary"], body, g["slug"], g["slug"]))

# ---- hub
chips = '<button type="button" aria-pressed="true" data-c="all">All</button>' + "".join(
    f'<button type="button" aria-pressed="false" data-c="{c}">{e(n)}</button>' for c, n in CATS if any(g["cat"] == c for g in GUIDES))
cards = "".join(
    f'<li data-c="{g["cat"]}"><a class="card" href="{g["slug"]}.html"><span class="cm">{e(CATNAME[g["cat"]])} · {g["mins"]} min</span>'
    f'<h3>{e(g["title"])}</h3><p>{e(g["summary"])}</p></a></li>' for g in GUIDES)
hub = f"""<p class="kick">Free guides</p>
<h1>Plain guides for when things go off.</h1>
<p class="lede">Power cuts, water cuts, cold snaps. What to do, written for real homes: flats, families with babies, and people looking after someone. Free, no sign-up, and checked against official UK guidance.</p>
<div class="start"><h2>New to this? Start with three things.</h2>
<ol><li>Store 3 days of water: 3 litres per person per day.</li><li>Keep 3 days of food that needs no cooking. <a href="no-cook-meals.html">Here are six meals</a>.</li><li>Join the <a href="priority-services-register.html">Priority Services Register</a> if anyone at home might need extra help.</li></ol>
<p>Then read <a href="national-power-cut.html">what the UK's Chief Medical Officers will say on the radio</a> if the whole country loses power.</p>
<p style="margin:0">Or <a href="../#check">take the free check</a> and get a plan for your home.</p></div>
<div class="chips noprint" role="group" aria-label="Filter guides">{chips}</div>
<ul class="cards" id="cards">{cards}</ul>
{CTA}
<script>
document.querySelectorAll('.chips button').forEach(b=>b.addEventListener('click',()=>{{
  document.querySelectorAll('.chips button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  document.querySelectorAll('#cards li').forEach(li=>li.hidden=!(b.dataset.c==='all'||li.dataset.c===b.dataset.c));
}}));
</script>"""
open(os.path.join(OUT, "index.html"), "w", encoding="utf8").write(
    page("Free guides | Fettle", "Free, plain guides to power cuts, water cuts, cold food, high-rise flats, babies and more. Checked against official UK guidance.", hub, "hub", ""))
print("wrote", len(GUIDES) + 1, "pages to", OUT)
