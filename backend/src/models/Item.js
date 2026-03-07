import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general" },
    unit: { type: String, default: "" },
    rate: { type: Number, default: 0 },
    showInClientPortal: { type: Boolean, default: false },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Item", ItemSchema);
