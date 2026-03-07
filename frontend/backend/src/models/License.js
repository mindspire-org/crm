import mongoose from "mongoose";

const LicenseSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    product: { type: String, default: "" },
    licenseKey: { type: String, default: "" },
    status: { type: String, enum: ["active", "expired", "revoked"], default: "active" },
    issuedAt: { type: Date },
    expiresAt: { type: Date },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.License || mongoose.model("License", LicenseSchema);
