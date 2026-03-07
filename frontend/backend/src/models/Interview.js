import mongoose from "mongoose";

const InterviewSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    candidateName: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    when: { type: Date, required: true },
    mode: { type: String, enum: ["onsite", "remote", "phone"], default: "onsite" },
    location: { type: String, default: "" },
    interviewer: { type: String, default: "" },
    status: { type: String, enum: ["scheduled", "completed", "canceled"], default: "scheduled" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Interview", InterviewSchema);
