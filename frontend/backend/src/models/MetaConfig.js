import mongoose from "mongoose";

const MetaConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    enabled: { type: Boolean, default: true },
    accessToken: { type: String, default: "" },
    adAccountId: { type: String, default: "" },
    verifyToken: { type: String, default: "" },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

MetaConfigSchema.index({ key: 1 }, { unique: true });

export default mongoose.model("MetaConfig", MetaConfigSchema);
