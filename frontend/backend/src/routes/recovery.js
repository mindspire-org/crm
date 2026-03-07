import { Router } from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import Client from "../models/Client.js";
import JournalEntry from "../models/JournalEntry.js";
import Vendor from "../models/Vendor.js";
import Note from "../models/Note.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const isAdminOrFinanceManager = (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (role === "admin" || role === "finance_manager" || role === "finance manager") {
    return next();
  }
  return res.status(403).json({ error: "Access denied" });
};

function parseDate(s) {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLabelString(input) {
  const s = String(input || "");
  if (!s.trim()) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function addToMap(map, key, patch) {
  if (!key) return;
  const cur = map.get(key) || {
    key,
    name: key,
    invoiced: 0,
    received: 0,
    outstanding: 0,
    overdue: 0,
    count: 0,
  };
  const next = {
    ...cur,
    ...patch,
    invoiced: Number(cur.invoiced || 0) + Number(patch.invoiced || 0),
    received: Number(cur.received || 0) + Number(patch.received || 0),
    outstanding: Number(cur.outstanding || 0) + Number(patch.outstanding || 0),
    overdue: Number(cur.overdue || 0) + Number(patch.overdue || 0),
    count: Number(cur.count || 0) + Number(patch.count || 0),
  };
  map.set(key, next);
}

async function computeRecovery({ issueFrom, issueTo, dueFrom, dueTo, q, status }) {
  const invoiceFilter = {};

  if (issueFrom || issueTo) {
    invoiceFilter.issueDate = {};
    if (issueFrom) invoiceFilter.issueDate.$gte = issueFrom;
    if (issueTo) invoiceFilter.issueDate.$lte = issueTo;
  }

  if (dueFrom || dueTo) {
    invoiceFilter.dueDate = {};
    if (dueFrom) invoiceFilter.dueDate.$gte = dueFrom;
    if (dueTo) invoiceFilter.dueDate.$lte = dueTo;
  }

  if (q) {
    invoiceFilter.$or = [
      { number: { $regex: q, $options: "i" } },
      { client: { $regex: q, $options: "i" } },
      { project: { $regex: q, $options: "i" } },
    ];
  }

  if (status && String(status).toLowerCase() !== "all") {
    invoiceFilter.status = String(status);
  }

  const invoices = await Invoice.find(invoiceFilter).sort({ createdAt: -1 }).lean();
  const invoiceIds = (invoices || []).map((i) => i?._id).filter((id) => mongoose.Types.ObjectId.isValid(String(id)));

  const paymentsAgg = invoiceIds.length
    ? await Payment.aggregate([
        { $match: { invoiceId: { $in: invoiceIds } } },
        {
          $group: {
            _id: "$invoiceId",
            received: { $sum: "$amount" },
            lastPaymentAt: { $max: "$date" },
          },
        },
      ])
    : [];
  const payByInvoiceId = new Map((paymentsAgg || []).map((r) => [String(r._id), r]));

  const projectIds = Array.from(
    new Set(
      (invoices || [])
        .map((i) => (i?.projectId ? String(i.projectId) : ""))
        .filter((v) => mongoose.Types.ObjectId.isValid(v))
    )
  );
  const projects = projectIds.length ? await Project.find({ _id: { $in: projectIds } }).lean() : [];
  const projectById = new Map((projects || []).map((p) => [String(p._id), p]));

  const employeeIds = Array.from(
    new Set(
      (projects || [])
        .map((p) => (p?.employeeId ? String(p.employeeId) : ""))
        .filter((v) => mongoose.Types.ObjectId.isValid(v))
    )
  );
  const employees = employeeIds.length ? await Employee.find({ _id: { $in: employeeIds } }).lean() : [];
  const employeeById = new Map((employees || []).map((e) => [String(e._id), e]));

  const clientIds = Array.from(
    new Set(
      (invoices || [])
        .map((i) => (i?.clientId ? String(i.clientId) : ""))
        .filter((v) => mongoose.Types.ObjectId.isValid(v))
    )
  );
  const clients = clientIds.length ? await Client.find({ _id: { $in: clientIds } }).lean() : [];
  const clientById = new Map((clients || []).map((c) => [String(c._id), c]));

  const now = new Date();
  const inDays = (d) => {
    const ms = d.getTime() - now.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  const summary = {
    totalInvoiced: 0,
    totalReceived: 0,
    totalOutstanding: 0,
    overdueOutstanding: 0,
    dueIn7: 0,
    dueIn30: 0,
    paidCount: 0,
    unpaidCount: 0,
    partialCount: 0,
    invoiceCount: 0,
  };

  const byProject = new Map();
  const byDepartment = new Map();
  const byProjectLabel = new Map();
  const byClientLabel = new Map();
  const byClientType = new Map();

  const rows = [];
  for (const inv of invoices) {
    const amount = Number(inv?.amount || 0);
    const pay = payByInvoiceId.get(String(inv?._id)) || null;
    const received = Number(pay?.received || 0);
    const outstanding = Math.max(0, amount - received);

    const rawStatus = String(inv?.status || "").trim();
    const computedStatus = outstanding <= 0 ? "Paid" : received > 0 ? "Partially paid" : "Unpaid";
    const effectiveStatus = rawStatus || computedStatus;
    const isPaid = String(effectiveStatus).toLowerCase() === "paid" || outstanding <= 0;

    const dueDate = inv?.dueDate ? new Date(inv.dueDate) : null;
    const proj = inv?.projectId ? projectById.get(String(inv.projectId)) : null;
    
    // Project priority metrics
    const totalTasks = proj?.totalTasks || 0;
    const completedTasks = proj?.completedTasks || 0;
    const allTasksDone = totalTasks > 0 && completedTasks === totalTasks;
    const isProjectDelivered = ["done", "completed", "closed"].includes(String(proj?.status || "").toLowerCase()) || allTasksDone;
    const isOverdue = Boolean(dueDate && !Number.isNaN(dueDate.getTime()) && !isPaid && dueDate < now);

    const daysOverdue = isOverdue && dueDate ? Math.max(0, -inDays(dueDate)) : 0;

    const emp = proj?.employeeId ? employeeById.get(String(proj.employeeId)) : null;
    const dept = String(emp?.department || "Unassigned").trim() || "Unassigned";

    const client = inv?.clientId ? clientById.get(String(inv.clientId)) : null;
    const clientTypeRaw = String(client?.type || "").toLowerCase();
    const clientType = clientTypeRaw === "person" ? "Individual" : clientTypeRaw === "org" ? "Organization" : "Unknown";

    // Fetch latest recovery note for the client
    let latestRecoveryNote = null;
    try {
      const latestNote = await Note.findOne({
        clientId: inv?.clientId,
        labels: { $regex: /recovery/i }
      }).sort({ createdAt: -1 }).lean();
      
      if (latestNote) {
        latestRecoveryNote = {
          text: latestNote.text,
          date: latestNote.createdAt,
          title: latestNote.title
        };
      }
    } catch (noteErr) {
      console.error("Error fetching recovery note:", noteErr);
    }

    summary.totalInvoiced += amount;
    summary.totalReceived += received;
    summary.totalOutstanding += outstanding;
    summary.invoiceCount += 1;

    if (isOverdue) summary.overdueOutstanding += outstanding;

    if (!isPaid && dueDate && !Number.isNaN(dueDate.getTime())) {
      const dd = inDays(dueDate);
      if (dd >= 0 && dd <= 7) summary.dueIn7 += outstanding;
      if (dd >= 0 && dd <= 30) summary.dueIn30 += outstanding;
    }

    if (String(effectiveStatus).toLowerCase() === "paid") summary.paidCount += 1;
    else if (String(effectiveStatus).toLowerCase().includes("partial")) summary.partialCount += 1;
    else summary.unpaidCount += 1;

    const projectName = String(inv?.project || proj?.title || "-");
    addToMap(byProject, String(inv?.projectId || projectName), {
      key: String(inv?.projectId || projectName),
      name: projectName,
      invoiced: amount,
      received,
      outstanding,
      overdue: isOverdue ? outstanding : 0,
      count: 1,
    });

    addToMap(byDepartment, dept, {
      key: dept,
      name: dept,
      invoiced: amount,
      received,
      outstanding,
      overdue: isOverdue ? outstanding : 0,
      count: 1,
    });

    const projLabels = parseLabelString(proj?.labels);
    for (const lab of projLabels.length ? projLabels : ["Unlabeled"]) {
      addToMap(byProjectLabel, lab, {
        key: lab,
        name: lab,
        invoiced: amount,
        received,
        outstanding,
        overdue: isOverdue ? outstanding : 0,
        count: 1,
      });
    }

    const clientLabels = Array.isArray(client?.labels) ? client.labels.map((x) => String(x).trim()).filter(Boolean) : [];
    for (const lab of clientLabels.length ? clientLabels : ["Unlabeled"]) {
      addToMap(byClientLabel, lab, {
        key: lab,
        name: lab,
        invoiced: amount,
        received,
        outstanding,
        overdue: isOverdue ? outstanding : 0,
        count: 1,
      });
    }

    addToMap(byClientType, clientType, {
      key: clientType,
      name: clientType,
      invoiced: amount,
      received,
      outstanding,
      overdue: isOverdue ? outstanding : 0,
      count: 1,
    });

    rows.push({
      id: String(inv?._id),
      number: String(inv?.number || ""),
      status: effectiveStatus,
      issueDate: inv?.issueDate || null,
      dueDate: inv?.dueDate || null,
      clientId: inv?.clientId ? String(inv.clientId) : "",
      clientName: String(inv?.client || client?.company || client?.person || ""),
      clientType,
      projectId: inv?.projectId ? String(inv.projectId) : "",
      projectName,
      department: dept,
      amount,
      received,
      outstanding,
      overdue: Boolean(isOverdue),
      daysOverdue,
      lastPaymentAt: pay?.lastPaymentAt || null,
      projectLabels: projLabels,
      clientLabels,
      isProjectDelivered,
      allTasksDone,
      projectStatus: proj?.status || "Open",
      latestRecoveryNote,
    });
  }

  const toSortedArray = (m) =>
    Array.from(m.values()).sort((a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0));

  const vendorAgg = await JournalEntry.aggregate([
    { $match: {} },
    { $unwind: "$lines" },
    { $match: { "lines.entityType": "vendor", "lines.entityId": { $exists: true } } },
    {
      $group: {
        _id: "$lines.entityId",
        debit: { $sum: "$lines.debit" },
        credit: { $sum: "$lines.credit" },
      },
    },
  ]);

  const vendorIds = (vendorAgg || [])
    .map((r) => (r?._id ? String(r._id) : ""))
    .filter((v) => mongoose.Types.ObjectId.isValid(v));
  const vendors = vendorIds.length ? await Vendor.find({ _id: { $in: vendorIds } }).lean() : [];
  const vendorById = new Map((vendors || []).map((v) => [String(v._id), v]));

  const vendorRows = (vendorAgg || [])
    .map((r) => {
      const id = String(r._id || "");
      const v = vendorById.get(id) || null;
      const debit = Number(r.debit || 0);
      const credit = Number(r.credit || 0);
      const payable = Math.max(0, credit - debit);
      return {
        vendorId: id,
        vendorName: String(v?.name || v?.company || "Vendor"),
        debit,
        credit,
        outstanding: payable,
      };
    })
    .filter((r) => Number(r.outstanding || 0) > 0)
    .sort((a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0));

  const vendorSummary = {
    totalOutstanding: vendorRows.reduce((s, r) => s + Number(r.outstanding || 0), 0),
    rows: vendorRows.slice(0, 50),
  };

  return {
    summary,
    rows,
    breakdowns: {
      byProject: toSortedArray(byProject),
      byDepartment: toSortedArray(byDepartment),
      byProjectLabel: toSortedArray(byProjectLabel),
      byClientLabel: toSortedArray(byClientLabel),
      byClientType: toSortedArray(byClientType),
    },
    vendors: vendorSummary,
  };
}

router.get("/summary", authenticate, isAdminOrFinanceManager, async (req, res) => {
  try {
    const issueFrom = parseDate(req.query.issueFrom);
    const issueTo = parseDate(req.query.issueTo);
    const dueFrom = parseDate(req.query.dueFrom);
    const dueTo = parseDate(req.query.dueTo);
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "all").trim();

    const out = await computeRecovery({ issueFrom, issueTo, dueFrom, dueTo, q, status });
    res.json({
      summary: out.summary,
      breakdowns: out.breakdowns,
      vendors: out.vendors,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/list", authenticate, isAdminOrFinanceManager, async (req, res) => {
  try {
    const issueFrom = parseDate(req.query.issueFrom);
    const issueTo = parseDate(req.query.issueTo);
    const dueFrom = parseDate(req.query.dueFrom);
    const dueTo = parseDate(req.query.dueTo);
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "all").trim();

    const out = await computeRecovery({ issueFrom, issueTo, dueFrom, dueTo, q, status });
    res.json({ rows: out.rows });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
