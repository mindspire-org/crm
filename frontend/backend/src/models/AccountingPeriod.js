import mongoose from "mongoose";

const AccountingPeriodSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    locked: { type: Boolean, default: false },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

AccountingPeriodSchema.index({ start: 1, end: 1 });

const AccountingPeriod =
  mongoose.models.AccountingPeriod || mongoose.model("AccountingPeriod", AccountingPeriodSchema);

export default AccountingPeriod;
