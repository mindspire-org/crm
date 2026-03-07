import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    name: { type: String, default: "" },
    type: { type: String, enum: ["casual","sick","annual","unpaid","other"], default: "casual" },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
    approver: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Leave", LeaveSchema);
