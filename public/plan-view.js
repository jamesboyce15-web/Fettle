/* The family's plan, as they see it: on their link (plan.html), on the coordinator's shared screen during the call
   (plan.html?live=1), and as a preview in the coordinator dashboard. Needs call-kit.js first. */
(function (root) {
  "use strict";
  const K = root.FettleCall;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = s => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
  const STATUS = { ok: ["Covered", "ok"], thin: ["No backup yet", "thin"], gap: ["Being arranged", "gap"] };
  const KITSTATUS = { recommended: "Recommended", approved: "Approved, being packed", ordered: "On its way", delivered: "Delivered" };

  const CSS = `
.fpv{--g:#2e7d4f;--gb:#e6f2ea;--a:#8a5a00;--ab:#fff3d6;--r:#b3261e;--rb:#fde7e5;--ink:#1c2522;--mute:#5b6763;--line:#dfe4e0;--card:#fff;--brand:#173f35;color:var(--ink);font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.fpv h1{font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.15;margin:0 0 6px;color:var(--brand);letter-spacing:-.01em}
.fpv h2{font-size:1.2rem;margin:0 0 10px;color:var(--brand)}
.fpv h3{font-size:1.02rem;margin:0 0 6px}
.fpv .sub{color:var(--mute);margin:0 0 18px}
.fpv .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 18px 16px;margin:0 0 16px}
.fpv .building{display:inline-flex;gap:8px;align-items:center;background:var(--ab);color:var(--a);border-radius:999px;padding:4px 12px;font-weight:600;font-size:.9rem;margin:0 0 12px}
.fpv .grid{width:100%;border-collapse:collapse;font-size:.95rem}
.fpv .grid th,.fpv .grid td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.fpv .grid th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--mute);font-weight:600}
.fpv .chip{display:inline-block;border-radius:999px;padding:2px 10px;font-size:.85rem;font-weight:600;white-space:nowrap}
.fpv .chip.ok{background:var(--gb);color:var(--g)}.fpv .chip.thin{background:var(--ab);color:var(--a)}.fpv .chip.gap{background:var(--rb);color:var(--r)}
.fpv .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.fpv .tab{flex:1 1 150px;border:2px solid var(--line);background:#fff;border-radius:14px;padding:10px 12px;text-align:left;cursor:pointer;font:inherit;color:inherit}
.fpv .tab b{display:block;font-size:1rem}.fpv .tab span{font-size:.85rem;color:var(--mute)}
.fpv .tab.g[aria-pressed=true]{border-color:var(--g);background:var(--gb)}.fpv .tab.a[aria-pressed=true]{border-color:#d49a00;background:var(--ab)}.fpv .tab.r[aria-pressed=true]{border-color:var(--r);background:var(--rb)}
.fpv .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle}
.fpv .dot.g{background:var(--g)}.fpv .dot.a{background:#d49a00}.fpv .dot.r{background:var(--r)}
.fpv .band{display:none}.fpv .band.on{display:block}
.fpv .bandhead{border-left:6px solid;padding:4px 0 4px 12px;margin:0 0 14px}
.fpv .bandhead.g{border-color:var(--g)}.fpv .bandhead.a{border-color:#d49a00}.fpv .bandhead.r{border-color:var(--r)}
.fpv ol.steps{margin:0 0 12px;padding-left:1.3em}.fpv ol.steps li{margin:0 0 6px}
.fpv .who{list-style:none;margin:0 0 12px;padding:0}.fpv .who li{padding:8px 12px;border-radius:10px;background:#f3f6f4;margin:0 0 6px}
.fpv .who li.gap{background:var(--rb)}
.fpv .watch{margin:8px 0 0;padding:0;list-style:none}.fpv .watch li{margin:0 0 8px;padding-left:14px;border-left:3px solid var(--line)}
.fpv .watch li.high{border-color:var(--r)}
.fpv .two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:720px){.fpv .two{grid-template-columns:1fr}}
.fpv .list{list-style:none;margin:0;padding:0}.fpv .list li{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)}
.fpv .list li:last-child{border-bottom:0}
.fpv .tick{flex:0 0 22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:.8rem;font-weight:700}
.fpv .tick.y{background:var(--gb);color:var(--g)}.fpv .tick.n{background:#eef1ef;color:var(--mute)}
.fpv .mute{color:var(--mute)}.fpv .sm{font-size:.9rem}
.fpv .coord{display:flex;gap:14px;align-items:center}
.fpv .av{flex:0 0 52px;height:52px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:700;font-size:1.2rem}
.fpv textarea{width:100%;min-height:90px;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;box-sizing:border-box}
.fpv input[type=text]{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;box-sizing:border-box;margin:0 0 8px}
.fpv .btn{background:var(--brand);color:#fff;border:0;border-radius:12px;padding:11px 18px;font:inherit;font-weight:600;cursor:pointer}
.fpv .btn:disabled{opacity:.6}
.fpv .new{background:var(--ab);border-color:#f0d38a}
.fpv .live .flash{animation:fpvflash 1.6s ease}
@keyframes fpvflash{from{background:#fff3d6}to{background:transparent}}
@media print{.fpv .band{display:block!important;break-inside:avoid-page;margin-bottom:18px}.fpv .tabs,.fpv .noprint{display:none!important}.fpv .card{break-inside:avoid;border-color:#bbb}}
`;
  function ensureStyle() {
    if (document.getElementById("fpv-css")) return;
    const s = document.createElement("style"); s.id = "fpv-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  // P = {family_name, status, sent_at, updated_at, next_review, data, coordinator}
  // opt = {band, onBand(band), canMessage, onMessage(text, name) -> Promise, live}
  function render(el, P, opt) {
    ensureStyle(); opt = opt || {};
    const d = P.data || {}, geo = d.geo || {}, cov = K.coverage(d, geo), homes = d.homes || [];
    const band = opt.band || "a", c = P.coordinator || {};
    const first = cov.map(r => r.person.name).filter(Boolean);
    const forWho = first.length ? first.join(" and ") : "your family";
    const outcomes = K.outcomesFor(d, geo), done = outcomes.filter(o => o.done), next = outcomes.filter(o => !o.done);
    let h = `<div class="fpv${opt.live ? " live" : ""}">`;

    // 1. Who it's for and who made it
    if (P.status === "call") h += `<p class="building">${opt.live ? "Live: your plan is being built now" : "Your plan is still being built"}</p>`;
    h += `<h1>The ${esc(P.family_name || "family")} family plan</h1>`;
    h += `<p class="sub">For ${esc(forWho)}. ${c.name ? `Made with ${esc(c.name)}, your Fettle coordinator` : "Made with your Fettle coordinator"}${d.call && d.call.doneAt ? ` on ${fmtDate(d.call.doneAt)}` : ""}.${P.updated_at ? ` Last updated ${fmtDate(P.updated_at)}.` : ""}</p>`;

    // 2. Who can get there, in each kind of emergency
    if (cov.length) {
      h += `<section class="card"><h2>Who can get there</h2><p class="mute sm">For each kind of emergency, who will come. Where nobody in the family can, your coordinator is arranging someone local.</p>
        <table class="grid"><thead><tr><th></th>${K.BANDS.map(b => `<th><span class="dot ${b.k}"></span>${b.name}</th>`).join("")}</tr></thead><tbody>`;
      cov.forEach(r => {
        h += `<tr><td><b>${esc(r.person.name || "Someone")}</b></td>${K.BANDS.map(b => { const x = r.bands[b.k], s = STATUS[x.status];
          return `<td><span class="chip ${s[1]}">${s[0]}</span>${x.main ? `<div class="sm">${esc(x.main.name)}${x.backup ? `, then ${esc(x.backup.name)}` : ""}</div>` : ""}</td>`; }).join("")}</tr>`;
      });
      h += `</tbody></table></section>`;
    }

    // 3. What to do, by band
    h += `<section class="card"><h2>What to do</h2><div class="tabs noprint" role="group" aria-label="Kind of emergency">${K.BANDS.map(b =>
      `<button class="tab ${b.k}" data-band="${b.k}" aria-pressed="${b.k === band}"><b><span class="dot ${b.k}"></span>${b.name}</b><span>${esc(b.what)}</span></button>`).join("")}</div>`;
    K.BANDS.forEach(b => {
      h += `<div class="band${b.k === band ? " on" : ""}" data-panel="${b.k}"><div class="bandhead ${b.k}"><h3>${b.name}: ${esc(b.what)}</h3><p class="mute sm" style="margin:0">${esc(b.long)}</p></div>`;
      homes.forEach(home => {
        const rows = cov.filter(r => r.home.id === home.id), w = K.whoComes(rows, b.k), f = K.findings(home).filter(x => x.bands.includes(b.k));
        if (homes.length > 1) h += `<h3>${esc(home.label || "Home")}</h3>`;
        h += `<ol class="steps">${K.bandSteps(home, b.k, rows).map(s => `<li>${esc(s)}</li>`).join("")}</ol>`;
        if (w.length) h += `<p class="sm" style="margin:0 0 4px"><b>Who comes</b></p><ul class="who">${w.map(x => `<li class="${x.gap ? "gap" : ""}"><b>${esc(x.person)}:</b> ${esc(x.text)}</li>`).join("")}</ul>`;
        if (f.length) h += `<p class="sm" style="margin:0 0 4px"><b>Watch out for</b></p><ul class="watch">${f.map(x => `<li class="${x.level}"><b>${esc(x.title)}.</b> ${esc(x.fix)}</li>`).join("")}</ul>`;
      });
      h += `<p class="sm mute" style="margin:12px 0 0">If life is at risk, call 999. To report a power cut, call 105.</p></div>`;
    });
    h += `</section>`;

    // 4. What's done and what's next
    h += `<div class="two"><section class="card"><h2>Done</h2>${done.length ? `<ul class="list">${done.map(o => `<li><span class="tick y">✓</span><span>${esc(o.t)}${o.at ? `<br><span class="sm mute">${fmtDate(o.at)}</span>` : ""}</span></li>`).join("")}</ul>` : `<p class="mute">Nothing yet.</p>`}</section>
      <section class="card"><h2>Coming next</h2>${next.length ? `<ul class="list">${next.map(o => `<li><span class="tick n">•</span><span>${esc(o.t)}<br><span class="sm mute">${esc(o.when)}</span></span></li>`).join("")}</ul>` : `<p class="mute">All done.</p>`}</section></div>`;

    // 5. Kit
    const kits = homes.map(home => ({ home, k: K.kitFor(home, cov) })).filter(x => x.k.tier !== "none");
    if (kits.length) {
      h += `<section class="card"><h2>Your kit</h2>`;
      kits.forEach(({ home, k }) => {
        const st = (home.kit && home.kit.status) || "recommended";
        h += `<h3>${esc(home.label || "Home")}: ${esc(K.KITS[k.tier].name)}${k.medical ? ` and ${esc(K.MEDICAL.name.toLowerCase())}` : ""}</h3>
          <p class="sm"><span class="chip ${st === "delivered" ? "ok" : "thin"}">${esc(KITSTATUS[st] || st)}</span> <span class="mute">£${k.total} including VAT and delivery</span></p>`;
        if (k.missing.length) h += `<p class="sm mute" style="margin:0 0 4px">Fills what's missing:</p><p class="sm" style="margin:0 0 10px">${k.missing.map(m => esc(m.t)).join(", ")}.</p>`;
      });
      h += `</section>`;
    }

    // 6. New near you
    if ((d.resources || []).length) h += `<section class="card new"><h2>New near you</h2><ul class="list">${d.resources.map(r => `<li><span class="dot ${esc(r.band || "a")}"></span><span>${esc(r.title)}${/^https?:\/\//i.test(r.source || "") ? ` <a href="${esc(r.source)}" target="_blank" rel="noopener">More</a>` : ""}<br><span class="sm mute">Added to your plan ${fmtDate(r.added)}</span></span></li>`).join("")}</ul></section>`;

    // 7. Your coordinator, and telling them something's changed
    h += `<section class="card"><div class="coord"><div class="av">${esc((c.name || "F")[0])}</div><div><h2 style="margin:0">${c.name ? esc(c.name) + ", your coordinator" : "Your coordinator"}</h2>
      <p class="sm mute" style="margin:2px 0 0">${[c.phone && `<a href="tel:${esc(c.phone.replace(/\s/g, ""))}">${esc(c.phone)}</a>`, c.email && `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`].filter(Boolean).join(" · ")}</p>
      ${P.next_review ? `<p class="sm" style="margin:2px 0 0">Next review: <b>${fmtDate(P.next_review)}</b></p>` : ""}</div></div>`;
    if (opt.canMessage) h += `<div class="noprint" style="margin-top:14px" id="fpv-change"><h3>Something's changed?</h3><p class="sm mute">A new diagnosis, a move, a new baby, a change of carer or job. Tell us and we'll update the plan.</p>
      <input type="text" id="fpv-name" placeholder="Your name" maxlength="60" aria-label="Your name"><textarea id="fpv-msg" maxlength="2000" aria-label="What's changed"></textarea>
      <p style="margin:8px 0 0"><button class="btn" id="fpv-send">Send to ${esc(c.name || "your coordinator")}</button> <span id="fpv-sent" class="sm"></span></p></div>`;
    h += `</section>`;
    h += `<p class="sm mute">Fettle isn't an emergency service. If life is at risk, call 999. Follow official warnings and advice.</p></div>`;

    el.innerHTML = h;
    el.querySelectorAll("[data-band]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.band;
      el.querySelectorAll("[data-band]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.band === k)));
      el.querySelectorAll("[data-panel]").forEach(x => x.classList.toggle("on", x.dataset.panel === k));
      opt.onBand && opt.onBand(k);
    }));
    const send = el.querySelector("#fpv-send");
    if (send) send.addEventListener("click", async () => {
      const t = el.querySelector("#fpv-msg").value.trim(), out = el.querySelector("#fpv-sent");
      if (!t) { out.textContent = "Please write what's changed."; return; }
      send.disabled = true; out.textContent = "Sending…";
      try { await opt.onMessage(t, el.querySelector("#fpv-name").value.trim()); out.textContent = "Sent. Your coordinator will be in touch."; el.querySelector("#fpv-msg").value = ""; }
      catch (e) { out.textContent = (e && e.message) || "That didn't send. Please try again."; }
      send.disabled = false;
    });
  }

  root.FettlePlanView = { render, esc, fmtDate };
})(typeof window !== "undefined" ? window : globalThis);
