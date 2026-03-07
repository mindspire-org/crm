import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
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
    amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    status: { type: String, default: "Unpaid" },
    issueDate: { type: Date },
    dueDate: { type: Date },
    // Line items
    items: [
      {
        name: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        rate: { type: Number, default: 0 },
        taxable: { type: Boolean, default: false },
        total: { type: Number, default: 0 },
      },
    ],
    // Optional associations and meta
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    project: { type: String, default: "" },
    note: { type: String, default: "" },
    labels: { type: String, default: "" },
    advanceAmount: { type: Number, default: 0 },
    // Taxes percentages
    tax1: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    // Attachments uploaded via /api/files
    attachments: [
      {
        name: { type: String, default: "" },
        path: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

// Add indexes for better query performance
InvoiceSchema.index({ clientId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ dueDate: 1 });

export default mongoose.model("Invoice", InvoiceSchema);
