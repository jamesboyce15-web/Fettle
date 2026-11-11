"""Build public/index.html from src/fettle.html.

Run after editing src/fettle.html or the translations:
    python3 i18n/build.py      # refresh translations inside src/fettle.html
    python3 tools/build_site.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "src", "fettle.html"), encoding="utf8").read()

src = src  # title is set in the source

# config.js must load before the main script so LIVE is set on start-up.
i = src.index("\n<script>\n")
src = src[:i] + '\n<script src="config.js"></script>' + src[i:]

# live.js runs after the main script and swaps in real accounts and payments.
j = src.rindex("</body>")
src = src[:j] + '<script src="live.js"></script>\n' + src[j:]

out = os.path.join(ROOT, "public", "index.html")
open(out, "w", encoding="utf8").write(src)
print("wrote", out, len(src), "bytes")
