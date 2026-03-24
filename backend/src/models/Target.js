import mongoose from "mongoose";

const TargetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who set the target
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    leads: { type: Number, default: 0 },
    sales: { type: Number, default: 0 }, // Value of sales
    revenue: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 }, // Percentage
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "achieved", "missed"], default: "active" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

// Unique index to ensure only one target per user per month
TargetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Target || mongoose.model("Target", TargetSchema);
