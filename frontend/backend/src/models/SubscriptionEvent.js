import mongoose from "mongoose";

const SubscriptionEventSchema = new mongoose.Schema(
  {
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true, index: true },
    type: { type: String, default: "" },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    meta: { type: Object, default: {} },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SubscriptionEventSchema.index({ subscriptionId: 1, createdAt: -1 });

export default mongoose.models.SubscriptionEvent || mongoose.model("SubscriptionEvent", SubscriptionEventSchema);
