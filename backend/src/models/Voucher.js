import mongoose from "mongoose";

const VoucherSchema = new mongoose.Schema(
  {
    voucherNo: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["sales_invoice", "customer_payment", "vendor_bill", "expense", "vendor_payment", "journal"],
      index: true,
    },
    date: { type: Date, required: true, index: true },
    memo: { type: String, default: "" },
    refNo: { type: String, default: "" },
    currency: { type: String, default: "PKR" },
    postedAt: { type: Date, default: Date.now },
    postedBy: { type: String },
    
    // Source document references
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense" },
    
    // The journal entry linked to this voucher
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry", required: true },
    
    attachments: [
      {
        name: String,
        path: String,
        mimeType: String,
      },
    ],
    
    status: { type: String, enum: ["draft", "posted", "voided"], default: "posted" },
    voidedAt: Date,
    voidedBy: String,
    voidReason: String,
  },
  { timestamps: true }
);

VoucherSchema.index({ type: 1, voucherNo: 1 });

const Voucher = mongoose.models.Voucher || mongoose.model("Voucher", VoucherSchema);
export default Voucher;
