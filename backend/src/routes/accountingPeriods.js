import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.js";
import AccountingPeriod from "../models/AccountingPeriod.js";

const router = Router();

// List periods (admin only)
router.get("/", authenticate, isAdmin, async (_req, res) => {
  try {
    const rows = await AccountingPeriod.find({}).sort({ start: -1 }).lean();
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create a period (admin only)
router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, start, end, locked, note } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: "start and end are required" });
    const doc = await AccountingPeriod.create({
      name: String(name || ""),
      start: new Date(start),
      end: new Date(end),
      locked: Boolean(locked) || false,
      note: String(note || ""),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update/Lock/Unlock a period (admin only)
router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    const update = {};
    if (payload.name !== undefined) update.name = String(payload.name);
    if (payload.start) update.start = new Date(payload.start);
    if (payload.end) update.end = new Date(payload.end);
    if (payload.locked !== undefined) update.locked = Boolean(payload.locked);
    if (payload.note !== undefined) update.note = String(payload.note || "");
    const doc = await AccountingPeriod.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
