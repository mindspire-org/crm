import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, default: "" },
    stage: { type: String, enum: ["Applied", "Screening", "Interview", "Offer", "Hired"], default: "Applied" },
    applied: { type: Date, default: Date.now },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    jobTitle: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    city: { type: String, default: "" },
    company: { type: String, default: "" },
    contactMethod: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
    experience: { type: String, default: "" },
    category: { type: String, default: "" },
    labels: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Candidate", CandidateSchema);
