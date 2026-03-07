import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    item: String,
    description: String,
    quantity: { type: Number, default: 1 },
    unit: String,
    rate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const EstimateSchema = new mongoose.Schema(
  {
    number: { type: String },
    client: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByRole: { type: String, default: "" },
    approvalStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Approved" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    branding: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      website: { type: String, default: "" },
      address: { type: String, default: "" },
      taxId: { type: String, default: "" },
      logo: { type: String, default: "" },
    },
    paymentInfo: { type: String, default: "" },
    estimateDate: { type: Date },
    validUntil: { type: Date },
    status: { type: String, enum: ["Draft", "Sent", "Accepted", "Declined"], default: "Draft" },
    tax: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    note: { type: String },
    advancedAmount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    items: { type: [ItemSchema], default: [] },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
  },
  { timestamps: true }
);

EstimateSchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.model("Estimate", EstimateSchema);
