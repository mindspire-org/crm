import { Router } from "express";
import { z } from "zod";
import Lead from "../models/Lead.js";
import MetaLead from "../models/MetaLead.js";
import Note from "../models/Note.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import MetaConfig from "../models/MetaConfig.js";
import { metaGraphGet } from "../services/metaGraph.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const router = Router();

const getMetaConfig = async () => {
  try {
    const cfg = await MetaConfig.findOne({ key: "default" }).lean();
    const env = {
      enabled: true,
      accessToken: String(process.env.META_ACCESS_TOKEN || "").trim(),
      adAccountId: String(process.env.META_AD_ACCOUNT_ID || "").trim(),
      verifyToken: String(process.env.META_VERIFY_TOKEN || "").trim(),
      source: "env",
    };

    if (!cfg) return env;

    return {
      enabled: cfg.enabled !== false,
      accessToken: String(cfg.accessToken || "").trim() || env.accessToken,
      adAccountId: String(cfg.adAccountId || "").trim() || env.adAccountId,
      verifyToken: String(cfg.verifyToken || "").trim() || env.verifyToken,
      source: "db",
    };
  } catch {
    return {
      enabled: true,
      accessToken: String(process.env.META_ACCESS_TOKEN || "").trim(),
      adAccountId: String(process.env.META_AD_ACCOUNT_ID || "").trim(),
      verifyToken: String(process.env.META_VERIFY_TOKEN || "").trim(),
      source: "env",
    };
  }
};

router.get("/config", authenticate, isAdmin, async (req, res) => {
  try {
    const cfg = await MetaConfig.findOne({ key: "default" }).lean();
    const merged = await getMetaConfig();
    res.json({
      enabled: merged.enabled,
      hasAccessToken: Boolean(String(merged.accessToken || "").trim()),
      adAccountId: String(merged.adAccountId || "").trim(),
      verifyToken: String(merged.verifyToken || "").trim(),
      source: merged.source,
      updatedAt: cfg?.updatedAt || null,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to load meta config" });
  }
});

router.put("/config", authenticate, isAdmin, async (req, res) => {
  try {
    const schema = z.object({
      enabled: z.boolean().optional(),
      accessToken: z.string().optional(),
      adAccountId: z.string().optional(),
      verifyToken: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map((x) => x.message).join(", ") });
    }

    const payload = {};
    if (parsed.data.enabled !== undefined) payload.enabled = parsed.data.enabled;
    if (parsed.data.accessToken !== undefined) payload.accessToken = String(parsed.data.accessToken || "").trim();
    if (parsed.data.adAccountId !== undefined) payload.adAccountId = String(parsed.data.adAccountId || "").trim();
    if (parsed.data.verifyToken !== undefined) payload.verifyToken = String(parsed.data.verifyToken || "").trim();

    const updated = await MetaConfig.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          ...payload,
          key: "default",
          updatedByUserId: req.user?._id,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean();

    const merged = await getMetaConfig();
    res.json({
      ok: true,
      enabled: merged.enabled,
      hasAccessToken: Boolean(String(merged.accessToken || "").trim()),
      adAccountId: String(merged.adAccountId || "").trim(),
      verifyToken: String(merged.verifyToken || "").trim(),
      source: merged.source,
      updatedAt: updated?.updatedAt || null,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to save meta config" });
  }
});

router.delete("/config", authenticate, isAdmin, async (req, res) => {
  try {
    await MetaConfig.deleteOne({ key: "default" });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to disconnect meta config" });
  }
});

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

function normalizePhone(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.replace(/[^0-9+]/g, "");
}

function leadPayloadFromFieldData(fieldData) {
  const flat = {};
  for (const row of Array.isArray(fieldData) ? fieldData : []) {
    const name = String(row?.name || "").trim().toLowerCase();
    const values = Array.isArray(row?.values) ? row.values : [];
    if (!name || !values.length) continue;
    flat[name] = values[0];
  }

  const fullName = String(flat.full_name || flat.name || "").trim();
  const email = String(flat.email || "").trim().toLowerCase();
  const phone = normalizePhone(flat.phone_number || flat.phone || "");
  const company = String(flat.company_name || flat.company || "").trim();
  const city = String(flat.city || "").trim();

  const name = fullName || company || "Meta Lead";

  return {
    name,
    company,
    email,
    phone,
    city,
    type: company ? "Organization" : "Person",
    source: "Meta Ads",
  };
}

async function upsertLeadFromMeta({ leadgenId, metaLead }) {
  const fieldPayload = leadPayloadFromFieldData(metaLead?.field_data);
  const match = [];
  if (fieldPayload.email) match.push({ email: fieldPayload.email });
  if (fieldPayload.phone) match.push({ phone: fieldPayload.phone });

  if (!match.length) {
    const created = await Lead.create({
      ...fieldPayload,
      status: "New",
      lastContact: new Date(),
      ownerId: (await getDefaultLeadOwnerId()) || undefined,
      initials: String(fieldPayload.name || "M")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
    return created;
  }

  const existing = await Lead.findOne({ $or: match }).sort({ createdAt: -1 });
  if (!existing) {
    const created = await Lead.create({
      ...fieldPayload,
      status: "New",
      lastContact: new Date(),
      ownerId: (await getDefaultLeadOwnerId()) || undefined,
      initials: String(fieldPayload.name || "M")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
    return created;
  }

  const next = {
    lastContact: new Date(),
  };

  if (!String(existing.company || "").trim() && fieldPayload.company) next.company = fieldPayload.company;
  if (!String(existing.city || "").trim() && fieldPayload.city) next.city = fieldPayload.city;
  if (!String(existing.phone || "").trim() && fieldPayload.phone) next.phone = fieldPayload.phone;
  if (!String(existing.email || "").trim() && fieldPayload.email) next.email = fieldPayload.email;
  if (!String(existing.source || "").trim()) next.source = fieldPayload.source;
  if (!existing.ownerId) {
    const ownerId = (await getDefaultLeadOwnerId()) || undefined;
    if (ownerId) next.ownerId = ownerId;
  }

  const updated = await Lead.findByIdAndUpdate(existing._id, { $set: next }, { new: true });
  return updated;
}

async function upsertMetaLeadNote(leadDoc, metaLeadRaw) {
  const lead = leadDoc?.toObject ? leadDoc.toObject() : leadDoc;
  if (!lead?._id) return;

  const leadgenId = String(metaLeadRaw?.id || "").trim();
  if (!leadgenId) return;

  const labelKey = `meta:${leadgenId}`;
  const title = "Meta Lead";

  const fields = Array.isArray(metaLeadRaw?.field_data) ? metaLeadRaw.field_data : [];
  const text = [
    `Leadgen ID: ${leadgenId}`,
    metaLeadRaw?.created_time ? `Created: ${metaLeadRaw.created_time}` : "",
    metaLeadRaw?.form_id ? `Form: ${metaLeadRaw.form_id}` : "",
    metaLeadRaw?.ad_id ? `Ad: ${metaLeadRaw.ad_id}` : "",
    metaLeadRaw?.campaign_id ? `Campaign: ${metaLeadRaw.campaign_id}` : "",
    "",
    "Fields:",
    ...fields.map((f) => {
      const k = String(f?.name || "");
      const v = Array.isArray(f?.values) ? f.values.join(", ") : "";
      return `- ${k}: ${v}`;
    }),
  ]
    .filter((x) => x !== "")
    .join("\n");

  const existing = await Note.findOne({ leadId: lead._id, category: "Meta", labels: labelKey }).sort({ createdAt: -1 });
  const employeeId = lead.ownerId || undefined;

  if (!existing) {
    await Note.create({
      employeeId,
      leadId: lead._id,
      title,
      text,
      category: "Meta",
      labels: labelKey,
      private: true,
    });
    return;
  }

  await Note.updateOne({ _id: existing._id }, { $set: { title, text, updatedAt: new Date() } });
}

router.get("/webhook", async (req, res) => {
  const mode = String(req.query["hub.mode"] || "");
  const token = String(req.query["hub.verify_token"] || "");
  const challenge = String(req.query["hub.challenge"] || "");

  const cfg = await getMetaConfig();
  if (!cfg.enabled) return res.status(403).send("Meta integration disabled");

  const verifyToken = String(cfg.verifyToken || "").trim();
  if (!verifyToken) return res.status(500).send("META_VERIFY_TOKEN not configured");

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Forbidden");
});

router.post("/webhook", async (req, res) => {
  // Respond quickly to Meta
  res.status(200).json({ ok: true });

  try {
    const cfg = await getMetaConfig();
    if (!cfg.enabled) return;

    const schema = z.object({ object: z.string().optional(), entry: z.array(z.any()).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return;

    const entries = parsed.data.entry || [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const ch of changes) {
        const field = String(ch?.field || "").trim();
        if (field !== "leadgen") continue;

        const leadgenId = String(ch?.value?.leadgen_id || ch?.value?.leadgenId || "").trim();
        if (!leadgenId) continue;

        const already = await MetaLead.findOne({ leadgenId }).select({ _id: 1 }).lean();
        if (already) continue;

        const metaLead = await metaGraphGet(
          `${leadgenId}`,
          {
            fields: "created_time,field_data,ad_id,adset_id,campaign_id,form_id",
          },
          { accessToken: cfg.accessToken }
        );

        const lead = await upsertLeadFromMeta({ leadgenId, metaLead });

        await MetaLead.create({
          leadgenId,
          leadId: lead?._id,
          formId: String(metaLead?.form_id || ""),
          adId: String(metaLead?.ad_id || ""),
          adsetId: String(metaLead?.adset_id || ""),
          campaignId: String(metaLead?.campaign_id || ""),
          createdTime: metaLead?.created_time ? new Date(metaLead.created_time) : undefined,
          raw: metaLead,
        });

        await upsertMetaLeadNote(lead, metaLead);
      }
    }
  } catch (e) {
    console.error("Meta webhook processing failed:", e?.message || e);
  }
});

router.get("/stats", async (req, res) => {
  try {
    const cfg = await getMetaConfig();
    if (!cfg.enabled) return res.status(403).json({ error: "Meta integration disabled" });

    const accountId = String(cfg.adAccountId || "").trim();
    if (!accountId) return res.status(400).json({ error: "META_AD_ACCOUNT_ID not configured" });

    const since = String(req.query.since || "").trim();
    const until = String(req.query.until || "").trim();

    const time_range = {};
    if (since) time_range.since = since;
    if (until) time_range.until = until;

    const data = await metaGraphGet(
      `${accountId}/insights`,
      {
        level: "campaign",
        fields: "campaign_id,campaign_name,spend,impressions,clicks,cpc,cpm,actions,action_values",
        time_range: Object.keys(time_range).length ? JSON.stringify(time_range) : undefined,
        limit: 100,
      },
      { accessToken: cfg.accessToken }
    );

    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to fetch stats" });
  }
});

router.get("/leads", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt(String(req.query.limit || "50"), 10) || 50));
    const rows = await MetaLead.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("leadId")
      .lean();

    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to load meta leads" });
  }
});

export default router;
