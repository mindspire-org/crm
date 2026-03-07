import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    isGroup: {
      type: Boolean,
      default: false
    },
    groupName: {
      type: String,
      trim: true
    },
    groupPhoto: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);

// Index for faster participant-based lookups
ConversationSchema.index({ participants: 1, updatedAt: -1 });
ConversationSchema.index({ projectId: 1, updatedAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
export default Conversation;
