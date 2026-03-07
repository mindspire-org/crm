import mongoose from "mongoose";

const ContractSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    client: { type: String, default: "" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal" },
    title: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    contractDate: { type: Date },
    validUntil: { type: Date },
    status: { type: String, default: "draft" },
    tax1: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    note: { type: String, default: "" },
    items: [
      {
        name: { type: String, default: "" },
        description: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        rate: { type: Number, default: 0 },
      },
    ],
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
  },
  { timestamps: true }
);

ContractSchema.index({ leadId: 1, createdAt: -1 });
ContractSchema.index({ proposalId: 1 }, { unique: true, sparse: true });

export default mongoose.model("Contract", ContractSchema);
