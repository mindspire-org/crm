import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    date: { type: Date, default: Date.now },
    category: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["cash", "bank", "payable"], default: "cash" },
    status: { type: String, enum: ["draft", "posted"], default: "draft" },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", ExpenseSchema);
