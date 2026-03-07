import { Router } from "express";
import JournalEntry from "../models/JournalEntry.js";
import Account from "../models/Account.js";

const router = Router();

// GET /api/ledgers/general?accountCode=1000&from=2026-07-01&to=2026-07-31
router.get("/general", async (req, res) => {
  try {
    const accountCode = req.query.accountCode?.toString().trim();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (!accountCode) return res.status(400).json({ error: "accountCode is required" });

    const account = await Account.findOne({ code: accountCode }).lean();
    if (!account) return res.status(404).json({ error: "Account not found" });

    const match = {};
    if (from || to) match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;

    const pipeline = [
      { $match: match },
      { $unwind: "$lines" },
      { $match: { "lines.accountCode": accountCode } },
      {
        $project: {
          date: 1,
          refNo: 1,
          memo: 1,
          debit: "$lines.debit",
          credit: "$lines.credit",
          entityType: "$lines.entityType",
          entityId: "$lines.entityId",
          createdAt: 1,
        },
      },
      { $sort: { date: 1, createdAt: 1, _id: 1 } },
    ];

    const rows = await JournalEntry.aggregate(pipeline);

    // Compute running balance (debit - credit) convention; UI can adjust per account type if needed
    const opening = Number(account.openingDebit || 0) - Number(account.openingCredit || 0);
    let balance = opening;
    const withBal = rows.map((r) => {
      balance += Number(r.debit || 0) - Number(r.credit || 0);
      return { ...r, balance };
    });

    res.json({ account, openingBalance: opening, rows: withBal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/ledgers/entity?entityType=client&entityId=<id>&from=&to=
router.get("/entity", async (req, res) => {
  try {
    const entityType = req.query.entityType?.toString().trim();
    const entityId = req.query.entityId?.toString().trim();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (!entityType || !entityId) return res.status(400).json({ error: "entityType and entityId are required" });

    const match = {};
    if (from || to) match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;

    const pipeline = [
      { $match: match },
      { $unwind: "$lines" },
      { $match: { "lines.entityType": entityType, "lines.entityId": { $exists: true } } },
      { $match: { "lines.entityId": { $in: [entityId, { $toObjectId: entityId } ] } } },
      {
        $project: {
          date: 1,
          refNo: 1,
          memo: 1,
          accountCode: "$lines.accountCode",
          debit: "$lines.debit",
          credit: "$lines.credit",
          createdAt: 1,
        },
      },
      { $sort: { date: 1, createdAt: 1, _id: 1 } },
    ];

    // The $toObjectId may not be allowed in all contexts, so fallback by trying string match first
    let rows = [];
    try {
      rows = await JournalEntry.aggregate(pipeline);
    } catch {
      const pipeline2 = [
        { $match: match },
        { $unwind: "$lines" },
        { $match: { "lines.entityType": entityType, "lines.entityId": entityId } },
        {
          $project: {
            date: 1,
            refNo: 1,
            memo: 1,
            accountCode: "$lines.accountCode",
            debit: "$lines.debit",
            credit: "$lines.credit",
            createdAt: 1,
          },
        },
        { $sort: { date: 1, createdAt: 1, _id: 1 } },
      ];
      rows = await JournalEntry.aggregate(pipeline2);
    }

    let balance = 0;
    const withBal = rows.map((r) => {
      balance += Number(r.debit || 0) - Number(r.credit || 0);
      return { ...r, balance };
    });

    res.json({ entityType, entityId, rows: withBal });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
