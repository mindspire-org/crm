import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: String, default: "" },
    openings: { type: Number, default: 1 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    posted: { type: Date, default: Date.now },
    location: { type: String, default: "" },
    salary: { type: String, default: "" },
    type: { type: String, default: "Full-time" }, // e.g. Full-time, Part-time, Contract
    description: { type: String, default: "" },
    requirements: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Job", JobSchema);
