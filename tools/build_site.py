"""Build public/index.html from src/fettle.html.

Run after editing src/fettle.html or the translations:
    python3 i18n/build.py      # refresh translations inside src/fettle.html
    python3 tools/build_site.py
"""
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "src", "fettle.html"), encoding="utf8").read()

src = src  # title is set in the source

# Translations: each language goes in its own file, public/tr/<lang>.<hash>.js, loaded only when someone picks it.
# English speakers (most visitors) no longer download 2.7 MB of Polish, Romanian, Panjabi and Urdu.
import re, hashlib, glob
A, B = src.index("/*TR-DATA-START*/"), src.index("/*TR-DATA-END*/")
block = src[A + len("/*TR-DATA-START*/"):B]
starts = [(m.start(), m.group(1)) for m in re.finditer(r"Object\.assign\(TR\.(\w+),", block)]
assert starts and block[:starts[0][0]].strip() == "", "unexpected text before the first dictionary"
TRDIR = os.path.join(ROOT, "public", "tr"); os.makedirs(TRDIR, exist_ok=True)
for f in glob.glob(os.path.join(TRDIR, "*.js")): os.remove(f)
srcmap = {}
for n, (pos, lang) in enumerate(starts):
    body = block[pos:starts[n + 1][0] if n + 1 < len(starts) else len(block)].strip()
    assert lang not in srcmap, "one dictionary per language: " + lang
    h = hashlib.sha256(body.encode("utf8")).hexdigest()[:10]
    name = f"{lang}.{h}.js"
    open(os.path.join(TRDIR, name), "w", encoding="utf8").write(body + "\n")
    srcmap[lang] = "tr/" + name
src = src[:A] + "/*TR-DATA-START*//*TR-DATA-END*/" + src[B + len("/*TR-DATA-END*/"):]
assert src.count("const TRSRC={}/*TRSRC*/") == 1
src = src.replace("const TRSRC={}/*TRSRC*/", "const TRSRC=" + json.dumps(srcmap) + "/*TRSRC*/")
print("translations:", ", ".join(f"{k} {os.path.getsize(os.path.join(ROOT, 'public', v)) // 1024} KB" for k, v in srcmap.items()))

# config.js must load before the main script so LIVE is set on start-up.
i = src.index("\n<script>\n")
src = src[:i] + '\n<script src="config.js"></script>' + src[i:]

# live.js runs after the main script and swaps in real accounts and payments.
j = src.rindex("</body>")
src = src[:j] + '<script src="live.js"></script>\n' + src[j:]

out = os.path.join(ROOT, "public", "index.html")
open(out, "w", encoding="utf8").write(src)
print("wrote", out, len(src), "bytes")

# The area report page: opened from /admin, or on its own by pasting a result from the SQL editor.
rep = open(os.path.join(ROOT, "tools", "area-report.html"), encoding="utf8").read().replace("<title>", '<meta name="robots" content="noindex">\n<title>', 1)
open(os.path.join(ROOT, "public", "area-report.html"), "w", encoding="utf8").write(rep)
print("wrote public/area-report.html")
