import mongoose from "mongoose";

const RecoveryEventSchema = new mongoose.Schema(
  {
    recoveryCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "RecoveryCase", index: true, required: true },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "RecoverySchedule", index: true },

    type: {
      type: String,
      enum: [
        "followup",
        "promise",
        "reminder_sent",
        "note",
        "status_change",
        "escalation",
        "dispute",
      ],
      required: true,
      index: true,
    },

    title: { type: String, default: "" },
    body: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed },

    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RecoveryEventSchema.index({ recoveryCaseId: 1, createdAt: -1 });

export default mongoose.models.RecoveryEvent || mongoose.model("RecoveryEvent", RecoveryEventSchema);
