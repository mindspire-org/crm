import mongoose from "mongoose";

const DeleteAccountRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

DeleteAccountRequestSchema.index({ createdAt: -1 });

export default mongoose.models.DeleteAccountRequest ||
  mongoose.model("DeleteAccountRequest", DeleteAccountRequestSchema);
