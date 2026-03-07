import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    permissions: [{ type: String, default: "" }],
  },
  { timestamps: true }
);

RoleSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Role || mongoose.model("Role", RoleSchema);
