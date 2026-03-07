import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, required: true },
    role: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    skype: { type: String, default: "" },
    website: { type: String, default: "" },
    avatar: { type: String, default: "" },
    labels: { type: [String], default: [] },
    isPrimaryContact: { type: Boolean, default: false },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    facebook: { type: String, default: "" },
    twitter: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    youtube: { type: String, default: "" },
    pinterest: { type: String, default: "" },
    instagram: { type: String, default: "" },
    github: { type: String, default: "" },
    gitlab: { type: String, default: "" },
    tumblr: { type: String, default: "" },
    vimeo: { type: String, default: "" },
    disableLogin: { type: Boolean, default: false },
    canAccessEverything: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ContactSchema.index({ leadId: 1 });

export default mongoose.model("Contact", ContactSchema);
