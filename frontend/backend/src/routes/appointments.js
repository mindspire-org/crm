import { Router } from "express";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Employee from "../models/Employee.js";
import Note from "../models/Note.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const router = Router();

// Mock notification services - replace with real API integrations (e.g. Twilio, SendGrid)
async function sendWhatsAppMessage(phone, message) {
  console.log(`[WhatsApp] Sending to ${phone}: ${message}`);
  // Implementation for WhatsApp API (e.g. Twilio) would go here
}

async function sendEmailNotification(email, subject, text) {
  console.log(`[Email] Sending to ${email}: ${subject}`);
  // Implementation for Email API (e.g. NodeMailer, SendGrid) would go here
}

async function notifyCustomer(doc) {
  const name = String(doc.name || "Customer");
  const when = [doc.preferredDate, doc.preferredTime].filter(Boolean).join(" at ");
  
  const msg = `Hello ${name}, your appointment for ${doc.service} on ${when} has been received and is being processed. We will contact you soon for confirmation. Thank you!`;
  
  if (doc.phone) {
    await sendWhatsAppMessage(doc.phone, msg);
  }
  
  if (doc.email) {
    await sendEmailNotification(doc.email, "Appointment Received - Haroom Medical Center", msg);
  }
}

const PUBLIC_KEY = String(process.env.APPOINTMENTS_PUBLIC_KEY || "").trim();

const getClientIp = (req) => {
  const xfwd = String(req.headers["x-forwarded-for"] || "");
  if (xfwd) return xfwd.split(",")[0].trim();
  return String(req.ip || req.connection?.remoteAddress || "");
};

// Simple in-memory rate limit (best-effort)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const rateBuckets = new Map();

const checkRateLimit = (key) => {
  const now = Date.now();
  const cur = rateBuckets.get(key);
  if (!cur || now - cur.ts > RATE_WINDOW_MS) {
    rateBuckets.set(key, { ts: now, count: 1 });
    return true;
  }
  if (cur.count >= RATE_MAX) return false;
  cur.count += 1;
  return true;
};

async function notifyAdmins(appointmentDoc) {
  const admins = await User.find({ role: "admin", status: "active" }).select({ _id: 1 }).lean();
  const href = `/appointments?open=${encodeURIComponent(String(appointmentDoc._id || ""))}`;
  const when = [appointmentDoc.preferredDate, appointmentDoc.preferredTime].filter(Boolean).join(" ").trim();
  const title = "New appointment request";
  const msg = `${String(appointmentDoc.name || "Someone")} • ${when || ""} ${String(appointmentDoc.service || "General")}`.trim();

  const rows = (admins || []).map((a) => ({
    userId: a._id,
    type: "appointment_new",
    title,
    message: msg,
    href,
    meta: { appointmentId: String(appointmentDoc._id || "") },
  }));

  if (rows.length) await Notification.insertMany(rows);
}

const isCancelledStatus = (status) => {
  const s = String(status || "").trim().toLowerCase();
  return s.startsWith("cancel");
};

const isNewStatus = (status) => {
  const s = String(status || "").trim().toLowerCase();
  return s === "new";
};

const isConvertibleStatus = (status) => {
  if (isNewStatus(status)) return false;
  if (isCancelledStatus(status)) return false;
  return true;
};

const APPT_TO_LEAD_STATUS = {
  New: "New",
  Contacted: "Qualified",
  Confirmed: "Discussion",
  Completed: "Won",
  Cancelled: "Lost",
};

const isValidEmail = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

const normalizePhone = (v) => {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.replace(/[\s().-]/g, "");
};

const isValidPhone = (v) => {
  const p = normalizePhone(v);
  if (!p) return false;
  const digits = p.replace(/[^0-9]/g, "");
  return digits.length >= 7;
};

const LEAD_STATUS_ORDER = ["New", "Qualified", "Discussion", "Negotiation", "Won", "Lost"];

const chooseMoreAdvancedLeadStatus = (current, next) => {
  const cur = String(current || "New").trim() || "New";
  const nxt = String(next || "New").trim() || "New";
  const curIdx = LEAD_STATUS_ORDER.indexOf(cur);
  const nxtIdx = LEAD_STATUS_ORDER.indexOf(nxt);
  if (curIdx === -1 && nxtIdx === -1) return cur;
  if (curIdx === -1) return nxt;
  if (nxtIdx === -1) return cur;
  return nxtIdx > curIdx ? nxt : cur;
};

const getDefaultLeadOwnerId = async () => {
  try {
    const admin = await User.findOne({ role: "admin", status: "active" }).select({ email: 1 }).lean();
    const email = String(admin?.email || "").trim().toLowerCase();
    if (email) {
      const emp = await Employee.findOne({ email }).select({ _id: 1 }).lean();
      if (emp?._id) return emp._id;
    }

    const fallback = await Employee.findOne({ status: "active" }).select({ _id: 1 }).sort({ createdAt: 1 }).lean();
    return fallback?._id || null;
  } catch {
    return null;
  }
};

const getEmployeeIdForUserEmail = async (emailRaw) => {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) return null;
  try {
    const emp = await Employee.findOne({ email }).select({ _id: 1 }).lean();
    return emp?._id || null;
  } catch {
    return null;
  }
};

async function syncAppointmentToLead(appointmentDoc, opts = {}) {
  const doc = appointmentDoc?.toObject ? appointmentDoc.toObject() : appointmentDoc;
  if (!doc) return null;
  if (!opts?.allowNew && !isConvertibleStatus(doc.status)) return { skipped: true };

  const email = String(doc.email || "").trim().toLowerCase();
  const phone = String(doc.phone || "").trim();
  const match = [];
  if (email) match.push({ email });
  if (phone) match.push({ phone });
  if (!match.length) return null;

  const mappedStatus = APPT_TO_LEAD_STATUS[String(doc.status || "New").trim()] || "New";
  const basePayload = {
    name: String(doc.name || doc.company || "Appointment Lead").trim() || "Appointment Lead",
    company: String(doc.company || ""),
    email,
    phone,
    systemNeeded: String(doc.service || "").trim(),
    type: String(doc.company || "").trim() ? "Organization" : "Person",
    status: mappedStatus,
    source: "Appointment",
    city: String(doc.city || "").trim(),
    lastContact: new Date(),
  };

  const existing = await Lead.findOne({ $or: match }).sort({ createdAt: -1 });

  if (!existing) {
    const ownerId = opts.ownerId || (await getDefaultLeadOwnerId()) || undefined;
    const payload = { ...basePayload, ownerId };
    if (!payload.initials && payload.name) {
      payload.initials = payload.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const created = await Lead.create(payload);
    return { lead: created, created: true };
  }

  const next = {};
  next.lastContact = new Date();

  next.status = chooseMoreAdvancedLeadStatus(existing.status, basePayload.status);

  if (!String(existing.company || "").trim() && basePayload.company) next.company = basePayload.company;
  if (!String(existing.city || "").trim() && basePayload.city) next.city = basePayload.city;
  if (!String(existing.systemNeeded || "").trim() && basePayload.systemNeeded) next.systemNeeded = basePayload.systemNeeded;
  if (!String(existing.source || "").trim() && basePayload.source) next.source = basePayload.source;
  if (!String(existing.phone || "").trim() && basePayload.phone) next.phone = basePayload.phone;
  if (!String(existing.email || "").trim() && basePayload.email) next.email = basePayload.email;

  if (!existing.ownerId) {
    const ownerId = opts.ownerId || (await getDefaultLeadOwnerId()) || undefined;
    if (ownerId) next.ownerId = ownerId;
  }

  const updated = await Lead.findByIdAndUpdate(existing._id, { $set: next }, { new: true });
  return { lead: updated, created: false };
}

const formatAppointmentNoteText = (doc) => {
  const when = [doc.preferredDate, doc.preferredTime].filter(Boolean).join(" ").trim();
  const utm = doc.utm || {};
  const utmParts = [
    utm.source ? `source=${utm.source}` : "",
    utm.medium ? `medium=${utm.medium}` : "",
    utm.campaign ? `campaign=${utm.campaign}` : "",
    utm.term ? `term=${utm.term}` : "",
    utm.content ? `content=${utm.content}` : "",
  ].filter(Boolean);

  return [
    `Status: ${String(doc.status || "-")}`,
    `Service: ${String(doc.service || "General")}`,
    when ? `Preferred: ${when}` : "Preferred: -",
    doc.timezone ? `Timezone: ${doc.timezone}` : "Timezone: -",
    "",
    `Name: ${String(doc.name || "-")}`,
    `Email: ${String(doc.email || "-")}`,
    `Phone: ${String(doc.phone || "-")}`,
    doc.company ? `Company: ${doc.company}` : "Company: -",
    doc.city ? `City: ${doc.city}` : "City: -",
    doc.contactMethod ? `Contact method: ${doc.contactMethod}` : "Contact method: -",
    "",
    doc.message ? `Message:\n${String(doc.message)}` : "Message: -",
    "",
    doc.source ? `Source: ${doc.source}` : "Source: Appointment",
    utmParts.length ? `UTM: ${utmParts.join(" | ")}` : "UTM: -",
    doc.referrer ? `Referrer: ${doc.referrer}` : "Referrer: -",
    "",
    `Appointment ID: ${String(doc._id || "-")}`,
    doc.createdAt ? `Submitted at: ${new Date(doc.createdAt).toLocaleString()}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");
};

async function upsertAppointmentLeadNote(leadDoc, appointmentDoc, opts = {}) {
  const lead = leadDoc?.toObject ? leadDoc.toObject() : leadDoc;
  const appt = appointmentDoc?.toObject ? appointmentDoc.toObject() : appointmentDoc;
  if (!lead?._id || !appt?._id) return;
  if (!opts?.allowNew && !isConvertibleStatus(appt.status)) return;

  const labelKey = `appointment:${String(appt._id)}`;
  const title = `Appointment: ${String(appt.service || "General")} (${String(appt.status || "New")})`;
  const text = formatAppointmentNoteText(appt);

  const existing = await Note.findOne({ leadId: lead._id, category: "Appointment", labels: labelKey }).sort({ createdAt: -1 });
  const employeeId = lead.ownerId || undefined;

  if (!existing) {
    await Note.create({
      employeeId,
      leadId: lead._id,
      title,
      text,
      category: "Appointment",
      labels: labelKey,
      private: true,
    });
    return;
  }

  await Note.findByIdAndUpdate(existing._id, { $set: { title, text, employeeId } });
}

// Public appointment submission (no auth)
router.post("/public", async (req, res) => {
  try {
    if (PUBLIC_KEY) {
      const provided = String(req.headers["x-appointments-key"] || "").trim();
      if (!provided || provided !== PUBLIC_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`ip:${ip}`)) return res.status(429).json({ error: "Too many requests" });

    const body = req.body || {};

    // Honeypot field for bots
    const honeypot = String(body.website || "").trim();
    if (honeypot) return res.status(200).json({ ok: true });

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const emailNorm = String(email || "").trim().toLowerCase();
    const phoneNorm = normalizePhone(phone);

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (email && !isValidEmail(emailNorm)) return res.status(400).json({ error: "Invalid email" });
    if (phone && !isValidPhone(phoneNorm)) return res.status(400).json({ error: "Invalid phone" });
    if (!isValidEmail(emailNorm) && !isValidPhone(phoneNorm)) return res.status(400).json({ error: "Valid email or phone is required" });

    const doc = await Appointment.create({
      name,
      email: emailNorm,
      phone: phoneNorm,
      service: String(body.service || "General").trim() || "General",
      preferredDate: String(body.preferredDate || "").trim(),
      preferredTime: String(body.preferredTime || "").trim(),
      timezone: String(body.timezone || "").trim(),
      message: String(body.message || "").trim(),
      contactMethod: String(body.contactMethod || "").trim(),
      company: String(body.company || "").trim(),
      city: String(body.city || "").trim(),
      source: String(body.source || "").trim(),
      utm: {
        source: String(body.utmSource || body.utm?.source || "").trim(),
        medium: String(body.utmMedium || body.utm?.medium || "").trim(),
        campaign: String(body.utmCampaign || body.utm?.campaign || "").trim(),
        term: String(body.utmTerm || body.utm?.term || "").trim(),
        content: String(body.utmContent || body.utm?.content || "").trim(),
      },
      referrer: String(body.referrer || "").trim(),
      createdIp: ip,
      userAgent: String(req.headers["user-agent"] || ""),
      status: "New",
    });

    try {
      await notifyAdmins(doc);
      await notifyCustomer(doc);
    } catch (_) {}

    try {
      // Always create/update a Lead for public appointment submissions (even in New status)
      const syncedNew = await syncAppointmentToLead(doc, { allowNew: true });
      if (syncedNew?.lead) await upsertAppointmentLeadNote(syncedNew.lead, doc, { allowNew: true });
    } catch (_) {}

    res.status(201).json({ ok: true, id: doc._id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: list appointments
router.get("/", authenticate, isAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const limitRaw = Number(req.query.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const filter = {};
    if (status) filter.status = status;

    if (from || to) {
      const createdAt = {};
      if (from) createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        createdAt.$lte = d;
      }
      filter.createdAt = createdAt;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
      ];
    }

    const items = await Appointment.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: get single
router.get("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
    const doc = await Appointment.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Admin: update status/fields
router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

    const before = await Appointment.findById(id).select({ status: 1 }).lean();
    const beforeStatus = String(before?.status || "");

    const payload = { ...(req.body || {}) };
    const allowed = new Set([
      "status",
      "service",
      "preferredDate",
      "preferredTime",
      "timezone",
      "message",
      "contactMethod",
      "company",
      "city",
      "source",
      "email",
      "phone",
      "name",
    ]);

    for (const k of Object.keys(payload)) {
      if (!allowed.has(k)) delete payload[k];
    }

    if (Object.prototype.hasOwnProperty.call(payload, "email")) {
      const em = String(payload.email || "").trim().toLowerCase();
      if (em && !isValidEmail(em)) return res.status(400).json({ error: "Invalid email" });
      payload.email = em;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
      const ph = normalizePhone(payload.phone);
      if (ph && !isValidPhone(ph)) return res.status(400).json({ error: "Invalid phone" });
      payload.phone = ph;
    }

    const doc = await Appointment.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });

    const afterStatus = String(doc.status || "");

    if (isConvertibleStatus(afterStatus)) {
      const ownerId = (await getEmployeeIdForUserEmail(req.user?.email)) || (await getDefaultLeadOwnerId());

      const synced = await syncAppointmentToLead(doc, { ownerId: ownerId || undefined });
      if (!synced?.lead?._id) {
        return res.status(400).json({ error: "Could not convert appointment to lead (missing email/phone)" });
      }

      await upsertAppointmentLeadNote(synced.lead, doc);
      await Appointment.findByIdAndDelete(id);

      return res.json({
        ...(doc.toObject ? doc.toObject() : doc),
        convertedToLead: true,
        appointmentRemoved: true,
        leadId: String(synced.lead._id),
      });
    }

    res.json({ ...(doc.toObject ? doc.toObject() : doc), convertedToLead: false });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
