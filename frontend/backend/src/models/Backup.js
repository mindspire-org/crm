import mongoose from 'mongoose';

const backupSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  trigger: { type: String, enum: ['manual', 'auto'], default: 'manual' },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  error: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Backup', backupSchema);
