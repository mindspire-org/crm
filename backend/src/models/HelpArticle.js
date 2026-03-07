import mongoose from "mongoose";

const HelpArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "HelpCategory" },
    scope: { type: String, enum: ["help", "kb"], default: "help", index: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

HelpArticleSchema.index({ scope: 1, title: 1 });

export default mongoose.model("HelpArticle", HelpArticleSchema);
