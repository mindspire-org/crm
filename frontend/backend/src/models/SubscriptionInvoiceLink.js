import mongoose from "mongoose";

const SubscriptionInvoiceLinkSchema = new mongoose.Schema(
  {
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    billingPeriodStart: { type: Date, required: true, index: true },
    billingPeriodEnd: { type: Date, required: true, index: true },
    currency: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "generated" },
  },
  { timestamps: true }
);

SubscriptionInvoiceLinkSchema.index(
  { subscriptionId: 1, billingPeriodStart: 1, billingPeriodEnd: 1 },
  { unique: true, name: "uniq_subscription_period" }
);

export default mongoose.models.SubscriptionInvoiceLink ||
  mongoose.model("SubscriptionInvoiceLink", SubscriptionInvoiceLinkSchema);
