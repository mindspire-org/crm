import { Router } from "express";
import JournalEntry from "../models/JournalEntry.js";
import AccountingSettings from "../models/AccountingSettings.js";

const router = Router();

function parseDate(s) {
  return s ? new Date(s) : null;
}

async function getEntityRows(entityType, entityId, from, to) {
  const match = {};
  if (from || to) match.date = {};
  if (from) match.date.$gte = from;
  if (to) match.date.$lte = to;
  const pipeline = [
    { $match: match },
    { $unwind: "$lines" },
    { $match: { "lines.entityType": entityType } },
    { $match: { "lines.entityId": { $in: [entityId, { $toObjectId: entityId }] } } },
    {
      $project: {
        date: 1,
        memo: 1,
        refNo: 1,
        accountCode: "$lines.accountCode",
        debit: "$lines.debit",
        credit: "$lines.credit",
        createdAt: 1,
      },
    },
    { $sort: { date: 1, createdAt: 1, _id: 1 } },
  ];
  let rows = [];
  try {
    rows = await JournalEntry.aggregate(pipeline);
  } catch {
    const pipeline2 = [
      { $match: match },
      { $unwind: "$lines" },
      { $match: { "lines.entityType": entityType, "lines.entityId": entityId } },
      {
        $project: {
          date: 1,
          memo: 1,
          refNo: 1,
          accountCode: "$lines.accountCode",
          debit: "$lines.debit",
          credit: "$lines.credit",
          createdAt: 1,
        },
      },
      { $sort: { date: 1, createdAt: 1, _id: 1 } },
    ];
    rows = await JournalEntry.aggregate(pipeline2);
  }
  let balance = 0;
  const withBal = rows.map((r) => {
    balance += Number(r.debit || 0) - Number(r.credit || 0);
    return { ...r, balance };
  });
  return withBal;
}

function renderHtml({ title, rows, from, to, branding = {} }) {
  const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (n) => Number(n || 0).toFixed(2);
  const period = [from && esc(from.toISOString().slice(0,10)), to && esc(to.toISOString().slice(0,10))].filter(Boolean).join(" to ");
  const totalDebit = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
  const brandingName = esc(branding.name || "");
  const brandingAddress = esc(branding.address || "");
  const brandingLogo = esc(branding.logo || "");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;color:#111}
    h1{font-size:20px;margin:0 0 4px}
    .muted{color:#666;margin-bottom:16px}
    .brand{display:flex;align-items:center;gap:16px;margin-bottom:16px}
    .brand img{height:48px;width:auto;object-fit:contain}
    .brand .info{display:flex;flex-direction:column}
    .brand .name{font-weight:700}
    .brand .addr{color:#666;font-size:12px}
    table{border-collapse:collapse;width:100%}
    th,td{border-bottom:1px solid #e5e5e5;padding:8px;text-align:left}
    td.num,th.num{text-align:right}
    tfoot td{font-weight:600}
    @media print{.no-print{display:none}}
  </style></head><body>
  <div class="no-print" style="text-align:right;margin-bottom:8px"><button onclick="window.print()">Print / Save as PDF</button></div>
  ${(brandingLogo || brandingName || brandingAddress) ? `<div class="brand">${brandingLogo?`<img src="${brandingLogo}" alt="logo"/>`:''}<div class="info"><div class="name">${brandingName}</div><div class="addr">${brandingAddress}</div></div></div>`:''}
  <h1>${esc(title)}</h1>
  <div class="muted">${esc(period)}</div>
  <table>
    <thead><tr><th>Date</th><th>Ref</th><th>Memo</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
    <tbody>
      ${rows.map(r=>`<tr><td>${esc(String(r.date).slice(0,10))}</td><td>${esc(r.refNo||"")}</td><td>${esc(r.memo||"")}</td><td>${esc(r.accountCode||"")}</td><td class="num">${fmt(r.debit)}</td><td class="num">${fmt(r.credit)}</td><td class="num">${fmt(r.balance)}</td></tr>`).join("")}
    </tbody>
    <tfoot>
      <tr><td colspan="4"></td><td class="num">${fmt(totalDebit)}</td><td class="num">${fmt(totalCredit)}</td><td></td></tr>
    </tfoot>
  </table>
  </body></html>`;
}

router.get("/client/:id", async (req, res) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const rows = await getEntityRows("client", req.params.id, from, to);
    const s = (await AccountingSettings.findOne({}).lean()) || {};
    const html = renderHtml({ title: `Client Statement`, rows, from, to, branding: { name: s.brandingName, address: s.brandingAddress, logo: s.brandingLogo } });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    res.status(400).send(`<pre>${(e && e.message) || "failed"}</pre>`);
  }
});

router.get("/employee/:id", async (req, res) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const rows = await getEntityRows("employee", req.params.id, from, to);
    const s = (await AccountingSettings.findOne({}).lean()) || {};
    const html = renderHtml({ title: `Employee Statement`, rows, from, to, branding: { name: s.brandingName, address: s.brandingAddress, logo: s.brandingLogo } });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    res.status(400).send(`<pre>${(e && e.message) || "failed"}</pre>`);
  }
});

router.get("/vendor/:id", async (req, res) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const rows = await getEntityRows("vendor", req.params.id, from, to);
    const s = (await AccountingSettings.findOne({}).lean()) || {};
    const html = renderHtml({ title: `Vendor Statement`, rows, from, to, branding: { name: s.brandingName, address: s.brandingAddress, logo: s.brandingLogo } });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    res.status(400).send(`<pre>${(e && e.message) || "failed"}</pre>`);
  }
});

export default router;
