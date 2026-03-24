import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    username: { type: String, required: false },
    action: { type: String, required: true }, // e.g., "LOGIN", "POST_JOURNAL", "UPDATE_SETTINGS"
    module: { type: String, required: true }, // e.g., "AUTH", "ACCOUNTING", "SETTINGS"
    details: { type: String, required: false },
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },
    resourceId: { type: String, required: false }, // ID of the object being modified
    status: { type: String, enum: ["success", "failure"], default: "success" },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ module: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
