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

// Get or create conversation with a user
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { participantIds, projectId } = req.body || {};

    // Client project-scoped conversation
    if (projectId) {
      const project = await Project.findById(projectId).lean();
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const requesterRole = String(req.user?.role || '').toLowerCase();

      if (requesterRole === 'client') {
        const clientId = req.user.clientId ? String(req.user.clientId) : '';
        if (!clientId || String(project.clientId || '') !== clientId) {
          return res.status(403).json({ error: 'Access denied: project does not belong to client' });
        }
      } else if (requesterRole !== 'admin') {
        // For non-admin internal users, only allow access if they are the assigned employee for this project.
        const email = String(req.user?.email || '').toLowerCase().trim();
        const myEmp = email ? await Employee.findOne({ email }).select('_id').lean() : null;
        const myEmpId = myEmp?._id ? String(myEmp._id) : '';
        const assignedEmpId = project.employeeId ? String(project.employeeId) : '';
        if (!myEmpId || !assignedEmpId || myEmpId !== assignedEmpId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Single conversation per project (prevents mixing/duplicates)
      const existing = await Conversation.findOne({ projectId })
        .populate('participants', 'name email avatar')
        .populate('lastMessage');

      if (existing) {
        const isAdmin = requesterRole === 'admin';
        if (!isAdmin && !hasParticipant(existing, req.user._id)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        return res.json(existing);
      }

      const participantSet = new Set([req.user._id.toString()]);

      // Add assigned staff (project.employeeId -> Employee -> User via email)
      if (project.employeeId) {
        const emp = await Employee.findById(project.employeeId).lean();
        const email = String(emp?.email || '').toLowerCase().trim();
        if (email) {
          const staffUser = await User.findOneAndUpdate(
            { email },
            {
              $setOnInsert: {
                email,
                username: email,
                role: 'staff',
                status: 'active',
                createdBy: 'project-employee-sync',
              },
              $set: {
                name: emp?.name || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
                avatar: emp?.avatar || '',
              },
            },
            { new: true, upsert: true }
          );
          if (staffUser?._id) participantSet.add(staffUser._id.toString());
        }
      }

      // Add admins so the client can always reach an admin
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id').lean();
      for (const a of admins) {
        if (a?._id) participantSet.add(String(a._id));
      }

      const allParticipants = Array.from(participantSet);
      const conversation = await Conversation.create({
        projectId,
        participants: allParticipants,
        isGroup: allParticipants.length > 2,
        groupName: String(project.title || '').trim() || 'Project Chat',
        createdBy: req.user._id,
        admins: admins.map((a) => a._id),
      });

      const populatedConvo = await Conversation.findById(conversation._id)
        .populate('participants', 'name email avatar')
        .populate('lastMessage');

      return res.status(201).json(populatedConvo);
    }

    // Clients must use project-scoped conversations only
    if (req.user.role === 'client') {
      return res.status(400).json({ error: 'projectId is required for client conversations' });
    }
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([...participantIds, req.user._id.toString()])];

    // Validate participant ids
    for (const pid of allParticipants) {
      if (!mongoose.Types.ObjectId.isValid(String(pid))) {
        return res.status(400).json({ error: 'Invalid participant id' });
      }
    }

    // Enforce internal messaging permissions
    const allowed = allowedRolesForConversationCreate(req.user.role);
    if (!allowed.size) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await User.find({ _id: { $in: allParticipants } }).select('_id role status').lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    for (const pid of allParticipants) {
      const u = byId.get(String(pid));
      if (!u) return res.status(400).json({ error: 'Participant not found' });
      if (String(u.status || '').toLowerCase() === 'inactive') {
        return res.status(400).json({ error: 'Participant is inactive' });
      }
      const pr = String(u.role || '').toLowerCase();
      if (pr === 'client') {
        return res.status(400).json({ error: 'Clients can only chat via project conversations' });
      }
      if (!allowed.has(pr)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // For 1:1 chat, check if conversation already exists
    if (allParticipants.length === 2) {
      const existingConvo = await Conversation.findOne({
        projectId: { $exists: false },
        participants: { $all: allParticipants, $size: allParticipants.length }
      })
        .populate('participants', 'name email avatar')
        .populate('lastMessage');

      if (existingConvo) {
        return res.json(existingConvo);
      }
    }

    // Create new conversation
    const conversation = await Conversation.create({
      projectId: undefined,
      participants: allParticipants,
      isGroup: allParticipants.length > 2,
      createdBy: req.user._id,
      admins: [req.user._id]
    });

    const populatedConvo = await Conversation.findById(conversation._id)
      .populate('participants', 'name email avatar');

    res.status(201).json(populatedConvo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify user is participant in this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
    if (!isAdmin && !hasParticipant(conversation, req.user._id)) {
      return res.status(403).json({ error: 'Access denied: not a participant in this conversation' });
    }

    const query = { conversationId };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'name email avatar');

    // Mark messages as read
    await Message.updateMany(
      { 
        conversationId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send a message
router.post('/messages', authenticate, async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    session = null;
  }

  const { conversationId, content, attachments = [] } = req.body;
  
  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    if (session) session.endSession();
    return res.status(400).json({ error: 'Message content or attachment is required' });
  }

  // Verify user is participant in this conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    if (session) session.endSession();
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
  if (!isAdmin && !hasParticipant(conversation, req.user._id)) {
    if (session) session.endSession();
    return res.status(403).json({ error: 'Access denied: not a participant in this conversation' });
  }

  const doWrite = async (useSession) => {
    const opts = useSession ? { session } : undefined;

    const created = await Message.create(
      [{
        conversationId,
        sender: req.user._id,
        content: content?.trim(),
        attachments,
        readBy: [req.user._id],
      }],
      opts
    );

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: created[0]._id,
        $addToSet: { participants: req.user._id },
      },
      useSession ? { new: true, session } : { new: true }
    );

    // Best-effort notification fanout (outside transaction concerns)
    try {
      const convo = await Conversation.findById(conversationId).select('participants projectId').lean();
      const parts = Array.isArray(convo?.participants) ? convo.participants : [];
      const senderId = String(req.user._id);
      const targets = parts.filter((p) => String(p) !== senderId);
      if (targets.length) {
        const from = String(req.user?.name || req.user?.email || 'Someone');
        const text = String(content || '').trim();
        const snippet = text.length > 80 ? `${text.slice(0, 77)}...` : text;
        const href = `/messages?conversationId=${encodeURIComponent(String(conversationId))}`;
        const now = new Date();
        await Notification.insertMany(
          targets.map((uid) => ({
            userId: uid,
            type: 'message_new',
            title: 'New message',
            message: `${from}: ${snippet || 'Sent an attachment'}`,
            href,
            meta: { conversationId, projectId: convo?.projectId },
            createdAt: now,
            updatedAt: now,
          })),
          { ordered: false }
        );
      }
    } catch {
      // best-effort
    }

    return created[0]._id;
  };

  try {
    // Prefer transactions, but fall back gracefully for standalone MongoDB.
    if (session) {
      try {
        session.startTransaction();
        const messageId = await doWrite(true);
        await session.commitTransaction();
        session.endSession();

        const populatedMessage = await Message.findById(messageId).populate('sender', 'name email avatar');
        try {
          broadcastSse({ event: "invalidate", data: { keys: ["messages", "notifications"], conversationId: String(conversationId || "") } });
        } catch {}
        return res.status(201).json(populatedMessage);
      } catch (e) {
        try {
          await session.abortTransaction();
        } catch {}
        session.endSession();
        // Continue to non-transactional fallback below.
      }
    }

    const messageId = await doWrite(false);
    const populatedMessage = await Message.findById(messageId).populate('sender', 'name email avatar');
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["messages", "notifications"], conversationId: String(conversationId || "") } });
    } catch {}
    return res.status(201).json(populatedMessage);
  } catch (e) {
    if (session) {
      try {
        session.endSession();
      } catch {}
    }
    return res.status(500).json({ error: e.message });
  }
});

// Mark messages as read
router.post('/messages/read', authenticate, async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Message IDs array is required' });
    }

    const msgs = await Message.find({ _id: { $in: messageIds } }).select('_id conversationId sender readBy').lean();
    const convoIds = Array.from(new Set(msgs.map((m) => String(m.conversationId))));
    const convos = await Conversation.find({ _id: { $in: convoIds }, participants: req.user._id }).select('_id').lean();
    const allowedConvoIds = new Set(convos.map((c) => String(c._id)));
    const allowedMessageIds = msgs
      .filter((m) => allowedConvoIds.has(String(m.conversationId)))
      .map((m) => m._id);

    if (!allowedMessageIds.length) {
      return res.json({ success: true });
    }

    await Message.updateMany(
      {
        _id: { $in: allowedMessageIds },
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Edit a message (sender or conversation admin)
router.patch('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body || {};
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const convo = await Conversation.findById(msg.conversationId).select('admins participants');
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const isSender = String(msg.sender) === String(req.user._id);
    const isAdmin = Array.isArray(convo.admins) && convo.admins.some((a) => String(a) === String(req.user._id));
    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: 'Not allowed to edit this message' });
    }

    if (msg.isDeleted) return res.status(400).json({ error: 'Cannot edit a deleted message' });

    msg.content = String(content || '').trim();
    await msg.save();

    const populated = await Message.findById(msg._id).populate('sender', 'name email avatar');
    try {
      broadcastSse({ event: "invalidate", data: { keys: ["messages"], conversationId: String(msg?.conversationId || "") } });
    } catch {}
    return res.json(populated);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Soft delete a message (sender or conversation admin)
router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const convo = await Conversation.findById(msg.conversationId).select('admins lastMessage');
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const isSender = String(msg.sender) === String(req.user._id);
    const isAdmin = Array.isArray(convo.admins) && convo.admins.some((a) => String(a) === String(req.user._id));
    if (!isSender && !isAdmin) {
      return res.status(403).json({ error: 'Not allowed to delete this message' });
    }

    if (msg.isDeleted) return res.json({ success: true });

    msg.isDeleted = true;
    msg.deletedAt = new Date();
    // Optional: clear sensitive content
    msg.content = '';
    await msg.save();

    // If it was the last message in the conversation, update lastMessage pointer
    if (String(convo.lastMessage) === String(msg._id)) {
      const prev = await Message.find({ conversationId: msg.conversationId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();
      await Conversation.findByIdAndUpdate(msg.conversationId, { lastMessage: prev[0]?._id || undefined });
    }

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["messages", "notifications"], conversationId: String(msg?.conversationId || "") } });
    } catch {}

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete a conversation (participant can delete 1:1, creator/admin can delete group)
router.delete('/conversations/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
    const userId = String(req.user._id);
    const isParticipant = hasParticipant(convo, req.user._id);
    const isCreator = String(convo.createdBy) === userId;
    const isConvoAdmin = Array.isArray(convo.admins) && convo.admins.some((a) => String(a) === userId);
    const participantCount = Array.isArray(convo.participants) ? convo.participants.length : 0;
    const isOneToOne = participantCount === 2;

    // Permission check:
    // - Admins can delete any conversation
    // - Participants can delete 1:1 conversations
    // - Creators or admins can delete group conversations
    let canDelete = isAdmin;
    if (!canDelete) {
      if (isOneToOne) {
        canDelete = isParticipant;
      } else {
        canDelete = isCreator || isConvoAdmin;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Not allowed to delete this conversation' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    // Delete related notifications
    await Notification.deleteMany({ "meta.conversationId": conversationId });

    try {
      broadcastSse({ event: "invalidate", data: { keys: ["conversations", "messages", "notifications"] } });
    } catch {}

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
