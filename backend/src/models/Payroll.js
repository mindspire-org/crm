import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    employee: { type: String, required: true },
    period: { type: String, required: true }, // YYYY-MM
    basic: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    daysInMonth: { type: Number, default: 30 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    allowedLeaves: { type: Number, default: 2 },
    status: { type: String, enum: ["draft", "processed", "paid"], default: "draft" },
  },
  { timestamps: true }
);

export default mongoose.model("Payroll", PayrollSchema);
