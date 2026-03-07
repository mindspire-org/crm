import { Router } from "express";
import TaskLabel from "../models/TaskLabel.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await TaskLabel.find({}).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = (req.body?.name || "").toString().trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    const color = (req.body?.color || "").toString();
    const doc = await TaskLabel.create({ name, color });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = {};
    if (req.body?.name !== undefined) payload.name = (req.body.name || "").toString().trim();
    if (req.body?.color !== undefined) payload.color = (req.body.color || "").toString();
    const doc = await TaskLabel.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await TaskLabel.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
