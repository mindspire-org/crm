import { Router } from "express";
import Announcement from "../models/Announcement.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const active = String(req.query.active || "").trim();

    const filter = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
        { createdByName: { $regex: q, $options: "i" } },
      ];
    }
    if (active === "1") filter.isActive = true;
    if (active === "0") filter.isActive = false;

    const items = await Announcement.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Announcement.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { title, message, startDate, endDate, isActive, shareWith } = req.body || {};
    if (!String(title || "").trim()) return res.status(400).json({ error: "Title is required" });

    const createdByName = req.user?.name || req.user?.email || "";

    const doc = await Announcement.create({
      title: String(title).trim(),
      message: String(message || ""),
      shareWith: {
        teamMembers: shareWith?.teamMembers !== undefined ? Boolean(shareWith.teamMembers) : true,
        clients: shareWith?.clients !== undefined ? Boolean(shareWith.clients) : false,
        leads: shareWith?.leads !== undefined ? Boolean(shareWith.leads) : false,
      },
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: typeof isActive === "boolean" ? isActive : true,
      createdBy: req.user?._id,
      createdByName,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const patch = req.body || {};

    const update = {};
    if (patch.title !== undefined) update.title = String(patch.title || "").trim();
    if (patch.message !== undefined) update.message = String(patch.message || "");
    if (patch.startDate !== undefined) update.startDate = patch.startDate ? new Date(patch.startDate) : undefined;
    if (patch.endDate !== undefined) update.endDate = patch.endDate ? new Date(patch.endDate) : undefined;
    if (patch.isActive !== undefined) update.isActive = Boolean(patch.isActive);
    if (patch.shareWith !== undefined) {
      update.shareWith = {
        teamMembers: patch.shareWith?.teamMembers !== undefined ? Boolean(patch.shareWith.teamMembers) : true,
        clients: patch.shareWith?.clients !== undefined ? Boolean(patch.shareWith.clients) : false,
        leads: patch.shareWith?.leads !== undefined ? Boolean(patch.shareWith.leads) : false,
      };
    }

    const doc = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Announcement.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
