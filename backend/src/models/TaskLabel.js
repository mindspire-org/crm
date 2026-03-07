import mongoose from "mongoose";

const TaskLabelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "" },
  },
  { timestamps: true }
);

TaskLabelSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("TaskLabel", TaskLabelSchema);
