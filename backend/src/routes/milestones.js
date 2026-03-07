import { Router } from "express";
import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const canViewProjects = (role) => {
  const r = String(role || "").trim().toLowerCase();
  return (
    r === "admin" ||
    r === "staff" ||
    r === "marketer" ||
    r === "sales" ||
    r === "sales_manager" ||
    r === "finance" ||
    r === "finance_manager" ||
    r === "developer" ||
        r === "project_manager" ||
    r === "marketing_manager"
  );
};

async function assertProjectAccess(req, res, projectId) {
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return null;
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }

  if (!canViewProjects(req.user?.role)) {
    res.status(403).json({ error: "Access denied" });
    return null;
  }

  const role = String(req.user?.role || "").trim().toLowerCase();
  if (
    role === "admin" ||
    role === "sales" ||
    role === "sales_manager" ||
    role === "finance" ||
    role === "finance_manager" ||
    role === "marketer" ||
        role === "project_manager" ||
    role === "marketing_manager"
  ) {
    return project;
  }

  if (role === "staff" || role === "developer") {
    const employee = await Employee.findOne({ email: req.user?.email }).lean();
    if (!employee || String(project.employeeId || "") !== String(employee._id || "")) {
      res.status(403).json({ error: "Access denied" });
      return null;
    }
    return project;
  }

  res.status(403).json({ error: "Access denied" });
  return null;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const projectId = req.query.projectId?.toString();
    const project = await assertProjectAccess(req, res, projectId);
    if (!project) return;

    const items = await Milestone.find({ projectId }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const projectId = req.body?.projectId;
    const project = await assertProjectAccess(req, res, projectId);
    if (!project) return;

    const payload = {
      projectId,
      title: String(req.body?.title || ""),
      due: req.body?.due ? new Date(req.body.due) : undefined,
      amount: req.body?.amount != null ? Number(req.body.amount) || 0 : 0,
      status: String(req.body?.status || "Open"),
    };

    const doc = await Milestone.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Milestone.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });

    const project = await assertProjectAccess(req, res, req.body?.projectId || existing.projectId);
    if (!project) return;

    const updates = {
      title: req.body?.title != null ? String(req.body.title) : existing.title,
      due: req.body?.due ? new Date(req.body.due) : existing.due,
      amount: req.body?.amount != null ? Number(req.body.amount) || 0 : existing.amount,
      status: req.body?.status != null ? String(req.body.status) : existing.status,
    };

    const doc = await Milestone.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Milestone.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });

    const project = await assertProjectAccess(req, res, req.query?.projectId || existing.projectId);
    if (!project) return;

    const r = await Milestone.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
