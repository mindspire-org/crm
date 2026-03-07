import { Router } from "express";
import Commission from "../models/Commission.js";
import Employee from "../models/Employee.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";

const router = Router();

// Get commissions for current user (employee dashboard)
router.get("/my-commissions", authenticate, async (req, res) => {
  try {
    // Find employee record for current user by email (consistent with lead ownership)
    const employee = await Employee.findOne({ email: req.user.email }).lean();
    if (!employee) {
      return res.json({ 
        commissions: [], 
        summary: { 
          totalEarned: 0, 
          totalPaid: 0, 
          totalPending: 0,
          pendingCount: 0,
          approvedCount: 0,
          paidCount: 0
        } 
      });
    }

    const commissions = await Commission.find({ employeeId: employee._id })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate summary
    const summary = {
      totalEarned: commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      totalPaid: commissions.filter(c => c.status === "paid").reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      totalPending: commissions.filter(c => c.status === "approved").reduce((sum, c) => sum + (c.commissionAmount || 0), 0),
      pendingCount: commissions.filter(c => c.status === "pending").length,
      approvedCount: commissions.filter(c => c.status === "approved").length,
      paidCount: commissions.filter(c => c.status === "paid").length,
    };

    res.json({ commissions, summary });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get all commissions (admin only)
router.get("/", authenticate, requirePermission("commissions.read"), async (req, res) => {
  try {
    const { employeeId, status, period, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (period) filter.period = period;

    const skip = (Number(page) - 1) * Number(limit);
    
    const [commissions, total] = await Promise.all([
      Commission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Commission.countDocuments(filter)
    ]);

    // Calculate totals
    const totals = await Commission.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: null, 
          totalAmount: { $sum: "$commissionAmount" },
          totalSaleAmount: { $sum: "$saleAmount" }
        } 
      }
    ]);

    res.json({
      commissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      summary: {
        totalAmount: totals[0]?.totalAmount || 0,
        totalSaleAmount: totals[0]?.totalSaleAmount || 0,
      }
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get commission summary by employee (for admin dashboard)
router.get("/summary-by-employee", authenticate, requirePermission("commissions.read"), async (req, res) => {
  try {
    const { period } = req.query;
    const matchStage = period ? { period } : {};

    const summary = await Commission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$employeeId",
          employeeName: { $first: "$employeeName" },
          totalCommissions: { $sum: "$commissionAmount" },
          totalSales: { $sum: "$saleAmount" },
          leadCount: { $sum: 1 },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$commissionAmount", 0] }
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$commissionAmount", 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$commissionAmount", 0] }
          }
        }
      },
      { $sort: { totalCommissions: -1 } }
    ]);

    res.json(summary);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single commission
router.get("/:id", authenticate, async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id).lean();
    if (!commission) return res.status(404).json({ error: "Not found" });
    
    // Check access - admin or owner can view
    if (req.user.role !== "admin") {
      const employee = await Employee.findOne({ userId: req.user._id }).lean();
      if (!employee || String(employee._id) !== String(commission.employeeId)) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    res.json(commission);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update commission status (admin only)
router.put("/:id/status", authenticate, requirePermission("commissions.update"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updateData = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (!commission) return res.status(404).json({ error: "Not found" });

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["commissions"], id: String(commission._id) } });
    } catch {}

    res.json(commission);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Mark multiple commissions as paid (admin only)
router.post("/bulk-pay", authenticate, requirePermission("commissions.update"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: "No commission IDs provided" });
    }

    const result = await Commission.updateMany(
      { _id: { $in: ids }, status: { $ne: "paid" } },
      { $set: { status: "paid", paidAt: new Date() } }
    );

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["commissions"] } });
    } catch {}

    res.json({ 
      ok: true, 
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} commissions marked as paid` 
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
