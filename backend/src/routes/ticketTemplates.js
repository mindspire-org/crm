import { Router } from "express";
import TicketTemplate from "../models/TicketTemplate.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const type = _req.query?.type?.toString().trim();
    const filter = {};
    if (type && type !== "all") {
      filter.type = { $in: ["all", type] };
    }
    const items = await TicketTemplate.find(filter).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = req.body?.name?.toString().trim();
    const body = req.body?.body?.toString() ?? "";
    const type = (req.body?.type?.toString().trim() || "all").toLowerCase();
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!body.trim()) return res.status(400).json({ error: "Body is required" });

    const allowed = new Set(["all", "general", "billing", "technical"]);
    if (!allowed.has(type)) return res.status(400).json({ error: "Invalid type" });

    const doc = await TicketTemplate.create({ name, body, type });
    res.status(201).json(doc);
  } catch (e) {
    const msg = e?.code === 11000 ? "Template name already exists" : e.message;
    res.status(400).json({ error: msg });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const name = req.body?.name?.toString().trim();
    const body = req.body?.body?.toString() ?? "";
    const type = (req.body?.type?.toString().trim() || "all").toLowerCase();
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!body.trim()) return res.status(400).json({ error: "Body is required" });

    const allowed = new Set(["all", "general", "billing", "technical"]);
    if (!allowed.has(type)) return res.status(400).json({ error: "Invalid type" });

    const doc = await TicketTemplate.findByIdAndUpdate(req.params.id, { name, body, type }, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    const msg = e?.code === 11000 ? "Template name already exists" : e.message;
    res.status(400).json({ error: msg });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await TicketTemplate.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
