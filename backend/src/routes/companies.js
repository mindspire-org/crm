import { Router } from "express";
import Company from "../models/Company.js";

const router = Router();

// List
router.get("/", async (req, res) => {
  const q = req.query.q?.toString().trim();
  const filter = q
    ? { $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
      ] }
    : {};
  const items = await Company.find(filter).sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Create
router.post("/", async (req, res) => {
  try {
    const doc = await Company.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const doc = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const r = await Company.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
