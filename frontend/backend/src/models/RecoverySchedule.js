import mongoose from "mongoose";

const RecoveryScheduleSchema = new mongoose.Schema(
  {
    recoveryCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "RecoveryCase", index: true, required: true },

    milestoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone", index: true },
    title: { type: String, default: "" },

    dueDate: { type: Date, index: true },
    amountDue: { type: Number, default: 0 },

    expectedPaymentAt: { type: Date, index: true },

    status: {
      type: String,
      enum: ["Pending", "PartiallyPaid", "Overdue", "Completed"],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true }
);

RecoveryScheduleSchema.index({ recoveryCaseId: 1, dueDate: 1 });
RecoveryScheduleSchema.index({ milestoneId: 1 });

export default mongoose.models.RecoverySchedule || mongoose.model("RecoverySchedule", RecoveryScheduleSchema);
