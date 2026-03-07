import mongoose from "mongoose";

const EstimateRequestSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    title: { type: String, default: "" },
    requestDate: { type: Date },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "new" },
  },
  { timestamps: true }
);

export default mongoose.model("EstimateRequest", EstimateRequestSchema);
