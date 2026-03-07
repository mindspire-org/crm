import express from "express";
import EstimateForm from "../models/EstimateForm.js";

const router = express.Router();

// List estimate forms
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const where = q
      ? {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { assigneeName: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const items = await EstimateForm.find(where).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get one form
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await EstimateForm.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a form
router.post("/", async (req, res) => {
  try {
    const { title, description, status, assignee, assigneeName, public: isPublic, allowAttachment } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
    const doc = await EstimateForm.create({
      title: String(title).trim(),
      description: description || undefined,
      status: ["active", "disabled"].includes(String(status)) ? status : "active",
      assignee: assignee || undefined,
      assigneeName: assigneeName || undefined,
      public: Boolean(isPublic),
      allowAttachment: Boolean(allowAttachment),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update a form
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    const doc = await EstimateForm.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a form
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await EstimateForm.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add a field to a form
router.post("/:id/fields", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, titleLangKey, placeholder, placeholderLangKey, type = "text", required = false, options } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
    const doc = await EstimateForm.findById(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    const allowed = ["text","textarea","select","multiselect","email","date","time","number"];
    const normalizedType = allowed.includes(type) ? type : "text";
    const opts = Array.isArray(options) ? options.filter((v)=>typeof v === 'string' && v.trim()).map(v=>v.trim()) : [];
    const field = {
      title: String(title).trim(),
      titleLangKey: titleLangKey || undefined,
      placeholder,
      placeholderLangKey: placeholderLangKey || undefined,
      type: normalizedType,
      options: ["select","multiselect"].includes(normalizedType) ? opts : [],
      required: Boolean(required)
    };
    doc.fields.push(field);
    await doc.save();
    const added = doc.fields[doc.fields.length - 1];
    res.status(201).json(added);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a field
router.delete("/:id/fields/:fid", async (req, res) => {
  try {
    const { id, fid } = req.params;
    const doc = await EstimateForm.findById(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    doc.fields = doc.fields.filter((f) => String(f._id) !== String(fid));
    await doc.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit a form (preview submission)
router.post("/:id/submit", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const doc = await EstimateForm.findById(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    doc.submissions.push({ data: payload, createdAt: new Date() });
    await doc.save();
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
