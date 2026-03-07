import { Router } from "express";
import Note from "../models/Note.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// GET /api/notes - List notes
// By default, only show notes created by the current user (admin sees all)
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const employeeId = req.query.employeeId?.toString();
    const leadId = req.query.leadId?.toString();
    const clientId = req.query.clientId?.toString();
    const myNotes = req.query.myNotes === "true";

    const filter = {};

    // Only admin can see all notes; everyone else only sees their own
    const isAdmin = req.user.role === "admin";
    if (!isAdmin || myNotes) {
      filter.createdBy = req.user._id;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (leadId) filter.leadId = leadId;
    if (clientId) filter.clientId = clientId;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { text: { $regex: q, $options: "i" } },
      ];
    }

    const items = await Note.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to fetch notes" });
  }
});

// POST /api/notes - Create a new note
// Automatically sets createdBy to the current user's ID
router.post("/", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user._id,
    };
    const doc = await Note.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/notes/:id - Update a note
// Only the creator or admin can update
router.put("/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Not found" });

    // Only the creator or admin can update
    const isOwner = note.createdBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "You can only edit your own notes" });
    }

    const doc = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/notes/:id - Delete a note
// Only the creator or admin can delete
router.delete("/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Not found" });

    // Only the creator or admin can delete
    const isOwner = note.createdBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "You can only delete your own notes" });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
