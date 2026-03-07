import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    name: { type: String, default: "" },
    type: { type: String, default: "" },
    path: { type: String, default: "" },
    url: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mime: { type: String, default: "" },
    uploadedBy: { type: String, default: "" },
    description: { type: String, default: "" },
    favorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FileSchema.index({ leadId: 1, createdAt: -1 });
FileSchema.index({ clientId: 1, createdAt: -1 });
FileSchema.index({ projectId: 1, createdAt: -1 });
FileSchema.index({ ticketId: 1, createdAt: -1 });
FileSchema.index({ subscriptionId: 1, createdAt: -1 });
FileSchema.index({ favorite: 1, createdAt: -1 });
FileSchema.index({ folderId: 1, createdAt: -1 });

export default mongoose.models.File || mongoose.model("File", FileSchema);
