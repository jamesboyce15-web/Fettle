"""Line drawings for the guides. Each is plain inline SVG, drawn for Fettle, so it prints and works offline.
In a guide body, <!--FIG:name--> is replaced with FIGS[name] by tools/build_guides.py."""

INK, LINE, SOFT, BRAND, AMBER, WATER, WATERD, RED = "#1c2522", "#9aa7a1", "#eef3f0", "#173f35", "#f2a900", "#d6ebf5", "#5b9bc4", "#c8372d"
FONT = 'font-family="Atkinson Hyperlegible, system-ui, sans-serif"'


def fig(svg, caption, alt, vb="0 0 600 240"):
    return (f'<figure class="fig"><svg viewBox="{vb}" role="img" aria-label="{alt}" xmlns="http://www.w3.org/2000/svg" {FONT}>'
            f'{svg}</svg><figcaption>{caption}</figcaption></figure>')


def num(x, y, n):
    return f'<circle cx="{x}" cy="{y}" r="13" fill="{BRAND}"/><text x="{x}" y="{y + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">{n}</text>'


def label(x, y, lines, size=13, anchor="middle", weight=400, color=INK):
    return "".join(f'<text x="{x}" y="{y + i * (size + 4)}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{color}">{t}</text>' for i, t in enumerate(lines))


# ---------- toilet ----------
def toilet(x, seat, bag, closed=False):
    """A toilet seen from the side, at offset x. seat: 'up' or 'down'."""
    g = f'<g transform="translate({x},0)">'
    g += f'<rect x="28" y="52" width="34" height="74" rx="5" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'           # cistern
    g += f'<rect x="58" y="44" width="10" height="10" rx="2" fill="{LINE}"/>'                                                # flush button
    g += f'<path d="M62 124 H158 Q156 160 124 168 L120 196 H86 L84 166 Q64 156 62 124 Z" fill="#fff" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'  # bowl
    g += f'<path d="M72 128 Q78 152 104 156 Q140 152 148 128 Z" fill="{SOFT}"/>'                                         # inside of bowl
    if bag:
        g += f'<path d="M66 124 Q70 156 104 162 Q144 156 154 124 Z" fill="#4a4f4d"/>'                                       # bag in the bowl
        g += f'<path d="M58 122 L52 146 L66 128 Z M162 122 L168 146 L154 128 Z" fill="#4a4f4d"/>'                             # bag over the rim
    if seat == "up":
        g += f'<rect x="64" y="58" width="9" height="66" rx="4" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
    else:
        g += f'<rect x="60" y="116" width="102" height="9" rx="4" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
    g += f'<line x1="70" y1="196" x2="136" y2="196" stroke="{INK}" stroke-width="2.5"/>'
    return g + "</g>"


FIGS = {}
FIGS["toilet"] = fig(
    toilet(0, "up", True) + num(28, 22, 1) + label(100, 220, ["Seat up. Put a strong bin bag", "in the bowl, edges over the rim."]) +
    toilet(200, "down", True) + num(228, 22, 2) + label(300, 220, ["Put the seat down to hold", "the bag in place. Use as normal."]) +
    f'<g transform="translate(400,0)">{num(28, 22, 3)}'
    f'<path d="M58 100 Q52 160 70 186 H118 Q136 160 128 100 Q110 92 93 104 Q76 92 58 100 Z" fill="#4a4f4d"/>'
    f'<path d="M84 104 Q93 84 102 104 M93 84 L93 72" stroke="#4a4f4d" stroke-width="6" fill="none" stroke-linecap="round"/>'
    f'<rect x="138" y="76" width="50" height="112" rx="6" fill="{BRAND}"/><rect x="134" y="66" width="58" height="14" rx="4" fill="{BRAND}"/>'
    f'<circle cx="146" cy="190" r="7" fill="{INK}"/><circle cx="180" cy="190" r="7" fill="{INK}"/>'
    f'</g>' + label(500, 220, ["Lift it out, tie it tightly, and", "put it in an outside bin."]),
    "A bin bag in the toilet bowl, held by the seat. Each time, lift it out, tie it, put it in an outside bin, and wash your hands.",
    "Three drawings: a bin bag lining a toilet bowl with the seat up, the seat lowered to hold the bag, and a tied bag next to an outside wheelie bin.")


def bowl(x, y, w, tint=WATER):
    return (f'<path d="M{x} {y} H{x + w} L{x + w - 16} {y + 46} H{x + 16} Z" fill="#fff" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<ellipse cx="{x + w / 2}" cy="{y}" rx="{w / 2}" ry="9" fill="{tint}" stroke="{INK}" stroke-width="2.5"/>'
            + "".join(f'<circle cx="{x + w / 2 + dx}" cy="{y - 1 + dy}" r="{r}" fill="#fff" stroke="{WATERD}" stroke-width="1.2"/>' for dx, dy, r in [(-20, -1, 4), (-8, 2, 3), (6, -2, 4.5), (22, 1, 3)]))


FIGS["handwash"] = fig(
    f'<rect x="20" y="150" width="560" height="10" rx="3" fill="{LINE}"/>' +
    bowl(60, 104, 150) + label(135, 186, ["Everyone uses this one:", "water with soap or disinfectant."], weight=700) +
    f'<rect x="232" y="132" width="40" height="18" rx="6" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>' + label(252, 124, ["soap"], 12) +
    f'<path d="M294 150 V96 Q294 88 302 88 H330 Q338 88 338 96 V150" fill="#fff" stroke="{INK}" stroke-width="2.5"/><line x1="294" y1="112" x2="338" y2="112" stroke="{LINE}" stroke-width="2"/>' + label(316, 80, ["towel"], 12) +
    bowl(380, 104, 150, "#f6e3c4") + label(455, 186, ["A second bowl, only for anyone", "with diarrhoea or sickness."], weight=700) +
    label(300, 30, ["Keep using the same bowl even when it stops looking clean."], 14, color=BRAND, weight=700),
    "A shared hand-washing bowl. The UK Chief Medical Officers say the soapy water stays safe for hand-washing for the whole power cut.",
    "A washing-up bowl of soapy water with soap and a towel for everyone, and a second bowl kept only for anyone who is ill.")


# ---------- turning things off ----------
FIGS["stoptap"] = fig(
    f'<rect x="40" y="40" width="250" height="170" rx="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'      # cupboard
    f'<rect x="30" y="26" width="270" height="16" rx="3" fill="{LINE}"/>'                                        # worktop
    f'<path d="M110 26 V8 Q110 2 116 2 H148" stroke="{INK}" stroke-width="5" fill="none"/>'                     # sink tap
    f'<path d="M150 210 V112 H210 V60" stroke="{WATERD}" stroke-width="10" fill="none"/>'                        # pipe up from floor
    f'<rect x="138" y="140" width="24" height="34" rx="4" fill="#b5873a" stroke="{INK}" stroke-width="2"/>'      # brass valve body
    f'<rect x="124" y="148" width="14" height="8" rx="2" fill="{INK}"/><rect x="114" y="140" width="10" height="24" rx="3" fill="{RED}"/>'  # spindle and handle
    f'<path d="M96 120 A 34 34 0 1 1 96 184" stroke="{AMBER}" stroke-width="5" fill="none"/><path d="M90 176 L96 190 L106 178" stroke="{AMBER}" stroke-width="5" fill="none" stroke-linejoin="round"/>'
    + label(440, 70, ["Usually under the kitchen sink."], 15, weight=700) + label(440, 104, ["Also look under the stairs,", "in an airing cupboard,", "a downstairs toilet or the garage."], 13)
    + label(440, 176, ["Turn the handle clockwise", "to turn the water off."], 15, weight=700, color=BRAND),
    "The inside stop tap. Turn it slowly and never force it. If it's stiff or you can't find it, ask a plumber to look at it now, before you need it.",
    "A cupboard under a kitchen sink with a water pipe and a stop tap handle, and an arrow showing the handle turning clockwise.")


def ecv(x, off):
    hx = (f'<rect x="{x + 54}" y="96" width="12" height="54" rx="4" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>' if not off
          else f'<rect x="{x + 34}" y="117" width="54" height="12" rx="4" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>')
    return (f'<rect x="{x + 20}" y="20" width="80" height="62" rx="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
            f'<rect x="{x + 34}" y="34" width="52" height="16" rx="2" fill="{SOFT}" stroke="{INK}" stroke-width="1.5"/>'
            f'<text x="{x + 60}" y="46" text-anchor="middle" font-size="10" font-family="monospace" fill="{INK}">04273</text>'
            f'<rect x="{x + 54}" y="82" width="12" height="130" fill="{LINE}"/>'
            f'<circle cx="{x + 60}" cy="123" r="10" fill="{INK}"/>' + hx)


FIGS["gasvalve"] = fig(
    ecv(20, False) + label(80, 226, ["ON: in line", "with the pipe"], 13, weight=700) +
    f'<path d="M200 120 H250" stroke="{BRAND}" stroke-width="4"/><path d="M244 112 L254 120 L244 128" stroke="{BRAND}" stroke-width="4" fill="none"/>' +
    label(226, 100, ["a quarter", "turn"], 12) +
    ecv(260, True) + label(320, 226, ["OFF: across", "the pipe"], 13, weight=700, color=RED) +
    label(500, 60, ["The gas meter and its", "emergency control valve"], 14, weight=700) +
    label(500, 110, ["Inside, or in a box outside", "or in a shared cupboard.", "An outside box needs its key."], 13) +
    label(500, 180, ["Smell gas? Turn it off,", "open windows, no switches", "or flames. Call 0800 111 999."], 13, weight=700, color=BRAND),
    "Turn the lever a quarter turn, so it sits across the pipe. Don't turn it back on until you're told it's safe.",
    "A gas meter with its lever in line with the pipe (on) and turned a quarter turn across the pipe (off).", vb="0 0 600 260")


def breaker(x, on=True, main=False):
    body = f'<rect x="{x}" y="66" width="34" height="96" rx="3" fill="{"#f3d6d3" if main else "#fff"}" stroke="{INK}" stroke-width="2"/>'
    sw = f'<rect x="{x + 9}" y="{78 if on else 112}" width="16" height="38" rx="3" fill="{RED if main else INK}"/>'
    return body + sw


FIGS["fusebox"] = fig(
    f'<rect x="30" y="40" width="440" height="150" rx="8" fill="{SOFT}" stroke="{INK}" stroke-width="2.5"/>' +
    breaker(50, True, True) + label(67, 182, ["MAIN"], 11, weight=700, color=RED) +
    "".join(breaker(110 + i * 44) for i in range(7)) +
    breaker(110 + 3 * 44, False) +
    label(255, 28, ["Up is on. Down is off."], 14, weight=700) +
    f'<path d="M259 190 V214" stroke="{AMBER}" stroke-width="4"/>' + label(259, 232, ["A switch that has tripped (clicked down) on its own"], 12) +
    label(535, 70, ["Main switch:", "usually red, at", "one end. Down", "turns off all", "the electricity."], 13, weight=700, color=BRAND),
    "The consumer unit (fuse box). Never touch it with wet hands or if you're standing in water.",
    "A consumer unit with a red main switch at one end and a row of smaller switches, one of them tripped down.", vb="0 0 620 250")


# ---------- making water safe ----------
FIGS["watersafe"] = fig(
    num(26, 22, 1) +
    f'<rect x="40" y="120" width="110" height="80" rx="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/><rect x="44" y="160" width="102" height="36" fill="{WATER}"/>'
    f'<path d="M36 112 Q95 150 154 112" fill="#f4efe4" stroke="{INK}" stroke-width="2"/>'                       # cloth over the top
    f'<path d="M70 50 L120 50 L112 92 H78 Z" fill="{WATER}" stroke="{INK}" stroke-width="2.5" transform="rotate(28 95 70)"/>'
    f'<path d="M98 104 Q100 116 96 128" stroke="{WATERD}" stroke-width="4" fill="none"/>'
    + label(95, 222, ["Pour it through a clean", "cloth until it runs clear."]) +
    num(226, 22, 2) +
    f'<rect x="240" y="96" width="120" height="70" rx="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/><rect x="244" y="112" width="112" height="50" fill="{WATER}"/>'
    f'<path d="M232 96 H368" stroke="{INK}" stroke-width="3"/><path d="M360 106 H392" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
    + "".join(f'<path d="M{270 + i * 22} 86 Q{262 + i * 22} 70 {272 + i * 22} 56" stroke="{LINE}" stroke-width="3" fill="none"/>' for i in range(3))
    + f'<path d="M262 186 Q270 170 278 186 Q286 168 296 186 Q304 172 314 186 Q322 170 332 186" fill="{AMBER}"/><rect x="246" y="186" width="108" height="6" fill="{INK}"/>'
    + label(300, 222, ["Then boil it, or use", "water purification tablets."]) +
    num(426, 22, 3) +
    f'<path d="M440 90 H560 L548 196 H452 Z" fill="#fff" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="446" y="110" width="108" height="82" fill="{WATER}"/>'
    f'<text x="500" y="160" text-anchor="middle" font-size="16" font-weight="700" fill="{BRAND}">10 litres</text>'
    f'<path d="M470 56 L520 76" stroke="{INK}" stroke-width="4" stroke-linecap="round"/><ellipse cx="526" cy="79" rx="9" ry="5" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    f'<path d="M526 84 V96" stroke="{WATERD}" stroke-width="3" stroke-dasharray="3 4"/>'
    + label(500, 222, ["Can't boil, no tablets?", "¼ teaspoon of plain bleach", "per 10 litres. Wait 15 minutes."]),
    "From the UK Chief Medical Officers' advice. Treated water is for drinking only.",
    "Three steps: pouring water through a cloth into a container, a pan of water boiling, and a quarter teaspoon of bleach going into a 10-litre bucket.", vb="0 0 600 270")


# ---------- one warm room ----------
FIGS["warmroom"] = fig(
    f'<rect x="20" y="20" width="560" height="190" rx="4" fill="#fbfaf6" stroke="{INK}" stroke-width="2.5"/>'
    f'<rect x="20" y="196" width="560" height="14" fill="{LINE}"/>'
    # window with curtains shut
    f'<rect x="60" y="44" width="110" height="90" fill="#1f3550"/><path d="M56 40 H174" stroke="{INK}" stroke-width="4"/>'
    f'<path d="M58 42 Q72 90 60 140 H116 Q104 90 116 42 Z M172 42 Q158 90 170 140 H114 Q126 90 114 42 Z" fill="#b8604f" stroke="{INK}" stroke-width="2"/>'
    + label(115, 160, ["Curtains shut", "at dusk"], 12, weight=700) +
    # door with draught excluder
    f'<rect x="470" y="78" width="80" height="118" fill="#fff" stroke="{INK}" stroke-width="2.5"/><circle cx="534" cy="140" r="4" fill="{INK}"/>'
    f'<rect x="462" y="186" width="96" height="14" rx="7" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>'
    + label(510, 44, ["Door shut, towel", "along the bottom"], 12, weight=700) +
    # sofa with people under blankets
    f'<rect x="210" y="128" width="210" height="58" rx="10" fill="#7d8f86" stroke="{INK}" stroke-width="2.5"/><rect x="200" y="112" width="22" height="74" rx="8" fill="#7d8f86" stroke="{INK}" stroke-width="2.5"/><rect x="408" y="112" width="22" height="74" rx="8" fill="#7d8f86" stroke="{INK}" stroke-width="2.5"/>'
    + "".join(f'<circle cx="{x}" cy="100" r="15" fill="#e9c9a8" stroke="{INK}" stroke-width="2"/><path d="M{x - 15} 96 Q{x} 74 {x + 15} 96 Z" fill="{BRAND}"/>' for x in (262, 315, 368))
    + f'<path d="M232 118 H398 Q404 150 398 176 H232 Q226 150 232 118 Z" fill="{AMBER}" opacity=".85" stroke="{INK}" stroke-width="2"/>'
    + label(315, 232, ["Everyone in one room, in layers and hats, with blankets. Feet up off the floor."], 13, weight=700),
    "Heat and live in one room. Close the curtains at dusk, block draughts, and get up and move about at least once an hour.",
    "A living room with curtains closed, a rolled towel along the bottom of the door, and three people in hats sharing blankets on a sofa.", vb="0 0 600 250")


# ---------- how much water to store ----------
def bottle(x, y, s=1.0):
    w, h = 14 * s, 40 * s
    return (f'<g transform="translate({x},{y})"><rect x="{w * .3}" y="0" width="{w * .4}" height="{5 * s}" rx="1" fill="{WATERD}"/>'
            f'<path d="M{w * .25} {5 * s} H{w * .75} L{w} {11 * s} V{h} H0 V{11 * s} Z" fill="{WATER}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<rect x="1" y="{18 * s}" width="{w - 2}" height="{8 * s}" fill="#fff" opacity=".8"/></g>')


def bottles(x0, y0, n, per_row):
    return "".join(bottle(x0 + (i % per_row) * 17, y0 + (i // per_row) * 46) for i in range(n))


FIGS["waterstore"] = fig(
    f'<rect x="20" y="166" width="560" height="6" rx="2" fill="{LINE}"/>'
    + bottles(52, 120, 5, 5) + label(92, 196, ["1 person", "9 litres: 5 bottles"], 13, weight=700)
    + bottles(178, 74, 9, 5) + label(220, 196, ["2 people", "18 litres: 9 bottles"], 13, weight=700)
    + bottles(352, 28, 18, 9) + label(428, 196, ["4 people", "36 litres: 18 bottles"], 13, weight=700)
    + label(300, 238, ["Large 2-litre bottles. Keep them somewhere cool and dark, like under a bed."], 13, color=BRAND, weight=700),
    "3 litres per person per day, for 3 days. Add more for pets, babies on powder formula, or hot weather.",
    "Rows of 2-litre water bottles: 5 for one person, 9 for two people and 18 for a family of four.", vb="0 0 600 255")


# ---------- a grab bag ----------
def item(cx, cy, art, name):
    return f'<g transform="translate({cx - 30},{cy - 30})">{art}</g>' + label(cx, cy + 44, name, 11)


_torch = f'<rect x="8" y="24" width="38" height="14" rx="4" fill="{INK}"/><path d="M46 20 H56 V42 H46 Z" fill="{LINE}" stroke="{INK}" stroke-width="2"/><path d="M58 22 L66 14 M58 31 H68 M58 40 L66 48" stroke="{AMBER}" stroke-width="2.5"/>'
_bank = f'<rect x="14" y="12" width="30" height="44" rx="5" fill="{BRAND}"/><rect x="20" y="20" width="18" height="6" rx="2" fill="{AMBER}"/><path d="M29 56 Q29 64 44 64 H56" stroke="{INK}" stroke-width="2.5" fill="none"/>'
_docs = f'<rect x="10" y="10" width="40" height="50" rx="2" fill="#fff" stroke="{INK}" stroke-width="2"/><path d="M16 22 H44 M16 30 H44 M16 38 H36" stroke="{LINE}" stroke-width="2"/><rect x="6" y="6" width="48" height="58" rx="4" fill="{WATER}" opacity=".45" stroke="{WATERD}" stroke-width="2"/>'
_cash = f'<rect x="4" y="20" width="44" height="26" rx="3" fill="#cfe3cf" stroke="{INK}" stroke-width="2"/><circle cx="26" cy="33" r="7" fill="none" stroke="{BRAND}" stroke-width="2"/><circle cx="50" cy="46" r="10" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>'
_keys = f'<circle cx="18" cy="24" r="10" fill="none" stroke="{INK}" stroke-width="3"/><path d="M26 30 L50 50 M42 44 L48 38 M47 48 L52 43" stroke="{INK}" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="24" r="3" fill="{AMBER}"/>'
_meds = f'<rect x="12" y="14" width="22" height="40" rx="4" fill="#fff" stroke="{INK}" stroke-width="2"/><rect x="10" y="8" width="26" height="9" rx="2" fill="{RED}"/><rect x="38" y="26" width="18" height="28" rx="2" fill="#fff" stroke="{INK}" stroke-width="2"/><path d="M42 34 H52 M42 40 H52 M42 46 H50" stroke="{LINE}" stroke-width="2"/>'
_glasses = f'<circle cx="16" cy="32" r="11" fill="{SOFT}" stroke="{INK}" stroke-width="3"/><circle cx="44" cy="32" r="11" fill="{SOFT}" stroke="{INK}" stroke-width="3"/><path d="M27 30 Q30 26 33 30 M5 30 L0 24 M55 30 L60 24" stroke="{INK}" stroke-width="3" fill="none"/>'
_kit = f'<rect x="6" y="16" width="48" height="36" rx="5" fill="#2f8f5b" stroke="{INK}" stroke-width="2"/><rect x="22" y="10" width="16" height="8" rx="2" fill="none" stroke="{INK}" stroke-width="2"/><path d="M30 24 V44 M20 34 H40" stroke="#fff" stroke-width="6"/>'
_food = bottle(6, 10, 1.2).replace('<g transform="translate(6,10)">', '<g transform="translate(6,8)">') + f'<rect x="30" y="30" width="28" height="22" rx="3" fill="{AMBER}" stroke="{INK}" stroke-width="2"/><path d="M34 38 H54" stroke="{INK}" stroke-width="1.5"/>'
_warm = f'<path d="M6 40 Q30 4 54 40 Z" fill="{BRAND}"/><rect x="4" y="38" width="52" height="10" rx="4" fill="{AMBER}"/><circle cx="30" cy="8" r="6" fill="{AMBER}"/><path d="M14 54 H46" stroke="#c0c6c4" stroke-width="6" stroke-linecap="round"/>'
_note = f'<rect x="8" y="8" width="34" height="46" rx="2" fill="#fff" stroke="{INK}" stroke-width="2"/><path d="M14 18 H36 M14 26 H36 M14 34 H30" stroke="{LINE}" stroke-width="2"/><path d="M48 10 L52 50" stroke="{BRAND}" stroke-width="4" stroke-linecap="round"/>'
_list = f'<rect x="10" y="6" width="40" height="52" rx="2" fill="#fff" stroke="{INK}" stroke-width="2"/>' + "".join(f'<path d="M16 {16 + i * 9} H44" stroke="{LINE}" stroke-width="2"/>' for i in range(5)) + f'<text x="30" y="13" text-anchor="middle" font-size="7" font-weight="700" fill="{BRAND}">NUMBERS</text>'

FIGS["grabbag"] = fig(
    # the rucksack
    f'<path d="M48 70 Q48 44 86 44 Q124 44 124 70 V212 Q124 222 114 222 H58 Q48 222 48 212 Z" fill="{BRAND}" stroke="{INK}" stroke-width="2.5"/>'
    f'<path d="M70 44 Q70 26 86 26 Q102 26 102 44" fill="none" stroke="{INK}" stroke-width="4"/>'
    f'<rect x="60" y="130" width="52" height="52" rx="8" fill="#245849" stroke="{INK}" stroke-width="2"/><path d="M60 146 H112" stroke="{AMBER}" stroke-width="2.5"/>'
    + label(86, 246, ["A bag you", "already own"], 13, weight=700)
    + "".join(item(210 + (i % 6) * 70, 50 + (i // 6) * 112, a, n) for i, (a, n) in enumerate([
        (_torch, ["Torch and", "batteries"]), (_bank, ["Charged", "power bank"]), (_docs, ["ID copies,", "in a wallet"]),
        (_cash, ["Cash,", "£10 each"]), (_keys, ["Spare", "keys"]), (_meds, ["Medicines", "and a list"]),
        (_glasses, ["Glasses,", "hearing aids"]), (_kit, ["Small first", "aid kit"]), (_food, ["Water and", "snacks"]),
        (_warm, ["Hats and", "warm layers"]), (_note, ["Notepad,", "pen, whistle"]), (_list, ["Numbers", "on paper"])])),
    "Keep it by the front door, and tell everyone at home where it is. Check it every season.",
    "A rucksack next to twelve things to pack: torch, power bank, copies of ID, cash, spare keys, medicines and a list, glasses, a small first aid kit, water and snacks, warm clothes, a notepad and whistle, and a paper list of phone numbers.",
    vb="0 0 600 270")


# ---------- a radio for emergencies ----------
FIGS["radio"] = fig(
    # radio body
    f'<rect x="40" y="70" width="290" height="140" rx="16" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
    f'<path d="M80 70 Q80 36 185 36 Q290 36 290 70" fill="none" stroke="{INK}" stroke-width="5"/>'
    + "".join(f'<circle cx="{86 + (i % 6) * 14}" cy="{110 + (i // 6) * 14}" r="4" fill="{LINE}"/>' for i in range(30))
    # dial window with the FM band
    + f'<rect x="180" y="92" width="130" height="40" rx="5" fill="{SOFT}" stroke="{INK}" stroke-width="2"/>'
    + "".join(f'<line x1="{190 + i * 11}" y1="116" x2="{190 + i * 11}" y2="{124 if i % 2 else 128}" stroke="{INK}" stroke-width="1.5"/>' for i in range(11))
    + f'<text x="192" y="108" font-size="11" fill="{INK}">88</text><text x="282" y="108" font-size="11" fill="{INK}">108</text><line x1="243" y1="96" x2="243" y2="130" stroke="{RED}" stroke-width="2.5"/>'
    # band switch with FM picked
    + f'<rect x="180" y="146" width="130" height="24" rx="12" fill="{SOFT}" stroke="{INK}" stroke-width="2"/><rect x="182" y="148" width="62" height="20" rx="10" fill="{BRAND}"/>'
    + f'<text x="213" y="163" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">FM</text><text x="277" y="163" text-anchor="middle" font-size="13" fill="{LINE}">AM / LW</text>'
    + f'<circle cx="290" cy="190" r="12" fill="{LINE}" stroke="{INK}" stroke-width="2"/><text x="200" y="196" font-size="11" fill="{INK}">tuning</text>'
    # wind-up handle
    + f'<path d="M330 120 H352 V156 H340" fill="none" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><circle cx="338" cy="156" r="6" fill="{AMBER}" stroke="{INK}" stroke-width="2"/>'
    + label(362, 108, ["wind-up handle", "(on some radios)"], 11, anchor="start")
    # label stuck on the front
    + f'<g transform="rotate(-3 80 178)"><rect x="56" y="168" width="110" height="34" rx="2" fill="#fff8d8" stroke="{INK}" stroke-width="1.5"/>'
    + f'<text x="62" y="181" font-size="9" fill="{INK}">R2 FM ____  R4 FM ____</text><text x="62" y="195" font-size="9" fill="{INK}">Local FM ________</text></g>'
    # batteries in their packet, and a notepad
    + f'<rect x="440" y="150" width="56" height="50" rx="4" fill="{WATER}" opacity=".6" stroke="{WATERD}" stroke-width="2"/>'
    + "".join(f'<rect x="{448 + i * 12}" y="158" width="9" height="34" rx="2" fill="{INK}"/><rect x="{448 + i * 12}" y="158" width="9" height="6" fill="{AMBER}"/>' for i in range(4))
    + label(468, 218, ["Spare batteries,", "in the packet"], 12)
    + f'<rect x="530" y="146" width="48" height="56" rx="2" fill="#fff" stroke="{INK}" stroke-width="2"/><path d="M536 160 H572 M536 170 H572 M536 180 H564" stroke="{LINE}" stroke-width="2"/>'
    + label(554, 218, ["Pen and", "paper"], 12)
    + label(300, 258, ["Switch to FM, find each station, and write its number on a label."], 13, color=BRAND, weight=700),
    "BBC Radio 4 stopped broadcasting on long wave in June 2026. Choose FM, and test the radio each season.",
    "A battery radio with the band switch set to FM, a dial, a wind-up handle, and a label on the front with spaces for the Radio 2, Radio 4 and local station FM numbers, next to spare batteries in their packet and a notepad.",
    vb="0 0 600 270")


# ---------- fridge and freezer in a power cut ----------
def appliance(x, w, h, top, fill, title, time, shelves):
    y = 210 - h
    g = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#fff" stroke="{INK}" stroke-width="2.5"/>'
    g += f'<rect x="{x + w - 16}" y="{y + 16}" width="6" height="40" rx="3" fill="{LINE}"/>'
    for i in range(shelves):
        yy = y + 14 + i * ((h - 24) / shelves)
        g += f'<rect x="{x + 10}" y="{yy}" width="{w - 34}" height="{(h - 24) / shelves - 8}" rx="3" fill="{fill if i >= shelves - top else SOFT}"/>'
    return g + label(x + w / 2, 28, [title], 13, weight=700) + label(x + w / 2, 230, [time], 15, weight=700, color=BRAND)


FIGS["fridge"] = fig(
    appliance(40, 110, 150, 0, SOFT, "Fridge", "about 4 hours", 4)
    + appliance(220, 110, 150, 4, WATER, "Freezer, full", "about 48 hours", 4)
    + appliance(400, 110, 150, 2, WATER, "Freezer, half full", "about 24 hours", 4)
    + f'<rect x="545" y="84" width="10" height="90" rx="5" fill="#fff" stroke="{INK}" stroke-width="2"/><rect x="547" y="140" width="6" height="32" fill="{RED}"/><circle cx="550" cy="180" r="9" fill="{RED}" stroke="{INK}" stroke-width="2"/>'
    + f'<line x1="555" y1="134" x2="566" y2="134" stroke="{INK}" stroke-width="2"/>' + label(580, 132, ["8°C"], 12, weight=700) + label(550, 56, ["Keep", "below"], 11),
    "If the doors stay shut. Each time you open one, the time gets shorter. Chilled food above 8°C for more than 4 hours goes in the bin.",
    "A fridge that stays cold for about 4 hours, a full freezer that keeps food frozen for about 48 hours, and a half-full freezer that lasts about 24 hours, with a thermometer showing 8°C.",
    vb="0 0 600 245")
