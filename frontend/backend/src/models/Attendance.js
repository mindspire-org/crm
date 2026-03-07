import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    name: { type: String, default: "" },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", AttendanceSchema);
