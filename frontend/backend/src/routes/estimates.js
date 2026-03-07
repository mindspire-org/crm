import express from "express";
import Estimate from "../models/Estimate.js";
import Lead from "../models/Lead.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";
import Project from "../models/Project.js";
import { ensureInvoiceForContract } from "../services/contractOps.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";
import multer from "multer";
import path from "path";

const router = express.Router();

const normRole = (role) => String(role || "").trim().toLowerCase();

const canViewEstimates = (role) => {
  const r = normRole(role);
  return (
    r === "admin" ||
    r === "marketing_manager" ||
    r === "marketer" ||
    r === "sales" ||
    r === "sales_manager" ||
    r === "finance" ||
    r === "finance_manager" ||
    r === "developer" ||
    r === "project_manager" ||
    r === "manager" ||
    r === "staff"
  );
};

const canCreateEstimates = (role) => {
  const r = normRole(role);
  return r === "admin" || r === "marketing_manager" || r === "marketer";
};

const canApproveEstimates = (role) => {
  const r = normRole(role);
  return r === "admin" || r === "marketing_manager";
};

const notifyEstimateNeedsApproval = async (estimateDoc, createdByUser) => {
  try {
    const recipients = await User.find({ role: { $in: ["admin", "marketing_manager"] }, status: "active" })
      .select("_id email")
      .lean();
    const href = `/prospects/estimates/${String(estimateDoc?._id || "")}`;
    const who = createdByUser?.email || createdByUser?.name || "A marketer";
    const title = "Estimate pending approval";
    const message = `${who} created Estimate ${estimateDoc?.number || ""} for ${estimateDoc?.client || ""}. Please review and approve.`.trim();

    const rows = recipients
      .filter((u) => String(u?._id) !== String(createdByUser?._id))
      .map((u) => ({
        userId: u._id,
        type: "estimate",
        title,
        message,
        href,
        meta: {
          estimateId: estimateDoc?._id,
          leadId: estimateDoc?.leadId,
          client: estimateDoc?.client,
          createdBy: createdByUser?._id,
        },
        createdAt: new Date(),
      }));

    if (rows.length) await Notification.insertMany(rows);
  } catch {
    // ignore notification errors
  }
};

// Minimal upload handler for estimate attachments (PDF share)
const uploadDir = path.join(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `estfile_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Upload estimate attachment
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    res.status(201).json({ name: req.file.originalname || "file", path: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List estimates with optional search and status
router.get("/", authenticate, async (req, res) => {
  try {
    if (!canViewEstimates(req.user?.role)) return res.status(403).json({ error: "Access denied" });
    const { q = "", status, leadId, clientId } = req.query;
    const cond = {};
    if (q) cond.$or = [
      { number: new RegExp(q, "i") },
      { client: new RegExp(q, "i") },
    ];
    if (status && status !== "-") cond.status = status;
    if (leadId) cond.leadId = leadId;
    if (clientId) cond.clientId = clientId;
    const list = await Estimate.find(cond)
      .populate({ path: "createdBy", select: "name email role" })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one estimate
router.get("/:id", async (req, res) => {
  try {
    const row = await Estimate.findById(req.params.id)
      .populate({ path: "createdBy", select: "name email role" })
      .lean();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create estimate
router.post("/", authenticate, async (req, res) => {
  try {
    if (!canCreateEstimates(req.user?.role)) return res.status(403).json({ error: "Access denied" });
    const { client, clientId, leadId, estimateDate, validUntil, tax = 0, tax2 = 0, note = "", advancedAmount = 0, items = [], fileIds = [] } = req.body || {};
    if (!client) return res.status(400).json({ error: "client is required" });
    const number = String(Math.floor(Date.now() / 1000));
    const amount = Array.isArray(items) ? items.reduce((a, it) => a + Number(it.total || 0), 0) : 0;

    const role = normRole(req.user?.role);
    const needsApproval = role === "marketer";
    const now = new Date();
    const doc = await Estimate.create({
      number,
      client,
      clientId,
      leadId,
      estimateDate,
      validUntil,
      tax,
      tax2,
      note,
      advancedAmount,
      amount,
      items,
      fileIds,
      createdBy: req.user?._id,
      createdByRole: role,
      approvalStatus: needsApproval ? "Pending" : "Approved",
      ...(needsApproval ? {} : { approvedBy: req.user?._id, approvedAt: now }),
    });

    if (needsApproval) {
      setImmediate(() => notifyEstimateNeedsApproval(doc, req.user));
    }
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["estimates", "leads", "projects", "contracts"], id: String(doc?._id || "") } });
    } catch {}
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/approve", authenticate, async (req, res) => {
  try {
    if (!canApproveEstimates(req.user?.role)) return res.status(403).json({ error: "Access denied" });
    const doc = await Estimate.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    doc.approvalStatus = "Approved";
    doc.approvedBy = req.user?._id;
    doc.approvedAt = new Date();
    doc.rejectedBy = undefined;
    doc.rejectedAt = undefined;
    await doc.save();
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["estimates"], id: String(doc?._id || "") } });
    } catch {}
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/reject", authenticate, async (req, res) => {
  try {
    if (!canApproveEstimates(req.user?.role)) return res.status(403).json({ error: "Access denied" });
    const doc = await Estimate.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    doc.approvalStatus = "Rejected";
    doc.rejectedBy = req.user?._id;
    doc.rejectedAt = new Date();
    doc.approvedBy = undefined;
    doc.approvedAt = undefined;
    await doc.save();
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["estimates"], id: String(doc?._id || "") } });
    } catch {}
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update estimate (partial)
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const update = req.body || {};
    const pre = await Estimate.findById(req.params.id).lean();
    if (!pre) return res.status(404).json({ error: "Not found" });

    const isApprover = canApproveEstimates(req.user?.role);
    const role = normRole(req.user?.role);
    const lockedApprovalFields = ["approvalStatus", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt"];
    for (const k of lockedApprovalFields) {
      if (update?.[k] !== undefined && !isApprover) {
        return res.status(403).json({ error: "Only admin/marketing manager can change approval" });
      }
    }

    if (update?.status !== undefined) {
      const nextStatus = String(update.status || "").trim();
      const low = nextStatus.toLowerCase();
      if (!isApprover && low && low !== "draft") {
        return res.status(403).json({ error: "Only admin/marketing manager can change estimate status" });
      }
      if (!isApprover && String(pre?.approvalStatus || "Approved") !== "Approved" && low !== "draft") {
        return res.status(403).json({ error: "Estimate must be approved before changing status" });
      }

      if (isApprover && String(pre?.approvalStatus || "Approved") !== "Approved" && low !== "draft") {
        update.approvalStatus = "Approved";
        update.approvedBy = req.user?._id;
        update.approvedAt = new Date();
        update.rejectedBy = undefined;
        update.rejectedAt = undefined;
      }
    }

    if (role === "marketer") {
      // Marketers cannot approve/reject or mark accepted/declined/sent. They can edit draft details.
      if (String(pre?.approvalStatus || "Approved") !== "Approved" && update?.status !== undefined) {
        update.status = "Draft";
      }
    }

    const doc = await Estimate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    // If estimate accepted, perform conversions: lead -> sale, proposal -> contract, create project
    try {
      const becameAccepted = String(update?.status || "").toLowerCase() === "accepted" && String(pre?.status || "").toLowerCase() !== "accepted";
      if (becameAccepted) {
        // 1) Update lead status
        if (doc.leadId) {
          await Lead.findByIdAndUpdate(doc.leadId, { $set: { status: "Won" } }).catch(() => null);
        }

        // 2) Create/ensure contract (idempotent). Prefer linking to an accepted proposal if one exists.
        let contract = null;
        let sourceProposal = null;
        try {
          sourceProposal = doc.leadId
            ? await Proposal.findOne({ leadId: doc.leadId, status: { $regex: /^accepted$/i } }).sort({ createdAt: -1 }).lean()
            : null;
        } catch {
          sourceProposal = null;
        }

        try {
          if (sourceProposal?._id) {
            contract = await Contract.findOne({ proposalId: sourceProposal._id }).lean();
            if (!contract && sourceProposal?.contractId) {
              contract = await Contract.findById(sourceProposal.contractId).lean();
            }
          }
        } catch {
          contract = null;
        }

        let createdContract = null;
        if (!contract) {
          try {
            let sourceTitle = `Contract for Estimate ${doc.number || doc._id}`;
            let amount = Number(doc.amount || 0);
            let tax1 = Number(doc.tax || 0);
            let tax2 = Number(doc.tax2 || 0);
            let items = [];

            if (sourceProposal) {
              sourceTitle = sourceProposal.title || sourceTitle;
              amount = Number(sourceProposal.amount || amount);
              tax1 = Number(sourceProposal.tax1 || tax1);
              tax2 = Number(sourceProposal.tax2 || tax2);
              const pItems = Array.isArray(sourceProposal.items) ? sourceProposal.items : [];
              items = pItems.map((it) => ({
                name: String(it?.name || "").trim(),
                description: "",
                quantity: Number(it?.qty ?? 1) || 0,
                rate: Number(it?.rate ?? 0) || 0,
              })).filter((x) => x.name);
            }

            createdContract = await Contract.create({
              clientId: doc.clientId || undefined,
              leadId: doc.leadId || undefined,
              client: doc.client || "",
              projectId: undefined,
              proposalId: sourceProposal?._id || undefined,
              title: sourceTitle,
              amount,
              contractDate: new Date(),
              validUntil: doc.validUntil || undefined,
              status: "draft",
              tax1,
              tax2,
              note: (sourceProposal?.note || doc.note || "") || "",
              items,
              fileIds: Array.isArray(sourceProposal?.fileIds) ? sourceProposal.fileIds : [],
            });
            contract = createdContract;

            // Back-link proposal to contract if needed
            if (sourceProposal?._id) {
              await Proposal.updateOne(
                { _id: sourceProposal._id, contractId: { $exists: false } },
                { $set: { contractId: contract._id } }
              ).catch(() => null);
              await Proposal.updateOne(
                { _id: sourceProposal._id, contractId: null },
                { $set: { contractId: contract._id } }
              ).catch(() => null);
            }
          } catch {}
        }

        // 3) Create/ensure project
        try {
          let project = null;
          if (contract?.projectId) {
            project = await Project.findById(contract.projectId).lean().catch(() => null);
          }
          if (!project) {
            project = await Project.create({
              title: (sourceProposal?.title || (doc?.note && doc.note.trim()) ? (sourceProposal?.title || doc.note).trim().slice(0, 80) : `Project from Estimate ${doc.number || doc._id}`),
              clientId: doc.clientId || undefined,
              client: doc.client || "",
              price: Number(sourceProposal?.amount || doc.amount || 0),
              start: new Date(),
              deadline: sourceProposal?.validUntil || doc.validUntil || undefined,
              status: "Open",
            });
          }
          if (contract && project?._id) {
            await Contract.updateOne({ _id: contract._id, projectId: { $exists: false } }, { $set: { projectId: project._id } }).catch(() => null);
            await Contract.updateOne({ _id: contract._id, projectId: null }, { $set: { projectId: project._id } }).catch(() => null);
          }

          // 4) Create invoice when a contract is created
          try {
            if (createdContract?._id) {
              await ensureInvoiceForContract({ contract: createdContract, project });
            }
          } catch {}
        } catch {}
      }
    } catch {}
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["estimates", "leads", "projects", "contracts"], id: String(doc?._id || "") } });
    } catch {}
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete estimate
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Estimate.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    const role = normRole(req.user?.role);
    const isApprover = canApproveEstimates(role);
    const canDelete =
      isApprover ||
      (role === "marketer" && String(doc?.createdBy || "") === String(req.user?._id || "") && String(doc?.approvalStatus || "Approved") !== "Approved");
    if (!canDelete) return res.status(403).json({ error: "Access denied" });

    await Estimate.findByIdAndDelete(req.params.id);
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["estimates"], id: String(doc?._id || "") } });
    } catch {}
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
