import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true, required: true },
    author: { type: String, default: "" },
    text: { type: String, default: "" },
    at: { type: Date, default: Date.now },
    rating: { type: Number },
    category: { type: String, default: "" },
    status: { type: String, default: "" },
    followUpRequired: { type: Boolean, default: false },
    sentiment: { type: String, default: "" },
  },
  { timestamps: true }
);

FeedbackSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("Feedback", FeedbackSchema);
