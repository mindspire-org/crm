import mongoose from "mongoose";

const TicketLabelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "#4F46E5" },
  },
  { timestamps: true }
);

TicketLabelSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("TicketLabel", TicketLabelSchema);
