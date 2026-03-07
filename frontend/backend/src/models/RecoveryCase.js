import mongoose from "mongoose";

const RecoveryCaseSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", index: true, required: true, unique: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", index: true },

    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    status: {
      type: String,
      enum: [
        "Pending",
        "PartiallyPaid",
        "Overdue",
        "InFollowUp",
        "PaymentPromised",
        "Dispute",
        "Completed",
        "WrittenOff",
      ],
      default: "Pending",
      index: true,
    },

    priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal", index: true },
    riskFlags: [{ type: String, default: "" }],

    lastFollowUpAt: { type: Date },
    nextFollowUpAt: { type: Date, index: true },
    nextExpectedPaymentAt: { type: Date, index: true },

    notes: { type: String, default: "" },

    writtenOffReason: { type: String, default: "" },
  },
  { timestamps: true }
);

RecoveryCaseSchema.index({ invoiceId: 1 });
RecoveryCaseSchema.index({ ownerUserId: 1, status: 1 });
RecoveryCaseSchema.index({ nextFollowUpAt: 1 });
RecoveryCaseSchema.index({ nextExpectedPaymentAt: 1 });

export default mongoose.models.RecoveryCase || mongoose.model("RecoveryCase", RecoveryCaseSchema);
