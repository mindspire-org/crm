import { Router } from "express";
import Subscription from "../models/Subscription.js";
import Counter from "../models/Counter.js";
import Invoice from "../models/Invoice.js";
import SubscriptionEvent from "../models/SubscriptionEvent.js";
import SubscriptionInvoiceLink from "../models/SubscriptionInvoiceLink.js";
import Reminder from "../models/Reminder.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastSse } from "../services/realtime.js";

const router = Router();

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addInterval(d, count, unit) {
  const c = Math.max(1, Number(count) || 1);
  const u = String(unit || "month").toLowerCase();
  const x = new Date(d);
  if (u === "day" || u === "days") x.setDate(x.getDate() + c);
  else if (u === "week" || u === "weeks") x.setDate(x.getDate() + c * 7);
  else if (u === "year" || u === "years") x.setFullYear(x.getFullYear() + c);
  else x.setMonth(x.getMonth() + c);
  return x;
}

function normalizeToMonthly(amount, everyCount, unit) {
  const a = Number(amount || 0) || 0;
  const c = Math.max(1, Number(everyCount) || 1);
  const u = String(unit || "month").toLowerCase();
  if (u === "day" || u === "days") return (a * 30) / c;
  if (u === "week" || u === "weeks") return (a * 4.345) / c;
  if (u === "month" || u === "months") return a / c;
  if (u === "year" || u === "years") return a / 12 / c;
  return a / c;
}

async function logEvent({ subscriptionId, type, title, message, meta, userId }) {
  try {
    await SubscriptionEvent.create({
      subscriptionId,
      type: String(type || ""),
      title: String(title || ""),
      message: String(message || ""),
      meta: meta || {},
      createdByUserId: userId || undefined,
    });
  } catch {}
}

router.get("/", authenticate, async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    const clientId = req.query.clientId?.toString();
    const currency = req.query.currency?.toString().trim();
    const repeatEveryUnit = req.query.repeatEveryUnit?.toString().trim();
    const status = req.query.status?.toString().trim();
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (currency) filter.currency = currency;
    if (repeatEveryUnit) filter.repeatEveryUnit = repeatEveryUnit;
    if (status) filter.status = status;
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { client: { $regex: q, $options: "i" } }];
    const items = await Subscription.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get("/dashboard", authenticate, async (req, res) => {
  try {
    const asOf = toDateOrNull(req.query.asOf) || new Date();
    const now = asOf;
    const startOfToday = startOfDay(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const subs = await Subscription.find({}).sort({ createdAt: -1 }).lean();

    const activeStatuses = new Set(["active", "renewal_due", "overdue"]);
    const active = subs.filter((s) => activeStatuses.has(String(s.status || "active").toLowerCase()));

    let mrr = 0;
    for (const s of active) {
      mrr += normalizeToMonthly(Number(s.amount || 0) || 0, Number(s.repeatEveryCount || 1) || 1, String(s.repeatEveryUnit || "month"));
    }
    const arr = mrr * 12;

    const renewalsDueThisMonth = active.filter((s) => {
      const d = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d >= startOfMonth && d < startOfNextMonth;
    });

    const overdue = active.filter((s) => {
      const d = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d < startOfToday;
    });

    const expired = subs.filter((s) => String(s.status || "").toLowerCase() === "expired");

    const newThisMonth = subs.filter((s) => {
      const d = s.createdAt ? new Date(s.createdAt) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      return d >= startOfMonth && d < startOfNextMonth;
    });

    res.json({
      asOf: now.toISOString(),
      totalActiveSubscriptions: active.length,
      mrr,
      arr,
      renewalsDueThisMonth: renewalsDueThisMonth.length,
      expiredSubscriptions: expired.length,
      overdueRenewals: overdue.length,
      newSubscriptionsThisMonth: newThisMonth.length,
      queues: {
        overdue: overdue.slice(0, 20),
        dueThisMonth: renewalsDueThisMonth.slice(0, 20),
      },
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Subscription.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id/timeline", authenticate, async (req, res) => {
  try {
    const items = await SubscriptionEvent.find({ subscriptionId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id/invoices", authenticate, async (req, res) => {
  try {
    const links = await SubscriptionInvoiceLink.find({ subscriptionId: req.params.id })
      .sort({ billingPeriodStart: -1 })
      .limit(100)
      .lean();
    const ids = links.map((l) => l.invoiceId).filter(Boolean);
    const invs = ids.length ? await Invoice.find({ _id: { $in: ids } }).sort({ createdAt: -1 }).lean() : [];
    res.json({ links, invoices: invs });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/reminders/whatsapp", authenticate, async (req, res) => {
  try {
    const sub = await Subscription.findById(req.params.id).lean();
    if (!sub) return res.status(404).json({ error: "Not found" });

    const title = String(req.body?.title || "Subscription renewal reminder");
    const message = String(req.body?.message || "");
    const dueAt = req.body?.dueAt ? new Date(req.body.dueAt) : (sub.nextBillingDate ? new Date(sub.nextBillingDate) : undefined);
    const to = String(req.body?.to || sub.whatsappNumber || "");

    const r = await Reminder.create({
      subscriptionId: sub._id,
      title,
      dueAt,
      repeat: false,
      channel: "whatsapp",
      message: message || "",
    });

    await logEvent({
      subscriptionId: sub._id,
      type: "reminder_sent",
      title,
      message: message || "",
      meta: { channel: "whatsapp", to },
      userId: req.user?._id,
    });

    res.status(201).json({ ok: true, reminder: r });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/billing/preview", authenticate, async (req, res) => {
  try {
    const asOf = toDateOrNull(req.body?.asOf) || new Date();
    const now = startOfDay(asOf);
    const limitRaw = Number(req.body?.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const subs = await Subscription.find({
      status: { $in: ["active", "renewal_due", "overdue"] },
      nextBillingDate: { $exists: true, $ne: null, $lte: now },
    })
      .sort({ nextBillingDate: 1 })
      .limit(limit)
      .lean();

    const rows = subs.map((s) => {
      const nextBillingDate = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
      const periodStart = nextBillingDate ? startOfDay(nextBillingDate) : null;
      const periodEnd = periodStart ? addInterval(periodStart, Number(s.repeatEveryCount || 1) || 1, String(s.repeatEveryUnit || "month")) : null;
      const amount = Number(s.amount || 0) || 0;
      return {
        subscriptionId: String(s._id),
        client: s.client || "",
        title: s.title || "",
        productName: s.productName || "",
        planName: s.planName || "",
        currency: s.currency || "",
        amount,
        nextBillingDate: periodStart ? periodStart.toISOString() : null,
        billingPeriodStart: periodStart ? periodStart.toISOString() : null,
        billingPeriodEnd: periodEnd ? periodEnd.toISOString() : null,
      };
    });

    res.json({ ok: true, asOf: now.toISOString(), rows });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/billing/run", authenticate, async (req, res) => {
  try {
    const asOf = toDateOrNull(req.body?.asOf) || new Date();
    const now = startOfDay(asOf);
    const limitRaw = Number(req.body?.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const subs = await Subscription.find({
      status: { $in: ["active", "renewal_due", "overdue"] },
      nextBillingDate: { $exists: true, $ne: null, $lte: now },
    })
      .sort({ nextBillingDate: 1 })
      .limit(limit);

    const created = [];
    const skipped = [];

    for (const s of subs) {
      const next = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
      if (!next || Number.isNaN(next.getTime())) {
        skipped.push({ subscriptionId: String(s._id), reason: "Missing nextBillingDate" });
        // eslint-disable-next-line no-continue
        continue;
      }
      const billingPeriodStart = startOfDay(next);
      const billingPeriodEnd = addInterval(billingPeriodStart, Number(s.repeatEveryCount || 1) || 1, String(s.repeatEveryUnit || "month"));

      const existingLink = await SubscriptionInvoiceLink.findOne({
        subscriptionId: s._id,
        billingPeriodStart,
        billingPeriodEnd,
      })
        .select({ _id: 1 })
        .lean();
      if (existingLink?._id) {
        skipped.push({ subscriptionId: String(s._id), reason: "Already billed for period" });
        // eslint-disable-next-line no-continue
        continue;
      }

      const inv = await Invoice.create({
        number: String(Math.floor(Date.now() / 1000)),
        clientId: s.clientId,
        client: s.client || "",
        amount: Number(s.amount || 0) || 0,
        issueDate: billingPeriodStart,
        dueDate: billingPeriodStart,
        status: "Unpaid",
        note: `Auto-generated from Subscription #${s.subscriptionNo || ""}`.trim(),
        labels: `subscription:${String(s._id)}`,
        items: Array.isArray(s.items) ? s.items : [],
        tax1: Number(s.tax1 || 0) || 0,
        tax2: Number(s.tax2 || 0) || 0,
      });

      await SubscriptionInvoiceLink.create({
        subscriptionId: s._id,
        invoiceId: inv._id,
        billingPeriodStart,
        billingPeriodEnd,
        currency: s.currency || "",
        amount: Number(s.amount || 0) || 0,
        status: "generated",
      });

      s.lastBilledAt = new Date();
      s.lastInvoiceId = inv._id;
      s.nextBillingDate = addInterval(billingPeriodStart, Number(s.repeatEveryCount || 1) || 1, String(s.repeatEveryUnit || "month"));
      s.status = "active";
      await s.save();

      await logEvent({
        subscriptionId: s._id,
        type: "invoice_generated",
        title: "Invoice generated",
        message: `Invoice ${String(inv.number || "")} generated for renewal.`,
        meta: { invoiceId: String(inv._id), invoiceNumber: String(inv.number || "") },
        userId: req.user?._id,
      });

      created.push({ subscriptionId: String(s._id), invoiceId: String(inv._id), invoiceNumber: String(inv.number || "") });
    }

    try { broadcastSse({ event: "invalidate", data: { keys: ["subscriptions"] } }); } catch {}

    res.json({ ok: true, createdCount: created.length, skippedCount: skipped.length, created, skipped });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const doc = await Subscription.create(req.body || {});
    await logEvent({
      subscriptionId: doc._id,
      type: "created",
      title: "Subscription created",
      message: doc.title || "",
      meta: {},
      userId: req.user?._id,
    });
    try { broadcastSse({ event: "invalidate", data: { keys: ["subscriptions"], id: String(doc?._id || "") } }); } catch {}
    res.status(201).json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const doc = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    await logEvent({
      subscriptionId: doc._id,
      type: "updated",
      title: "Subscription updated",
      message: doc.title || "",
      meta: {},
      userId: req.user?._id,
    });
    try { broadcastSse({ event: "invalidate", data: { keys: ["subscriptions"], id: String(doc?._id || "") } }); } catch {}
    res.json(doc);
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/:id/cancel", authenticate, async (req, res) => {
  try {
    const cancelledBy = (req.body?.cancelledBy ?? "").toString();
    const doc = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled", cancelledAt: new Date(), cancelledBy },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Not found" });
    await logEvent({
      subscriptionId: doc._id,
      type: "status_change",
      title: "Subscription cancelled",
      message: cancelledBy ? `Cancelled by ${cancelledBy}` : "Cancelled",
      meta: { status: "cancelled" },
      userId: req.user?._id,
    });
    try { broadcastSse({ event: "invalidate", data: { keys: ["subscriptions"], id: String(doc?._id || "") } }); } catch {}
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/reactivate", authenticate, async (req, res) => {
  try {
    const doc = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: "active", cancelledAt: undefined, cancelledBy: "" },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Not found" });
    await logEvent({
      subscriptionId: doc._id,
      type: "status_change",
      title: "Subscription reactivated",
      message: "Reactivated",
      meta: { status: "active" },
      userId: req.user?._id,
    });
    try { broadcastSse({ event: "invalidate", data: { keys: ["subscriptions"], id: String(doc?._id || "") } }); } catch {}
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/admin/backfill-nos", authenticate, async (req, res) => {
  try {
    if (String(req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const missing = await Subscription.find({ $or: [{ subscriptionNo: { $exists: false } }, { subscriptionNo: null }] })
      .sort({ createdAt: 1 })
      .select({ _id: 1 })
      .lean();

    let updated = 0;
    for (const s of missing) {
      // eslint-disable-next-line no-await-in-loop
      const c = await Counter.findOneAndUpdate(
        { key: "subscription" },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
      );
      // eslint-disable-next-line no-await-in-loop
      await Subscription.findByIdAndUpdate(s._id, { subscriptionNo: c.value });
      updated += 1;
    }

    res.json({ ok: true, updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await authenticate(req, res, () => null);
    if (!req.user) return;
    const r = await Subscription.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    try { broadcastSse({ event: "invalidate", data: { keys: ["subscriptions"], id: String(req.params.id || "") } }); } catch {}
    res.json({ ok: true });
  }
  catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
