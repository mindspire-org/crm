import { Router } from "express";
import Account from "../models/Account.js";
import JournalEntry from "../models/JournalEntry.js";
import { authenticate } from "../middleware/auth.js";
import { assertNotLocked } from "../services/accounting.js";

const router = Router();

// Post a journal entry
router.post("/", authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const date = payload.date ? new Date(payload.date) : new Date();
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    await assertNotLocked(date);

    // Map accountCode -> accountId for convenience
    for (const l of lines) {
      if (!l.accountId && l.accountCode) {
        const acc = await Account.findOne({ code: l.accountCode }).lean();
        if (!acc) return res.status(400).json({ error: `Account not found: ${l.accountCode}` });
        l.accountId = acc._id;
        l.accountCode = acc.code;
      }
      l.debit = Number(l.debit || 0);
      l.credit = Number(l.credit || 0);
    }

    const doc = await JournalEntry.create({
      date,
      memo: String(payload.memo || ""),
      refNo: String(payload.refNo || ""),
      currency: String(payload.currency || "PKR"),
      postedAt: new Date(),
      postedBy: req.user?.email || req.user?._id || String(payload.postedBy || "system"),
      adjusting: Boolean(payload.adjusting) || false,
      lines,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List journals (basic filters)
router.get("/", async (req, res) => {
  try {
    const q = {};
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (from || to) q.date = {};
    if (from) q.date.$gte = from;
    if (to) q.date.$lte = to;
    const entries = await JournalEntry.find(q).sort({ date: -1, createdAt: -1 }).lean();
    res.json(entries);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
