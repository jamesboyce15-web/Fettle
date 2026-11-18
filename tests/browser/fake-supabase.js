// Test double for supabase-js. Stores everything in localStorage so it survives page loads.
// Emulates the row level security in schema.sql and communities.sql, and the two Communities server
// functions (/api/join-org, /api/org-invite), so the browser tests exercise the same rules. Also family.sql: shared plans, invites and members.
// Two people in one browser: set sessionStorage "fake_tab" before the page loads and each tab keeps its own sign-in.
(function () {
  const L = k => JSON.parse(localStorage.getItem("fake_" + k) || "null"), S = (k, v) => localStorage.setItem("fake_" + k, JSON.stringify(v));
  const blank = () => ({ users: [], households: [], purchases: [], subscriptions: [], organisations: [], org_members: [], org_invites: [], case_events: [], anon_checks: [], fettle_events: [], household_members: [], household_invites: [], communities: [], community_admins: [], community_members: [], community_requests: [] });
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
    subscriptions: (d, r) => r.user_id === me(),
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
    anon_checks: (d, r) => !!r.area && !r.user_id, fettle_events: (d, r) => ["check_started", "check_finished", "tool_calc", "tool_local", "tool_local_found", "tool_remind", "remind_signup", "tool_flood", "tool_flood_found", "reg_join", "checkin_fine", "checkin_maybe", "checkin_now", "family_circle", "family_checkin", "connect_open", "connect_yes", "connect_maybe", "connect_no", "connect_landing", "connect_book", "connect_emergency", "connect_recover", "alerts_on", "community_start", "community_join", "community_ask", "community_newsletter"].includes(r.kind) && (r.src === undefined || /^[a-z0-9-]{1,20}$/.test(r.src)),
  };
  function builder(table) {
    const st = { filters: [], op: "select", row: null, single: false };
    const run = () => {
      const d = db(); d[table] = d[table] || []; let rows = d[table].filter(r => CAN_SEE[table](d, r));
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
      if (st.maybe) return { data: rows[0] || null, error: null };
      if (st.single) return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
      return { data: rows, error: null };
    };
    const b = { select() { return b; }, order() { return b; }, limit() { return b; },
      eq(k, v) { st.filters.push([k, v]); return b; }, is(k, v) { st.filters.push([k, v]); return b; }, in(k, v) { st.filters.push([k, v]); return b; },
      insert(row) { st.op = "insert"; st.row = row; return b; }, update(row) { st.op = "update"; st.row = row; return b; },
      delete() { st.op = "delete"; return b; }, single() { st.single = true; return b; }, maybeSingle() { st.maybe = true; return b; },
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
    // community.sql
    community_public({ p_slug }) { const c = (db().communities || []).find(x => x.slug === String(p_slug).toLowerCase()); return [c ? { slug: c.slug, name: c.name, kind: c.kind, area: c.area, info: c.info } : null]; },
    community_create({ p_slug, p_name, p_kind, p_area, p_admin_name }) { const d = db(); if (!me()) return [null, "Sign in first"];
      if (d.communities.some(x => x.slug === p_slug)) return [null, "That web address is taken. Try another"];
      const c = { id: uid(), slug: p_slug, name: p_name, kind: p_kind, area: p_area || null, info: {}, created_by: me() }; d.communities.push(c);
      d.community_admins.push({ community_id: c.id, user_id: me(), name: p_admin_name }); save(d); return [{ slug: c.slug, name: c.name, kind: c.kind, area: c.area, info: c.info }]; },
    community_mine() { const d = db(); return [d.communities.filter(c => d.community_admins.some(a => a.community_id === c.id && a.user_id === me())).map(c => ({ slug: c.slug, name: c.name, kind: c.kind, area: c.area, info: c.info }))]; },
    community_set_info({ p_slug, p_name, p_area, p_info }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c || !d.community_admins.some(a => a.community_id === c.id && a.user_id === me())) return [null, "Only this community's organisers can do that"]; Object.assign(c, { name: p_name || c.name, area: p_area || null, info: p_info }); save(d); return [null]; },
    community_share({ p_slug, p_token, p_data, p_named, p_contact }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c) return [null, "That community isn't on Fettle"];
      const m = d.community_members.find(x => x.token === p_token); if (!m) return [false];
      Object.assign(m, { community_id: c.id, data: p_data, named: p_named || null, contact: p_contact || null, updated_at: new Date().toISOString() }); save(d); return [true]; },
    // service role only (called by /api/community-join, which the page's fetch is routed to below)
    community_join({ p_slug, p_token, p_data, p_named, p_contact, p_net }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c) return ["missing"];
      const now = Date.now(), m = d.community_members.find(x => x.token === p_token);
      if (m) { Object.assign(m, { community_id: c.id, data: p_data, named: p_named || null, contact: p_contact || null, updated_at: new Date().toISOString() }); save(d); return ["ok"]; }
      d.community_join_log = (d.community_join_log || []).filter(x => now - Date.parse(x.at) < 2 * 864e5);
      if (d.community_join_log.filter(x => x.community_id === c.id && x.net === p_net && now - Date.parse(x.at) < 864e5).length >= 20) { save(d); return ["net"]; }
      if (d.community_members.filter(x => x.community_id === c.id && now - Date.parse(x.joined_at) < 36e5).length >= 150) return ["busy"];
      const at = new Date().toISOString(); d.community_join_log.push({ community_id: c.id, net: p_net, at });
      d.community_members.push({ token: p_token, community_id: c.id, data: p_data, named: p_named || null, contact: p_contact || null, updated_at: at, joined_at: at }); save(d); return ["ok"]; },
    community_flag({ p_slug, p_hours, p_note }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c || !d.community_admins.some(a => a.community_id === c.id && a.user_id === me())) return [null, "Only this community's organisers can do that"];
      if (![1, 24, 168].includes(p_hours)) return [null, "Choose a time"]; const since = Date.now() - p_hours * 36e5;
      const n = d.community_members.filter(m => m.community_id === c.id && Date.parse(m.joined_at) > since).length;
      (d.community_flags = d.community_flags || []).push({ id: uid(), community_id: c.id, flagged_by: me(), since: new Date(since).toISOString(), joins: n, note: p_note || null, status: "new", created_at: new Date().toISOString() }); save(d); return [n]; },
    community_leave({ p_token }) { const d = db(); d.community_members = d.community_members.filter(x => x.token !== p_token); d.community_requests = (d.community_requests || []).filter(x => x.token !== p_token); save(d); return [null]; },
    community_ask({ p_slug, p_token, p_need, p_note, p_named, p_contact }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c) return [null, "That community isn't on Fettle"];
      if (!d.community_members.some(m => m.token === p_token && m.community_id === c.id)) return [null, "Add your home to their totals first, then you can ask for help"];
      d.community_requests.push({ id: uid(), community_id: c.id, token: p_token, need: p_need, note: p_note || null, named: p_named || null, contact: p_contact || null, status: "new", created_at: new Date().toISOString() }); save(d); return [null]; },
    community_stats({ p_slug }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c || !d.community_admins.some(a => a.community_id === c.id && a.user_id === me())) return [null, "Only this community's organisers can see this"];
      const M = d.community_members.filter(x => x.community_id === c.id), n = M.length, now = Date.now(), ago = ms => M.filter(m => now - Date.parse(m.joined_at) < ms).length;
      const day = t => new Date(t).toISOString().slice(0, 10), days = [...Array(14)].map((_, i) => M.filter(m => day(m.joined_at) === day(now - (13 - i) * 864e5)).length);
      const fl = (d.community_flags || []).filter(f => f.community_id === c.id).slice(-1)[0];
      const joins = { h1: ago(36e5), d1: ago(864e5), d7: ago(7 * 864e5), days, flag: fl ? fl.status : null };
      if (n < 5) return [{ members: n, small: true, joins }];
      const hide = x => x >= 1 && x <= 2 ? null : x, ind = {};
      [...new Set(M.flatMap(m => Object.keys((m.data || {}).ind || {})))].forEach(k => { const A = M.filter(m => k in m.data.ind), has = A.filter(m => m.data.ind[k] === 1).length; ind[k] = { app: A.length, missing: hide(A.length - has) }; });
      const rk = k => hide(M.filter(m => m.data.risk && m.data.risk[k]).length);
      return [{ members: n, named: M.filter(m => m.named).length, ind, risk: { o70: rk("o70"), alone: rk("alone"), u5: rk("u5") }, requests: d.community_requests.filter(r => r.community_id === c.id && r.status === "new").length, joins }]; },
    community_people({ p_slug }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c || !d.community_admins.some(a => a.community_id === c.id && a.user_id === me())) return [null, "Only this community's organisers can see this"];
      return [d.community_members.filter(m => m.community_id === c.id && m.named).map(m => ({ named: m.named, contact: m.contact, risk: m.data.risk, missing: Object.entries(m.data.ind || {}).filter(([k, v]) => !v).map(([k]) => k) }))]; },
    community_requests_list({ p_slug }) { const d = db(), c = d.communities.find(x => x.slug === p_slug); if (!c || !d.community_admins.some(a => a.community_id === c.id && a.user_id === me())) return [null, "Only this community's organisers can see this"];
      return [d.community_requests.filter(r => r.community_id === c.id).map(r => ({ id: r.id, need: r.need, note: r.note, named: r.named, contact: r.contact, status: r.status, at: r.created_at }))]; },
    community_request_done({ p_id }) { const d = db(), r = d.community_requests.find(x => x.id === p_id); if (r && d.community_admins.some(a => a.community_id === r.community_id && a.user_id === me())) { r.status = "done"; save(d); } return [null]; },
  };
  window.fakeUser = email => db().users.find(x => x.email === email);
  // Stands in for functions/api/community-join.js: robot check passes unless window.__fakeRobot is false; the connection code is window.__fakeNet.
  const prevFetch = window.fetch;
  window.fetch = async (u, init) => { if (String(u).endsWith("/api/community-join")) { const b = JSON.parse(init.body);
      if (window.__fakeRobot === false) return new Response(JSON.stringify({ error: "We couldn't check this was a person. Please try again." }), { status: 403 });
      const [r] = RPC.community_join({ p_slug: b.slug, p_token: b.token, p_data: b.data, p_named: b.named, p_contact: b.contact, p_net: window.__fakeNet || "net-1" });
      const M = { missing: "We couldn't find that community.", net: "A lot of homes have joined from this internet connection today. Please try again tomorrow, or use mobile data.", busy: "Lots of homes are joining right now. Please try again in an hour." };
      return r === "ok" ? new Response('{"ok":true}', { status: 200 }) : new Response(JSON.stringify({ error: M[r] }), { status: 429 }); }
    return prevFetch(u, init); };
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
