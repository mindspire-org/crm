import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, default: "" },
    stage: { type: String, enum: ["Applied", "Screening", "Interview", "Offer", "Hired"], default: "Applied" },
    applied: { type: Date, default: Date.now },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    jobTitle: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Candidate", CandidateSchema);
