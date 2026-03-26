import Project from "../models/Project.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import mongoose from "mongoose";
import { Router } from "express";
import Client from "../models/Client.js";
import { ensureLinkedAccount } from "../services/accounting.js";
import { authenticate } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

// simple multer storage for avatar uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(SERVER_ROOT, "uploads");
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `clientavatar_${req.params.id || Date.now()}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const canReadClients = (role) => {
  const r = String(role || "").toLowerCase();
  return [
    "admin",
    "staff",
    "marketer",
    "marketing_manager",
    "sales",
    "sales_manager",
    "finance",
    "finance_manager",
    "developer",
    "project_manager",
  ].includes(r);
};

const canWriteClients = (role) => {
  const r = String(role || "").toLowerCase();
  return r === "admin" || r === "marketer";
};

// List clients with optional search
router.get("/", authenticate, async (req, res) => {
  try {
    if (!canReadClients(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const q = req.query.q?.toString().trim();
    const filter = q
      ? {
          $or: [
            { company: { $regex: q, $options: "i" } },
            { person: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    // Use aggregation to fetch clients and their financial data in ONE pass
    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $limit: 1000 },
      // Look up project counts
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "clientId",
          as: "projects"
        }
      },
      // Look up total invoiced
      {
        $lookup: {
          from: "invoices",
          localField: "_id",
          foreignField: "clientId",
          as: "invoices"
        }
      },
      // Look up payments
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "clientId",
          as: "payments"
        }
      },
      {
        $project: {
          company: 1,
          person: 1,
          email: 1,
          phone: 1,
          avatar: 1,
          clientGroups: 1,
          labels: 1,
          _id: 1,
          createdAt: 1,
          projectsCount: { $size: "$projects" },
          totalInvoiced: { $sum: "$invoices.amount" },
          paymentReceived: { $sum: "$payments.amount" },
          due: { 
            $subtract: [
              { $sum: "$invoices.amount" },
              { $sum: "$payments.amount" }
            ] 
          }
        }
      }
    ];

    const items = await Client.aggregate(pipeline);
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Create client
router.post("/", authenticate, async (req, res) => {
  try {
    if (!canWriteClients(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const doc = await Client.create(req.body);
    try {
      const displayName = doc.company || doc.person || doc.firstName || doc.lastName || "Client";
      await ensureLinkedAccount("client", doc._id, displayName);
    } catch (err) {
      console.error("Account auto-creation failed for client:", err.message);
    }
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get single client
router.get("/:id", authenticate, async (req, res) => {
  try {
    if (!canReadClients(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const doc = await Client.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update client
router.put("/:id", authenticate, async (req, res) => {
  try {
    if (!canWriteClients(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const doc = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    try {
      const displayName = doc.company || doc.person || doc.firstName || doc.lastName || "Client";
      await ensureLinkedAccount("client", doc._id, displayName);
    } catch (_) {}
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Upload & set client avatar
router.post("/:id/avatar", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!canWriteClients(req.user?.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    // Log upload details for debugging
    console.log("Avatar upload:", {
      clientId: req.params.id,
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    });
    
    // Check if file exists on disk
    const fs = await import('fs');
    const fileExists = fs.existsSync(req.file.path);
    console.log("File exists on disk:", fileExists, "at path:", req.file.path);
    
    const avatarPath = `/uploads/${req.file.filename}`;
    const doc = await Client.findByIdAndUpdate(req.params.id, { avatar: avatarPath }, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    
    console.log("Avatar saved:", { clientId: doc._id, avatar: doc.avatar, fileExists });
    res.json(doc);
  } catch (e) {
    console.error("Avatar upload error:", e);
    res.status(400).json({ error: e.message });
  }
});

// Delete client
router.delete("/:id", authenticate, async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const r = await Client.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
