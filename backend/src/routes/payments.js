import { Router } from "express";
import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Invoice from "../models/Invoice.js";
import Subscription from "../models/Subscription.js";
import SubscriptionInvoiceLink from "../models/SubscriptionInvoiceLink.js";
import { ensureLinkedAccount, getSettings, postJournal } from "../services/accounting.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const verifyInvoicePreviewToken = (token) => {
  const decoded = jwt.verify(String(token || ""), JWT_SECRET);
  if (!decoded || decoded.kind !== "invoice_preview" || !decoded.invoiceId) {
    throw new Error("Invalid preview token");
  }
  return decoded;
};

async function resolveInvoiceObjectId(idOrNumber) {
  if (!idOrNumber) return null;
  const raw = String(idOrNumber);
  if (mongoose.Types.ObjectId.isValid(raw)) return raw;
  const inv = await Invoice.findOne({ number: raw }).select({ _id: 1 }).lean();
  return inv?._id ? String(inv._id) : null;
}

async function updateSubscriptionPaymentStatus(invoiceId, status) {
  if (!invoiceId || status !== "Paid") return;
  try {
    const link = await SubscriptionInvoiceLink.findOne({ invoiceId });
    if (link) {
      await Subscription.findByIdAndUpdate(link.subscriptionId, {
        lastPaidAt: new Date(),
        status: "active",
      });
      link.status = "paid";
      await link.save();
    }
  } catch (e) {
    console.error("[Payments] Failed to update subscription payment status:", e);
  }
}

async function updateInvoiceStatus(invoiceId) {
  if (!invoiceId || !mongoose.Types.ObjectId.isValid(String(invoiceId))) return;
  const inv = await Invoice.findById(invoiceId);
  if (!inv) return;
  const pays = await Payment.find({ invoiceId }).select({ amount: 1 }).lean();
  const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const total = Number(inv.amount || 0);
  let status = "Unpaid";
  if (paid > 0 && total > 0 && paid < total) status = "Partially paid";
  if ((total > 0 && paid >= total) || (total === 0 && paid > 0)) status = "Paid";
  inv.status = status;
  await inv.save();
  if (status === "Paid") {
    await updateSubscriptionPaymentStatus(invoiceId, status);
  }
}

router.get("/public", async (req, res) => {
  try {
    const t = String(req.query.t || "");
    const invoiceId = String(req.query.invoiceId || "");
    if (!t) return res.status(401).json({ error: "Preview token required" });
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });

    const decoded = verifyInvoicePreviewToken(t);
    if (String(decoded.invoiceId) !== invoiceId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const items = await Payment.find({ invoiceId }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    if (String(e?.name || "") === "TokenExpiredError") {
      return res.status(401).json({ error: "Preview token expired" });
    }
    return res.status(401).json({ error: "Invalid preview token" });
  }
});

// List payments with optional search and client filters
router.get("/", authenticate, requirePermission("payments.read"), async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const invoiceId = req.query.invoiceId?.toString();
    const projectId = req.query.projectId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (projectId) filter.projectId = projectId;
    if (invoiceId) {
      const resolved = await resolveInvoiceObjectId(invoiceId);
      if (!resolved) return res.json([]);
      filter.invoiceId = resolved;
    }
    if (q) {
      Object.assign(filter, {
        $or: [
          { client: { $regex: q, $options: "i" } },
          { method: { $regex: q, $options: "i" } },
          { reference: { $regex: q, $options: "i" } },
          { transactionId: { $regex: q, $options: "i" } },
        ],
      });
    }
    const items = await Payment.find(filter).sort({ createdAt: -1 }).lean();

    const invoiceObjectIds = Array.from(
      new Set(
        (items || [])
          .map((p) => (p?.invoiceId != null ? String(p.invoiceId) : ""))
          .filter((v) => mongoose.Types.ObjectId.isValid(v))
      )
    );
    const invoices = invoiceObjectIds.length
      ? await Invoice.find({ _id: { $in: invoiceObjectIds } }).select({ _id: 1, number: 1 }).lean()
      : [];
    const invoiceById = new Map((invoices || []).map((i) => [String(i._id), String(i.number || "")]));

    const enriched = (items || []).map((p) => {
      const raw = p?.invoiceId != null ? String(p.invoiceId) : "";
      const isObj = mongoose.Types.ObjectId.isValid(raw);
      const invoiceNumber = isObj ? (invoiceById.get(raw) || "") : raw;
      const invoiceObjectId = isObj ? raw : "";
      return { ...p, invoiceNumber, invoiceObjectId };
    });

    res.json(enriched);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create payment
router.post("/", authenticate, requirePermission("payments.create"), async (req, res) => {
  try {
    const payload = req.body || {};
    if (payload.notes && !payload.note) payload.note = payload.notes;
    if (payload.invoiceId) {
      const resolved = await resolveInvoiceObjectId(payload.invoiceId);
      if (!resolved) return res.status(400).json({ error: "Invalid invoiceId" });
      payload.invoiceId = resolved;
    }
    if (payload.amount != null) payload.amount = Number(payload.amount || 0);
    if (payload.fee != null) payload.fee = Number(payload.fee || 0);
    if (payload.date) payload.date = new Date(payload.date);
    const doc = await Payment.create(payload);
    if (doc?.invoiceId) await updateInvoiceStatus(String(doc.invoiceId));
    // Auto-post: DR Cash/Bank, CR AR-[Client]
    try {
      const amt = Number(doc.amount || 0);
      if (amt > 0 && doc.clientId) {
        const settings = await getSettings();
        const method = String(doc.method || "cash").toLowerCase();
        const cashOrBank = method.includes("bank") || method.includes("transfer") ? settings.bankAccount : settings.cashAccount;
        const clientAcc = await ensureLinkedAccount("client", doc.clientId, doc.client || "Client");
        await postJournal({
          date: doc.date || new Date(),
          memo: `Payment ${doc.reference || doc.transactionId || doc._id}`,
          refNo: String(doc.reference || doc.transactionId || ""),
          lines: [
            { accountCode: cashOrBank, debit: amt, credit: 0 },
            { accountCode: clientAcc.code, debit: 0, credit: amt, entityType: "client", entityId: doc.clientId },
          ],
          postedBy: "system",
        });
      }
    } catch (_) {}
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update payment
router.put("/:id", authenticate, requirePermission("payments.update"), async (req, res) => {
  try {
    const existing = await Payment.findById(req.params.id).lean();
    const payload = req.body || {};
    if (payload.notes && !payload.note) payload.note = payload.notes;
    if (payload.invoiceId) {
      const resolved = await resolveInvoiceObjectId(payload.invoiceId);
      if (!resolved) return res.status(400).json({ error: "Invalid invoiceId" });
      payload.invoiceId = resolved;
    }
    if (payload.amount != null) payload.amount = Number(payload.amount || 0);
    if (payload.fee != null) payload.fee = Number(payload.fee || 0);
    if (payload.date) payload.date = new Date(payload.date);
    const doc = await Payment.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    const oldInvoiceId = existing?.invoiceId ? String(existing.invoiceId) : "";
    const newInvoiceId = doc?.invoiceId ? String(doc.invoiceId) : "";
    if (oldInvoiceId) await updateInvoiceStatus(oldInvoiceId);
    if (newInvoiceId && newInvoiceId !== oldInvoiceId) await updateInvoiceStatus(newInvoiceId);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete payment
router.delete("/:id", authenticate, requirePermission("payments.delete"), async (req, res) => {
  try {
    const doc = await Payment.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (doc?.invoiceId) await updateInvoiceStatus(String(doc.invoiceId));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
