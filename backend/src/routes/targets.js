import express from "express";
import Target from "../models/Target.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Proposal from "../models/Proposal.js";
import Invoice from "../models/Invoice.js";
import { authenticate } from "../middleware/auth.js"; // Assuming middleware exists

const router = express.Router();

// GET all targets (Admin/Finance/Manager)
router.get("/", authenticate, async (req, res) => {
  try {
    const { role } = req.user;
    if (!["admin", "finance", "finance_manager", "marketing_manager", "sales_manager"].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { month, year } = req.query;
    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const targets = await Target.find(query).populate("user", "name email role").populate("manager", "name");
    res.json(targets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET my performance (Marketer/Sales)
router.get("/my-performance", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const target = await Target.findOne({ user: userId, month, year });
    
    // Calculate actual performance
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const leadsCount = await Lead.countDocuments({
      assignedTo: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const salesInvoices = await Invoice.find({
      createdBy: userId, // or assigned user logic
      status: "Paid",
      updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalSales = salesInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    res.json({
      target: target || { message: "No target set for this month" },
      actual: {
        leads: leadsCount,
        sales: totalSales,
        month,
        year
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST/PUT set target
router.post("/", authenticate, async (req, res) => {
  try {
    const { role, _id: managerId } = req.user;
    if (!["admin", "finance", "finance_manager", "marketing_manager", "sales_manager"].includes(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { user, month, year, leads, sales, revenue, commissionRate, bonus, deductions, note } = req.body;

    const target = await Target.findOneAndUpdate(
      { user, month, year },
      { 
        manager: managerId,
        leads, sales, revenue, commissionRate, bonus, deductions, note,
        status: "active"
      },
      { upsert: true, new: true }
    );

    res.json(target);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
