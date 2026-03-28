import { Router } from "express";
import Setting from "../models/Setting.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

import { logActivity } from "../utils/auditLogger.js";

// Logo upload MUST come before /:section to avoid being caught by the parameter
router.post("/logo", authenticate, upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const logoUrl = `/uploads/${req.file.filename}`;
    
    const current = (await Setting.findOne({ key: "global" }).lean()) || { data: { general: {} } };
    const merged = { 
      ...(current.data || {}), 
      general: { 
        ...(current.data?.general || {}),
        logoUrl 
      } 
    };
    
    await Setting.findOneAndUpdate(
      { key: "global" },
      { $set: { data: merged } },
      { upsert: true }
    );

    await logActivity({
      userId: req.user?._id,
      username: req.user?.username,
      action: "UPDATE_LOGO",
      module: "SETTINGS",
      details: "Company logo updated",
      ipAddress: req.ip || req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"]
    });
    
    res.json({ logoUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET current settings
router.get("/", authenticate, async (_req, res) => {
  try {
    const doc = await Setting.findOne({ key: "global" }).lean();
    res.json(doc?.data || {});
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to load settings" });
  }
});

// PUT replace/merge full settings document
router.put("/", authenticate, async (req, res) => {
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

import { sendEmail } from "../utils/emailService.js";

// ... existing routes

router.post("/test-email", authenticate, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: "Recipient email is required" });

    await sendEmail({
      to,
      subject: "SMTP Integration Test - Corporate CRM",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">SMTP Connection Successful</h2>
          <p>This is a test email from your Corporate CRM system to verify your Hostinger SMTP configuration.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Time magnitude: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: "This is a test email from your Corporate CRM system to verify your SMTP configuration."
    });

    res.json({ ok: true, message: "Test email sent successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to send test email" });
  }
});

// PATCH update a specific section, e.g. /api/settings/general
router.patch("/:section", authenticate, async (req, res) => {
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
