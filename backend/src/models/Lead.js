import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    expectedPrice: { type: String, default: "" },
    systemNeeded: { type: String, default: "" },
    type: { type: String, enum: ["Organization", "Person"], default: "Organization" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    status: { type: String, default: "New" },
    source: { type: String, default: "" },
    value: { type: String, default: "-" },
    lastContact: { type: Date },
    initials: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    country: { type: String, default: "" },
    website: { type: String, default: "" },
    vatNumber: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    currency: { type: String, default: "" },
    currencySymbol: { type: String, default: "" },
    labels: [{ type: mongoose.Schema.Types.ObjectId, ref: "LeadLabel" }],
    // Approval workflow fields for Won status
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: null },
    approvalRequestedAt: { type: Date },
    approvalRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Reminder fields
    reminderDate: { type: Date },
    reminderSent: { type: Boolean, default: false },
    // Conversation notes - free text for lead owner to track client conversations
    conversationNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

LeadSchema.index({ name: 1 });
LeadSchema.index({ company: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ ownerId: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ approvalStatus: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ createdByUserId: 1 });
LeadSchema.index({ reminderDate: 1 });
LeadSchema.index({ reminderSent: 1 });

export default mongoose.model("Lead", LeadSchema);
