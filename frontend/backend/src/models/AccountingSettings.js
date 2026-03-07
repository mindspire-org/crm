import mongoose from "mongoose";

const AccountingSettingsSchema = new mongoose.Schema(
  {
    // Default account codes used by automation
    cashAccount: { type: String, default: "1000" },
    bankAccount: { type: String, default: "1010" },
    arParent: { type: String, default: "1100" },
    apParent: { type: String, default: "2000" },
    salaryExpense: { type: String, default: "6000" },
    salaryPayableParent: { type: String, default: "2100" },
    commissionExpense: { type: String, default: "6100" }, // Commission expense account
    commissionPayable: { type: String, default: "2150" }, // Commission payable liability
    revenueAccount: { type: String, default: "4000" },
    baseCurrency: { type: String, default: "PKR" },
    fiscalYearStartMonth: { type: Number, default: 7 }, // 1-12; 7 = July
    fiscalYearStartDay: { type: Number, default: 1 },
    // Branding for statements
    brandingName: { type: String, default: "Healthspire" },
    brandingAddress: { type: String, default: "" },
    brandingLogo: { type: String, default: "" },
  },
  { timestamps: true }
);

const AccountingSettings =
  mongoose.models.AccountingSettings || mongoose.model("AccountingSettings", AccountingSettingsSchema);

export default AccountingSettings;
