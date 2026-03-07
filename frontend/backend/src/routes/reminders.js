import { Router } from "express";
import Reminder from "../models/Reminder.js";
import Lead from "../models/Lead.js";
import Employee from "../models/Employee.js";
import { authenticate, applyDataScope } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.use(applyDataScope);

const getMyEmployeeId = async (req) => {
  const email = req.user?.email;
  if (!email) return null;
  const emp = await Employee.findOne({ email }).select("_id").lean();
  return emp ? String(emp._id) : null;
};

const ensureLeadAccess = async (req, res, lead) => {
  if (!lead) return true;
  if (req.user?.role === "admin") return true;
  if (req.user?.role === "marketing_manager") return true;
  if (req.user?.role === "sales_manager") return true;

  if (
    req.user?.role === "marketer" ||
    req.user?.role === "sales" ||
    req.user?.role === "staff" ||
    req.user?.role === "manager" ||
    req.user?.role === "finance" ||
    req.user?.role === "finance_manager" ||
    req.user?.role === "developer" ||
        req.user?.role === "project_manager"
  ) {
    const myEmployeeId = await getMyEmployeeId(req);
    if (!myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    if (String(lead.ownerId || "") !== myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    return true;
  }

  res.status(403).json({ error: "Access denied" });
  return false;
};

router.get("/", async (req, res) => {
  try {
    const leadId = req.query.leadId?.toString().trim();
    const invoiceId = req.query.invoiceId?.toString().trim();
    const estimateId = req.query.estimateId?.toString().trim();
    const subscriptionId = req.query.subscriptionId?.toString().trim();
    if (!leadId && !invoiceId && !estimateId && !subscriptionId) return res.status(400).json({ error: "leadId, invoiceId, estimateId, or subscriptionId is required" });

    const filter = {};
    if (leadId) filter.leadId = leadId;
    if (invoiceId) filter.invoiceId = invoiceId;
    if (estimateId) filter.estimateId = estimateId;
    if (subscriptionId) filter.subscriptionId = subscriptionId;

     // If querying by lead, enforce lead access (admin or marketer owner)
     if (leadId) {
       const lead = await Lead.findById(leadId).select("ownerId").lean();
       if (!lead) return res.json([]);
       if (!(await ensureLeadAccess(req, res, lead))) return;
     }

    const items = await Reminder.find(filter).sort({ doneAt: 1, dueAt: 1, createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/next", async (req, res) => {
  try {
    const raw = String(req.query.leadIds || "").trim();
    const includeOverdue = String(req.query.includeOverdue || "").trim() === "1";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return res.json({});

    const allowed = [];
    if (req.user?.role === "admin") {
      allowed.push(...ids);
    } else if (req.user?.role === "marketing_manager") {
      allowed.push(...ids);
    } else if (
      req.user?.role === "marketer" ||
      req.user?.role === "sales" ||
      req.user?.role === "staff" ||
      req.user?.role === "manager" ||
      req.user?.role === "finance" ||
      req.user?.role === "finance_manager" ||
      req.user?.role === "developer" ||
            req.user?.role === "project_manager"
    ) {
      const myEmployeeId = await getMyEmployeeId(req);
      if (!myEmployeeId) return res.json({});
      const owned = await Lead.find({ _id: { $in: ids }, ownerId: myEmployeeId }).select("_id").lean();
      allowed.push(...owned.map((x) => String(x._id)));
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!allowed.length) return res.json({});
    const now = new Date();
    const docs = await Reminder.find({
      leadId: { $in: allowed },
      $or: [{ doneAt: { $exists: false } }, { doneAt: null }],
      ...(includeOverdue ? { dueAt: { $exists: true, $ne: null } } : { dueAt: { $gte: now } }),
    })
      .sort({ dueAt: 1 })
      .lean();

    const out = {};
    for (const r of docs) {
      const lid = String(r.leadId || "");
      if (!lid) continue;
      if (out[lid]) continue;
      out[lid] = r;
    }
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const leadId = (req.body?.leadId?.toString?.() ?? "").trim();
    const invoiceId = (req.body?.invoiceId?.toString?.() ?? "").trim();
    const estimateId = (req.body?.estimateId?.toString?.() ?? "").trim();
    const subscriptionId = (req.body?.subscriptionId?.toString?.() ?? "").trim();
    if (!leadId && !invoiceId && !estimateId && !subscriptionId) return res.status(400).json({ error: "leadId, invoiceId, estimateId, or subscriptionId is required" });

    if (leadId) {
      const lead = await Lead.findById(leadId).select("ownerId").lean();
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      if (!(await ensureLeadAccess(req, res, lead))) return;
    }

    const title = (req.body?.title ?? "").toString();
    const repeat = Boolean(req.body?.repeat);
    const dueAt = req.body?.dueAt ? new Date(req.body.dueAt) : undefined;
    const channel = (req.body?.channel ?? "").toString();
    const message = (req.body?.message ?? "").toString();

    const doc = await Reminder.create({
      leadId: leadId || undefined,
      invoiceId: invoiceId || undefined,
      estimateId: estimateId || undefined,
      subscriptionId: subscriptionId || undefined,
      title,
      repeat,
      dueAt,
      channel,
      message,
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await Reminder.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.leadId) {
      const lead = await Lead.findById(existing.leadId).select("ownerId").lean();
      if (lead && !(await ensureLeadAccess(req, res, lead))) return;
    }

    const title = req.body?.title !== undefined ? (req.body.title ?? "").toString() : undefined;
    const repeat = req.body?.repeat !== undefined ? Boolean(req.body.repeat) : undefined;
    const dueAt = req.body?.dueAt !== undefined ? (req.body.dueAt ? new Date(req.body.dueAt) : undefined) : undefined;
    const doneAt = req.body?.doneAt !== undefined ? (req.body.doneAt ? new Date(req.body.doneAt) : undefined) : undefined;
    const channel = req.body?.channel !== undefined ? (req.body.channel ?? "").toString() : undefined;
    const message = req.body?.message !== undefined ? (req.body.message ?? "").toString() : undefined;

    const payload = {};
    if (title !== undefined) payload.title = title;
    if (repeat !== undefined) payload.repeat = repeat;
    if (req.body?.dueAt !== undefined) payload.dueAt = dueAt;
    if (req.body?.doneAt !== undefined) {
      if (req.body.doneAt === null) {
        payload.$unset = { ...(payload.$unset || {}), doneAt: 1 };
      } else {
        payload.doneAt = doneAt;
      }
    }
    if (channel !== undefined) payload.channel = channel;
    if (message !== undefined) payload.message = message;

    const doc = await Reminder.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const existing = await Reminder.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.leadId) {
      const lead = await Lead.findById(existing.leadId).select("ownerId").lean();
      if (lead && !(await ensureLeadAccess(req, res, lead))) return;
    }
    const r = await Reminder.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
