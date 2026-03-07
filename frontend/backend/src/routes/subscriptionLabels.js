import { Router } from "express";
import SubscriptionLabel from "../models/SubscriptionLabel.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await SubscriptionLabel.find({}).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = req.body?.name?.toString().trim();
    const color = req.body?.color?.toString().trim() || "#4F46E5";
    if (!name) return res.status(400).json({ error: "Name is required" });
    const doc = await SubscriptionLabel.create({ name, color });
    res.status(201).json(doc);
  } catch (e) {
    const msg = e?.code === 11000 ? "Label already exists" : e.message;
    res.status(400).json({ error: msg });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const name = req.body?.name?.toString().trim();
    const color = req.body?.color?.toString().trim() || "#4F46E5";
    if (!name) return res.status(400).json({ error: "Name is required" });
    const doc = await SubscriptionLabel.findByIdAndUpdate(req.params.id, { name, color }, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    const msg = e?.code === 11000 ? "Label already exists" : e.message;
    res.status(400).json({ error: msg });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await SubscriptionLabel.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
