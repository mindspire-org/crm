import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    avatar: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, default: "" },
    pinHash: { type: String, default: "" },
    resetPasswordTokenHash: { type: String, default: "" },
    resetPasswordTokenExpiresAt: { type: Date },
    role: {
      type: String,
      enum: [
        "admin",
        "client",
        "staff",
        "marketer",
        "marketing_manager",
        "sales",
        "sales_manager",
        "finance",
        "finance_manager",
        "developer",
        "project_manager",
        "manager",
        "core",
        "main team member",
      ],
      default: "client",
    },
    permissions: [{ type: String, default: "" }], // Format: "module:submodule:action" (e.g., "crm:leads:edit")
    access: {
      canView: { type: Boolean, default: true },
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      dataScope: { type: String, enum: ["assigned", "all", "team"], default: "assigned" },
      canSeePrices: { type: Boolean, default: false },
      canSeeFinance: { type: Boolean, default: false },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    failedLogins: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    createdBy: { type: String, default: "system" }, // e.g. self-signup
  },
  { timestamps: true }
);

// Add indexes for faster authentication queries
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ resetPasswordTokenHash: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
