import mongoose from "mongoose";

const NoteCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

NoteCategorySchema.index({ name: 1 }, { unique: true });

export default mongoose.model("NoteCategory", NoteCategorySchema);
