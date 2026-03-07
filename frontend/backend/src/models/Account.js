import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
      lowercase: true,
      trim: true,
    },
    parentCode: { type: String, trim: true, default: null },
    openingDebit: { type: Number, default: 0 },
    openingCredit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

AccountSchema.index({ code: 1 }, { unique: true });
AccountSchema.index({ type: 1 });

const Account = mongoose.models.Account || mongoose.model("Account", AccountSchema);
export default Account;
