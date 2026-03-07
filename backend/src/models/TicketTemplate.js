import mongoose from "mongoose";

const TicketTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, default: "all" },
  },
  { timestamps: true }
);

TicketTemplateSchema.index({ name: 1 }, { unique: true });

export default mongoose.models.TicketTemplate || mongoose.model("TicketTemplate", TicketTemplateSchema);
