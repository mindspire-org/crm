import mongoose from "mongoose";

const JournalLineSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
    accountCode: { type: String, required: true },
    description: { type: String, default: "" },
    entityType: { type: String, enum: ["client", "employee", "vendor", "other"], default: undefined },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const JournalEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    memo: { type: String, default: "" },
    refNo: { type: String, default: "" },
    currency: { type: String, default: "PKR" },
    postedAt: { type: Date },
    postedBy: { type: String },
    adjusting: { type: Boolean, default: false },
    lines: { type: [JournalLineSchema], validate: (v) => Array.isArray(v) && v.length >= 2 },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry", default: undefined },
  },
  { timestamps: true }
);

JournalEntrySchema.index({ date: 1 });
JournalEntrySchema.index({ "lines.accountId": 1 });
JournalEntrySchema.index({ "lines.entityType": 1, "lines.entityId": 1 });

// Basic invariant: debits must equal credits
JournalEntrySchema.pre("validate", function ensureBalanced(next) {
  const totalDebit = (this.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = (this.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);
  if (Math.round((totalDebit - totalCredit) * 100) !== 0) {
    return next(new Error("Journal not balanced (debits must equal credits)"));
  }
  return next();
});

const JournalEntry = mongoose.models.JournalEntry || mongoose.model("JournalEntry", JournalEntrySchema);
export default JournalEntry;
