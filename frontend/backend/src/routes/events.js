import { Router } from "express";
import Event from "../models/Event.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const leadId = req.query.leadId?.toString();
    const labelId = req.query.labelId?.toString();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (leadId) filter.leadId = leadId;
    if (labelId) filter.labelId = labelId;
    if (q) filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { client: { $regex: q, $options: "i" } },
    ];
    const items = await Event.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const doc = await Event.create(req.body || {});
    try { broadcastSse({ event: "invalidate", data: { keys: ["events"], id: String(doc?._id || "") } }); } catch {}
    res.status(201).json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", authenticate, async (req, res) => {
  try { const doc = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!doc) return res.status(404).json({ error: "Not found" }); try { broadcastSse({ event: "invalidate", data: { keys: ["events"], id: String(doc?._id || "") } }); } catch {} res.json(doc); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete("/:id", authenticate, async (req, res) => {
  try { const r = await Event.findByIdAndDelete(req.params.id); if (!r) return res.status(404).json({ error: "Not found" }); try { broadcastSse({ event: "invalidate", data: { keys: ["events"], id: String(req.params.id || "") } }); } catch {} res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
