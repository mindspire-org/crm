import { Router } from "express";
import Project from "../models/Project.js";
import { authenticate } from "../middleware/auth.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

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

const canCreateProjects = (role) => {
  const r = String(role || "").trim().toLowerCase();
  return r === "admin" || r === "project_manager";
};

// Helper: canonicalize label (title case)
const canonicalLabel = (label) => {
  if (!label) return "";
  const trimmed = String(label).trim();
  if (!trimmed) return "";
  // Preserve known priority labels exactly
  const lower = trimmed.toLowerCase();
  if (lower === "low priority") return "Low Priority";
  if (lower === "normal") return "Normal";
  if (lower === "urgent") return "Urgent";
  if (lower === "critical") return "Critical";
  // Title case for others
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Helper: check if deadline is <= 2 days away
const isWithinTwoDays = (deadline) => {
  if (!deadline) return false;
  const now = new Date();
  const d = new Date(deadline);
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= 2 && diffDays >= 0;
};

// Helper: notify admins (excluding info@mindspire.com)
const notifyAdmins = async (projectId, projectName, oldLabel) => {
  try {
    const admins = await User.find({ role: "admin", email: { $ne: "info@mindspire.com" } }).lean();
    const messages = admins.map(admin => ({
      userId: admin._id,
      title: `Project label auto-changed to Critical`,
      message: `Project "${projectName}" (ID: ${projectId}) label was automatically changed from "${oldLabel}" to "Critical" because its deadline is within 2 days.`,
      type: "system",
      createdAt: new Date(),
    }));
    if (messages.length) await Notification.insertMany(messages);
  } catch (e) {
    // ignore notification errors
  }
};

// One-time cleanup: delete admin info@mindspire.com
(async () => {
  try {
    const result = await User.deleteMany({ role: "admin", email: "info@mindspire.com" });
    if (result.deletedCount > 0) console.log(`Deleted ${result.deletedCount} admin(s): info@mindspire.com`);
  } catch (e) {
    console.error("Failed to cleanup admin info@mindspire.com:", e);
  }
})();

router.get("/labels", authenticate, async (req, res) => {
  try {
    if (!canViewProjects(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const builtin = ["Low Priority", "Normal", "Urgent", "Critical"];

    const filter = {};

    if (
      req.user.role === "admin" ||
      req.user.role === "sales" ||
      req.user.role === "sales_manager" ||
      req.user.role === "finance" ||
      req.user.role === "finance_manager" ||
      req.user.role === "marketer" ||
      req.user.role === "project_manager"
    ) {
      const employeeId = req.query.employeeId?.toString();
      if (employeeId) filter.employeeId = employeeId;
    } else if (req.user.role === "staff" || req.user.role === "marketing_manager") {
      const staffUser = await User.findOne({ email: req.user.email }).lean();
      if (!staffUser) return res.json([]);
      const employee = await Employee.findOne({ email: req.user.email }).lean();
      if (!employee) return res.json([]);
      filter.employeeId = employee._id;
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const docs = await Project.find(filter).select("labels").lean();
    const set = new Set();
    for (const v of builtin) set.add(v);
    for (const d of docs) {
      const raw = String(d?.labels || "");
      if (!raw.trim()) continue;
      for (const part of raw.split(",")) {
        const v = canonicalLabel(part || "");
        if (v) set.add(v);
      }
    }
    const out = Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/", authenticate, async (req, res) => {
  const q = req.query.q?.toString().trim();
  const clientId = req.query.clientId?.toString().trim();
  const filter = {};

  if (!canViewProjects(req.user?.role)) {
    return res.status(403).json({ error: "Access denied" });
  }

  // Role-based scoping
  if (
    req.user.role === "admin" ||
    req.user.role === "sales" ||
    req.user.role === "sales_manager" ||
    req.user.role === "finance" ||
    req.user.role === "finance_manager" ||
    req.user.role === "marketer" ||
    req.user.role === "project_manager"
  ) {
    // Can optionally filter by employeeId
    const employeeId = req.query.employeeId?.toString();
    if (employeeId) filter.employeeId = employeeId;
  } else if (req.user.role === "staff" || req.user.role === "marketing_manager" || req.user.role === "developer") {
    // Staff, developer and marketing_manager can only see projects assigned to them
    const staffUser = await User.findOne({ email: req.user.email }).lean();
    if (!staffUser) return res.json([]);
    const employee = await Employee.findOne({ email: req.user.email }).lean();
    if (!employee) return res.json([]);
    filter.employeeId = employee._id;
  } else {
    // Clients and other roles not allowed here
    return res.status(403).json({ error: "Access denied" });
  }

  if (clientId) {
    if (mongoose.isValidObjectId(clientId)) {
      filter.clientId = new mongoose.Types.ObjectId(clientId);
    } else {
      // tolerate legacy string storage
      filter.clientId = clientId;
    }
  }

  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { client: { $regex: q, $options: "i" } }];
  let items = await Project.find(filter).sort({ createdAt: -1 }).lean();

  // Auto-set label to Critical if deadline <= 2 days (run only for admins to avoid race conditions)
  if (req.user.role === "admin") {
    const updates = [];
    for (const proj of items) {
      if (isWithinTwoDays(proj.deadline) && String(proj.labels || "").trim().toLowerCase() !== "critical") {
        const oldLabel = proj.labels || "";
        updates.push({
          updateOne: {
            filter: { _id: proj._id },
            update: { $set: { labels: "Critical" } },
          },
        });
        // Notify admins async (fire-and-forget)
        setImmediate(() => notifyAdmins(proj._id, proj.title || "Untitled", oldLabel));
      }
    }
    if (updates.length) await Project.bulkWrite(updates);
    // Refetch to reflect changes
    items = await Project.find(filter).sort({ createdAt: -1 }).lean();
  }

  if (String(req.user?.role || "").toLowerCase() === "marketer") {
    for (const it of items) {
      try { delete it.price; } catch {}
    }
  }
  res.json(items);
});

// Get single project by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Project.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    if (!canViewProjects(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Role-based access check
    if (
      req.user.role === "admin" ||
      req.user.role === "sales" ||
      req.user.role === "sales_manager" ||
      req.user.role === "finance" ||
      req.user.role === "finance_manager" ||
      req.user.role === "marketer" ||
      req.user.role === "project_manager"
    ) {
      // Admin/sales/finance/marketer can view any project
    } else if (req.user.role === "staff" || req.user.role === "marketing_manager" || req.user.role === "developer") {
      // Staff/developer/marketing_manager can only view projects assigned to them
      const employee = await Employee.findOne({ email: req.user.email }).lean();
      if (!employee || String(doc.employeeId) !== String(employee._id)) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    if (String(req.user?.role || "").toLowerCase() === "marketer") {
      try { delete doc.price; } catch {}
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  // Only admins can create projects
  if (!canCreateProjects(req.user?.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const doc = await Project.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const pre = await Project.findById(req.params.id).lean();
    const doc = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Role-based update permissions
    if (req.user.role === "admin" || req.user.role === "project_manager") {
      // Admin and project_manager can update any project
    } else if (req.user.role === "staff" || req.user.role === "developer") {
      // Staff/developer can only update projects assigned to them (limited fields)
      const employee = await Employee.findOne({ email: req.user.email }).lean();
      if (!employee || String(doc.employeeId) !== String(employee._id)) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Staff/developer can only update certain fields (progress, status, etc.)
      const allowedUpdates = ["progress", "status", "description", "clientRequirements", "deliveryDocument"];
      const updates = Object.keys(req.body);
      const hasInvalidUpdates = updates.some(key => !allowedUpdates.includes(key));
      if (hasInvalidUpdates) {
        return res.status(403).json({ error: "You can only update progress, status, description, clientRequirements, or deliveryDocument" });
      }
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    // Notify newly assigned employee (admin only)
    try {
      const nextEmployeeId = req.body?.employeeId;
      if (req.user.role === "admin" && nextEmployeeId && String(nextEmployeeId) !== String(pre?.employeeId || "")) {
        const emp = await Employee.findById(nextEmployeeId).lean();
        const email = String(emp?.email || "").toLowerCase().trim();
        if (email) {
          const u = await User.findOne({ email }).select("_id").lean();
          if (u?._id) {
            await Notification.create({
              userId: u._id,
              type: "project_assigned",
              title: "New project assigned",
              message: String(doc.title || "Project"),
              href: `/projects/overview/${doc._id}`,
              meta: { projectId: doc._id },
            });
          }
        }
      }
    } catch {
      // best-effort
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  // Only admins can delete projects
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const r = await Project.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
