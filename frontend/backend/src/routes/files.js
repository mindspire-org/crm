import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import File from "../models/File.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Apply authentication to all files routes
router.use(authenticate);

// Use same upload directory as server.js for consistency
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(path.resolve(__dirname, "../.."), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const owner = req.body.projectId
      ? `proj_${req.body.projectId}`
      : req.body.leadId
      ? `lead_${req.body.leadId}`
      : req.body.employeeId
      ? `emp_${req.body.employeeId}`
      : "misc";
    cb(null, `file_${owner}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const employeeId = req.query.employeeId?.toString();
    const projectId = req.query.projectId?.toString();
    const leadId = req.query.leadId?.toString();
    const clientId = req.query.clientId?.toString();
    const ticketId = req.query.ticketId?.toString();
    const subscriptionId = req.query.subscriptionId?.toString();
    const taskId = req.query.taskId?.toString();
    const favorite = req.query.favorite?.toString();
    const folderId = req.query.folderId?.toString();

    const filter = {};
    // Only admin can see all files; regular users see only their own
    if (req.user?.role !== "admin") {
      filter.userId = req.user?._id;
    }
    if (employeeId) filter.employeeId = employeeId;
    if (projectId) filter.projectId = projectId;
    if (leadId) filter.leadId = leadId;
    if (clientId) filter.clientId = clientId;
    if (ticketId) filter.ticketId = ticketId;
    if (subscriptionId) filter.subscriptionId = subscriptionId;
    if (taskId) filter.taskId = taskId;
    if (favorite === "true") filter.favorite = true;
    if (folderId && folderId !== "null" && folderId !== "") filter.folderId = folderId;
    else filter.folderId = null;
    if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }];

    const items = await File.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    // Only admin or owner can access file
    if (req.user?.role !== "admin") {
      filter.userId = req.user?._id;
    }
    const doc = await File.findOne(filter).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id/favorite", async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    // Only admin or owner can modify
    if (req.user?.role !== "admin") {
      filter.userId = req.user?._id;
    }
    const doc = await File.findOne(filter);
    if (!doc) return res.status(404).json({ error: "Not found" });
    doc.favorite = !doc.favorite;
    await doc.save();
    res.json({ _id: doc._id, favorite: doc.favorite });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const hasMeta = Boolean(req.body?.url || req.body?.path || req.body?.name);
    if (!req.file && !hasMeta) return res.status(400).json({ error: "No file uploaded" });

    const doc = await File.create({
      userId: req.user?._id,
      employeeId: req.body.employeeId,
      projectId: req.body.projectId,
      leadId: req.body.leadId,
      clientId: req.body.clientId,
      ticketId: req.body.ticketId,
      taskId: req.body.taskId,
      subscriptionId: req.body.subscriptionId,
      folderId: req.body.folderId || null,
      name: req.body.name || req.file?.originalname || "file",
      type: req.body.type || "",
      path: req.file ? `/uploads/${req.file.filename}` : (req.body.path || ""),
      url: req.body.url || "",
      size: req.file ? (req.file.size || 0) : (Number(req.body.size) || 0),
      mime: req.file ? (req.file.mimetype || "") : (req.body.mime || ""),
      uploadedBy: req.user?.email || req.body.uploadedBy || "",
      description: req.body.description || "",
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    // Only admin or owner can delete
    if (req.user?.role !== "admin") {
      filter.userId = req.user?._id;
    }
    const r = await File.findOneAndDelete(filter);
    if (!r) return res.status(404).json({ error: "Not found" });
    
    // Delete physical file if exists
    if (r.path) {
      try {
        const filename = path.basename(r.path);
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.error("Failed to delete physical file:", fileErr.message);
        // Continue - DB record is already deleted
      }
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
