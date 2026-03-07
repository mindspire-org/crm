import { Router } from "express";
import Setting from "../models/Setting.js";

const router = Router();

// GET current settings
router.get("/", async (_req, res) => {
  try {
    const doc = await Setting.findOne({ key: "global" }).lean();
    res.json(doc?.data || {});
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to load settings" });
  }
});

// PUT replace/merge full settings document
router.put("/", async (req, res) => {
  try {
    const payload = req.body?.data || req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid settings payload" });
    }
    const doc = await Setting.findOneAndUpdate(
      { key: "global" },
      { $set: { data: payload } },
      { upsert: true, new: true }
    ).lean();
    res.json(doc?.data || {});
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to save settings" });
  }
});

// PATCH update a specific section, e.g. /api/settings/general
router.patch("/:section", async (req, res) => {
  try {
    const section = String(req.params.section || "").trim();
    if (!section) return res.status(400).json({ error: "Missing section" });
    const data = req.body?.data || req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Invalid section payload" });
    }
    const current = (await Setting.findOne({ key: "global" }).lean()) || { data: {} };
    const merged = { ...(current.data || {}), [section]: data };
    const doc = await Setting.findOneAndUpdate(
      { key: "global" },
      { $set: { data: merged } },
      { upsert: true, new: true }
    ).lean();
    res.json(doc?.data || {});
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to update section" });
  }
});

export default router;
