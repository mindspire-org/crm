import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";
import Ticket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Announcement from "../models/Announcement.js";
import ProjectRequest from "../models/ProjectRequest.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Invoice from "../models/Invoice.js";
import Estimate from "../models/Estimate.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";

const router = Router();

const requireClient = (req, res, next) => {
  if (!req.user || req.user.role !== "client") {
    return res.status(403).json({ error: "Client access required" });
  }
  if (!req.user.clientId) {
    return res.status(403).json({ error: "Client is not linked to a clientId" });
  }
  next();
};

const buildClientMatch = async (clientId) => {
  const cid = String(clientId || "").trim();
  const base = { clientId: cid };
  try {
    const client = await Client.findById(cid).select("company person").lean();
    const names = [client?.company, client?.person]
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    if (names.length === 0) return base;
    return { $or: [base, { client: { $in: names } }] };
  } catch {
    return base;
  }
};

const ensureCounterAtLeast = async (minSeq) => {
  const n = Number(minSeq || 0) || 0;
  await Counter.findOneAndUpdate(
    { name: "ticket" },
    { $max: { seq: n } },
    { upsert: true, new: true }
  );
};

const assignTicketNoIfMissing = async (doc) => {
  if (!doc || doc.ticketNo) return doc;
  const c = await Counter.findOneAndUpdate(
    { name: "ticket" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const nextNo = c?.seq;
  if (!nextNo) return doc;
  await Ticket.updateOne({ _id: doc._id, ticketNo: { $exists: false } }, { $set: { ticketNo: nextNo } });
  await Ticket.updateOne({ _id: doc._id, ticketNo: null }, { $set: { ticketNo: nextNo } });
  doc.ticketNo = nextNo;
  return doc;
};

router.get("/me", authenticate, requireClient, async (req, res) => {
  try {
    const client = await Client.findById(req.user.clientId).lean();
    const user = typeof req.user.toObject === "function" ? req.user.toObject() : req.user;
    res.json({ user, client });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/projects", authenticate, requireClient, async (req, res) => {
  try {
    const items = await Project.find({ clientId: req.user.clientId }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/invoices", authenticate, requireClient, async (req, res) => {
  try {
    const match = await buildClientMatch(req.user.clientId);
    const items = await Invoice.find(match).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/estimates", authenticate, requireClient, async (req, res) => {
  try {
    const match = await buildClientMatch(req.user.clientId);
    const items = await Estimate.find(match).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/proposals", authenticate, requireClient, async (req, res) => {
  try {
    const match = await buildClientMatch(req.user.clientId);
    const items = await Proposal.find(match).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/contracts", authenticate, requireClient, async (req, res) => {
  try {
    const match = await buildClientMatch(req.user.clientId);
    const items = await Contract.find(match).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/projects/:id", authenticate, requireClient, async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: req.params.id, clientId: req.user.clientId }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/tickets", authenticate, requireClient, async (req, res) => {
  try {
    const projectId = req.query.projectId?.toString();
    const filter = { clientId: req.user.clientId };
    if (projectId) filter.projectId = projectId;

    const items = await Ticket.find(filter).sort({ createdAt: -1 }).lean();

    const maxNo = items.reduce((m, it) => Math.max(m, Number(it?.ticketNo || 0) || 0), 0);
    await ensureCounterAtLeast(maxNo);
    for (const it of items) {
      if (!it.ticketNo) await assignTicketNoIfMissing(it);
    }

    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/tickets", authenticate, requireClient, async (req, res) => {
  try {
    const { title, description, type, labels, projectId } = req.body || {};

    if (!String(title || "").trim()) return res.status(400).json({ error: "Title is required" });
    if (!projectId) return res.status(400).json({ error: "projectId is required" });
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) {
      return res.status(400).json({ error: "Invalid projectId" });
    }

    const project = await Project.findOne({ _id: projectId, clientId: req.user.clientId }).lean();
    if (!project) return res.status(403).json({ error: "Invalid projectId for this client" });

    const client = await Client.findById(req.user.clientId).lean();
    const clientName = client?.company || client?.person || project?.client || "";

    const payload = {
      projectId,
      clientId: req.user.clientId,
      client: clientName,
      title: String(title).trim(),
      description: String(description || ""),
      requestedBy: req.user?.name || req.user?.email || "",
      type: String(type || "general"),
      labels: Array.isArray(labels) ? labels : [],
      status: "open",
      lastActivity: new Date(),
    };

    const doc = await Ticket.create(payload);
    await assignTicketNoIfMissing(doc);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/tickets/:id", authenticate, requireClient, async (req, res) => {
  try {
    const doc = await Ticket.findOne({ _id: req.params.id, clientId: req.user.clientId }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    await ensureCounterAtLeast(Number(doc?.ticketNo || 0) || 0);
    if (!doc.ticketNo) await assignTicketNoIfMissing(doc);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/tickets/:id/messages", authenticate, requireClient, async (req, res) => {
  try {
    const text = req.body?.text?.toString() || "";
    if (!text.trim()) return res.status(400).json({ error: "Message text is required" });

    const ticket = await Ticket.findOne({ _id: req.params.id, clientId: req.user.clientId }).lean();
    if (!ticket) return res.status(404).json({ error: "Not found" });

    if (ticket.projectId) {
      const project = await Project.findOne({ _id: ticket.projectId, clientId: req.user.clientId }).lean();
      if (!project) return res.status(403).json({ error: "Ticket project is not accessible" });
    }

    const msg = {
      text: text.trim(),
      createdBy: req.user?.name || req.user?.email || "",
      createdAt: new Date(),
    };

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

router.get("/announcements", authenticate, requireClient, async (req, res) => {
  try {
    const now = new Date();
    const items = await Announcement.find({
      isActive: true,
      "shareWith.clients": true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/client/project-requests - Create a new project request
router.post("/project-requests", authenticate, requireClient, async (req, res) => {
  try {
    const { title, description, budget, deadline } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const projectRequest = new ProjectRequest({
      clientId: req.user.clientId,
      title: title.trim(),
      description: description.trim(),
      budget: budget?.trim() || undefined,
      deadline: deadline ? new Date(deadline) : undefined,
    });

    await projectRequest.save();

    try {
      const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
      const now = new Date();
      if (admins.length) {
        const clientName = String(req.user?.name || req.user?.email || "Client");
        await Notification.insertMany(
          admins.map((a) => ({
            userId: a._id,
            type: "project_request_new",
            title: "New project request",
            message: `${clientName}: ${String(title).trim()}`,
            href: "/project-requests",
            meta: { projectRequestId: projectRequest._id, clientId: req.user.clientId },
            createdAt: now,
            updatedAt: now,
          })),
          { ordered: false }
        );
      }
    } catch {
      // best-effort
    }

    res.status(201).json(projectRequest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/client/project-requests - List client's project requests
router.get("/project-requests", authenticate, requireClient, async (req, res) => {
  try {
    const requests = await ProjectRequest.find({ clientId: req.user.clientId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
