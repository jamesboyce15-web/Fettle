// Test double for supabase-js. Stores everything in localStorage so it survives page loads.
// Emulates the row level security in schema.sql and communities.sql, and the two Communities server
// functions (/api/join-org, /api/org-invite), so the browser tests exercise the same rules.
(function () {
  const L = k => JSON.parse(localStorage.getItem("fake_" + k) || "null"), S = (k, v) => localStorage.setItem("fake_" + k, JSON.stringify(v));
  const blank = () => ({ users: [], households: [], purchases: [], organisations: [], org_members: [], org_invites: [], case_events: [], anon_checks: [], fettle_events: [] });
  const db = () => Object.assign(blank(), L("db") || {}), save = d => S("db", d);
  const uid = () => crypto.randomUUID();
  const me = () => { const s = L("session"); return s && s.user.id; };
  const member = (d, org) => d.org_members.some(m => m.org_id === org && m.user_id === me());
  const q = new URLSearchParams(location.search);
  if (q.get("fake_pay") && q.get("hh")) setTimeout(() => { const d = db(), h = d.households.find(x => x.id === q.get("hh")); if (h) { d.purchases.push({ id: uid(), user_id: h.user_id, household_id: h.id, product: "book_digital" }); save(d); } }, 1200);

  const CAN_SEE = {
    households: (d, r) => r.org_id ? member(d, r.org_id) : r.user_id === me(),
    purchases: (d, r) => r.user_id === me(),
    organisations: (d, r) => member(d, r.id),
    org_members: (d, r) => r.user_id === me() || member(d, r.org_id),
    case_events: (d, r) => member(d, r.org_id),
    org_invites: () => false,
    anon_checks: () => false, fettle_events: () => false, // insert-only
  };
  const CAN_ADD = {
    households: (d, r) => r.org_id ? (r.user_id == null && r.created_by === me() && member(d, r.org_id)) : r.user_id === me(),
    purchases: () => false, organisations: () => false, org_members: () => false, org_invites: () => false,
    case_events: (d, r) => member(d, r.org_id) && r.user_id === me(),
    anon_checks: (d, r) => !!r.area && !r.user_id, fettle_events: (d, r) => ["check_started", "check_finished"].includes(r.kind),
  };
  function builder(table) {
    const st = { filters: [], op: "select", row: null, single: false };
    const run = () => {
      const d = db(); let rows = d[table].filter(r => CAN_SEE[table](d, r));
      st.filters.forEach(([k, v]) => rows = rows.filter(r => v === null ? r[k] == null : String(r[k]) === String(v)));
      if (st.op === "insert") {
        const list = (Array.isArray(st.row) ? st.row : [st.row]).map(x => Object.assign({ id: uid(), created_at: new Date().toISOString() }, x));
        if (!list.every(r => CAN_ADD[table](d, r))) return { data: null, error: { message: "new row violates row-level security policy" } };
        d[table].push(...list); save(d); return { data: st.single ? { id: list[0].id } : list, error: null };
      }
      if (st.op === "update") {
        if (table === "households" && rows.some(r => r.org_id && st.row.user_id)) return { data: null, error: { message: "rls" } };
        rows.forEach(r => Object.assign(r, st.row)); save(d); return { data: null, error: null };
      }
      if (st.op === "delete") { const ids = new Set(rows.map(r => r.id)); d[table] = d[table].filter(r => !ids.has(r.id)); save(d); return { data: null, error: null }; }
      return { data: rows, error: null };
    };
    const b = { select() { return b; }, order() { return b; }, limit() { return b; },
      eq(k, v) { st.filters.push([k, v]); return b; }, is(k, v) { st.filters.push([k, v]); return b; },
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

  window.supabase = { createClient() {
    const sess = () => L("session");
    return {
      auth: {
        async getSession() { return { data: { session: sess() } }; },
        onAuthStateChange() {},
        async signUp({ email, password, options }) { const d = db(); if (d.users.find(u => u.email === email)) return { data: {}, error: { message: "User already registered" } }; const u = { id: uid(), email, user_metadata: options.data, pw: password }; d.users.push(u); save(d); const s = { access_token: "tok_" + u.id, user: u }; S("session", s); return { data: { user: u, session: s }, error: null }; },
        async signInWithPassword({ email, password }) { const u = db().users.find(u => u.email === email && u.pw === password); if (!u) return { data: {}, error: { message: "Invalid login credentials" } }; const s = { access_token: "tok_" + u.id, user: u }; S("session", s); return { data: { user: u, session: s }, error: null }; },
        async signOut() { localStorage.removeItem("fake_session"); return {}; },
        async resetPasswordForEmail() { return {}; }, async updateUser() { return { data: { user: sess().user } }; },
      },
      from: builder,
    };
  } };
})();
