import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    client: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    start: { type: Date },
    end: { type: Date },
    type: { type: String, default: "meeting" },
    location: { type: String, default: "" },
    labelId: { type: String, default: "" },
    labelColor: { type: String, default: "" },
    repeat: { type: Boolean, default: false },
    shareOnlyMe: { type: Boolean, default: false },
    shareAllTeam: { type: Boolean, default: false },
    shareSpecific: { type: Boolean, default: false },
  },
  { timestamps: true }
);

EventSchema.index({ leadId: 1, start: 1 });

export default mongoose.model("Event", EventSchema);
