import { Router } from "express";
import Contract from "../models/Contract.js";
import { authenticate } from "../middleware/auth.js";
import Project from "../models/Project.js";
import { upsertInvoiceForContract } from "../services/contractOps.js";
import Invoice from "../models/Invoice.js";

const router = Router();

router.use(authenticate);

const normalizeStatus = (s) => {
  const t = String(s || "").trim().toLowerCase();
  if (!t) return "draft";
  if (t === "payment_pending" || t === "payment pending") return "payment pending";
  if (t === "running") return "running";
  if (t === "completed") return "completed";
  if (t === "draft") return "draft";
  return "draft";
};

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const leadId = req.query.leadId?.toString();
    const projectId = req.query.projectId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (leadId) filter.leadId = leadId;
    if (projectId) filter.projectId = projectId;
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { client: { $regex: q, $options: "i" } }];
    const items = await Contract.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Contract.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      clientId: body.clientId || undefined,
      leadId: body.leadId || undefined,
      client: body.client || "",
      projectId: body.projectId || undefined,
      proposalId: body.proposalId || undefined,
      title: body.title || "",
      amount: Number(body.amount || 0),
      contractDate: body.contractDate ? new Date(body.contractDate) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      status: normalizeStatus(body.status),
      tax1: Number(body.tax1 || 0),
      tax2: Number(body.tax2 || 0),
      note: body.note || "",
      items: Array.isArray(body.items) ? body.items : [],
      fileIds: Array.isArray(body.fileIds) ? body.fileIds : [],
    };

    const doc = await Contract.create(payload);

    try {
      await upsertInvoiceForContract({ contract: doc.toObject ? doc.toObject() : doc });
    } catch {}

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const pre = await Contract.findById(req.params.id).lean();
    if (!pre) return res.status(404).json({ error: "Not found" });

    const body = req.body || {};
    const update = { ...body };
    if (Object.prototype.hasOwnProperty.call(update, "status")) update.status = normalizeStatus(update.status);

    let doc = await Contract.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    const becameRunning = normalizeStatus(update.status) === "running" && normalizeStatus(pre?.status) !== "running";
    if (becameRunning && !doc.projectId) {
      try {
        const project = await Project.create({
          title: String(doc.title || "Project from Contract").slice(0, 120),
          clientId: doc.clientId || undefined,
          client: doc.client || "",
          price: Number(doc.amount || 0),
          start: new Date(),
          deadline: doc.validUntil || undefined,
          status: "Open",
          description: `Created from Contract ${String(doc._id)}`,
          labels: `contract:${String(doc._id)}`,
        });
        if (project?._id) {
          await Invoice.updateMany(
            { labels: `contract:${String(doc._id)}`, $or: [{ projectId: { $exists: false } }, { projectId: null }] },
            { $set: { projectId: project._id, project: String(project.title || "") } }
          ).catch(() => null);
          doc = await Contract.findByIdAndUpdate(doc._id, { $set: { projectId: project._id } }, { new: true });
        }
      } catch {}
    }

    try {
      const contractObj = doc?.toObject ? doc.toObject() : doc;
      if (contractObj?._id) {
        const project = contractObj.projectId ? await Project.findById(contractObj.projectId).lean().catch(() => null) : null;
        await upsertInvoiceForContract({ contract: contractObj, project });
      }
    } catch {}

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const pre = await Contract.findById(req.params.id).lean();
    if (!pre) return res.status(404).json({ error: "Not found" });
    const preStatus = normalizeStatus(pre.status);

    const body = req.body || {};
    const update = { ...body };
    if (Object.prototype.hasOwnProperty.call(update, "status")) update.status = normalizeStatus(update.status);

    let doc = await Contract.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    const nextStatus = normalizeStatus(doc.status);
    const becameRunning = nextStatus === "running" && preStatus !== "running";

    if (becameRunning && !doc.projectId) {
      try {
        const project = await Project.create({
          title: String(doc.title || "Project from Contract").slice(0, 120),
          clientId: doc.clientId || undefined,
          client: doc.client || "",
          price: Number(doc.amount || 0),
          start: new Date(),
          deadline: doc.validUntil || undefined,
          status: "Open",
          description: `Created from Contract ${String(doc._id)}`,
          labels: `contract:${String(doc._id)}`,
        });
        if (project?._id) {
          await Invoice.updateMany(
            { labels: `contract:${String(doc._id)}`, $or: [{ projectId: { $exists: false } }, { projectId: null }] },
            { $set: { projectId: project._id, project: String(project.title || "") } }
          ).catch(() => null);
          doc = await Contract.findByIdAndUpdate(doc._id, { $set: { projectId: project._id } }, { new: true });
        }
      } catch {}
    }

    try {
      const contractObj = doc?.toObject ? doc.toObject() : doc;
      if (contractObj?._id) {
        const project = contractObj.projectId ? await Project.findById(contractObj.projectId).lean().catch(() => null) : null;
        await upsertInvoiceForContract({ contract: contractObj, project });
      }
    } catch {}

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try { const r = await Contract.findByIdAndDelete(req.params.id); if (!r) return res.status(404).json({ error: "Not found" }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
