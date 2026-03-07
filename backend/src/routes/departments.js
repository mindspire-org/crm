import { Router } from "express";
import Department from "../models/Department.js";

const router = Router();

// List departments with optional search and active filter
router.get("/", async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : undefined;
    const active = req.query.active ? String(req.query.active) : undefined;
    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (active === "1") filter.isActive = true;
    if (active === "0") filter.isActive = false;
    const items = await Department.find(filter).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: (e && e.message) ? e.message : String(e) });
  }
});

// Create department
router.post("/", async (req, res) => {
  try {
    if (!req.body || !req.body.name) return res.status(400).json({ error: "Name is required" });
    const doc = await Department.create({
      name: req.body.name,
      description: req.body.description || "",
      head: req.body.head || "",
      isActive: typeof req.body.isActive === "boolean" ? req.body.isActive : true,
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "Department name already exists" });
    }
    res.status(400).json({ error: (e && e.message) ? e.message : String(e) });
  }
});

// Get by id
router.get("/:id", async (req, res) => {
  try {
    const doc = await Department.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: (e && e.message) ? e.message : String(e) });
  }
});

// Update by id
router.put("/:id", async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.head !== undefined) updates.head = req.body.head;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    const doc = await Department.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "Department name already exists" });
    }
    res.status(400).json({ error: (e && e.message) ? e.message : String(e) });
  }
});

// Delete by id
router.delete("/:id", async (req, res) => {
  try {
    const r = await Department.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e && e.message) ? e.message : String(e) });
  }
});

export default router;
