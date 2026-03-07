import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import Ticket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Employee from "../models/Employee.js";

const router = Router();

const ensureCounterAtLeast = async (minSeq) => {
  const n = Number(minSeq || 0) || 0;
  await Counter.findOneAndUpdate(
    { key: "ticket" },
    { $max: { value: n } },
    { upsert: true, new: true }
  );
};

const assignTicketNoIfMissing = async (doc) => {
  if (!doc || doc.ticketNo) return doc;
  const c = await Counter.findOneAndUpdate(
    { key: "ticket" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  const nextNo = c?.value;
  if (!nextNo) return doc;
  await Ticket.updateOne({ _id: doc._id, ticketNo: { $exists: false } }, { $set: { ticketNo: nextNo } });
  await Ticket.updateOne({ _id: doc._id, ticketNo: null }, { $set: { ticketNo: nextNo } });
  doc.ticketNo = nextNo;
  return doc;
};

const getMyEmployeeId = async (req) => {
  if (req.user?.role !== "staff" && req.user?.role !== "marketer") return null;
  const employee = await Employee.findOne({ email: req.user.email }).select("_id").lean();
  return employee ? String(employee._id) : null;
};

const ensureTicketAccess = async (req, res, ticket) => {
  if (!ticket) return true;
  if (req.user?.role === "admin") return true;
  if (req.user?.role === "staff" || req.user?.role === "marketer") {
    const myEmployeeId = await getMyEmployeeId(req);
    if (!myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    if (String(ticket.assignedTo || "") !== myEmployeeId) {
      res.status(403).json({ error: "Access denied" });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: "Access denied" });
  return false;
};

router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    
    const filter = {};
    if (req.user.role === "staff" || req.user.role === "marketer") {
      const myEmployeeId = await getMyEmployeeId(req);
      if (!myEmployeeId) return res.json([]);
      // Ticket.assignedTo is stored as a string in schema
      filter.assignedTo = myEmployeeId;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    if (clientId) {
      if (mongoose.isValidObjectId(clientId)) {
        filter.clientId = new mongoose.Types.ObjectId(clientId);
      } else {
        // be tolerant: try matching by stored string clientId or by client name
        filter.$or = [
          ...(filter.$or || []),
          { clientId: clientId },
          { client: { $regex: clientId, $options: "i" } },
        ];
      }
    }
    if (q) filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { client: { $regex: q, $options: "i" } },
      { type: { $regex: q, $options: "i" } },
      { labels: { $elemMatch: { $regex: q, $options: "i" } } },
    ];
    const items = await Ticket.find(filter).sort({ createdAt: -1 }).lean();

    const maxNo = items.reduce((m, it) => Math.max(m, Number(it?.ticketNo || 0) || 0), 0);
    await ensureCounterAtLeast(maxNo);
    for (const it of items) {
      if (!it.ticketNo) await assignTicketNoIfMissing(it);
    }

    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    const payload = req.body || {};
    const doc = await Ticket.create(payload);
    await assignTicketNoIfMissing(doc);
    res.status(201).json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Ticket.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    if (!(await ensureTicketAccess(req, res, doc))) return;
    await ensureCounterAtLeast(Number(doc?.ticketNo || 0) || 0);
    if (!doc.ticketNo) await assignTicketNoIfMissing(doc);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/merge", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    const sourceId = req.body?.sourceId?.toString();
    if (!sourceId) return res.status(400).json({ error: "sourceId is required" });
    if (sourceId === req.params.id) return res.status(400).json({ error: "Cannot merge into same ticket" });

    const target = await Ticket.findById(req.params.id);
    const source = await Ticket.findById(sourceId);
    if (!target || !source) return res.status(404).json({ error: "Not found" });

    const targetLabels = Array.isArray(target.labels) ? target.labels : [];
    const sourceLabels = Array.isArray(source.labels) ? source.labels : [];
    const labels = Array.from(new Set([...targetLabels, ...sourceLabels]));

    const targetMsgs = Array.isArray(target.messages) ? target.messages : [];
    const sourceMsgs = Array.isArray(source.messages) ? source.messages : [];
    const messages = [...targetMsgs, ...sourceMsgs].sort((a, b) => {
      const at = new Date(a?.createdAt || 0).getTime();
      const bt = new Date(b?.createdAt || 0).getTime();
      return at - bt;
    });

    target.labels = labels;
    target.messages = messages;
    target.lastActivity = new Date();
    await target.save();

    source.status = "closed";
    source.lastActivity = new Date();
    await source.save();

    res.json(await Ticket.findById(req.params.id).lean());
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/messages", authenticate, async (req, res) => {
  try {
    const text = req.body?.text?.toString() || "";
    const createdBy = req.body?.createdBy?.toString() || "";
    if (!text.trim()) return res.status(400).json({ error: "Message text is required" });
    const existing = await Ticket.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await ensureTicketAccess(req, res, existing))) return;
    const msg = { text: text.trim(), createdBy, createdAt: new Date() };
    const doc = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: msg }, $set: { lastActivity: new Date() } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Ticket.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!(await ensureTicketAccess(req, res, existing))) return;
    if ((req.user.role === "staff" || req.user.role === "marketer") && String(req.body?.status || "").toLowerCase() === "closed") {
      return res.status(403).json({ error: "Access denied" });
    }
    const doc = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
  try {
    const r = await Ticket.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
