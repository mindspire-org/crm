import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    department: { type: String, default: "" },
    role: { type: String, default: "" },
    location: { type: String, default: "" },
    status: { type: String, enum: ["active", "on-leave", "remote"], default: "active" },
    joinDate: { type: Date },
    salary: { type: Number, default: 0 },
    salaryTerm: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other"], default: "male" },
    avatar: { type: String, default: "" },
    initials: { type: String, default: "" },
    mailingAddress: { type: String, default: "" },
    alternativeAddress: { type: String, default: "" },
    alternativePhone: { type: String, default: "" },
    dateOfBirth: { type: Date },
    sick: { type: String, default: "" },
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
      drigg: { type: String, default: "" },
      youtube: { type: String, default: "" },
      pinterest: { type: String, default: "" },
      instagram: { type: String, default: "" },
      github: { type: String, default: "" },
      tumblr: { type: String, default: "" },
      vino: { type: String, default: "" },
    },
    password: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    disableLogin: { type: Boolean, default: false },
    markAsInactive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

EmployeeSchema.pre("save", function(next) {
  if (!this.name) {
    this.name = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }
  if (!this.initials && this.name) {
    this.initials = this.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  next();
});

export default mongoose.model("Employee", EmployeeSchema);
