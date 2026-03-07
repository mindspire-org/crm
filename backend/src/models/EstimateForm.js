import mongoose from "mongoose";

const FieldSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleLangKey: { type: String },
    placeholder: { type: String },
    placeholderLangKey: { type: String },
    type: {
      type: String,
      enum: [
        "text",
        "textarea",
        "select",
        "multiselect",
        "email",
        "date",
        "time",
        "number",
      ],
      default: "text",
    },
    options: { type: [String], default: [] }, // for select/multiselect
    required: { type: Boolean, default: false },
  },
  { _id: true }
);

const SubmissionSchema = new mongoose.Schema(
  {
    data: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EstimateFormSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    assigneeName: { type: String },
    public: { type: Boolean, default: false },
    allowAttachment: { type: Boolean, default: false },
    fields: { type: [FieldSchema], default: [] },
    submissions: { type: [SubmissionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.EstimateForm || mongoose.model("EstimateForm", EstimateFormSchema);
