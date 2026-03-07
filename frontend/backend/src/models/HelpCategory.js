import mongoose from "mongoose";

const HelpCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scope: { type: String, enum: ["help", "kb"], default: "help", index: true },
  },
  { timestamps: true }
);

HelpCategorySchema.index({ scope: 1, name: 1 }, { unique: true });

export default mongoose.model("HelpCategory", HelpCategorySchema);
