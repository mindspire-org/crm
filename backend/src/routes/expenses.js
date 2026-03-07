import { Router } from "express";
import Expense from "../models/Expense.js";
import Account from "../models/Account.js";
import Voucher from "../models/Voucher.js";
import JournalEntry from "../models/JournalEntry.js";
import Counter from "../models/Counter.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";

const router = Router();

// Helper to get next voucher number (duplicated from vouchers.js for consistency if needed, or could be shared)
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

router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const employeeId = req.query.employeeId?.toString();
    const clientId = req.query.clientId?.toString();
    const projectId = req.query.projectId?.toString();
    const vendorId = req.query.vendorId?.toString();
    const accountId = req.query.accountId?.toString();
    
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (clientId) filter.clientId = clientId;
    if (projectId) filter.projectId = projectId;
    if (vendorId) filter.vendorId = vendorId;
    if (accountId) filter.accountId = accountId;

    if (q) filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
    
    const items = await Expense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate("employeeId", "name firstName lastName")
      .populate("clientId", "company person")
      .populate("vendorId", "name company")
      .populate("accountId", "code name")
      .populate("voucherId", "voucherNo status")
      .lean();
    
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const data = { ...req.body };
    
    // If status is posted, we must have an accountId
    if (data.status === "posted" && !data.accountId) {
      return res.status(400).json({ error: "Account is required to post an expense" });
    }

    let voucher = null;
    if (data.status === "posted") {
      // 1. Create Journal Entry
      // Determine the Credit Account (Cash or Bank or Payable)
      // For simplicity, we'll assume a default cash/bank account if not provided in metadata
      // In a real scenario, this would come from accounting settings
      const expenseAcc = await Account.findById(data.accountId);
      if (!expenseAcc) return res.status(400).json({ error: "Invalid expense account" });

      // Default Credit Account logic (should ideally come from AccountingSettings)
      // Here we use a placeholder logic or assume paymentMethod maps to certain codes
      let creditAccountCode = "10101"; // Default Cash placeholder
      if (data.paymentMethod === "bank") creditAccountCode = "10102"; // Default Bank placeholder
      if (data.paymentMethod === "payable") creditAccountCode = "20101"; // Default Accounts Payable placeholder

      const creditAcc = await Account.findOne({ code: creditAccountCode });
      
      const totalAmount = (Number(data.amount) || 0) + (Number(data.tax) || 0) + (Number(data.tax2) || 0);

      const lines = [
        {
          accountId: expenseAcc._id,
          accountCode: expenseAcc.code,
          debit: totalAmount,
          credit: 0,
          description: data.title || "Expense"
        },
        {
          accountId: creditAcc?._id,
          accountCode: creditAcc?.code || creditAccountCode,
          debit: 0,
          credit: totalAmount,
          description: `Payment for: ${data.title || "Expense"}`
        }
      ];

      const journalEntry = await JournalEntry.create({
        date: new Date(data.date || Date.now()),
        memo: data.description || data.title,
        refNo: data.title,
        currency: "PKR",
        postedBy: req.user.email || req.user._id,
        postedAt: new Date(),
        lines
      });

      // 2. Create Voucher
      const voucherNo = await getNextVoucherNo("expense");
      voucher = await Voucher.create({
        voucherNo,
        type: "expense",
        date: new Date(data.date || Date.now()),
        memo: data.description || data.title,
        refNo: data.title,
        currency: "PKR",
        postedBy: req.user.email || req.user._id,
        journalEntryId: journalEntry._id,
        vendorId: data.vendorId || undefined,
        employeeId: data.employeeId || undefined,
        clientId: data.clientId || undefined,
        status: "posted"
      });

      data.voucherId = voucher._id;
    }

    const doc = await Expense.create(data);
    try { broadcastSse({ event: "invalidate", data: { keys: ["expenses"], id: String(doc?._id || "") } }); } catch {}
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    // Prevent editing if already posted (unless specifically handling unpost logic which is complex)
    if (existing.status === "posted" && req.body.status !== "draft") {
      // Allow minor updates or block entirely
      // return res.status(400).json({ error: "Cannot edit a posted expense" });
    }

    const doc = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    try { broadcastSse({ event: "invalidate", data: { keys: ["expenses"], id: String(doc?._id || "") } }); } catch {}
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (existing.status === "posted") {
       return res.status(400).json({ error: "Cannot delete a posted expense. Please unpost or void the voucher first." });
    }

    await Expense.findByIdAndDelete(req.params.id);
    try { broadcastSse({ event: "invalidate", data: { keys: ["expenses"], id: String(req.params.id || "") } }); } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
