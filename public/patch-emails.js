// Patch emails: every email Patch sends, in one place, so the wording can be read and approved in admin (Emails tab)
// before anything is sent. Each returns {subject, text, html}. The server sends them; admin only previews them.
(function (root) {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const BLUE = "#1f58a8", INK = "#14201b", MUTE = "#5a6660", LINE = "#dce2de";
  // A plain, readable layout that works in Gmail, Outlook and Apple Mail: one column, inline styles, no images.
  function shell(brand, preheader, body, footer) {
    return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(brand)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f3;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:14px">
<tr><td style="padding:22px 26px 0;font:700 20px Helvetica,Arial,sans-serif;color:${INK}">${esc(brand)}<span style="color:${BLUE}">.</span></td></tr>
<tr><td style="padding:14px 26px 24px;font-size:15px;line-height:1.55">${body}</td></tr></table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:${MUTE};margin:14px auto 0">${footer}</p></td></tr></table></body></html>`;
  }
  const button = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${esc(label)}</a></p>`;
  const first = name => String(name || "").trim().split(/\s+/)[0] || "there";

  // 1. When James has built an owner's free report.
  // o.sector: "salon" (the default) or "cafe".
  function reportReady(o) {
    const cafe = o.sector === "cafe", one = cafe ? "café" : "salon";
    const what = cafe ? `It shows how your prices, opening hours and hygiene rating compare with the 10 cafés nearest you, item by item, and where you could save on supplies or charge a little more and still be good value.`
      : `It shows how your prices compare with the 10 salons nearest you, service by service, and what we'd change first so you get picked more often when people search or ask an AI assistant for a salon near them.`;
    const subject = `Your Patch report for ${o.cafe}`;
    const offer = o.offer === false ? "" : `If you'd like to be found by AI too, with enquiries straight to your WhatsApp, there's a button at the end of the report. Setup is free and there's no contract.`;
    const text = `Hi ${first(o.name)},\n\nYour report for ${o.cafe} is ready. ${what}\n\nYour report: ${o.reportUrl}\n\nIt's private: no other ${one} sees your figures, so please don't share the link.${offer ? "\n\n" + offer : ""}\n\nIf anything looks wrong, just reply to this email.\n\n${o.from || "James"}\n${o.brand || "Patch"}`;
    const html = shell(o.brand || "Patch", `Your report for ${o.cafe} is ready`, `<p>Hi ${esc(first(o.name))},</p><p>Your report for <b>${esc(o.cafe)}</b> is ready. ${esc(what)}</p>
      ${button(o.reportUrl, "Open your report")}<p style="color:${MUTE};font-size:14px">It's private: no other ${one} sees your figures, so please don't share the link.</p>${offer ? `<p>${esc(offer)}</p>` : ""}<p>If anything looks wrong, just reply to this email.</p><p>${esc(o.from || "James")}<br>${esc(o.brand || "Patch")}</p>`,
      `You're getting this because you asked for a report on ${esc(o.cafe)}. We won't email you again about it unless you join.`);
    return { subject, text, html };
  }

  // 2. Monday morning, to owners who use Patch. Up to five things worth knowing this week.
  function weekly(o) {
    const items = (o.items || []).slice(0, 5);
    const subject = items[0] ? `This week at ${o.cafe}: ${items[0].t}` : `This week at ${o.cafe}`;
    const text = `Morning ${first(o.name)},\n\n` + items.map(i => `• ${i.t}\n  ${i.s}`).join("\n\n") + `\n\n${o.actions ? `${o.actions.n} action${o.actions.n === 1 ? "" : "s"} waiting${o.actions.value ? `, worth about £${o.actions.value.toLocaleString("en-GB")} a year` : ""}.\n\n` : ""}Open Patch: ${o.ownerUrl}\n\nStop these emails: ${o.unsubUrl}`;
    const tone = { good: "#2f7a4f", warn: "#875700", bad: "#b3261e" };
    const html = shell(o.brand || "Patch", items.map(i => i.t).join(" · "), `<p>Morning ${esc(first(o.name))},</p><p>Your week at <b>${esc(o.cafe)}</b>:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(i => `<tr><td style="padding:10px 0;border-top:1px solid ${LINE}"><b style="color:${tone[i.tone] || INK}">${esc(i.t)}</b><br><span style="color:${MUTE};font-size:14px">${esc(i.s)}</span></td></tr>`).join("")}</table>
      ${o.actions && o.actions.n ? `<p style="margin-top:16px">${o.actions.n} action${o.actions.n === 1 ? "" : "s"} waiting${o.actions.value ? `, worth about <b>£${o.actions.value.toLocaleString("en-GB")} a year</b>` : ""}.</p>` : ""}${button(o.ownerUrl, "Open Patch")}`,
      `The Monday email from ${esc(o.brand || "Patch")} for ${esc(o.cafe)}. <a href="${esc(o.unsubUrl)}" style="color:${MUTE}">Stop these emails</a>.`);
    return { subject, text, html };
  }

  // 3. To James each morning there's something new: report requests and founding-member interest.
  function adminDigest(o) {
    const reqs = o.requests || [], fnd = o.founding || [];
    const subject = `Patch: ${[reqs.length ? `${reqs.length} new report request${reqs.length > 1 ? "s" : ""}` : "", fnd.length ? `${fnd.length} want a founding place` : ""].filter(Boolean).join(", ")}`;
    const line = r => `${r.name} (${r.cafe || "place not picked"})${r.role ? ", " + r.role : ""}`;
    const text = (reqs.length ? `New report requests:\n${reqs.map(r => "• " + line(r)).join("\n")}\n\n` : "") + (fnd.length ? `Want a founding place:\n${fnd.map(r => "• " + line(r) + (r.message ? `: “${r.message}”` : "")).join("\n")}\n\n` : "") + `Admin: ${o.adminUrl}`;
    const html = shell("Patch", subject, `${reqs.length ? `<p><b>New report requests</b></p><ul>${reqs.map(r => `<li>${esc(line(r))}</li>`).join("")}</ul>` : ""}${fnd.length ? `<p><b>Want a founding place</b></p><ul>${fnd.map(r => `<li>${esc(line(r))}${r.message ? `: “${esc(r.message)}”` : ""}</li>`).join("")}</ul>` : ""}${button(o.adminUrl, "Open admin")}`, "Sent to Patch admins.");
    return { subject, text, html };
  }

  // Made-up examples, for previewing the wording in admin.
  const SAMPLES = {
    reportReady: () => reportReady({ name: "Jess Patel", cafe: "Mane Street", reportUrl: "https://example.com/report?t=…", brand: "Patch", from: "James", foundingPrice: 59 }),
    weekly: () => weekly({ name: "Leah Byrne", cafe: "Mane Street", ownerUrl: "https://example.com/owner?t=…", unsubUrl: "https://example.com/api/unsubscribe?t=…", brand: "Patch", actions: { n: 6, value: 2140 },
      items: [{ t: "Add your prices to Google", s: "3 of the 5 salons nearest you list prices on Google; you don't yet. It takes about 10 minutes.", tone: "warn" }, { t: "You were named by ChatGPT", s: "For “hairdresser in Heaton Moor”, up from not named last week.", tone: "good" }, { t: "Insurance renewal", s: "Due 1 December. Two quotes to compare are in Patch.", tone: "" }] }),
    adminDigest: () => adminDigest({ adminUrl: "https://example.com/admin", requests: [{ name: "Sam Okafor", cafe: "Fade Lab", role: "Owner" }], founding: [{ name: "Leah Byrne", cafe: "Mane Street", message: "Can we talk next week?" }] }),
  };

  const api = { reportReady, weekly, adminDigest, SAMPLES };
  root.PatchEmails = api; if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
