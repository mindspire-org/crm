import { Router } from "express";
import mongoose from "mongoose";
import HelpCategory from "../models/HelpCategory.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const scope = (req.query.scope || "help").toString();
    const q = req.query.q?.toString().trim();
    const filter = { scope };
    if (q) filter.name = { $regex: q, $options: "i" };
    const items = await HelpCategory.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await HelpCategory.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const name = payload?.name?.toString().trim();
    if (!name) return res.status(400).json({ error: "Name is required" });
    payload.scope = (payload.scope || "help").toString();
    const doc = await HelpCategory.create(payload);
    res.status(201).json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const doc = await HelpCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await HelpCategory.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
