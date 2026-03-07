import { Router } from "express";
import Voucher from "../models/Voucher.js";
import JournalEntry from "../models/JournalEntry.js";
import Counter from "../models/Counter.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Helper to get next voucher number
async function getNextVoucherNo(type) {
  const prefixMap = {
    sales_invoice: "SINV",
    customer_payment: "CPAY",
    vendor_bill: "VBILL",
    expense: "EXP",
    vendor_payment: "VPAY",
    journal: "JV",
  };
  const prefix = prefixMap[type] || "VCH";
  const counter = await Counter.findOneAndUpdate(
    { key: `voucher_${type}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.value).padStart(5, "0")}`;
}

// Create a new voucher
router.post("/", authenticate, async (req, res) => {
  try {
    const { type, date, memo, refNo, currency, lines, ...sourceRefs } = req.body;

    if (!lines || lines.length < 2) {
      return res.status(400).json({ error: "Voucher must have at least 2 lines" });
    }

    // 1. Create Journal Entry
    const journalEntry = await JournalEntry.create({
      date: new Date(date),
      memo,
      refNo,
      currency: currency || "PKR",
      postedBy: req.user.email || req.user._id,
      postedAt: new Date(),
      lines,
    });

    // 2. Create Voucher
    const voucherNo = await getNextVoucherNo(type);
    const voucher = await Voucher.create({
      voucherNo,
      type,
      date: new Date(date),
      memo,
      refNo,
      currency: currency || "PKR",
      postedBy: req.user.email || req.user._id,
      journalEntryId: journalEntry._id,
      ...sourceRefs,
    });

    res.status(201).json(voucher);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List vouchers with filters
router.get("/", authenticate, async (req, res) => {
  try {
    const { type, from, to, q } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (q) {
      filter.$or = [
        { voucherNo: { $regex: q, $options: "i" } },
        { memo: { $regex: q, $options: "i" } },
        { refNo: { $regex: q, $options: "i" } },
      ];
    }

    const vouchers = await Voucher.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate("journalEntryId")
      .lean();
    res.json(vouchers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
