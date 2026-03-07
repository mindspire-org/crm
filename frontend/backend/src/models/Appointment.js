import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },

    service: { type: String, default: "General", trim: true },
    preferredDate: { type: String, default: "", trim: true },
    preferredTime: { type: String, default: "", trim: true },
    timezone: { type: String, default: "", trim: true },

    message: { type: String, default: "", trim: true },

    contactMethod: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },

    source: { type: String, default: "", trim: true },
    utm: {
      source: { type: String, default: "", trim: true },
      medium: { type: String, default: "", trim: true },
      campaign: { type: String, default: "", trim: true },
      term: { type: String, default: "", trim: true },
      content: { type: String, default: "", trim: true },
    },
    referrer: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["New", "Contacted", "Confirmed", "Completed", "Cancelled"],
      default: "New",
    },

    createdIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

AppointmentSchema.index({ createdAt: -1 });
AppointmentSchema.index({ status: 1, createdAt: -1 });
AppointmentSchema.index({ email: 1, createdAt: -1 });
AppointmentSchema.index({ phone: 1, createdAt: -1 });

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);
