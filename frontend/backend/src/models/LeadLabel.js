import mongoose from "mongoose";

const LeadLabelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "" },
  },
  { timestamps: true }
);

LeadLabelSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("LeadLabel", LeadLabelSchema);
