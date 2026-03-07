import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true, required: true },
    text: { type: String, default: "" },
    author: { type: String, default: "" },
    kind: { type: String, default: "General" },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CommentSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("Comment", CommentSchema);
