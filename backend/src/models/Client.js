import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["org", "person"], default: "org" },
    company: { type: String, default: "" },
    person: { type: String, default: "" },
    owner: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    country: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    skype: { type: String, default: "" },
    website: { type: String, default: "" },
    avatar: { type: String, default: "" },
    vatNumber: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    clientGroups: { type: [String], default: [] },
    currency: { type: String, default: "" },
    currencySymbol: { type: String, default: "" },
    labels: { type: [String], default: [] },
    disableOnlinePayment: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: String, default: "system" },
    // Primary contact details
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    // Social links
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
    // Account & permissions
    disableLogin: { type: Boolean, default: false },
    isPrimaryContact: { type: Boolean, default: true },
    canAccessEverything: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Add indexes for better performance
ClientSchema.index({ company: "text", person: "text", email: "text", phone: "text" });
ClientSchema.index({ createdAt: -1 });
ClientSchema.index({ status: 1 });
ClientSchema.index({ clientGroups: 1 });
ClientSchema.index({ labels: 1 });

export default mongoose.model("Client", ClientSchema);
