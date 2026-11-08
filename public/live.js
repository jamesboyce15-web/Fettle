/* Fettle live layer.
   Loaded after the main app script. When config.js has Supabase details, this file replaces the
   in-memory prototype accounts with real ones (Supabase Auth), saves plans to the database, and
   takes payment for the £5 digital book through Stripe Checkout (via /api/checkout).
   Paid status comes only from the purchases table, which only the Stripe webhook can write. */
(function () {
  if (!window.FETTLE_CONFIG || !window.FETTLE_CONFIG.supabaseUrl) return; // prototype mode
  const CFG = window.FETTLE_CONFIG;
  let sb = null, saved = new Map(), saving = false, events = [];

  const strip = h => { const o = Object.assign({}, h); delete o._id; delete o.paid; return o; };
  const errBox = t => { const e = document.getElementById("a-err"); if (e) e.textContent = t; return false; };
  const say = t => { try { toast(t); } catch (e) {} };

  function loadScript(src) {
    return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }

  async function boot() {
    try { await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"); }
    catch (e) { console.error("Could not load Supabase", e); return; }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") newPasswordView(); });
    const { data } = await sb.auth.getSession();
    if (data.session) await loadUser(data.session.user);
    await handleReturn();
    if (new URLSearchParams(location.search).get("recheck")) { // link from a reminder email
      history.replaceState(null, "", location.pathname);
      if (user) { const i = H.findIndex(h => checkDue(h)); if (i >= 0) recheck(i); else homeView(); } else authView("signin");
    }
    const join = new URLSearchParams(location.search).get("join"); // invite link: /?join=ABCD-2345
    if (join) { history.replaceState(null, "", location.pathname); if (!(user && user.pro)) { proAuth(); const c = document.getElementById("j-code"); if (c && join !== "1") c.value = join; } }
    setInterval(saveAll, 4000);
    addEventListener("pagehide", saveAll);
  }

  async function token() { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : ""; }

  // Fettle for Communities: a worker or admin in an organisation. Returns true if this account is one.
  async function loadOrg(u) {
    let { data: mem } = await sb.from("org_members").select("org_id,role,job_title").eq("user_id", u.id);
    const code = localStorage.getItem("fettle_join");
    if ((!mem || !mem.length) && code) { // signed up with an invite code, then confirmed their email
      const j = JSON.parse(code); localStorage.removeItem("fettle_join");
      const r = await joinOrg(j.code, j.jobTitle);
      if (r.ok) ({ data: mem } = await sb.from("org_members").select("org_id,role,job_title").eq("user_id", u.id));
      else say(r.error);
    }
    if (!mem || !mem.length) return false;
    const m = mem[0];
    const { data: orgs } = await sb.from("organisations").select("id,name,wards").eq("id", m.org_id);
    const org = (orgs || [])[0] || { name: "Your organisation", wards: [] };
    const { data: rows, error } = await sb.from("households").select("id,data").eq("org_id", m.org_id).order("created_at");
    if (error) { console.error(error); say("We couldn't load your caseload. Please refresh."); }
    saved.clear();
    H = (rows || []).map(r => { const h = Object.assign(fresh(true), r.data); h._id = r.id; saved.set(r.id, JSON.stringify(strip(h))); return h; });
    WARDS = org.wards && org.wards.length ? org.wards : [];
    TOKENS.add(org.name);
    const meta = u.user_metadata || {};
    user = { id: u.id, email: u.email, name: meta.first_name || u.email.split("@")[0], households: H,
      pro: { org: org.name, orgId: m.org_id, role: m.job_title || (m.role === "admin" ? "Team admin" : "Team member"), admin: m.role === "admin" } };
    setAcct();
    return true;
  }
  async function joinOrg(code, jobTitle) {
    const r = await fetch("/api/join-org", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() }, body: JSON.stringify({ code, jobTitle }) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    return { ok: r.ok, error: j.error || "Sorry, that didn't work. Please try again." };
  }

  async function loadUser(u) {
    if (await loadOrg(u)) return;
    const meta = u.user_metadata || {};
    const { data: rows, error } = await sb.from("households").select("id,data").is("org_id", null).order("created_at");
    if (error) { console.error(error); say("We couldn't load your plans. Please refresh."); return; }
    const { data: buys } = await sb.from("purchases").select("household_id,product");
    const paid = new Set((buys || []).filter(b => b.product === "book_digital").map(b => b.household_id));
    const fromDb = (rows || []).map(r => { const h = Object.assign(fresh(r.data.other), r.data); h._id = r.id; h.paid = paid.has(r.id); saved.set(r.id, JSON.stringify(strip(h))); return h; });
    const pending = H.filter(h => !h._id); // a check finished before signing in
    H = fromDb.concat(pending);
    user = { id: u.id, email: u.email, name: meta.first_name || u.email.split("@")[0], households: H, remind: !!meta.remind_emails };
    setAcct();
    await saveAll();
  }

  async function saveAll() {
    if (!user || !sb || saving || user.sample) return;
    saving = true;
    const org = user.pro && user.pro.orgId;
    try {
      for (const h of H) {
        const body = JSON.stringify(strip(h));
        if (!h._id) {
          const row = org ? { org_id: org, user_id: null, created_by: user.id, updated_by: user.id, data: strip(h), lang: h.lang || "en" }
                          : { user_id: user.id, data: strip(h), lang: h.lang || "en" };
          const { data, error } = await sb.from("households").insert(row).select("id").single();
          if (!error) { h._id = data.id; saved.set(h._id, body); } else console.error(error);
        } else if (saved.get(h._id) !== body) {
          const ch = { data: strip(h), lang: h.lang || "en", updated_at: new Date().toISOString() };
          if (org) ch.updated_by = user.id;
          const { error } = await sb.from("households").update(ch).eq("id", h._id);
          if (!error) saved.set(h._id, body); else console.error(error);
        }
      }
      if (org) await flushEvents(org);
    } finally { saving = false; }
  }

  // Case history: who created, visited, checked or deleted each resident's plan.
  window.caseEvent = function (action, h) {
    if (!user || !user.pro || !user.pro.orgId) return;
    if (action === "deleted") {
      const id = h._id;
      if (id) sb.from("households").delete().eq("id", id).then(({ error }) => { if (error) { console.error(error); say("That plan couldn't be deleted. Please try again."); } else saved.delete(id); });
      events.push({ h: null, ref: h.ref, action });
    } else events.push({ h, ref: h.ref, action });
    setTimeout(saveAll, 50);
  };
  async function flushEvents(org) {
    const ready = events.filter(e => !e.h || e.h._id);
    if (!ready.length) return;
    const { error } = await sb.from("case_events").insert(ready.map(e => ({ household_id: e.h ? e.h._id : null, org_id: org, user_id: user.id, action: e.action, ref: e.ref })));
    if (!error) events = events.filter(e => !ready.includes(e)); else console.error(error);
  }

  // ---------- accounts ----------
  window.submitAuth = async function (e, mode) {
    e.preventDefault();
    const email = document.getElementById("a-email").value.trim().toLowerCase(), pw = document.getElementById("a-pw").value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errBox("Enter an email address like name@example.com.");
    const btn = e.target.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
    try {
      if (mode === "signup") {
        const name = document.getElementById("a-name").value.trim();
        if (!name) return errBox("Enter your first name.");
        if (pw.length < 8) return errBox("Use at least 8 characters for your password.");
        const news = document.getElementById("a-news").checked, remind = document.getElementById("a-remind").checked;
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { first_name: name, weekly_emails: news, remind_emails: remind } } });
        if (error) return errBox(/registered|exists/i.test(error.message) ? "There's already an account with that email. Sign in instead." : error.message);
        if (!data.session) return errBox("Check your email and click the link to confirm your account, then sign in.");
        await loadUser(data.user);
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) return errBox("That email and password don't match an account.");
        await loadUser(data.user);
      }
      view = 0; homeView(); return false;
    } finally { if (btn) btn.disabled = false; }
  };

  // ---------- Fettle for Communities: join a team with an invite code ----------
  window.proAuth = function () {
    go("auth");
    document.getElementById("authbox").innerHTML = `
     <p class="kicker"><span>Fettle for Communities</span> For councils, housing providers and support teams</p>
     <h1 class="qtitle">Join your team</h1>
     <p class="mute">Your team lead will have sent you an invite code. Use your work email.</p>
     <form onsubmit="return liveJoin(event)" novalidate>
      <label for="j-code">Invite code <span class="hint">From your team lead</span></label><input class="txt" id="j-code" autocomplete="off" autocapitalize="characters" spellcheck="false">
      <label for="j-name">Your first name</label><input class="txt" id="j-name" autocomplete="given-name">
      <label for="j-email">Work email</label><input class="txt" id="j-email" type="email" autocomplete="email">
      <label for="j-role">Your role</label><select class="txt" id="j-role">${ROLES.map(r => `<option>${r}</option>`).join("")}</select>
      <label for="j-pw">Password <span class="hint">At least 8 characters</span></label><input class="txt" id="j-pw" type="password" autocomplete="new-password">
      <p class="err" id="a-err" role="alert"></p>
      <button class="btn full" type="submit">Join my team</button>
     </form>
     <p class="switch">Already joined? <button class="linkbtn" onclick="authView('signin')">Sign in</button></p>
     <div class="pcard" style="margin-top:20px"><h3>Not set up yet?</h3><p class="sm mute">During pilots we set up each organisation with you. Email hello@fettle.example. Or open a sample caseload of 34 made-up households.</p><button class="btn quiet full" onclick="proSample()">Open the sample caseload</button></div>`;
  };
  window.liveJoin = async function (e) {
    e.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const code = v("j-code").toUpperCase().replace(/[^A-Z0-9]/g, ""), name = v("j-name"), email = v("j-email").toLowerCase(), pw = document.getElementById("j-pw").value, jobTitle = v("j-role");
    if (code.length !== 8) return errBox("Enter the 8-character invite code from your team lead.");
    if (!name) return errBox("Enter your first name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errBox("Enter an email address like name@example.org.");
    if (pw.length < 8) return errBox("Use at least 8 characters for your password.");
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      let { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { first_name: name, weekly_emails: false, remind_emails: false } } });
      if (error && /registered|exists/i.test(error.message)) ({ data, error } = await sb.auth.signInWithPassword({ email, password: pw }));
      if (error) return errBox(/credentials|password/i.test(error.message) ? "There's already an account with that email, and that password doesn't match it." : error.message);
      if (!data.session) { // email confirmation is on: join once they've confirmed and signed in
        localStorage.setItem("fettle_join", JSON.stringify({ code, jobTitle }));
        return errBox("Check your email and click the link to confirm your account, then sign in. You'll join your team then.");
      }
      const r = await joinOrg(code, jobTitle);
      if (!r.ok) return errBox(r.error);
      await loadUser(data.user); proView(); say("Welcome to " + user.pro.org + ".");
      return false;
    } finally { btn.disabled = false; }
  };

  // Admins: invite a colleague.
  const baseProView = window.proView;
  window.proView = function () {
    baseProView();
    const box = document.getElementById("homebox");
    if (!isPro() || user.sample || !box) return;
    const slot = document.getElementById("pro-extra");
    if (user.pro.admin && slot) slot.innerHTML = `<div class="pcard" id="invite-card"><h3>Invite a colleague</h3>
      <p class="sm mute">Make a code for each person. It works once and lasts 14 days. Add their work email to lock the code to them.</p>
      <label for="i-email" style="display:block;font-weight:700;font-size:1rem;margin:12px 0 6px">Their work email <span class="mute" style="font-weight:400;font-size:.9rem">Optional</span></label><input class="txt" id="i-email" type="email" autocomplete="off">
      <label class="sm" style="display:flex;gap:10px;align-items:flex-start;font-weight:400;margin:10px 0"><input type="checkbox" id="i-admin" style="width:20px;height:20px;margin-top:2px;accent-color:var(--brand)"><span>They can invite people too (team admin)</span></label>
      <p class="err" id="i-err" role="alert"></p>
      <button class="btn small" onclick="liveInvite()">Make an invite code</button><div id="i-out"></div></div>`;
    box.insertAdjacentHTML("beforeend", `<p class="sm mute" style="margin-top:28px;text-align:center">Residents' plans belong to ${esc(user.pro.org)}, not to your account. If you leave, they stay with your team.</p>`);
  };
  window.liveInvite = async function () {
    const email = document.getElementById("i-email").value.trim(), out = document.getElementById("i-out"), err = document.getElementById("i-err");
    err.textContent = "";
    const r = await fetch("/api/org-invite", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token() }, body: JSON.stringify({ email: email || null, role: document.getElementById("i-admin").checked ? "admin" : "worker" }) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { err.textContent = j.error || "Sorry, that didn't work. Please try again."; return; }
    const link = location.origin + "/?join=" + j.code; TOKENS.add(j.code); TOKENS.add(link); if (email) TOKENS.add(email);
    out.innerHTML = `<div class="script" style="margin-top:12px"><p class="sm" style="margin:0 0 6px">Send this code to your colleague:</p><p style="font-size:1.6rem;letter-spacing:.08em;margin:0"><b id="i-code">${esc(j.code)}</b></p><p class="sm mute" style="margin:6px 0 0">Or send them this link, which fills the code in:</p><p class="sm" id="i-link" style="word-break:break-all;margin:2px 0 0">${esc(link)}</p></div>`;
  };

  const baseSignOut = window.signOut;
  window.signOut = async function () { await saveAll(); if (sb) await sb.auth.signOut(); saved.clear(); events = []; WARDS = []; baseSignOut(); };

  window.liveReset = function () {
    go("auth");
    document.getElementById("authbox").innerHTML = `<h1 class="qtitle">Reset your password</h1>
      <form onsubmit="return liveResetSend(event)" novalidate><label for="r-email">Email address</label><input class="txt" id="r-email" type="email" autocomplete="email">
      <p class="err" id="a-err" role="alert"></p><button class="btn full" type="submit">Send me a reset link</button></form>
      <p class="switch"><button class="linkbtn" onclick="authView('signin')">Back to sign in</button></p>`;
  };
  window.liveResetSend = async function (e) {
    e.preventDefault();
    const email = document.getElementById("r-email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errBox("Enter an email address like name@example.com.");
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/" });
    errBox("If there's an account with that email, we've sent a link. Check your inbox.");
    return false;
  };
  function newPasswordView() {
    go("auth");
    document.getElementById("authbox").innerHTML = `<h1 class="qtitle">Choose a new password</h1>
      <form onsubmit="return liveNewPw(event)" novalidate><label for="n-pw">New password <span class="hint">At least 8 characters</span></label><input class="txt" id="n-pw" type="password" autocomplete="new-password">
      <p class="err" id="a-err" role="alert"></p><button class="btn full" type="submit">Save password</button></form>`;
  }
  window.liveNewPw = async function (e) {
    e.preventDefault();
    const pw = document.getElementById("n-pw").value;
    if (pw.length < 8) return errBox("Use at least 8 characters for your password.");
    const { data, error } = await sb.auth.updateUser({ password: pw });
    if (error) return errBox(error.message);
    await loadUser(data.user); homeView(); say("Password changed.");
    return false;
  };

  // Delete account (UK GDPR right to erasure). Purchases are kept without your name for tax records.
  const baseHome = window.homeView;
  window.homeView = function () {
    baseHome();
    const box = document.getElementById("homebox");
    if (user && !user.pro && box && !document.getElementById("del-acct")) {
      box.insertAdjacentHTML("beforeend", `<div class="pcard"><label style="display:flex;gap:10px;align-items:flex-start;font-weight:400;margin:0"><input type="checkbox" id="remind-t" ${user.remind ? "checked" : ""} onchange="liveRemind(this.checked)" style="width:20px;height:20px;margin-top:3px;accent-color:var(--brand)"><span><b>Check-in reminders</b><br><span class="sm mute">An email when your 30-day and 90-day checks are due, then one a season.</span></span></label></div>`);
      box.insertAdjacentHTML("beforeend", `<p class="sm mute" style="margin-top:34px;text-align:center"><button class="linkbtn" id="del-acct" onclick="liveDelete()">Delete my account and plans</button></p>`);
    }
  };
  window.liveRemind = async function (on) {
    const { error } = await sb.auth.updateUser({ data: { remind_emails: on } });
    if (error) { say("Sorry, that didn't save. Please try again."); return; }
    user.remind = on; say(on ? "Reminders on." : "Reminders off.");
  };
  window.liveDelete = async function () {
    go("auth");
    document.getElementById("authbox").innerHTML = `<h1 class="qtitle">Delete your account?</h1>
      <p>This permanently deletes your account and every plan in it, including health answers. It can't be undone. Download any books you want to keep first.</p>
      <p class="err" id="a-err" role="alert"></p>
      <div class="navq"><button class="btn quiet" onclick="homeView()">Keep my account</button><button class="btn" onclick="liveDeleteNow()">Delete everything</button></div>`;
  };
  window.liveDeleteNow = async function () {
    const { data } = await sb.auth.getSession();
    const r = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: "Bearer " + data.session.access_token } });
    if (!r.ok) return errBox("Sorry, that didn't work. Email us and we'll delete it for you.");
    await sb.auth.signOut(); saved.clear(); baseSignOut(); say("Your account and plans have been deleted.");
  };

  // ---------- payment ----------
  window.liveCheckout = async function (h) {
    if (!user) { authView("signup", true); return; }
    await saveAll();
    if (!h._id) { say("We couldn't save your plan. Please try again."); go("r"); render(); return; }
    const { data } = await sb.auth.getSession();
    say("Taking you to secure payment…");
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token }, body: JSON.stringify({ householdId: h._id, product: "book_digital" }) });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || "Payment setup failed");
      location.href = j.url;
    } catch (e) { say("Sorry, payment isn't working right now. Your plan is saved. Please try again later."); view = H.indexOf(h); go("r"); render(); }
  };

  async function handleReturn() {
    const q = new URLSearchParams(location.search), st = q.get("checkout"), hh = q.get("hh");
    if (!st) return;
    history.replaceState(null, "", location.pathname);
    if (!user) return;
    const i = H.findIndex(h => h._id === hh); if (i < 0) return;
    view = i;
    if (st === "cancelled") { go("r"); render(); say("Payment cancelled. Your plan is saved."); return; }
    say("Payment received. Getting your book ready…");
    for (let n = 0; n < 12 && !H[i].paid; n++) { // the Stripe webhook usually lands within a few seconds
      await new Promise(r => setTimeout(r, 1500));
      const { data } = await sb.from("purchases").select("id").eq("household_id", hh).eq("product", "book_digital").limit(1);
      if (data && data.length) H[i].paid = true;
    }
    if (H[i].paid) openBook();
    else { go("r"); render(); say("Your payment went through. Your book will unlock in a minute: refresh this page."); }
  }

  boot();
})();
