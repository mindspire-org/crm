import mongoose from "mongoose";

const FolderSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

FolderSchema.index({ leadId: 1, createdAt: -1 });
FolderSchema.index({ clientId: 1, createdAt: -1 });
FolderSchema.index({ projectId: 1, createdAt: -1 });
FolderSchema.index({ ticketId: 1, createdAt: -1 });
FolderSchema.index({ subscriptionId: 1, createdAt: -1 });
FolderSchema.index({ parentId: 1, createdAt: -1 });

export default mongoose.models.Folder || mongoose.model("Folder", FolderSchema);
