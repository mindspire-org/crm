import { Router } from "express";
import DeleteAccountRequest from "../models/DeleteAccountRequest.js";
import User from "../models/User.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();

    const filter = {};
    if (status && status !== "all") filter.status = status;

    const docs = await DeleteAccountRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email role")
      .lean();

    const items = q
      ? docs.filter((d) => {
          const u = d.userId || {};
          const hay = `${String(u.name || "")} ${String(u.email || "")} ${String(u.role || "")}`.toLowerCase();
          return hay.includes(q.toLowerCase());
        })
      : docs;

    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    const existing = await DeleteAccountRequest.findOne({ userId: req.user._id, status: "pending" }).lean();
    if (existing) return res.status(409).json({ error: "A pending delete request already exists" });

    const doc = await DeleteAccountRequest.create({ userId: req.user._id, reason, status: "pending" });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const update = { status };
    if (status !== "pending") {
      update.processedAt = new Date();
      update.processedBy = req.user._id;
    } else {
      update.processedAt = undefined;
      update.processedBy = undefined;
    }

    const doc = await DeleteAccountRequest.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("userId", "name email role")
      .lean();

    if (!doc) return res.status(404).json({ error: "Not found" });

    if (status === "approved" && doc.userId?._id) {
      await User.updateOne({ _id: doc.userId._id }, { $set: { status: "inactive" } }).catch(() => null);
    }

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const r = await DeleteAccountRequest.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
