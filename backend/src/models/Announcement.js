import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
    shareWith: {
      teamMembers: { type: Boolean, default: true },
      clients: { type: Boolean, default: false },
      leads: { type: Boolean, default: false },
    },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
