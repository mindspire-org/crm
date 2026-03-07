import { Router } from "express";
import Account from "../models/Account.js";
import JournalEntry from "../models/JournalEntry.js";

const router = Router();

const parseDate = (s) => (s ? new Date(s) : null);

// COA balances snapshot (opening + current)
// GET /api/accounts/balances?asOf=2026-12-31
router.get("/balances", async (req, res) => {
  console.log("Terminal: Accessing /api/accounts/balances snapshot", req.query.asOf);
  try {
    const asOf = parseDate(req.query.asOf || new Date().toISOString());

    const accounts = await Account.find({}).sort({ code: 1 }).lean();
    const accountsByCode = new Map(accounts.map((a) => [a.code, a]));

    const sums = await JournalEntry.aggregate([
      { $match: { date: { $lte: asOf } } },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.accountCode",
          debit: { $sum: "$lines.debit" },
          credit: { $sum: "$lines.credit" },
        },
      },
    ]);

    const byCode = new Map(sums.map((s) => [String(s._id), { debit: Number(s.debit || 0), credit: Number(s.credit || 0) }]));

    const nodeByCode = new Map();
    for (const a of accounts) {
      const s = byCode.get(a.code) || { debit: 0, credit: 0 };
      const openingDebit = Number(a.openingDebit || 0);
      const openingCredit = Number(a.openingCredit || 0);
      nodeByCode.set(a.code, {
        _id: a._id,
        code: a.code,
        name: a.name,
        type: a.type,
        parentCode: a.parentCode || null,
        isActive: a.isActive !== false,
        openingDebit,
        openingCredit,
        periodDebit: Number(s.debit || 0),
        periodCredit: Number(s.credit || 0),
        currentDebit: openingDebit + Number(s.debit || 0),
        currentCredit: openingCredit + Number(s.credit || 0),
      });
    }

    // Roll up debit/credit totals to parents
    const ensureNode = (code) => {
      if (nodeByCode.has(code)) return nodeByCode.get(code);
      const a = accountsByCode.get(code);
      if (!a) return null;
      const openingDebit = Number(a.openingDebit || 0);
      const openingCredit = Number(a.openingCredit || 0);
      const created = {
        _id: a._id,
        code: a.code,
        name: a.name,
        type: a.type,
        parentCode: a.parentCode || null,
        isActive: a.isActive !== false,
        openingDebit,
        openingCredit,
        periodDebit: 0,
        periodCredit: 0,
        currentDebit: openingDebit,
        currentCredit: openingCredit,
      };
      nodeByCode.set(code, created);
      return created;
    };

    for (const n of Array.from(nodeByCode.values())) {
      const deltaDebit = Number(n.currentDebit || 0);
      const deltaCredit = Number(n.currentCredit || 0);
      let p = n.parentCode;
      const guard = new Set([n.code]);
      while (p) {
        if (guard.has(p)) break;
        guard.add(p);
        const pn = ensureNode(p);
        if (!pn) break;
        pn.currentDebit = Number(pn.currentDebit || 0) + deltaDebit;
        pn.currentCredit = Number(pn.currentCredit || 0) + deltaCredit;
        p = pn.parentCode;
      }
    }

    const childrenByParent = new Map();
    for (const n of nodeByCode.values()) {
      const p = n.parentCode || null;
      if (!childrenByParent.has(p)) childrenByParent.set(p, []);
      childrenByParent.get(p).push(n);
    }
    for (const list of childrenByParent.values()) {
      list.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    }

    const ordered = [];
    const walk = (parentCode, level) => {
      const kids = childrenByParent.get(parentCode) || [];
      for (const k of kids) {
        const hasChildren = (childrenByParent.get(k.code) || []).length > 0;
        const sign = k.type === "asset" || k.type === "expense" ? 1 : -1;
        const opening = sign * (Number(k.openingDebit || 0) - Number(k.openingCredit || 0));
        const current = sign * (Number(k.currentDebit || 0) - Number(k.currentCredit || 0));
        ordered.push({
          ...k,
          level,
          hasChildren,
          opening,
          current,
        });
        walk(k.code, level + 1);
      }
    };
    walk(null, 0);

    res.json({ asOf, rows: ordered });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/test-ping", (req, res) => res.json({ pong: true }));

// List accounts (optionally filter by type)
router.get("/", async (req, res) => {
  try {
    const type = req.query.type?.toString().trim().toLowerCase();
    const q = req.query.q?.toString().trim();
    const filter = {};
    if (type) filter.type = type;
    if (q) filter.$or = [{ code: new RegExp(q, "i") }, { name: new RegExp(q, "i") }];
    const docs = await Account.find(filter).sort({ code: 1 }).lean();
    res.json(docs);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create account
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.code || !payload.name || !payload.type) {
      return res.status(400).json({ error: "code, name and type are required" });
    }
    const doc = await Account.create({
      code: String(payload.code).trim(),
      name: String(payload.name).trim(),
      type: String(payload.type).trim().toLowerCase(),
      parentCode: payload.parentCode ? String(payload.parentCode).trim() : null,
      openingDebit: Number(payload.openingDebit || 0),
      openingCredit: Number(payload.openingCredit || 0),
      isActive: payload.isActive !== false,
      meta: payload.meta || {},
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update account
router.put("/:id", async (req, res) => {
  try {
    const payload = req.body || {};
    if (payload.openingDebit !== undefined) payload.openingDebit = Number(payload.openingDebit || 0);
    if (payload.openingCredit !== undefined) payload.openingCredit = Number(payload.openingCredit || 0);
    const updated = await Account.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
