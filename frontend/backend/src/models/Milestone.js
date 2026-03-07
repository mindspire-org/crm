import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true, required: true },
    title: { type: String, default: "" },
    due: { type: Date },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "Open" },
  },
  { timestamps: true }
);

MilestoneSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("Milestone", MilestoneSchema);
