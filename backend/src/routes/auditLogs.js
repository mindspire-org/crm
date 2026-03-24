import { Router } from "express";
import AuditLog from "../models/AuditLog.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// GET /api/audit-logs
router.get("/", authenticate, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized access to audit logs" });
    }

    const { module, action, userId, from, to, limit = 100, skip = 0 } = req.query;
    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .populate("userId", "username email name")
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({ logs, total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
