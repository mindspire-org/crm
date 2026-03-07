import { Router } from "express";
import Vendor from "../models/Vendor.js";
import { ensureLinkedAccount } from "../services/accounting.js";

const router = Router();

// List vendors (simple search)
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const filter = q ? { $or: [ { name: { $regex: q, $options: "i" } }, { company: { $regex: q, $options: "i" } } ] } : {};
    const items = await Vendor.find(filter).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create vendor
router.post("/", async (req, res) => {
  try {
    const doc = await Vendor.create(req.body);
    try {
      await ensureLinkedAccount("vendor", doc._id, doc.name || doc.company || "Vendor");
    } catch (_) {}
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single
router.get("/:id", async (req, res) => {
  try {
    const doc = await Vendor.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update vendor
router.put("/:id", async (req, res) => {
  try {
    const doc = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    try {
      await ensureLinkedAccount("vendor", doc._id, doc.name || doc.company || "Vendor");
    } catch (_) {}
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete vendor
router.delete("/:id", async (req, res) => {
  try {
    const r = await Vendor.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
