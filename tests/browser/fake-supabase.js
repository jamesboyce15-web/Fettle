// Test double for supabase-js. Stores everything in localStorage so it survives page loads.
// Emulates the row level security in schema.sql and communities.sql, and the two Communities server
// functions (/api/join-org, /api/org-invite), so the browser tests exercise the same rules. Also family.sql: shared plans, invites and members.
// Two people in one browser: set sessionStorage "fake_tab" before the page loads and each tab keeps its own sign-in.
(function () {
  const L = k => JSON.parse(localStorage.getItem("fake_" + k) || "null"), S = (k, v) => localStorage.setItem("fake_" + k, JSON.stringify(v));
  const blank = () => ({ users: [], households: [], purchases: [], organisations: [], org_members: [], org_invites: [], case_events: [], anon_checks: [], fettle_events: [], household_members: [], household_invites: [] });
  const db = () => Object.assign(blank(), L("db") || {}), save = d => S("db", d);
  const uid = () => crypto.randomUUID();
  const TAB = (() => { try { return !!sessionStorage.getItem("fake_tab"); } catch (e) { return false; } })();
  const SL = k => TAB ? JSON.parse(sessionStorage.getItem("fake_" + k) || "null") : L(k), SS = (k, v) => TAB ? sessionStorage.setItem("fake_" + k, JSON.stringify(v)) : S(k, v);
  const me = () => { const s = SL("session"); return s && s.user.id; };
  const fam = (d, hid) => d.household_members.some(m => m.household_id === hid && m.user_id === me());
  const owns = (d, hid) => d.households.some(h => h.id === hid && h.user_id === me() && !h.org_id);
  const member = (d, org) => d.org_members.some(m => m.org_id === org && m.user_id === me());
  const q = new URLSearchParams(location.search);
  if (q.get("fake_pay") && q.get("hh")) setTimeout(() => { const d = db(), h = d.households.find(x => x.id === q.get("hh")); if (h) { d.purchases.push({ id: uid(), user_id: h.user_id, household_id: h.id, product: "book_digital" }); save(d); } }, 1200);

  const CAN_SEE = {
    households: (d, r) => r.org_id ? member(d, r.org_id) : (r.user_id === me() || fam(d, r.id)),
    household_members: (d, r) => r.user_id === me() || fam(d, r.household_id) || owns(d, r.household_id),
    household_invites: () => false,
    purchases: (d, r) => r.user_id === me(),
    organisations: (d, r) => member(d, r.id),
    org_members: (d, r) => r.user_id === me() || member(d, r.org_id),
    case_events: (d, r) => member(d, r.org_id),
    org_invites: () => false,
    anon_checks: () => false, fettle_events: () => false, // insert-only
  };
  const CAN_ADD = {
    households: (d, r) => r.org_id ? (r.user_id == null && r.created_by === me() && member(d, r.org_id)) : r.user_id === me(),
    purchases: () => false, organisations: () => false, household_members: () => false, household_invites: () => false, org_members: () => false, org_invites: () => false,
    case_events: (d, r) => member(d, r.org_id) && r.user_id === me(),
    anon_checks: (d, r) => !!r.area && !r.user_id, fettle_events: (d, r) => ["check_started", "check_finished", "tool_calc", "tool_local", "tool_local_found", "tool_remind", "remind_signup", "tool_flood", "tool_flood_found", "reg_join", "checkin_fine", "checkin_maybe", "checkin_now", "family_circle", "family_checkin", "connect_open", "connect_yes", "connect_maybe", "connect_no", "connect_landing", "connect_book", "connect_emergency", "connect_recover", "alerts_on"].includes(r.kind) && (r.src === undefined || /^[a-z0-9-]{1,20}$/.test(r.src)),
  };
  function builder(table) {
    const st = { filters: [], op: "select", row: null, single: false };
    const run = () => {
      const d = db(); let rows = d[table].filter(r => CAN_SEE[table](d, r));
      st.filters.forEach(([k, v]) => rows = rows.filter(r => Array.isArray(v) ? v.map(String).includes(String(r[k])) : v === null ? r[k] == null : String(r[k]) === String(v)));
      if (st.op === "insert") {
        const list = (Array.isArray(st.row) ? st.row : [st.row]).map(x => Object.assign({ id: uid(), created_at: new Date().toISOString() }, x));
        if (!list.every(r => CAN_ADD[table](d, r))) return { data: null, error: { message: "new row violates row-level security policy" } };
        d[table].push(...list); save(d); return { data: st.single ? { id: list[0].id } : list, error: null };
      }
      if (st.op === "update") {
        if (table === "households" && rows.some(r => r.org_id && st.row.user_id)) return { data: null, error: { message: "rls" } };
        if (table === "households" && rows.some(r => "user_id" in st.row && st.row.user_id !== r.user_id)) return { data: null, error: { message: "A plan's owner can't be changed" } };
        rows.forEach(r => Object.assign(r, st.row)); save(d); return { data: null, error: null };
      }
      if (st.op === "delete" && table === "household_members") rows = rows.filter(r => r.user_id === me() || owns(d, r.household_id));
      if (st.op === "delete") { const ids = new Set(rows.map(r => r.id)); d[table] = d[table].filter(r => !ids.has(r.id)); save(d); return { data: null, error: null }; }
      if (st.single) return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
      return { data: rows, error: null };
    };
    const b = { select() { return b; }, order() { return b; }, limit() { return b; },
      eq(k, v) { st.filters.push([k, v]); return b; }, is(k, v) { st.filters.push([k, v]); return b; }, in(k, v) { st.filters.push([k, v]); return b; },
      insert(row) { st.op = "insert"; st.row = row; return b; }, update(row) { st.op = "update"; st.row = row; return b; },
      delete() { st.op = "delete"; return b; }, single() { st.single = true; return b; },
      then(ok, bad) { return Promise.resolve(run()).then(ok, bad); } };
    return b;
  }

  // Fake server functions for Communities.
  const realFetch = window.fetch.bind(window);
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  window.fetch = async function (url, init = {}) {
    const path = typeof url === "string" ? new URL(url, location.href).pathname : "";
    if (path !== "/api/join-org" && path !== "/api/org-invite") return realFetch(url, init);
    const d = db(), u = d.users.find(x => (init.headers || {}).Authorization === "Bearer tok_" + x.id);
    if (!u) return reply(401, { error: "Please sign in again." });
    const body = JSON.parse(init.body || "{}");
    if (path === "/api/join-org") {
      const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^(.{4})(.{4})$/, "$1-$2");
      if (d.org_members.some(m => m.user_id === u.id)) return reply(409, { error: "Your account is already part of an organisation." });
      const inv = d.org_invites.find(i => i.code === code);
      if (!inv || inv.used_at) return reply(400, { error: "That code isn't valid. It may have been used already or expired. Ask for a new one." });
      inv.used_at = new Date().toISOString(); inv.used_by = u.id;
      d.org_members.push({ org_id: inv.org_id, user_id: u.id, role: inv.role, job_title: body.jobTitle || null }); save(d);
      return reply(200, { orgId: inv.org_id, role: inv.role });
    }
    const m = d.org_members.find(x => x.user_id === u.id && x.role === "admin");
    if (!m) return reply(403, { error: "Only an admin for your organisation can invite colleagues." });
    const code = "TEST-" + String(d.org_invites.length + 1).padStart(4, "0");
    d.org_invites.push({ code, org_id: m.org_id, role: body.role === "admin" ? "admin" : "worker", email: body.email || null }); save(d);
    return reply(200, { code, role: "worker", expiresInDays: 14 });
  };

  window.fakeClickLink = () => { const o = L("otp"), u = db().users.find(x => x.email === o.email); SS("session", { access_token: "tok_" + u.id, user: u }); return o.to; };
  // family.sql server functions
  const RPC = {
    create_household_invite({ p_household }) { const d = db(); if (!me()) return [null, "Sign in first"];
      const h = d.households.find(x => x.id === p_household && !x.org_id && (x.user_id === me() || fam(d, x.id))); if (!h) return [null, "You can't share that plan"];
      const tok = uid().replace(/-/g, ""); d.household_invites.push({ token: tok, household_id: h.id, created_by: me(), expires_at: Date.now() + 14 * 864e5, uses: 0 }); save(d); return [tok]; },
    accept_household_invite({ p_token }) { const d = db(); if (!me()) return [null, "Sign in first"];
      const inv = d.household_invites.find(i => i.token === p_token && i.expires_at > Date.now()); if (!inv) return [null, "This invite has expired. Ask for a new link"];
      if (d.households.some(h => h.id === inv.household_id && h.user_id === me())) return [inv.household_id];
      if (d.household_members.filter(m => m.household_id === inv.household_id).length >= 10) return [null, "This plan already has 10 people in it"];
      const u = d.users.find(x => x.id === me());
      if (!fam(d, inv.household_id)) d.household_members.push({ household_id: inv.household_id, user_id: me(), name: ((u.user_metadata || {}).first_name || "").slice(0, 60), added_at: new Date().toISOString() });
      inv.uses++; save(d); return [inv.household_id]; },
    fettle_recent_checkins() { return [null]; },
  };
  window.fakeUser = email => db().users.find(x => x.email === email);
  window.supabase = { createClient() {
    const sess = () => SL("session");
    return {
      auth: {
        async getSession() { return { data: { session: sess() } }; },
        onAuthStateChange() {},
        async signUp({ email, password, options }) { const d = db(); if (d.users.find(u => u.email === email)) return { data: {}, error: { message: "User already registered" } }; const u = { id: uid(), email, user_metadata: options.data, pw: password }; d.users.push(u); save(d);
          if (localStorage.getItem("fake_confirm")) { S("otp", { email, to: "/" }); return { data: { user: u, session: null }, error: null }; } // "Confirm email" switched on, as live
          const s = { access_token: "tok_" + u.id, user: u }; SS("session", s); return { data: { user: u, session: s }, error: null }; },
        async signInWithPassword({ email, password }) { const u = db().users.find(u => u.email === email && u.pw === password); if (!u) return { data: {}, error: { message: "Invalid login credentials" } }; const s = { access_token: "tok_" + u.id, user: u }; SS("session", s); return { data: { user: u, session: s }, error: null }; },
        async signOut() { localStorage.removeItem("fake_session"); try { sessionStorage.removeItem("fake_session"); } catch (e) {} return {}; },
        async resetPasswordForEmail() { return {}; },
        // Sign-in link: creates the account if new (with options.data as metadata) and remembers the link. The test "clicks" it with window.fakeClickLink().
        async signInWithOtp({ email, options }) { const d = db(); let u = d.users.find(x => x.email === email); if (!u) { u = { id: uid(), email, user_metadata: options.data || {}, pw: null }; d.users.push(u); save(d); } S("otp", { email, to: options.emailRedirectTo }); return { data: {}, error: null }; },
        async updateUser({ data } = {}) { const s = sess(); if (data) { const d = db(), u = d.users.find(x => x.id === s.user.id); if (u) { u.user_metadata = Object.assign({}, u.user_metadata, data); save(d); s.user = u; SS("session", s); } } return { data: { user: s.user }, error: null }; },
      },
      from: builder,
      async rpc(name, args) { const f = RPC[name]; if (!f) return { data: null, error: { message: "Could not find the function " + name + " in the schema cache" } }; const [data, err] = f(args || {}); return { data: data ?? null, error: err ? { message: err } : null }; },
    };
  } };
})();
