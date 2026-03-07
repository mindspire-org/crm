import { Router } from "express";
import Interview from "../models/Interview.js";

const router = Router();

// List with optional filters
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const candidateId = req.query.candidateId?.toString();
    const jobId = req.query.jobId?.toString();
    const filter = {};
    if (candidateId) filter.candidateId = candidateId;
    if (jobId) filter.jobId = jobId;
    if (q) {
      Object.assign(filter, {
        $or: [
          { candidateName: { $regex: q, $options: "i" } },
          { jobTitle: { $regex: q, $options: "i" } },
          { interviewer: { $regex: q, $options: "i" } },
          { location: { $regex: q, $options: "i" } },
        ],
      });
    }
    const items = await Interview.find(filter).sort({ when: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create
router.post("/", async (req, res) => {
  try {
    const doc = await Interview.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const doc = await Interview.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const r = await Interview.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
