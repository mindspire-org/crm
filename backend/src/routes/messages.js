import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';
import { broadcastSse } from "../services/realtime.js";

const router = express.Router();

const hasParticipant = (conversation, userId) => {
  const uid = String(userId || '');
  const parts = Array.isArray(conversation?.participants) ? conversation.participants : [];
  return parts.some((p) => String(p) === uid);
};

const allowedRolesForConversationCreate = (role) => {
  const r = String(role || '').toLowerCase();
  if (r === 'admin') return new Set(['admin', 'staff', 'marketer', 'marketing_manager', 'sales', 'finance', 'developer', 'project_manager']);
  if (r === 'staff') return new Set(['admin', 'staff', 'marketer', 'marketing_manager', 'sales', 'finance', 'developer', 'project_manager']);
  if (r === 'marketer' || r === 'marketing_manager') return new Set(['admin', 'marketer', 'marketing_manager']);
  if (r === 'sales' || r === 'sales_manager') return new Set(['admin', 'sales', 'sales_manager']);
  if (r === 'finance') return new Set(['admin', 'staff', 'marketer', 'marketing_manager', 'sales', 'finance', 'developer', 'project_manager']);
  if (r === 'developer' || r === 'project_manager') {
    return new Set(['admin', 'staff', 'marketer', 'marketing_manager', 'sales', 'finance', 'developer', 'project_manager']);
  }
  return new Set();
};

// Get all conversations for current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
    const conversations = await Conversation.find(isAdmin ? {} : { participants: req.user._id })
      .populate('participants', 'name email avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const convoIds = conversations.map((c) => c._id);
    const unread = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convoIds },
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        },
      },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]);

    const unreadMap = new Map(unread.map((x) => [String(x._id), Number(x.count) || 0]));
    const out = conversations.map((c) => {
      const obj = typeof c.toObject === 'function' ? c.toObject() : c;
      obj.unreadCount = unreadMap.get(String(c._id)) || 0;
      return obj;
    });

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get or create conversation
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { participantIds, projectId } = req.body || {};

    if (projectId) {
      const project = await Project.findById(projectId).lean();
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const requesterRole = String(req.user?.role || '').toLowerCase();
      if (requesterRole === 'client') {
        const clientId = req.user.clientId ? String(req.user.clientId) : '';
        if (!clientId || String(project.clientId || '') !== clientId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const existing = await Conversation.findOne({ projectId })
        .populate('participants', 'name email avatar')
        .populate('lastMessage');

      if (existing) {
        if (requesterRole !== 'admin' && !hasParticipant(existing, req.user._id)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        return res.json(existing);
      }

      const participantSet = new Set([req.user._id.toString()]);
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id').lean();
      admins.forEach(a => participantSet.add(String(a._id)));

      const conversation = await Conversation.create({
        projectId,
        participants: Array.from(participantSet),
        isGroup: true,
        groupName: String(project.title || 'Project Chat'),
        createdBy: req.user._id,
        admins: admins.map(a => a._id),
      });

      const populated = await Conversation.findById(conversation._id).populate('participants', 'name email avatar');
      return res.status(201).json(populated);
    }

    const allParticipants = [...new Set([...(participantIds || []), req.user._id.toString()])];
    if (allParticipants.length === 2) {
      const existing = await Conversation.findOne({
        projectId: { $exists: false },
        participants: { $all: allParticipants, $size: 2 }
      }).populate('participants', 'name email avatar').populate('lastMessage');
      if (existing) return res.json(existing);
    }

    const conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: allParticipants.length > 2,
      createdBy: req.user._id,
      admins: [req.user._id]
    });

    const populated = await Conversation.findById(conversation._id).populate('participants', 'name email avatar');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get messages
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    
    if (String(req.user?.role).toLowerCase() !== 'admin' && !hasParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name email avatar');

    await Message.updateMany(
      { conversationId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send message
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { conversationId, content, attachments = [], type = 'text', mediaUrl } = req.body;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const created = await Message.create({
      conversationId,
      sender: req.user._id,
      content: content?.trim(),
      attachments,
      type,
      mediaUrl,
      readBy: [req.user._id],
    });

    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: created._id });

    const populated = await Message.findById(created._id).populate('sender', 'name email avatar');
    broadcastSse({ event: "invalidate", data: { keys: ["messages"], conversationId: String(conversationId) } });
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update message (Star, Pin, Edit)
router.patch('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, isStarred, isPinned } = req.body || {};

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const convo = await Conversation.findById(msg.conversationId);
    const isSender = String(msg.sender) === String(req.user._id);
    const isAdmin = String(req.user.role).toLowerCase() === 'admin' || (convo.admins || []).some(a => String(a) === String(req.user._id));

    if (content !== undefined) {
      if (!isSender && !isAdmin) return res.status(403).json({ error: 'Denied' });
      if (!isAdmin) {
        const hour = 60 * 60 * 1000;
        if (Date.now() - new Date(msg.createdAt).getTime() > hour) return res.status(400).json({ error: 'Time limit exceeded' });
      }
      msg.content = content;
    }

    if (isStarred !== undefined) msg.isStarred = isStarred;
    if (isPinned !== undefined) {
      if (!isSender && !isAdmin) return res.status(403).json({ error: 'Denied' });
      msg.isPinned = isPinned;
    }

    await msg.save();
    const populated = await Message.findById(msg._id).populate('sender', 'name email avatar');
    broadcastSse({ event: "invalidate", data: { keys: ["messages"], conversationId: String(msg.conversationId) } });
    res.json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete message
router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ error: 'Not found' });

    const isSender = String(msg.sender) === String(req.user._id);
    if (!isSender && String(req.user.role).toLowerCase() !== 'admin') return res.status(403).json({ error: 'Denied' });

    if (String(req.user.role).toLowerCase() !== 'admin') {
      const hour = 60 * 60 * 1000;
      if (Date.now() - new Date(msg.createdAt).getTime() > hour) return res.status(400).json({ error: 'Time limit exceeded' });
    }

    msg.isDeleted = true;
    msg.content = '';
    await msg.save();
    broadcastSse({ event: "invalidate", data: { keys: ["messages"], conversationId: String(msg.conversationId) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete conversation
router.delete('/conversations/:conversationId', authenticate, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.conversationId);
    if (!convo) return res.status(404).json({ error: 'Not found' });
    
    await Message.deleteMany({ conversationId: convo._id });
    await Conversation.findByIdAndDelete(convo._id);
    broadcastSse({ event: "invalidate", data: { keys: ["conversations"] } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
