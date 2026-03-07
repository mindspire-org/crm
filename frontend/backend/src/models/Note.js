import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    title: { type: String, default: "" },
    text: { type: String, default: "" },
    category: { type: String, default: "" },
    labels: { type: String, default: "" },
    labelColor: { type: String, default: "" },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    private: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NoteSchema.index({ leadId: 1, createdAt: -1 });
NoteSchema.index({ clientId: 1, createdAt: -1 });

export default mongoose.model("Note", NoteSchema);
