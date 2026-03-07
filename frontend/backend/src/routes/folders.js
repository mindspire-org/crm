import { Router } from "express";
import Folder from "../models/Folder.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const employeeId = req.query.employeeId?.toString();
    const projectId = req.query.projectId?.toString();
    const leadId = req.query.leadId?.toString();
    const clientId = req.query.clientId?.toString();
    const ticketId = req.query.ticketId?.toString();
    const subscriptionId = req.query.subscriptionId?.toString();
    const taskId = req.query.taskId?.toString();
    const parentId = req.query.parentId?.toString();

    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (projectId) filter.projectId = projectId;
    if (leadId) filter.leadId = leadId;
    if (clientId) filter.clientId = clientId;
    if (ticketId) filter.ticketId = ticketId;
    if (subscriptionId) filter.subscriptionId = subscriptionId;
    if (taskId) filter.taskId = taskId;
    if (parentId && parentId !== "null" && parentId !== "") filter.parentId = parentId;
    else filter.parentId = null;

    const items = await Folder.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, employeeId, projectId, leadId, clientId, ticketId, taskId, subscriptionId, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Folder name is required" });

    const doc = await Folder.create({
      name: name.trim(),
      description: description || "",
      employeeId: employeeId || null,
      projectId: projectId || null,
      leadId: leadId || null,
      clientId: clientId || null,
      ticketId: ticketId || null,
      taskId: taskId || null,
      subscriptionId: subscriptionId || null,
      parentId: parentId || null,
      createdBy: req.user?.email || "",
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await Folder.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: "Not found" });

    // Check if folder has subfolders
    const subfolders = await Folder.countDocuments({ parentId: folder._id });
    if (subfolders > 0) {
      return res.status(400).json({ error: "Cannot delete folder with subfolders" });
    }

    await Folder.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
