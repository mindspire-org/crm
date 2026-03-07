import { Router } from "express";
import NoteCategory from "../models/NoteCategory.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", async (_req, res) => {
  try {
    const items = await NoteCategory.find({}).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = req.body?.name?.toString().trim();
    if (!name) return res.status(400).json({ error: "Name is required" });
    const doc = await NoteCategory.create({ name });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const name = req.body?.name?.toString().trim();
    if (!name) return res.status(400).json({ error: "Name is required" });
    const doc = await NoteCategory.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await NoteCategory.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
