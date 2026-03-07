import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: String, default: "" },
    openings: { type: Number, default: 1 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    posted: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Job", JobSchema);
