import mongoose from "mongoose";

const ReminderSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    estimateId: { type: mongoose.Schema.Types.ObjectId, ref: "Estimate" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    title: { type: String, default: "" },
    dueAt: { type: Date },
    repeat: { type: Boolean, default: false },
    doneAt: { type: Date },
    channel: { type: String, default: "" },
    message: { type: String, default: "" },
  },
  { timestamps: true }
);

ReminderSchema.index({ leadId: 1, dueAt: 1 });
ReminderSchema.index({ invoiceId: 1, dueAt: 1 });
ReminderSchema.index({ estimateId: 1, dueAt: 1 });
ReminderSchema.index({ subscriptionId: 1, dueAt: 1 });
ReminderSchema.index({ leadId: 1, doneAt: 1, dueAt: 1 });

ReminderSchema.pre("validate", function (next) {
  if (!this.leadId && !this.invoiceId && !this.estimateId && !this.subscriptionId) {
    return next(new Error("Either leadId, invoiceId, estimateId, or subscriptionId is required"));
  }
  next();
});

export default mongoose.models.Reminder || mongoose.model("Reminder", ReminderSchema);
