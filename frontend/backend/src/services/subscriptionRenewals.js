import cron from "node-cron";
import Subscription from "../models/Subscription.js";
import Reminder from "../models/Reminder.js";
import SubscriptionEvent from "../models/SubscriptionEvent.js";

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function buildReminderMessage({ clientName, productName, planName, amount, currency, dueDate, paymentLink }) {
  const parts = [];
  parts.push(`Dear ${clientName || "Client"},`);
  parts.push(`Your subscription renewal is due.`);
  parts.push(`Product: ${productName || "Subscription"}${planName ? ` (${planName})` : ""}`);
  parts.push(`Amount: ${currency || ""} ${Number(amount || 0).toLocaleString()}`);
  if (dueDate) parts.push(`Due date: ${dueDate.toISOString().slice(0, 10)}`);
  if (paymentLink) parts.push(`Payment link: ${paymentLink}`);
  parts.push(`Thank you.`);
  return parts.join("\n");
}

export function startSubscriptionRenewalReminderService() {
  // 1st of every month at 09:00
  cron.schedule("0 9 1 * *", async () => {
    try {
      await processMonthlySubscriptionRenewalReminders();
    } catch (e) {
      console.error("[SubscriptionRenewals] Monthly reminder job failed:", e);
    }
  });

  console.log("[SubscriptionRenewals] Started - will run on 1st of each month 09:00");
}

export async function processMonthlySubscriptionRenewalReminders(opts = {}) {
  const now = toDateOrNull(opts.asOf) || new Date();
  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const subs = await Subscription.find({
    status: { $in: ["active", "renewal_due", "overdue"] },
    nextBillingDate: { $exists: true, $ne: null, $lte: to },
  })
    .select({
      _id: 1,
      client: 1,
      whatsappNumber: 1,
      productName: 1,
      planName: 1,
      amount: 1,
      currency: 1,
      nextBillingDate: 1,
    })
    .lean();

  for (const s of subs) {
    const next = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
    if (!next || Number.isNaN(next.getTime())) continue;
    const isInMonth = sameMonth(next, now);
    const isOverdue = next < from;
    if (!isInMonth && !isOverdue) continue;

    const title = "Subscription renewal reminder";
    const message = buildReminderMessage({
      clientName: s.client || "Client",
      productName: s.productName || s.title,
      planName: s.planName,
      amount: s.amount || 0,
      currency: s.currency || "",
      dueDate: next,
      paymentLink: "",
    });

    // eslint-disable-next-line no-await-in-loop
    await Reminder.create({
      subscriptionId: s._id,
      title,
      dueAt: next,
      repeat: false,
      channel: "whatsapp",
      message,
    });

    // eslint-disable-next-line no-await-in-loop
    await SubscriptionEvent.create({
      subscriptionId: s._id,
      type: "reminder_sent",
      title,
      message,
      meta: { channel: "whatsapp", to: s.whatsappNumber || "" },
    });
  }

  return { ok: true, count: subs.length };
}
