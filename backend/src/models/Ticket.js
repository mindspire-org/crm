import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: Number },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    requestedBy: { type: String, default: "" },
    type: { type: String, default: "general" },
    labels: { type: [String], default: [] },
    assignedTo: { type: String, default: "" },
    status: { type: String, default: "open" },
    lastActivity: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    messages: {
      type: [
        {
          text: { type: String, default: "" },
          createdBy: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
TicketSchema.index({ clientId: 1 });
TicketSchema.index({ projectId: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ createdAt: -1 });

export default mongoose.model("Ticket", TicketSchema);
