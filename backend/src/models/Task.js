import mongoose from "mongoose";
import Counter from "./Counter.js";

const AssigneeSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    initials: { type: String, default: "" },
  },
  { _id: false }
);

const ChecklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SubTaskSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ReminderSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    when: { type: Date },
    repeat: { type: String, default: "" },
    priority: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
    notifyTargets: { type: [String], default: [] },
  },
  { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
  {
    authorName: { type: String, default: "" },
    text: { type: String, default: "" },
    attachmentCount: { type: Number, default: 0 },
    attachments: {
      type: [{
        _id: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String, default: "" },
        url: { type: String, default: "" },
        path: { type: String, default: "" },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

const ActivitySchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    message: { type: String, default: "" },
    authorName: { type: String, default: "" },
  },
  { timestamps: true }
);

const TaskSchema = new mongoose.Schema(
  {
    taskNo: { type: Number, unique: true, index: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
    createdByEmail: { type: String, default: "" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    projectTitle: { type: String, default: "" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    points: { type: Number },
    status: { type: String, enum: ["backlog", "todo", "in-progress", "review", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    start: { type: Date },
    deadline: { type: Date },
    dueDate: { type: Date },
    assignees: { type: [AssigneeSchema], default: [] },
    collaborators: { type: [String], default: [] },
    comments: { type: Number, default: 0 },
    attachments: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] },
    subTasks: { type: [SubTaskSchema], default: [] },
    dependencies: {
      blockedBy: { type: [mongoose.Schema.Types.ObjectId], ref: "Task", default: [] },
      blocking: { type: [mongoose.Schema.Types.ObjectId], ref: "Task", default: [] },
    },
    reminders: { type: [ReminderSchema], default: [] },
    taskComments: { type: [CommentSchema], default: [] },
    activity: { type: [ActivitySchema], default: [] },
  },
  { timestamps: true }
);

TaskSchema.pre("save", async function preSave(next) {
  try {
    if (!this.isNew || this.taskNo) return next();
    const c = await Counter.findOneAndUpdate(
      { key: "task" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    this.taskNo = c.value;
    return next();
  } catch (e) {
    return next(e);
  }
});

TaskSchema.index({ projectId: 1 });
TaskSchema.index({ invoiceId: 1 });
TaskSchema.index({ leadId: 1 });
TaskSchema.index({ ticketId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ createdAt: -1 });

export default mongoose.model("Task", TaskSchema);
