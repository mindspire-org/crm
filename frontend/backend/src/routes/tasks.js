import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import Task from "../models/Task.js";
import File from "../models/File.js";
import Invoice from "../models/Invoice.js";
import Counter from "../models/Counter.js";
import Employee from "../models/Employee.js";
import Project from "../models/Project.js";
import { broadcastSse } from "../services/realtime.js";

const router = Router();

const ensureCounterAtLeast = async (minSeq) => {
  const n = Number(minSeq || 0) || 0;
  await Counter.findOneAndUpdate(
    { $or: [{ key: "task" }, { name: "task" }] },
    { $max: { value: n }, $set: { key: "task", name: "task" } },
    { upsert: true, new: true }
  );
};

const assignTaskNoIfMissing = async (doc) => {
  if (!doc || doc.taskNo) return doc;
  const c = await Counter.findOneAndUpdate(
    { $or: [{ key: "task" }, { name: "task" }] },
    { $inc: { value: 1 }, $set: { key: "task", name: "task" } },
    { new: true, upsert: true }
  );
  const nextNo = c?.value;
  if (!nextNo) return doc;

  // only set if still missing to avoid races
  await Task.updateOne({ _id: doc._id, taskNo: { $exists: false } }, { $set: { taskNo: nextNo } });
  await Task.updateOne({ _id: doc._id, taskNo: null }, { $set: { taskNo: nextNo } });
  doc.taskNo = nextNo;
  return doc;
};

const resolveAuthorName = (req) => {
  const name = String(req.user?.name || "").trim();
  if (name) return name;
  const email = String(req.user?.email || "").trim();
  return email;
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveEmployeeName = async (req) => {
  const byUser = String(req.user?.name || "").trim();
  if (byUser) return byUser;

  const email = String(req.user?.email || "").trim();
  if (!email) return "";

  const employee = await Employee.findOne({ email }).lean();
  if (!employee) return "";
  return (employee.name || `${employee.firstName || ""} ${employee.lastName || ""}`.trim()).trim();
};

const recalcProjectProgress = async (projectId) => {
  const pid = String(projectId || "").trim();
  if (!pid) return;
  if (!mongoose.Types.ObjectId.isValid(pid)) return;
  try {
    const total = await Task.countDocuments({ projectId: pid });
    if (!total) {
      await Project.findByIdAndUpdate(pid, { progress: 0 }, { new: false });
      return;
    }
    const done = await Task.countDocuments({ projectId: pid, status: { $in: ["done"] } });
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    await Project.findByIdAndUpdate(pid, { progress: pct }, { new: false });
  } catch {
    // ignore
  }
};

const buildTaskVisibilityFilter = async (req) => {
  if (!req.user) return {};
  if (req.user.role === "admin") return {};

  const userId = req.user._id;
  const email = String(req.user.email || "").trim();
  const employeeName = await resolveEmployeeName(req);
  const nameRegex = employeeName ? { $regex: `^${escapeRegex(employeeName)}$`, $options: "i" } : null;

  const or = [{ createdByUserId: userId }];
  if (email) or.push({ createdByEmail: { $regex: `^${escapeRegex(email)}$`, $options: "i" } });
  if (nameRegex) {
    or.push({ "assignees.name": nameRegex });
    // collaborators is stored as an array of employee names
    or.push({ collaborators: nameRegex });
  }

  return { $or: or };
};

const isTaskOwner = (task, user) => {
  if (!task || !user) return false;
  const byUserId = task.createdByUserId && String(task.createdByUserId) === String(user._id);
  const byEmail = task.createdByEmail && String(task.createdByEmail).toLowerCase() === String(user.email || "").toLowerCase();
  return byUserId || byEmail;
};

const isTaskAssigneeOrCollaborator = (task, employeeName) => {
  if (!task || !employeeName) return false;
  const isAssignee = (task.assignees || []).some(
    (a) => String(a?.name || "").toLowerCase() === String(employeeName).toLowerCase()
  );
  const isCollaborator = (task.collaborators || []).some(
    (n) => String(n || "").toLowerCase() === String(employeeName).toLowerCase()
  );
  return isAssignee || isCollaborator;
};

const filterToStatusOnly = (body) => {
  const allowed = ["status", "activity"];
  const filtered = {};
  for (const key of allowed) {
    if (body[key] !== undefined) filtered[key] = body[key];
  }
  return filtered;
};

const filterToAllowedFields = (body, allowedFields) => {
  const filtered = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) filtered[key] = body[key];
  }
  // Always include activity if present
  if (body.activity !== undefined) filtered.activity = body.activity;
  return filtered;
};

const buildAutoActivityMessage = (prev, next) => {
  const changes = [];
  if (next.title !== undefined && String(next.title) !== String(prev.title || "")) changes.push("title");
  if (next.status !== undefined && String(next.status) !== String(prev.status || "")) changes.push(`status → ${next.status}`);
  if (next.priority !== undefined && String(next.priority) !== String(prev.priority || "")) changes.push(`priority → ${next.priority}`);
  if (next.deadline !== undefined && String(next.deadline || "") !== String(prev.deadline || "")) changes.push("deadline");
  if (next.dueDate !== undefined && String(next.dueDate || "") !== String(prev.dueDate || "")) changes.push("due date");
  if (next.assignees !== undefined) changes.push("assignees");
  if (next.collaborators !== undefined) changes.push("collaborators");
  if (next.tags !== undefined) changes.push("tags");

  if (!changes.length) return "";
  if (changes.length === 1) return `Updated ${changes[0]}`;
  return `Updated ${changes.slice(0, 3).join(", ")}${changes.length > 3 ? "…" : ""}`;
};

// Activity feed (flattened)
router.get("/activity", authenticate, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const author = String(req.query.author || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const limitRaw = Number(req.query.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const visibility = await buildTaskVisibilityFilter(req);
    const matchTasks = { ...visibility, activity: { $exists: true, $ne: [] } };

    const pipeline = [
      { $match: matchTasks },
      { $unwind: "$activity" },
    ];

    const activityMatch = {};
    if (author) activityMatch["activity.authorName"] = { $regex: author, $options: "i" };
    if (from || to) {
      const range = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      activityMatch["activity.createdAt"] = range;
    }
    if (Object.keys(activityMatch).length) pipeline.push({ $match: activityMatch });

    pipeline.push({
      $project: {
        _id: 0,
        activityId: "$activity._id",
        taskId: "$_id",
        taskNo: "$taskNo",
        taskTitle: "$title",
        type: "$activity.type",
        message: "$activity.message",
        authorName: "$activity.authorName",
        createdAt: "$activity.createdAt",
      },
    });

    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { taskTitle: { $regex: q, $options: "i" } },
            { message: { $regex: q, $options: "i" } },
            { authorName: { $regex: q, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $limit: limit });

    const out = await Task.aggregate(pipeline);
    res.json(Array.isArray(out) ? out : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List with optional filters
router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const status = req.query.status?.toString().trim();
    const priority = req.query.priority?.toString().trim();
    const assignedTo = req.query.assignedTo?.toString().trim();
    const tag = req.query.tag?.toString().trim();
    const deadlineFrom = req.query.deadlineFrom?.toString().trim();
    const deadlineTo = req.query.deadlineTo?.toString().trim();
    const projectId = req.query.projectId?.toString();
    const invoiceIdQ = req.query.invoiceId?.toString();
    const leadIdQ = req.query.leadId?.toString();
    const ticketIdQ = req.query.ticketId?.toString();

    const visibility = await buildTaskVisibilityFilter(req);
    const filter = { ...visibility };
    
    // Apply additional filters
    if (projectId) filter.projectId = projectId;
    if (leadIdQ) filter.leadId = leadIdQ;
    if (ticketIdQ) filter.ticketId = ticketIdQ;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter["assignees.name"] = { $regex: assignedTo, $options: "i" };
    if (tag) filter.tags = { $elemMatch: { $regex: tag, $options: "i" } };
    if (deadlineFrom || deadlineTo) {
      const range = {};
      if (deadlineFrom) range.$gte = new Date(deadlineFrom);
      if (deadlineTo) range.$lte = new Date(deadlineTo);
      filter.deadline = range;
    }
    
    // Apply search filter
    if (q) {
      const rawQ = String(q).trim();
      const qNoStr = rawQ.startsWith("#") ? rawQ.slice(1).trim() : rawQ;
      const qNo = /^\d+$/.test(qNoStr) ? Number(qNoStr) : null;
      filter.$or = [
        { title: { $regex: rawQ, $options: "i" } },
        { description: { $regex: rawQ, $options: "i" } },
        { tags: { $elemMatch: { $regex: rawQ, $options: "i" } } },
        ...(qNo !== null ? [{ taskNo: qNo }] : []),
      ];
    }

    // Handle invoice lookup via invoiceId
    let invoiceMatch = {};
    if (invoiceIdQ) {
      const invoiceObjId = mongoose.Types.ObjectId.isValid(invoiceIdQ) ? invoiceIdQ : null;
      if (invoiceObjId) {
        invoiceMatch = { invoiceId: invoiceObjId };
      } else {
        invoiceMatch = { invoiceId: null };
      }
    }

    const finalFilter = { ...filter, ...invoiceMatch };
    
    // Execute query
    const docs = await Task.find(finalFilter)
      .populate("projectId", "title")
      .populate("leadId", "name")
      .populate("ticketId", "subject")
      .sort({ createdAt: -1 })
      .lean();
    
    // Count attachments for each task
    const taskIds = docs.map(d => d._id.toString());
    const attachmentCounts = await File.aggregate([
      { $match: { taskId: { $in: taskIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$taskId", count: { $sum: 1 } } }
    ]);
    
    const countMap = new Map(attachmentCounts.map(ac => [ac._id.toString(), ac.count]));
    
    // Assign task numbers if missing and add attachments count
    const withNumbersAndAttachments = await Promise.all(
      docs.map(async (doc) => {
        const withNumber = await assignTaskNoIfMissing(doc);
        return {
          ...withNumber,
          attachments: countMap.get(doc._id.toString()) || 0
        };
      })
    );
    res.json(withNumbersAndAttachments);
  } catch (e) {

    res.status(500).json({ error: e.message });
  }
});

// Read one
router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Task.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });

    const employeeName = await resolveEmployeeName(req);
    const isCreator = doc.createdByUserId && String(doc.createdByUserId) === String(req.user._id);
    const isCreatorByEmail = doc.createdByEmail && String(doc.createdByEmail).toLowerCase() === String(req.user.email || "").toLowerCase();
    const isAssignee = employeeName
      ? (doc.assignees || []).some((a) => String(a?.name || "").toLowerCase() === String(employeeName).toLowerCase())
      : false;
    const isCollaborator = employeeName
      ? (doc.collaborators || []).some((n) => String(n || "").toLowerCase() === String(employeeName).toLowerCase())
      : false;

    if (!isCreator && !isCreatorByEmail && !isAssignee && !isCollaborator) {
      return res.status(403).json({ error: "Not allowed to view this task" });
    }

    const maxExisting = await Task.findOne({ taskNo: { $ne: null } })
      .sort({ taskNo: -1 })
      .select("taskNo")
      .lean();
    await ensureCounterAtLeast(maxExisting?.taskNo || 0);

    await assignTaskNoIfMissing(doc);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create
router.post("/", authenticate, async (req, res) => {
  try {
    const author = resolveAuthorName(req);
    if (!Array.isArray(req.body.activity) || req.body.activity.length === 0) {
      req.body.activity = [{ type: "create", message: "Task created", authorName: author }];
    }

    if (req.user?._id) req.body.createdByUserId = req.user._id;
    req.body.createdByName = String(req.user?.name || "").trim();
    req.body.createdByEmail = String(req.user?.email || "").trim();

    // Staff can create tasks but should assign them appropriately
    if (req.user.role === "staff") {
      const staffEmployee = await Employee.findOne({ email: req.user.email }).lean();
      if (!staffEmployee) return res.status(404).json({ error: "Employee record not found" });

      const staffName = staffEmployee.name || `${staffEmployee.firstName || ""} ${staffEmployee.lastName || ""}`.trim();

      // If no assignees provided, assign to self
      if (!req.body.assignees || req.body.assignees.length === 0) {
        req.body.assignees = [{ name: staffName }];
      }

      // Ensure staff can see the task by being in collaborators (schema-supported)
      if (!Array.isArray(req.body.collaborators)) req.body.collaborators = [];
      const alreadyCollaborator = req.body.collaborators.some(
        (n) => String(n || "").toLowerCase() === String(staffName).toLowerCase()
      );
      if (!alreadyCollaborator) req.body.collaborators.push(staffName);
    }

    const doc = await Task.create(req.body);
    try {
      if (doc?.projectId) await recalcProjectProgress(doc.projectId);
    } catch {}
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["tasks", "projects"], id: String(doc?._id || "") } });
    } catch {}
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", authenticate, async (req, res) => {
  try {
    // First get the task to check access
    const existingTask = await Task.findById(req.params.id).lean();
    if (!existingTask) return res.status(404).json({ error: "Not found" });

    const author = resolveAuthorName(req);
    const employeeName = await resolveEmployeeName(req);
    const isOwner = isTaskOwner(existingTask, req.user);
    const isAdmin = req.user.role === "admin";
    const canEditAll = isOwner || isAdmin;
    const isAssigneeOrCollaborator = !canEditAll && isTaskAssigneeOrCollaborator(existingTask, employeeName);

    // If not owner/admin and not assignee/collaborator → deny access
    if (!canEditAll && !isAssigneeOrCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    // If assignee/collaborator (not owner/admin), they can only update status and reminders
    let nextBody = req.body;
    if (!canEditAll && isAssigneeOrCollaborator) {
      const attemptedChanges = Object.keys(req.body || {}).filter(k => k !== "activity");
      const allowedFields = ["status", "reminders"];
      const nonAllowedChanges = attemptedChanges.filter(k => !allowedFields.includes(k));
      
      if (nonAllowedChanges.length > 0) {
        return res.status(403).json({ 
          error: "Only the task owner can edit task details. You can only update the status and manage your reminders." 
        });
      }
      
      nextBody = filterToAllowedFields(req.body, allowedFields);
    }

    const shouldAutoAppendActivity = nextBody && nextBody.activity === undefined;
    if (shouldAutoAppendActivity) {
      const msg = buildAutoActivityMessage(existingTask, nextBody || {});
      if (msg) {
        const prevActs = Array.isArray(existingTask.activity) ? existingTask.activity : [];
        nextBody = {
          ...(nextBody || {}),
          activity: [{ type: "update", message: msg, authorName: author }, ...prevActs],
        };
      }
    }

    // Staff/assignees cannot remove themselves as assignee or collaborator
    if (nextBody.assignees || nextBody.collaborators) {
      const isAssignee = (existingTask.assignees || []).some(
        (a) => String(a?.name || "").toLowerCase() === String(employeeName).toLowerCase()
      );
      const isCollaborator = (existingTask.collaborators || []).some(
        (n) => String(n || "").toLowerCase() === String(employeeName).toLowerCase()
      );

      if (nextBody.assignees) {
        const stillAssignee = nextBody.assignees.some(
          (a) => String(a?.name || "").toLowerCase() === String(employeeName).toLowerCase()
        );
        if (!stillAssignee && isAssignee) {
          nextBody.assignees.push({ name: employeeName });
        }
      }

      if (nextBody.collaborators) {
        const nextCols = Array.isArray(nextBody.collaborators) ? nextBody.collaborators : [];
        const stillCollaborator = nextCols.some(
          (n) => String(n || "").toLowerCase() === String(employeeName).toLowerCase()
        );
        if (!stillCollaborator && isCollaborator) {
          nextCols.push(employeeName);
          nextBody.collaborators = nextCols;
        }
      }
    }

    const doc = await Task.findByIdAndUpdate(req.params.id, nextBody, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    try {
      const prevProjectId = existingTask?.projectId;
      const nextProjectId = doc?.projectId;
      if (prevProjectId) await recalcProjectProgress(prevProjectId);
      if (nextProjectId && String(nextProjectId) !== String(prevProjectId || "")) await recalcProjectProgress(nextProjectId);
    } catch {}

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["tasks", "projects"], id: String(doc?._id || "") } });
    } catch {}

    if (!doc.taskNo) {
      const c = await Counter.findOneAndUpdate(
        { $or: [{ key: "task" }, { name: "task" }] },
        { $inc: { value: 1 }, $set: { key: "task", name: "task" } },
        { new: true, upsert: true }
      );
      const updated = await Task.findByIdAndUpdate(req.params.id, { taskNo: c.value }, { new: true });
      return res.json(updated || doc);
    }

    return res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete
router.delete("/:id", authenticate, async (req, res) => {
  try {
    // First get the task to check access
    const existingTask = await Task.findById(req.params.id).lean();
    if (!existingTask) return res.status(404).json({ error: "Not found" });

    // Only owner or admin can delete tasks
    const isOwner = isTaskOwner(existingTask, req.user);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Only the task owner or admin can delete tasks" });
    }

    await Task.findByIdAndDelete(req.params.id);
    try {
      if (existingTask?.projectId) await recalcProjectProgress(existingTask.projectId);
    } catch {}
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["tasks", "projects"], id: String(req.params.id || "") } });
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
