import { Router } from "express";
import mongoose from "mongoose";
import HelpArticle from "../models/HelpArticle.js";
import HelpCategory from "../models/HelpCategory.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const scope = (req.query.scope || "help").toString();
    const q = req.query.q?.toString().trim();
    const categoryId = req.query.categoryId?.toString();
    const filter = { scope };
    if (q) {
      Object.assign(filter, {
        $or: [
          { title: { $regex: q, $options: "i" } },
          { content: { $regex: q, $options: "i" } },
          { tags: { $elemMatch: { $regex: q, $options: "i" } } },
        ],
      });
    }
    if (categoryId) {
      if (mongoose.Types.ObjectId.isValid(categoryId)) filter.categoryId = categoryId;
      else {
        const cat = await HelpCategory.findOne({ scope, name: categoryId }).select("_id").lean();
        if (cat) filter.categoryId = String(cat._id);
      }
    }
    const items = await HelpArticle.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await HelpArticle.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.title || !payload.title.toString().trim()) return res.status(400).json({ error: "Title is required" });
    payload.scope = (payload.scope || "help").toString();
    const doc = await HelpArticle.create(payload);
    res.status(201).json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const doc = await HelpArticle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await HelpArticle.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
