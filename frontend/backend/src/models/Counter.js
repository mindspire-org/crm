import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    // Some routes/models historically used { name, seq }
    name: { type: String, trim: true },
    seq: { type: Number, default: 0 },
    // Others use { key, value }
    key: { type: String, trim: true },
    value: { type: Number, default: 0 },
    // Legacy fields kept for backward compatibility with old code and indexes
    name: { type: String },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

CounterSchema.index({ key: 1 }, { unique: true, sparse: true });
CounterSchema.index({ name: 1 }, { unique: true, sparse: true });

CounterSchema.pre("validate", function (next) {
  if (!this.key && !this.name) {
    return next(new Error("Counter requires either key or name"));
  }
  next();
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
export default Counter;
