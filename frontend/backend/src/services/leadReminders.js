import cron from "node-cron";
import Lead from "../models/Lead.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

/**
 * Service to check for lead reminders and send notifications
 * Runs every 5 minutes to check for due reminders
 */
export function startLeadReminderService() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      await processLeadReminders();
    } catch (error) {
      console.error("[LeadReminderService] Error processing reminders:", error);
    }
  });

  console.log("[LeadReminderService] Started - checking every 5 minutes");
}

/**
 * Process due lead reminders
 * Finds leads where reminderDate has passed but reminderSent is false
 */
async function processLeadReminders() {
  const now = new Date();

  // Find leads with due reminders that haven't been sent yet
  const dueLeads = await Lead.find({
    reminderDate: { $lte: now },
    reminderSent: { $ne: true },
    ownerId: { $exists: true },
  }).lean();

  if (!dueLeads.length) return;

  console.log(`[LeadReminderService] Found ${dueLeads.length} due reminders`);

  for (const lead of dueLeads) {
    try {
      await sendReminderNotification(lead);
      // Mark reminder as sent
      await Lead.findByIdAndUpdate(lead._id, { reminderSent: true });
    } catch (error) {
      console.error(`[LeadReminderService] Failed to process reminder for lead ${lead._id}:`, error);
    }
  }
}

/**
 * Send reminder notification to the lead owner
 */
async function sendReminderNotification(lead) {
  if (!lead.ownerId) return;

  // Get employee details to find associated user
  const employee = await Employee.findById(lead.ownerId).lean();
  if (!employee || !employee.email) {
    console.log(`[LeadReminderService] No employee or email found for lead ${lead._id}`);
    return;
  }

  // Find user by employee email
  const user = await User.findOne({ email: employee.email.toLowerCase() }).select("_id").lean();
  if (!user) {
    console.log(`[LeadReminderService] No user found for employee email ${employee.email}`);
    return;
  }

  // Create notification
  const notification = {
    userId: user._id,
    title: "Lead Follow-up Reminder",
    message: `It's time to connect with "${lead.name}"${lead.company ? ` (${lead.company})` : ""}. The reminder you set is now due.`,
    type: "lead_reminder",
    href: `/crm/leads/${lead._id}`,
    meta: {
      leadId: lead._id,
      leadName: lead.name,
      company: lead.company || "",
      reminderDate: lead.reminderDate,
    },
    createdAt: new Date(),
    read: false,
  };

  await Notification.create(notification);
  console.log(`[LeadReminderService] Sent reminder for lead "${lead.name}" to user ${user._id}`);
}

export default { startLeadReminderService };
