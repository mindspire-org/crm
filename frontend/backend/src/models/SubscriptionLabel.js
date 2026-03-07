import mongoose from "mongoose";

const SubscriptionLabelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#4F46E5" },
  },
  { timestamps: true }
);

SubscriptionLabelSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.SubscriptionLabel || mongoose.model("SubscriptionLabel", SubscriptionLabelSchema);
