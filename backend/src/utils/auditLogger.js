import AuditLog from "../models/AuditLog.js";

export const logActivity = async ({
  userId,
  username,
  action,
  module,
  details,
  ipAddress,
  userAgent,
  resourceId,
  status = "success"
}) => {
  try {
    await AuditLog.create({
      userId,
      username,
      action,
      module,
      details,
      ipAddress,
      userAgent,
      resourceId,
      status
    });
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};
