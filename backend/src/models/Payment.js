import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },
    method: { type: String, default: "Cash" },
    date: { type: Date },
    status: { type: String, default: "Received" },
    payer: { type: String, default: "" },
    receivedBy: { type: String, default: "" },
    reference: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    bankName: { type: String, default: "" },
    account: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
