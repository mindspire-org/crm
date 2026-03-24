import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import jwt from "jsonwebtoken";
import { ensureLinkedAccount, getSettings, postJournal } from "../services/accounting.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

// Minimal upload handler for invoice attachments
const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `invfile_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const signInvoicePreviewToken = (invoiceId, opts = {}) => {
  const ttl = opts.ttl || "2h";
  return jwt.sign(
    { kind: "invoice_preview", invoiceId: String(invoiceId || "") },
    JWT_SECRET,
    { expiresIn: ttl }
  );
};

const verifyInvoicePreviewToken = (token) => {
  const decoded = jwt.verify(String(token || ""), JWT_SECRET);
  if (!decoded || decoded.kind !== "invoice_preview" || !decoded.invoiceId) {
    throw new Error("Invalid preview token");
  }
  return decoded;
};

function computeInvoiceAmount(input) {
  const items = Array.isArray(input?.items) ? input.items : [];
  const tax1 = Number(input?.tax1 || 0);
  const tax2 = Number(input?.tax2 || 0);
  const tds = Number(input?.tds || 0);
  const advance = Number(input?.advanceAmount || 0);
  const discount = Number(input?.discount || 0);

  if (items.length) {
    const subTotal = items.reduce((sum, it) => sum + (Number(it?.quantity ?? it?.qty ?? 0) * Number(it?.rate ?? 0)), 0);
    const tax1Amt = (tax1 / 100) * subTotal;
    const tax2Amt = (tax2 / 100) * subTotal;
    const tdsAmt = (tds / 100) * subTotal;
    const gross = subTotal + tax1Amt + tax2Amt - tdsAmt - advance;
    return Math.max(0, gross - discount);
  }

  const subTotal = Number(input?.amount ?? input?.total ?? 0);
  const tax1Amt = (tax1 / 100) * subTotal;
  const tax2Amt = (tax2 / 100) * subTotal;
  const tdsAmt = (tds / 100) * subTotal;
  const gross = subTotal + tax1Amt + tax2Amt - tdsAmt - advance;
  return Math.max(0, gross - discount);
}

// Upload invoice attachment
router.post("/upload", authenticate, requirePermission("invoices.update"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    res.status(201).json({ name: req.file.originalname || "file", path: `/uploads/${req.file.filename}` });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id/preview-token", authenticate, requirePermission("invoices.read"), async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Invoice.findById(id).select({ _id: 1 }).lean();
    }
    if (!doc) {
      doc = await Invoice.findOne({ number: id }).select({ _id: 1 }).lean();
    }
    if (!doc?._id) return res.status(404).json({ error: "Not found" });
    const token = signInvoicePreviewToken(doc._id, { ttl: "2h" });
    res.json({ token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/public/:id", async (req, res) => {
  try {
    const t = String(req.query.t || "");
    if (!t) return res.status(401).json({ error: "Preview token required" });

    const decoded = verifyInvoicePreviewToken(t);
    const requestedId = String(req.params.id || "");

    const doc = await Invoice.findById(decoded.invoiceId).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    const allowedIds = new Set([String(doc._id), String(doc.number || "").trim()].filter(Boolean));
    if (!allowedIds.has(requestedId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(doc);
  } catch (e) {
    if (String(e?.name || "") === "TokenExpiredError") {
      return res.status(401).json({ error: "Preview token expired" });
    }
    return res.status(401).json({ error: "Invalid preview token" });
  }
});

// List invoices with optional search and client filters
router.get("/", authenticate, requirePermission("invoices.read"), async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const projectId = req.query.projectId?.toString();
    const contractId = req.query.contractId?.toString();
    const label = req.query.label?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (projectId) filter.projectId = projectId;
    if (contractId) filter.labels = `contract:${String(contractId)}`;
    if (!contractId && label) filter.labels = String(label);
    if (q) {
      Object.assign(filter, {
        $or: [
          { number: { $regex: q, $options: "i" } },
          { client: { $regex: q, $options: "i" } },
        ],
      });
    }
    const items = await Invoice.find(filter).sort({ createdAt: -1 }).lean();
    
    // Role-based scoping for Marketer/Sales
    const role = String(req.user?.role || "").toLowerCase().trim();
    if (role === "marketer" || role === "sales") {
      const filtered = items.filter(inv => 
        String(inv.createdBy || "") === String(req.user._id) || 
        String(inv.salesPersonId || "") === String(req.user._id)
      );
      return res.json(filtered);
    }

    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single invoice by id
router.get("/:id", authenticate, requirePermission("invoices.read"), async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      doc = await Invoice.findById(id).lean();
    }
    // Fallback: allow lookup by invoice number when not a valid ObjectId
    if (!doc) {
      doc = await Invoice.findOne({ number: id }).lean();
    }
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create invoice
router.post("/", authenticate, requirePermission("invoices.create"), async (req, res) => {
  try {
    const body = req.body || {};
    const number = body.number || String(Math.floor(Date.now() / 1000));
    if (body.tax != null && body.tax1 == null) body.tax1 = body.tax;
    if (body.discount != null) body.discount = Number(body.discount || 0);
    const amount = computeInvoiceAmount(body);
    const issueDate = body.issueDate || body.date || new Date();

    let clientId = body.clientId;
    let client = body.client;
    let projectId = body.projectId;
    let projectTitle = body.project;

    if (projectId && !clientId) {
      try {
        const proj = await Project.findById(projectId).lean();
        if (proj) {
          clientId = proj.clientId || clientId;
          client = proj.client || client;
          projectTitle = proj.title || projectTitle;
        }
      } catch {}
    }

    const doc = await Invoice.create({
      ...body,
      number,
      amount,
      issueDate,
      clientId,
      client,
      projectId,
      project: projectTitle,
    });
    // Auto-post: DR AR-[Client], CR Revenue
    try {
      const amt = Number(doc.amount || 0);
      if (amt > 0 && doc.clientId) {
        const settings = await getSettings();
        const clientAcc = await ensureLinkedAccount("client", doc.clientId, doc.client || "Client");
        await postJournal({
          date: doc.issueDate || new Date(),
          memo: `Invoice ${doc.number}`,
          refNo: String(doc.number || ""),
          lines: [
            { accountCode: clientAcc.code, debit: amt, credit: 0, entityType: "client", entityId: doc.clientId },
            { accountCode: settings.revenueAccount, debit: 0, credit: amt },
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

// Update invoice
router.put("/:id", authenticate, requirePermission("invoices.update"), async (req, res) => {
  try {
    const existing = await Invoice.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });

    const payload = { ...(req.body || {}) };
    if (payload.tax != null && payload.tax1 == null) payload.tax1 = payload.tax;
    if (payload.discount != null) payload.discount = Number(payload.discount || 0);
    if (payload.advanceAmount != null) payload.advanceAmount = Number(payload.advanceAmount || 0);
    if (payload.tax1 != null) payload.tax1 = Number(payload.tax1 || 0);
    if (payload.tax2 != null) payload.tax2 = Number(payload.tax2 || 0);
    if (payload.tds != null) payload.tds = Number(payload.tds || 0);

    const merged = { ...existing, ...payload };
    payload.amount = computeInvoiceAmount(merged);

    const doc = await Invoice.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    // If the invoice total changed, post an adjustment journal entry so Revenue/AR stays accurate.
    try {
      const oldAmt = Number(existing.amount || 0);
      const newAmt = Number(doc.amount || 0);
      const delta = newAmt - oldAmt;
      const sameClient = String(existing.clientId || "") && String(existing.clientId) === String(doc.clientId || "");
      if (sameClient && Math.abs(delta) > 0.00001 && doc.clientId) {
        const settings = await getSettings();
        const clientAcc = await ensureLinkedAccount("client", doc.clientId, doc.client || "Client");
        const amt = Math.abs(delta);

        // If delta > 0: increase invoice => DR AR, CR Revenue
        // If delta < 0: decrease invoice => DR Revenue, CR AR
        const inc = delta > 0;
        await postJournal({
          date: new Date(),
          memo: `Invoice ${doc.number} adjustment`,
          refNo: String(doc.number || ""),
          lines: inc
            ? [
                { accountCode: clientAcc.code, debit: amt, credit: 0, entityType: "client", entityId: doc.clientId },
                { accountCode: settings.revenueAccount, debit: 0, credit: amt },
              ]
            : [
                { accountCode: settings.revenueAccount, debit: amt, credit: 0 },
                { accountCode: clientAcc.code, debit: 0, credit: amt, entityType: "client", entityId: doc.clientId },
              ],
          postedBy: "system",
        });
      }
    } catch (_) {}

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete invoice
router.delete("/:id", authenticate, requirePermission("invoices.delete"), async (req, res) => {
  try {
    const { id } = req.params;
    let r = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      r = await Invoice.findByIdAndDelete(id);
    }
    if (!r) {
      r = await Invoice.findOneAndDelete({ number: id });
    }
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
