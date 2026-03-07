import mongoose from "mongoose";
import Counter from "./Counter.js";

const ItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const AttachmentSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    name: { type: String, default: "" },
    path: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const SubscriptionSchema = new mongoose.Schema(
  {
    subscriptionNo: { type: Number, unique: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    companyName: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    vendor: { type: String, default: "" },
    title: { type: String, default: "" },
    productName: { type: String, default: "" },
    planName: { type: String, default: "" },
    type: { type: String, default: "App" },
    currency: { type: String, default: "PKR" },
    firstBillingDate: { type: Date },
    nextBillingDate: { type: Date },
    lastBilledAt: { type: Date },
    lastPaidAt: { type: Date },
    repeatEveryCount: { type: Number, default: 1 },
    repeatEveryUnit: { type: String, enum: ["day", "week", "month", "year"], default: "month" },
    cycles: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "pending", "renewal_due", "overdue", "suspended", "cancelled", "expired"],
      default: "active",
    },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, default: "" },
    suspendedAt: { type: Date },
    suspendedBy: { type: String, default: "" },
    cancelReason: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    tax1: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    accountManagerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    note: { type: String, default: "" },
    labels: { type: [String], default: [] },
    items: { type: [ItemSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
  },
  { timestamps: true }
);

SubscriptionSchema.pre("save", async function preSave(next) {
  try {
    if (!this.isNew || this.subscriptionNo) return next();
    const c = await Counter.findOneAndUpdate(
      { key: "subscription" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    this.subscriptionNo = c.value;
    return next();
  } catch (e) {
    return next(e);
  }
});

export default mongoose.models.Subscription || mongoose.model("Subscription", SubscriptionSchema);
