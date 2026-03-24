import { Router } from "express";
import Expense from "../models/Expense.js";
import Account from "../models/Account.js";
import Voucher from "../models/Voucher.js";
import JournalEntry from "../models/JournalEntry.js";
import Counter from "../models/Counter.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";
import { ensureLinkedAccount, getSettings, postJournal } from "../services/accounting.js";

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

async function postExpenseToLedger({ data, user }) {
  if (!data.accountId) {
    throw new Error("Account is required to post an expense");
  }

  const expenseAcc = await Account.findById(data.accountId).lean();
  if (!expenseAcc) throw new Error("Invalid expense account");

  const settings = await getSettings();

  const method = String(data.paymentMethod || "cash").toLowerCase();
  let creditAccountCode = settings.cashAccount;
  let creditEntityType;
  let creditEntityId;

  if (method === "bank") {
    creditAccountCode = settings.bankAccount || "10102";
  } else if (method === "payable") {
    if (data.vendorId) {
      const linked = await ensureLinkedAccount("vendor", data.vendorId, data.vendor || "Vendor");
      creditAccountCode = linked.code;
      creditEntityType = "vendor";
      creditEntityId = data.vendorId;
    } else {
      creditAccountCode = settings.apParent || "20101";
    }
  } else {
    // method is cash
    creditAccountCode = settings.cashAccount || "10101";
  }

  if (!creditAccountCode) {
    throw new Error("Accounting settings not configured for this payment method");
  }

  const totalAmount = (Number(data.amount) || 0) + (Number(data.tax) || 0) + (Number(data.tax2) || 0);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const journalEntry = await postJournal({
    date: data.date || new Date(),
    memo: data.description || data.title || "Expense",
    refNo: data.title || "Expense",
    currency: "PKR",
    lines: [
      { accountCode: expenseAcc.code, debit: totalAmount, credit: 0, description: data.title || "Expense" },
      {
        accountCode: creditAccountCode,
        debit: 0,
        credit: totalAmount,
        description: `Payment for: ${data.title || "Expense"}`,
        entityType: creditEntityType,
        entityId: creditEntityId,
      },
    ],
    postedBy: user?.email || user?._id || "system",
  });

  const voucherNo = await getNextVoucherNo("expense");
  const voucher = await Voucher.create({
    voucherNo,
    type: "expense",
    date: new Date(data.date || Date.now()),
    memo: data.description || data.title,
    refNo: data.title,
    currency: "PKR",
    postedBy: user?.email || user?._id,
    journalEntryId: journalEntry._id,
    vendorId: data.vendorId || undefined,
    employeeId: data.employeeId || undefined,
    clientId: data.clientId || undefined,
    status: "posted",
  });

  return { journalEntry, voucher };
}

router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const from = req.query.from?.toString();
    const to = req.query.to?.toString();
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

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

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

router.get("/:id", authenticate, async (req, res) => {
  try {
    const item = await Expense.findById(req.params.id)
      .populate("employeeId", "name firstName lastName")
      .populate("clientId", "company person")
      .populate("vendorId", "name company")
      .populate("accountId", "code name")
      .populate("voucherId", "voucherNo status")
      .lean();

    if (!item) return res.status(404).json({ error: "Expense not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:id/post", authenticate, async (req, res) => {
  try {
    const existing = await Expense.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status === "posted") return res.json(existing);

    const payload = { ...existing, ...req.body, status: "posted" };
    const { voucher } = await postExpenseToLedger({ data: payload, user: req.user });

    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      { status: "posted", voucherId: voucher._id },
      { new: true }
    );

    try { broadcastSse({ event: "invalidate", data: { keys: ["expenses"], id: String(updated?._id || "") } }); } catch {}
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const data = { ...req.body };
    
    // If status is posted, we must have an accountId
    if (data.status === "posted" && !data.accountId) {
      return res.status(400).json({ error: "Account is required to post an expense" });
    }

    if (data.status === "posted") {
      const { voucher } = await postExpenseToLedger({ data, user: req.user });
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
