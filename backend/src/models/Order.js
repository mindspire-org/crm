import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    name: String,
    description: String,
    quantity: { type: Number, default: 1 },
    unit: String,
    rate: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    number: { type: String },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    items: { type: [OrderItemSchema], default: [] },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "new" },
    orderDate: { type: Date },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
