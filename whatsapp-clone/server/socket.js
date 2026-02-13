const Message = require('./models/Message');
const User = require('./models/User');
const Call = require('./models/Call');
const { notifyNewMessage, notifyIncomingCall, notifyGroupMessage } = require('./routes/push');

// Store online users
const onlineUsers = new Map();
// Store call sessions
const callSessions = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    
    // Add user to online users
    onlineUsers.set(socket.user.id, {
      socketId: socket.id,
      username: socket.user.username,
      connectedAt: new Date()
    });
    
    // Update user online status
    User.setOnlineStatus(socket.user.id, true);
    
    // Broadcast online status to all contacts
    socket.broadcast.emit('user-online', {
      userId: socket.user.id,
      username: socket.user.username
    });

    // Join personal room
    socket.join(`user_${socket.user.id}`);

    // =====================
    // CHAT EVENTS
    // =====================

    // Join a chat room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`${socket.user.username} joined room: ${roomId}`);
    });

    // Leave a chat room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      console.log(`${socket.user.username} left room: ${roomId}`);
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { receiver_id, group_id, content, message_type, media_id, reply_to_id, roomId } = data;
        
        // Save message to database
        const message = await Message.create({
          sender_id: socket.user.id,
          receiver_id,
          group_id,
          content,
          message_type: message_type || 'text',
          media_id,
          reply_to_id
        });

        const fullMessage = {
          ...message,
          sender_name: socket.user.username,
          sender_avatar: socket.user.avatar
        };

        // Emit to room
        io.to(roomId).emit('receive-message', fullMessage);

        // Also emit to receiver's personal room (for notifications)
        if (receiver_id) {
          io.to(`user_${receiver_id}`).emit('new-message-notification', {
            message: fullMessage,
            from: {
              id: socket.user.id,
              username: socket.user.username
            }
          });

          // Send push notification if receiver is offline
          const receiverOnline = onlineUsers.has(receiver_id);
          if (!receiverOnline) {
            notifyNewMessage(receiver_id, message, {
              id: socket.user.id,
              username: socket.user.username,
              avatar: socket.user.avatar
            }).catch(err => console.error('Push notification error:', err));
          }
        }

        // Acknowledge sender
        socket.emit('message-sent', {
          tempId: data.tempId,
          message: fullMessage
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', {
          tempId: data.tempId,
          error: 'Failed to send message'
        });
      }
    });

    // =====================
    // MESSAGE STATUS EVENTS
    // =====================

    // Mark messages as delivered
    socket.on('messages-delivered', async (data) => {
      try {
        const { messageIds, senderId } = data;
        
        await Message.markAsDelivered(messageIds, socket.user.id);
        
        // Notify sender
        io.to(`user_${senderId}`).emit('message-status-update', {
          messageIds,
          status: 'delivered',
          userId: socket.user.id
        });
      } catch (error) {
        console.error('Error marking messages as delivered:', error);
      }
    });

    // Mark messages as read
    socket.on('messages-read', async (data) => {
      try {
        const { senderId, roomId } = data;
        
        const count = await Message.markAsRead(senderId, socket.user.id);
        
        if (count > 0) {
          // Notify sender
          io.to(`user_${senderId}`).emit('message-status-update', {
            roomId,
            status: 'read',
            userId: socket.user.id,
            readAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // =====================
    // TYPING INDICATORS
    // =====================

    socket.on('typing-start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user-typing', {
        userId: socket.user.id,
        username: socket.user.username
      });
    });

    socket.on('typing-stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user-stopped-typing', {
        userId: socket.user.id
      });
    });

    // =====================
    // VOICE/VIDEO CALL EVENTS
    // =====================

    // Initiate call
    socket.on('call-initiate', async (data) => {
      try {
        const { receiverId, callType, offer } = data;
        
        // Check if receiver is online
        const receiver = onlineUsers.get(receiverId);
        if (!receiver) {
          socket.emit('call-failed', {
            reason: 'User is offline',
            receiverId
          });
          return;
        }

        // Create call record
        const call = await Call.create({
          caller_id: socket.user.id,
          receiver_id: receiverId,
          call_type: callType
        });

        // Store call session
        callSessions.set(call.id, {
          callerId: socket.user.id,
          receiverId,
          callType,
          startedAt: new Date()
        });

        // Send call invitation to receiver
        io.to(`user_${receiverId}`).emit('incoming-call', {
          callId: call.id,
          callType,
          caller: {
            id: socket.user.id,
            username: socket.user.username,
            avatar: socket.user.avatar
          },
          offer
        });

        // Acknowledge caller
        socket.emit('call-initiated', {
          callId: call.id,
          receiverId
        });

      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('call-failed', {
          reason: 'Failed to initiate call'
        });
      }
    });

    // Answer call
    socket.on('call-answer', async (data) => {
      try {
        const { callId, answer } = data;
        
        const session = callSessions.get(callId);
        if (!session) {
          socket.emit('call-failed', { reason: 'Call session not found' });
          return;
        }

        // Update call status
        await Call.updateStatus(callId, 'answered');

        // Send answer to caller
        io.to(`user_${session.callerId}`).emit('call-answered', {
          callId,
          answer
        });

      } catch (error) {
        console.error('Error answering call:', error);
      }
    });

    // Decline call
    socket.on('call-decline', async (data) => {
      try {
        const { callId, reason } = data;
        
        const session = callSessions.get(callId);
        if (!session) return;

        // Update call status
        await Call.updateStatus(callId, reason || 'declined');
        await Call.endCall(callId);

        // Notify caller
        io.to(`user_${session.callerId}`).emit('call-declined', {
          callId,
          reason: reason || 'declined'
        });

        // Clean up
        callSessions.delete(callId);

      } catch (error) {
        console.error('Error declining call:', error);
      }
    });

    // ICE candidate exchange
    socket.on('ice-candidate', (data) => {
      const { callId, candidate, targetUserId } = data;
      
      io.to(`user_${targetUserId}`).emit('ice-candidate', {
        callId,
        candidate,
        from: socket.user.id
      });
    });

    // End call
    socket.on('call-end', async (data) => {
      try {
        const { callId } = data;
        
        const session = callSessions.get(callId);
        if (!session) return;

        // End the call in database
        await Call.endCall(callId);

        // Notify other participant
        const otherUserId = session.callerId === socket.user.id 
          ? session.receiverId 
          : session.callerId;

        io.to(`user_${otherUserId}`).emit('call-ended', {
          callId,
          endedBy: socket.user.id
        });

        // Clean up
        callSessions.delete(callId);

      } catch (error) {
        console.error('Error ending call:', error);
      }
    });

    // =====================
    // PRESENCE EVENTS
    // =====================

    // Get online status of users
    socket.on('get-online-status', (userIds) => {
      const status = userIds.map(id => ({
        userId: id,
        isOnline: onlineUsers.has(id)
      }));
      socket.emit('online-status', status);
    });

    // =====================
    // GROUP EVENTS
    // =====================

    // Join group rooms on connection
    socket.on('join-groups', (groupIds) => {
      groupIds.forEach(groupId => {
        socket.join(`group_${groupId}`);
      });
    });

    // Send group message
    socket.on('send-group-message', async (data) => {
      try {
        const { group_id, content, message_type, media_id, reply_to_id } = data;
        
        const message = await Message.create({
          sender_id: socket.user.id,
          group_id,
          content,
          message_type: message_type || 'text',
          media_id,
          reply_to_id
        });

        const fullMessage = {
          ...message,
          sender_name: socket.user.username,
          sender_avatar: socket.user.avatar
        };

        // Emit to group room
        io.to(`group_${group_id}`).emit('receive-group-message', fullMessage);

        // Acknowledge sender
        socket.emit('message-sent', {
          tempId: data.tempId,
          message: fullMessage
        });

      } catch (error) {
        console.error('Error sending group message:', error);
        socket.emit('message-error', {
          tempId: data.tempId,
          error: 'Failed to send message'
        });
      }
    });

    // =====================
    // DISCONNECT
    // =====================

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      
      // Remove from online users
      onlineUsers.delete(socket.user.id);
      
      // Update last seen
      await User.updateLastSeen(socket.user.id);
      
      // Broadcast offline status
      socket.broadcast.emit('user-offline', {
        userId: socket.user.id,
        lastSeen: new Date()
      });

      // End any active calls
      for (const [callId, session] of callSessions.entries()) {
        if (session.callerId === socket.user.id || session.receiverId === socket.user.id) {
          await Call.endCall(callId);
          
          const otherUserId = session.callerId === socket.user.id 
            ? session.receiverId 
            : session.callerId;
          
          io.to(`user_${otherUserId}`).emit('call-ended', {
            callId,
            reason: 'User disconnected'
          });
          
          callSessions.delete(callId);
        }
      }
    });
  });

  // Utility: Get online user count
  io.getOnlineCount = () => onlineUsers.size;
  
  // Utility: Check if user is online
  io.isUserOnline = (userId) => onlineUsers.has(userId);
  
  // Utility: Get all online users
  io.getOnlineUsers = () => Array.from(onlineUsers.keys());
};
