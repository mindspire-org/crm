import mongoose from "mongoose";

const MetaLeadSchema = new mongoose.Schema(
  {
    leadgenId: { type: String, required: true, unique: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    formId: { type: String, default: "" },
    adId: { type: String, default: "" },
    adsetId: { type: String, default: "" },
    campaignId: { type: String, default: "" },
    createdTime: { type: Date },
    raw: { type: Object },
  },
  { timestamps: true }
);
MetaLeadSchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.model("MetaLead", MetaLeadSchema);
