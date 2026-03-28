import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: false,
      trim: true,
      default: ''
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    attachments: [{
      url: String,
      name: String,
      type: String,
      size: Number,
      isSticker: Boolean,
      projectId: String,
      progress: Number
    }],
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'audio', 'voice', 'sticker'],
      default: 'text'
    },
    mediaUrl: String,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    isStarred: {
      type: Boolean,
      default: false
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Index for faster querying of messages in a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Robust model cleaning to ensure CastErrors don't occur when changing attachments from [String] to objects
if (mongoose.models && mongoose.models.Message) {
  Object.keys(mongoose.models).forEach(key => {
    if (key === 'Message') delete mongoose.models[key];
  });
}
if (mongoose.connection && mongoose.connection.models && mongoose.connection.models.Message) {
  delete mongoose.connection.models.Message;
}

const Message = mongoose.model('Message', MessageSchema);
export default Message;
