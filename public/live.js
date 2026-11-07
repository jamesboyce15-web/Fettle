/* Fettle live layer.
   Loaded after the main app script. When config.js has Supabase details, this file replaces the
   in-memory prototype accounts with real ones (Supabase Auth), saves plans to the database, and
   takes payment for the £5 digital book through Stripe Checkout (via /api/checkout).
   Paid status comes only from the purchases table, which only the Stripe webhook can write. */
(function () {
  if (!window.FETTLE_CONFIG || !window.FETTLE_CONFIG.supabaseUrl) return; // prototype mode
  const CFG = window.FETTLE_CONFIG;
  let sb = null, saved = new Map(), saving = false;

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
    setInterval(saveAll, 4000);
    addEventListener("pagehide", saveAll);
  }

  async function loadUser(u) {
    const meta = u.user_metadata || {};
    const { data: rows, error } = await sb.from("households").select("id,data").order("created_at");
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
    if (!user || !sb || saving || (user.pro)) return;
    saving = true;
    try {
      for (const h of H) {
        const body = JSON.stringify(strip(h));
        if (!h._id) {
          const { data, error } = await sb.from("households").insert({ user_id: user.id, data: strip(h), lang: h.lang || "en" }).select("id").single();
          if (!error) { h._id = data.id; saved.set(h._id, body); } else console.error(error);
        } else if (saved.get(h._id) !== body) {
          const { error } = await sb.from("households").update({ data: strip(h), lang: h.lang || "en", updated_at: new Date().toISOString() }).eq("id", h._id);
          if (!error) saved.set(h._id, body); else console.error(error);
        }
      }
    } finally { saving = false; }
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

  const baseSignOut = window.signOut;
  window.signOut = async function () { await saveAll(); if (sb) await sb.auth.signOut(); saved.clear(); baseSignOut(); };

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
