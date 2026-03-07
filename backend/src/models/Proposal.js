import mongoose from "mongoose";
import Counter from "./Counter.js";

 const ItemSchema = new mongoose.Schema(
   {
     name: { type: String, default: "" },
     qty: { type: Number, default: 1 },
     rate: { type: Number, default: 0 },
   },
   { _id: false }
 );

const ProposalSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    client: { type: String, default: "" },
    title: { type: String, default: "" },
    number: { type: Number, unique: true, index: true },
    amount: { type: Number, default: 0 },
    proposalDate: { type: Date },
    validUntil: { type: Date },
    status: { type: String, default: "draft" },
    tax1: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    note: { type: String, default: "" },
    items: { type: [ItemSchema], default: [] },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: "Contract" },
    acceptedAt: { type: Date },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedFrom: { type: String, default: "" },
  },
  { timestamps: true }
);

ProposalSchema.index({ leadId: 1, createdAt: -1 });

// Assign an auto-incrementing number if not set
ProposalSchema.pre("save", async function (next) {
  try {
    if (!this.isNew || typeof this.number === "number") return next();
    const ctr = await Counter.findOneAndUpdate(
      { $or: [ { key: "proposal" }, { name: "proposal" } ] },
      { $inc: { value: 1 }, $set: { key: "proposal", name: "proposal" } },
      { new: true, upsert: true }
    ).lean();
    this.number = ctr.value;
    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.model("Proposal", ProposalSchema);
