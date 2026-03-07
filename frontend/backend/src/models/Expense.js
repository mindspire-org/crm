import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    date: { type: Date },
    category: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", ExpenseSchema);
