// Test double for supabase-js. Stores everything in localStorage so it survives page loads.
(function () {
  const L = k => JSON.parse(localStorage.getItem("fake_" + k) || "null"), S = (k, v) => localStorage.setItem("fake_" + k, JSON.stringify(v));
  const db = () => L("db") || { users: [], households: [], purchases: [] }, save = d => S("db", d);
  const uid = () => crypto.randomUUID();
  const q = new URLSearchParams(location.search);
  if (q.get("fake_pay") && q.get("hh")) setTimeout(() => { const d = db(), h = d.households.find(x => x.id === q.get("hh")); if (h) { d.purchases.push({ id: uid(), user_id: h.user_id, household_id: h.id, product: "book_digital" }); save(d); } }, 1200);
  function builder(table) {
    const st = { filters: [], op: "select", row: null, single: false };
    const me = () => { const s = L("session"); return s && s.user.id; };
    const run = () => {
      const d = db(); let rows = d[table].filter(r => r.user_id === me());
      st.filters.forEach(([k, v]) => rows = rows.filter(r => String(r[k]) === String(v)));
      if (st.op === "insert") { const r = Object.assign({ id: uid(), created_at: new Date().toISOString() }, st.row); if (r.user_id !== me()) return { data: null, error: { message: "rls" } }; d[table].push(r); save(d); return { data: st.single ? { id: r.id } : [r], error: null }; }
      if (st.op === "update") { rows.forEach(r => Object.assign(r, st.row)); save(d); return { data: null, error: null }; }
      return { data: rows, error: null };
    };
    const b = { select() { return b; }, order() { return b; }, limit() { return b; }, eq(k, v) { st.filters.push([k, v]); return b; },
      insert(row) { st.op = "insert"; st.row = row; return b; }, update(row) { st.op = "update"; st.row = row; return b; }, single() { st.single = true; return b; },
      then(ok, bad) { return Promise.resolve(run()).then(ok, bad); } };
    return b;
  }
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
