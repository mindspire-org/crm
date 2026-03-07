import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import AccountingSettings from "../models/AccountingSettings.js";

const router = Router();

router.get("/settings", authenticate, isAdmin, async (_req, res) => {
  try {
    let s = await AccountingSettings.findOne({}).lean();
    if (!s) s = (await AccountingSettings.create({})).toObject();
    res.json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/settings", authenticate, isAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    let s = await AccountingSettings.findOne({});
    if (!s) s = await AccountingSettings.create({});
    const fields = [
      "cashAccount",
      "bankAccount",
      "arParent",
      "apParent",
      "salaryExpense",
      "salaryPayableParent",
      "revenueAccount",
      "baseCurrency",
      "fiscalYearStartMonth",
      "fiscalYearStartDay",
    ];
    for (const f of fields) {
      if (payload[f] !== undefined) s[f] = payload[f];
    }
    await s.save();
    res.json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
