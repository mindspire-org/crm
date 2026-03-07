import mongoose from "mongoose";

const TimesheetSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true, required: true },
    date: { type: Date },
    user: { type: String, default: "" },
    task: { type: String, default: "" },
    hours: { type: Number, default: 0 },
    billable: { type: Boolean, default: false },
    rate: { type: Number },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

TimesheetSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("Timesheet", TimesheetSchema);
