import { Router } from "express";
import mongoose from "mongoose";
import { authenticate, isAdmin } from "../middleware/auth.js";
import ProjectRequest from "../models/ProjectRequest.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

const router = Router();

router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const status = req.query.status?.toString().trim();
    const clientId = req.query.clientId?.toString().trim();

    const filter = {};
    if (status) filter.status = status;

    if (clientId) {
      if (mongoose.Types.ObjectId.isValid(clientId)) {
        filter.clientId = clientId;
      } else {
        filter._id = null;
      }
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const items = await ProjectRequest.find(filter)
      .populate("clientId", "company person")
      .populate({
        path: "projectId",
        populate: {
          path: "employeeId",
          select: "name email",
          model: "Employee",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = items.map((doc) => ({
      ...doc,
      clientName: doc.clientId?.company || doc.clientId?.person || "Client",
      employeeId: doc.projectId?.employeeId?._id,
      employeeName: doc.projectId?.employeeId?.name,
    }));

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const doc = await ProjectRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { status, title, description, budget, deadline } = req.body || {};

    const update = {};
    if (status) update.status = status;
    if (typeof title === "string") update.title = title;
    if (typeof description === "string") update.description = description;
    if (typeof budget === "string") update.budget = budget;
    if (deadline === null || deadline === "") update.deadline = null;
    if (deadline) update.deadline = new Date(deadline);

    const pre = await ProjectRequest.findById(req.params.id).lean();
    if (!pre) return res.status(404).json({ error: "Not found" });

    // If admin approves and no project exists yet, create one and link it.
    if (update.status === "approved" && !pre.projectId) {
      const client = await Client.findById(pre.clientId).select("company person").lean();
      const clientName = client?.company || client?.person || "Client";

      const project = await Project.create({
        clientId: pre.clientId,
        client: clientName,
        title: typeof update.title === "string" ? update.title : pre.title,
        description: typeof update.description === "string" ? update.description : pre.description,
        deadline: Object.prototype.hasOwnProperty.call(update, "deadline") ? update.deadline : pre.deadline,
        status: "Open",
      });

      update.projectId = project._id;
    }

    const doc = await ProjectRequest.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Include clientName in response for UI convenience
    const client = await Client.findById(doc.clientId).select("company person").lean();
    const clientName = client?.company || client?.person || "Client";
    res.json({ ...doc, clientName });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
