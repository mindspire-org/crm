import mongoose from "mongoose";

const projectRequestSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  budget: {
    type: String,
    trim: true,
  },
  deadline: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "in_progress"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

projectRequestSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const ProjectRequest = mongoose.models.ProjectRequest || mongoose.model("ProjectRequest", projectRequestSchema);
export default ProjectRequest;
