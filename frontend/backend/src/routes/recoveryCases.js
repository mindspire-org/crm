import { Router } from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Project from "../models/Project.js";
import Client from "../models/Client.js";
import Milestone from "../models/Milestone.js";
import RecoveryCase from "../models/RecoveryCase.js";
import RecoverySchedule from "../models/RecoverySchedule.js";
import RecoveryEvent from "../models/RecoveryEvent.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const isAdminOrFinance = (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (role === "admin" || role === "finance" || role === "finance_manager" || role === "finance manager") return next();
  return res.status(403).json({ error: "Access denied" });
};

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

async function getReceivedForInvoiceIds(invoiceIds) {
  if (!invoiceIds.length) return new Map();
  const agg = await Payment.aggregate([
    { $match: { invoiceId: { $in: invoiceIds } } },
    { $group: { _id: "$invoiceId", received: { $sum: "$amount" }, lastPaymentAt: { $max: "$date" } } },
  ]);
  return new Map((agg || []).map((r) => [String(r._id), r]));
}

function computeInvoiceStatus({ invoice, received, now }) {
  const amount = safeNumber(invoice?.amount);
  const outstanding = Math.max(0, amount - safeNumber(received));
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : null;
  const overdue = Boolean(dueDate && !Number.isNaN(dueDate.getTime()) && outstanding > 0 && dueDate < now);
  return { amount, outstanding, dueDate, overdue };
}

async function ensureCaseForInvoice({ invoice, project, client }) {
  const invoiceId = invoice?._id;
  if (!invoiceId) return null;

  const existing = await RecoveryCase.findOne({ invoiceId }).lean();
  if (existing) return existing;

  const created = await RecoveryCase.create({
    invoiceId,
    projectId: invoice?.projectId || project?._id,
    clientId: invoice?.clientId || client?._id,
  });
  return created?.toObject ? created.toObject() : created;
}

async function syncSchedulesFromMilestones({ recoveryCaseId, projectId, invoiceAmount }) {
  if (!mongoose.Types.ObjectId.isValid(String(recoveryCaseId))) return { created: 0, updated: 0, ok: false };

  const milestones = projectId
    ? await Milestone.find({ projectId }).sort({ due: 1, createdAt: 1 }).lean()
    : [];

  // If no milestones exist, create a simple 2-step schedule:
  // 60% on delivery (invoice due date) + 40% in 15 days.
  // This is a safe fallback for recovery operations.
  if (!milestones.length) {
    const existing = await RecoverySchedule.find({ recoveryCaseId }).lean();
    if (existing.length) return { created: 0, updated: 0, ok: true, mode: "kept-existing" };

    const a = safeNumber(invoiceAmount);
    const first = Math.round(a * 0.6);
    const second = Math.max(0, a - first);
    const now = new Date();

    const docs = [
      {
        recoveryCaseId,
        title: "Delivery Payment",
        dueDate: now,
        amountDue: first,
        status: "Pending",
      },
      {
        recoveryCaseId,
        title: "Final Settlement",
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        amountDue: second,
        status: "Pending",
      },
    ].filter((x) => x.amountDue > 0);

    if (docs.length) await RecoverySchedule.insertMany(docs);
    return { created: docs.length, updated: 0, ok: true, mode: "auto-generated" };
  }

  const hasAmounts = milestones.some((m) => safeNumber(m?.amount) > 0);
  // If milestones exist but have no amount, distribute invoice amount evenly.
  const per = !hasAmounts && milestones.length ? safeNumber(invoiceAmount) / milestones.length : 0;

  let created = 0;
  let updated = 0;

  for (const m of milestones) {
    const existing = await RecoverySchedule.findOne({ recoveryCaseId, milestoneId: m._id }).lean();
    const patch = {
      recoveryCaseId,
      milestoneId: m._id,
      title: String(m?.title || "Milestone"),
      dueDate: m?.due || undefined,
      amountDue: hasAmounts ? safeNumber(m?.amount) : Math.round(per),
    };

    if (!existing) {
      await RecoverySchedule.create(patch);
      created += 1;
    } else {
      await RecoverySchedule.updateOne({ _id: existing._id }, { $set: patch });
      updated += 1;
    }
  }

  return { created, updated, ok: true, mode: "synced" };
}

router.get("/", authenticate, isAdminOrFinance, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "all").trim();
    const ownerUserId = String(req.query.ownerUserId || "").trim();
    const overdueOnly = String(req.query.overdueOnly || "").trim() === "1";
    const nextFollowUpFrom = toDateOrNull(req.query.nextFollowUpFrom);
    const nextFollowUpTo = toDateOrNull(req.query.nextFollowUpTo);
    const limitRaw = Number(req.query.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const invoiceFilter = {};
    if (q) {
      invoiceFilter.$or = [
        { number: { $regex: q, $options: "i" } },
        { client: { $regex: q, $options: "i" } },
        { project: { $regex: q, $options: "i" } },
      ];
    }

    const invoices = await Invoice.find(invoiceFilter).sort({ createdAt: -1 }).limit(limit).lean();
    const invoiceIds = invoices.map((i) => i?._id).filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
    const payByInvoiceId = await getReceivedForInvoiceIds(invoiceIds);

    const caseDocs = await RecoveryCase.find({ invoiceId: { $in: invoiceIds } }).lean();
    const caseByInvoiceId = new Map(caseDocs.map((c) => [String(c.invoiceId), c]));

    const now = new Date();

    const rows = [];
    for (const inv of invoices) {
      const pay = payByInvoiceId.get(String(inv._id)) || null;
      const received = safeNumber(pay?.received);
      const lastPaymentAt = pay?.lastPaymentAt || null;
      const { amount, outstanding, dueDate, overdue } = computeInvoiceStatus({ invoice: inv, received, now });

      const c = caseByInvoiceId.get(String(inv._id)) || null;

      if (nextFollowUpFrom || nextFollowUpTo) {
        const nf = c?.nextFollowUpAt ? new Date(c.nextFollowUpAt) : null;
        if (!nf || Number.isNaN(nf.getTime())) continue;
        if (nextFollowUpFrom && nf < nextFollowUpFrom) continue;
        if (nextFollowUpTo) {
          const end = new Date(nextFollowUpTo.getTime());
          end.setHours(23, 59, 59, 999);
          if (nf > end) continue;
        }
      }

      const effectiveStatus = (() => {
        if (outstanding <= 0) return "Completed";
        if (c?.status) return c.status;
        if (overdue) return "Overdue";
        if (received > 0) return "PartiallyPaid";
        return "Pending";
      })();

      if (status && status !== "all" && String(effectiveStatus) !== String(status)) continue;
      if (ownerUserId && String(c?.ownerUserId || "") !== ownerUserId) continue;
      if (overdueOnly && !overdue) continue;

      rows.push({
        invoiceId: String(inv._id),
        invoiceNumber: String(inv.number || ""),
        invoiceStatus: String(inv.status || ""),
        issueDate: inv.issueDate || null,
        dueDate: inv.dueDate || null,
        clientId: inv.clientId ? String(inv.clientId) : "",
        clientName: String(inv.client || ""),
        projectId: inv.projectId ? String(inv.projectId) : "",
        projectName: String(inv.project || ""),
        amount,
        received,
        outstanding,
        overdue,
        lastPaymentAt,

        recovery: c
          ? {
              id: String(c._id),
              status: c.status,
              ownerUserId: c.ownerUserId ? String(c.ownerUserId) : "",
              priority: c.priority,
              riskFlags: Array.isArray(c.riskFlags) ? c.riskFlags : [],
              nextFollowUpAt: c.nextFollowUpAt || null,
              lastFollowUpAt: c.lastFollowUpAt || null,
              nextExpectedPaymentAt: c.nextExpectedPaymentAt || null,
              notes: c.notes || "",
            }
          : null,

        effectiveStatus,
      });
    }

    res.json({ rows });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:invoiceId", authenticate, isAdminOrFinance, async (req, res) => {
  try {
    const invoiceId = String(req.params.invoiceId || "");
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return res.status(400).json({ error: "Invalid invoiceId" });

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const project = invoice.projectId ? await Project.findById(invoice.projectId).lean() : null;
    const client = invoice.clientId ? await Client.findById(invoice.clientId).lean() : null;

    const c = await ensureCaseForInvoice({ invoice, project, client });
    if (!c?._id) return res.status(500).json({ error: "Failed to create recovery case" });

    const schedules = await RecoverySchedule.find({ recoveryCaseId: c._id }).sort({ dueDate: 1, createdAt: 1 }).lean();
    const events = await RecoveryEvent.find({ recoveryCaseId: c._id }).sort({ createdAt: -1 }).limit(200).lean();

    const payAgg = await Payment.aggregate([
      { $match: { invoiceId: new mongoose.Types.ObjectId(invoiceId) } },
      { $group: { _id: "$invoiceId", received: { $sum: "$amount" }, lastPaymentAt: { $max: "$date" } } },
    ]);
    const received = safeNumber(payAgg?.[0]?.received);
    const lastPaymentAt = payAgg?.[0]?.lastPaymentAt || null;

    const now = new Date();
    const { amount, outstanding, overdue } = computeInvoiceStatus({ invoice, received, now });

    res.json({
      invoice,
      project,
      client,
      case: c,
      schedules,
      events,
      computed: { amount, received, outstanding, overdue, lastPaymentAt },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:invoiceId", authenticate, isAdminOrFinance, async (req, res) => {
  try {
    const invoiceId = String(req.params.invoiceId || "");
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return res.status(400).json({ error: "Invalid invoiceId" });

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const existing = await RecoveryCase.findOne({ invoiceId }).lean();
    const c = existing ? existing : await RecoveryCase.create({ invoiceId, projectId: invoice.projectId, clientId: invoice.clientId });

    const patch = {};
    if (req.body?.ownerUserId !== undefined) {
      const v = String(req.body.ownerUserId || "").trim();
      patch.ownerUserId = mongoose.Types.ObjectId.isValid(v) ? v : undefined;
    }
    if (req.body?.status !== undefined) {
      patch.status = String(req.body.status || "Pending");
    }
    if (req.body?.priority !== undefined) {
      patch.priority = String(req.body.priority || "normal");
    }
    if (req.body?.riskFlags !== undefined) {
      patch.riskFlags = Array.isArray(req.body.riskFlags) ? req.body.riskFlags.map((x) => String(x).trim()).filter(Boolean) : [];
    }
    if (req.body?.nextFollowUpAt !== undefined) {
      patch.nextFollowUpAt = toDateOrNull(req.body.nextFollowUpAt) || undefined;
    }
    if (req.body?.nextExpectedPaymentAt !== undefined) {
      patch.nextExpectedPaymentAt = toDateOrNull(req.body.nextExpectedPaymentAt) || undefined;
    }
    if (req.body?.notes !== undefined) {
      patch.notes = String(req.body.notes || "");
    }

    await RecoveryCase.updateOne({ _id: c._id }, { $set: patch });
    const out = await RecoveryCase.findById(c._id).lean();

    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:invoiceId/events", authenticate, isAdminOrFinance, async (req, res) => {
  try {
    const invoiceId = String(req.params.invoiceId || "");
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return res.status(400).json({ error: "Invalid invoiceId" });

    const c = await RecoveryCase.findOne({ invoiceId }).lean();
    if (!c) return res.status(404).json({ error: "Recovery case not found" });

    const type = String(req.body?.type || "").trim();
    if (!type) return res.status(400).json({ error: "type is required" });

    const doc = await RecoveryEvent.create({
      recoveryCaseId: c._id,
      scheduleId: mongoose.Types.ObjectId.isValid(String(req.body?.scheduleId || "")) ? req.body.scheduleId : undefined,
      type,
      title: String(req.body?.title || ""),
      body: String(req.body?.body || ""),
      meta: req.body?.meta && typeof req.body.meta === "object" ? req.body.meta : undefined,
      createdByUserId: req.user?._id,
    });

    // Lightweight convenience: if logging followup/promise update case dates.
    if (type === "followup") {
      await RecoveryCase.updateOne({ _id: c._id }, { $set: { lastFollowUpAt: new Date(), nextFollowUpAt: toDateOrNull(req.body?.meta?.nextFollowUpAt) || undefined } });
    }
    if (type === "promise") {
      await RecoveryCase.updateOne({ _id: c._id }, { $set: { nextExpectedPaymentAt: toDateOrNull(req.body?.meta?.expectedPaymentAt) || undefined, status: "PaymentPromised" } });
    }

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:invoiceId/schedules/sync-from-milestones", authenticate, isAdminOrFinance, async (req, res) => {
  try {
    const invoiceId = String(req.params.invoiceId || "");
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return res.status(400).json({ error: "Invalid invoiceId" });

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const c = await ensureCaseForInvoice({ invoice });
    const out = await syncSchedulesFromMilestones({
      recoveryCaseId: c._id,
      projectId: invoice.projectId,
      invoiceAmount: invoice.amount,
    });

    const schedules = await RecoverySchedule.find({ recoveryCaseId: c._id }).sort({ dueDate: 1, createdAt: 1 }).lean();
    res.json({ ok: true, sync: out, schedules });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
