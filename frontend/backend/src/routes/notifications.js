import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";

const router = Router();

// Cleanup notifications older than 48 hours
const cleanupOldNotifications = async () => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`[Notifications] Cleaned up ${result.deletedCount} old notifications`);
    }
  } catch (e) {
    console.error("[Notifications] Cleanup error:", e);
  }
};

// Run cleanup every hour
setInterval(cleanupOldNotifications, 60 * 60 * 1000);
// Also run on startup
cleanupOldNotifications();

router.get("/", authenticate, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit || 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const unreadOnly = String(req.query.unreadOnly || "").toLowerCase() === "true";

    const filter = { userId: req.user._id };
    if (unreadOnly) filter.readAt = { $exists: false };

    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, readAt: { $exists: false } });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create notification (for reminders, etc.)
router.post("/", authenticate, async (req, res) => {
  try {
    const { userId, type, title, message, href, meta } = req.body || {};
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    // Determine target user (defaults to current user)
    const targetUserId = userId || req.user._id;
    
    // Check if user can create notification for others
    const isSelf = String(targetUserId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    
    // For reminders, allow task creators to notify task participants
    let isTaskCreatorSendingReminder = false;
    if (!isSelf && !isAdmin && type === "reminder" && meta?.taskId) {
      const task = await Task.findById(meta.taskId).lean();
      if (task) {
        const isTaskCreator = 
          (task.createdByUserId && String(task.createdByUserId) === String(req.user._id)) ||
          (task.createdByEmail && String(task.createdByEmail).toLowerCase() === String(req.user.email || "").toLowerCase());
        
        // Check if target is an assignee or collaborator
        const targetName = meta.targetUser || "";
        const isAssignee = task.assignees?.some(a => 
          String(a.name).toLowerCase() === targetName.toLowerCase()
        );
        const isCollaborator = task.collaborators?.some(c => 
          String(c).toLowerCase() === targetName.toLowerCase()
        );
        
        if (isTaskCreator && (isAssignee || isCollaborator || targetName === String(req.user.name || ""))) {
          isTaskCreatorSendingReminder = true;
        }
      }
    }
    
    // Allow if: self, admin, or task creator sending reminder to participants
    if (!isSelf && !isAdmin && !isTaskCreatorSendingReminder) {
      return res.status(403).json({ error: "Can only create notifications for yourself" });
    }

    const notification = await Notification.create({
      userId: targetUserId,
      type: type || "general",
      title,
      message: message || "",
      href: href || "",
      meta: meta || {},
    });

    res.status(201).json(notification);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/mark-read", authenticate, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const now = new Date();

    if (ids.length) {
      const objectIds = ids
        .map((x) => String(x))
        .filter((x) => mongoose.Types.ObjectId.isValid(x))
        .map((x) => new mongoose.Types.ObjectId(x));
      if (objectIds.length) {
        await Notification.updateMany(
          { _id: { $in: objectIds }, userId: req.user._id, readAt: { $exists: false } },
          { $set: { readAt: now } }
        );
      }
    } else {
      await Notification.updateMany(
        { userId: req.user._id, readAt: { $exists: false } },
        { $set: { readAt: now } }
      );
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
