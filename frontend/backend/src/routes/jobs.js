import { Router } from "express";
import Job from "../models/Job.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const filter = {};
    if (q) {
      Object.assign(filter, {
        $or: [
          { title: { $regex: q, $options: "i" } },
          { department: { $regex: q, $options: "i" } },
          { status: { $regex: q, $options: "i" } },
        ],
      });
    }
    const items = await Job.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const doc = await Job.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const doc = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await Job.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
