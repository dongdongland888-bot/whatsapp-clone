const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { verifyToken, checkNotBlocked } = require('../middleware/auth');
const { messageValidation } = require('../middleware/validation');
const { messageLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply authentication to all routes
router.use(verifyToken);

// Get recent conversations
router.get('/conversations', asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  
  const conversations = await Message.getRecentConversations(
    req.user.id, 
    parseInt(limit)
  );
  
  res.json({
    success: true,
    data: conversations
  });
}));

// Get unread message counts
router.get('/unread', asyncHandler(async (req, res) => {
  const unreadCounts = await Message.getUnreadCount(req.user.id);
  
  const totalUnread = unreadCounts.reduce((sum, item) => sum + item.count, 0);
  
  res.json({
    success: true,
    data: {
      total: totalUnread,
      by_sender: unreadCounts
    }
  });
}));

// Search messages
router.get('/search', asyncHandler(async (req, res) => {
  const { query, limit = 20, offset = 0 } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }
  
  const messages = await Message.search(req.user.id, query, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  res.json({
    success: true,
    data: messages
  });
}));

// Get chat history with a specific user
router.get('/chat/:otherUserId', messageValidation.getChat.slice(1), asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, before } = req.query;
  
  const messages = await Message.getChatHistory(
    req.user.id,
    parseInt(req.params.otherUserId),
    {
      limit: parseInt(limit),
      offset: parseInt(offset),
      before: before ? parseInt(before) : null
    }
  );
  
  res.json({
    success: true,
    data: messages,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: messages.length === parseInt(limit)
    }
  });
}));

// Get group messages
router.get('/group/:groupId', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, before } = req.query;
  
  const messages = await Message.getGroupMessages(
    parseInt(req.params.groupId),
    {
      limit: parseInt(limit),
      offset: parseInt(offset),
      before: before ? parseInt(before) : null
    }
  );
  
  res.json({
    success: true,
    data: messages,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: messages.length === parseInt(limit)
    }
  });
}));

// Get a specific message
router.get('/:messageId', asyncHandler(async (req, res) => {
  const message = await Message.findById(parseInt(req.params.messageId));
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  // Check if user is part of the conversation
  if (message.sender_id !== req.user.id && message.receiver_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view this message'
    });
  }
  
  res.json({
    success: true,
    data: message
  });
}));

// Send a new message (REST endpoint - Socket.IO preferred for real-time)
router.post('/', messageLimiter, messageValidation.send, checkNotBlocked, asyncHandler(async (req, res) => {
  const { receiver_id, group_id, content, message_type, media_id, reply_to_id, is_forwarded } = req.body;
  
  // Validate that either receiver_id or group_id is provided
  if (!receiver_id && !group_id) {
    return res.status(400).json({
      success: false,
      message: 'Either receiver_id or group_id is required'
    });
  }
  
  const message = await Message.create({
    sender_id: req.user.id,
    receiver_id,
    group_id,
    content,
    message_type: message_type || 'text',
    media_id,
    reply_to_id,
    is_forwarded: is_forwarded || false
  });
  
  // Get full message with sender info
  const fullMessage = await Message.findById(message.id);
  
  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: fullMessage
  });
}));

// Update message status
router.put('/:messageId/status', messageValidation.updateStatus, asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  const message = await Message.findById(parseInt(req.params.messageId));
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  // Only receiver can update status
  if (message.receiver_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Only the receiver can update message status'
    });
  }
  
  await Message.updateStatus(parseInt(req.params.messageId), status, req.user.id);
  
  res.json({
    success: true,
    message: `Message marked as ${status}`
  });
}));

// Mark all messages from a sender as read
router.put('/read/:senderId', asyncHandler(async (req, res) => {
  const count = await Message.markAsRead(parseInt(req.params.senderId), req.user.id);
  
  res.json({
    success: true,
    message: `${count} messages marked as read`
  });
}));

// Edit a message
router.put('/:messageId', asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required'
    });
  }
  
  const message = await Message.findById(parseInt(req.params.messageId));
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  // Only sender can edit
  if (message.sender_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own messages'
    });
  }
  
  // Check if message is too old to edit (15 minutes)
  const messageAge = Date.now() - new Date(message.created_at).getTime();
  if (messageAge > 15 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      message: 'Cannot edit messages older than 15 minutes'
    });
  }
  
  const updated = await Message.edit(parseInt(req.params.messageId), req.user.id, content);
  
  if (!updated) {
    return res.status(400).json({
      success: false,
      message: 'Failed to edit message'
    });
  }
  
  res.json({
    success: true,
    message: 'Message edited successfully'
  });
}));

// Delete a message
router.delete('/:messageId', asyncHandler(async (req, res) => {
  const { forEveryone = false } = req.query;
  
  const message = await Message.findById(parseInt(req.params.messageId));
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  // Only sender can delete
  if (message.sender_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own messages'
    });
  }
  
  // Check if message is too old to delete for everyone (1 hour)
  if (forEveryone === 'true') {
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge > 60 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete messages older than 1 hour for everyone'
      });
    }
  }
  
  const deleted = await Message.delete(
    parseInt(req.params.messageId), 
    req.user.id, 
    forEveryone === 'true'
  );
  
  if (!deleted) {
    return res.status(400).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
  
  res.json({
    success: true,
    message: forEveryone === 'true' ? 'Message deleted for everyone' : 'Message deleted'
  });
}));

// Forward messages
router.post('/forward', messageLimiter, asyncHandler(async (req, res) => {
  const { messageIds, receiverIds, groupIds } = req.body;
  
  if (!messageIds || !messageIds.length) {
    return res.status(400).json({
      success: false,
      message: 'At least one message ID is required'
    });
  }
  
  if ((!receiverIds || !receiverIds.length) && (!groupIds || !groupIds.length)) {
    return res.status(400).json({
      success: false,
      message: 'At least one recipient is required'
    });
  }
  
  const forwardedMessages = [];
  
  for (const messageId of messageIds) {
    const originalMessage = await Message.findById(messageId);
    
    if (!originalMessage) continue;
    
    // Forward to users
    if (receiverIds) {
      for (const receiverId of receiverIds) {
        const forwarded = await Message.create({
          sender_id: req.user.id,
          receiver_id: receiverId,
          content: originalMessage.content,
          message_type: originalMessage.message_type,
          media_id: originalMessage.media_id,
          is_forwarded: true
        });
        forwardedMessages.push(forwarded);
      }
    }
    
    // Forward to groups
    if (groupIds) {
      for (const groupId of groupIds) {
        const forwarded = await Message.create({
          sender_id: req.user.id,
          group_id: groupId,
          content: originalMessage.content,
          message_type: originalMessage.message_type,
          media_id: originalMessage.media_id,
          is_forwarded: true
        });
        forwardedMessages.push(forwarded);
      }
    }
  }
  
  res.status(201).json({
    success: true,
    message: `${forwardedMessages.length} messages forwarded successfully`,
    data: forwardedMessages
  });
}));

module.exports = router;
