const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply authentication to all routes
router.use(verifyToken);

// Get call history
router.get('/history', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, type } = req.query;
  
  const calls = await Call.getHistory(req.user.id, {
    limit: parseInt(limit),
    offset: parseInt(offset),
    type
  });
  
  res.json({
    success: true,
    data: calls
  });
}));

// Get call statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const stats = await Call.getStats(req.user.id, {
    days: parseInt(days)
  });
  
  // Calculate totals
  const totals = {
    total_calls: 0,
    total_duration: 0,
    voice_calls: 0,
    video_calls: 0,
    missed_calls: 0,
    answered_calls: 0
  };
  
  stats.forEach(stat => {
    totals.total_calls += stat.count;
    totals.total_duration += stat.total_duration || 0;
    
    if (stat.call_type === 'voice') {
      totals.voice_calls += stat.count;
    } else {
      totals.video_calls += stat.count;
    }
    
    if (stat.status === 'missed') {
      totals.missed_calls += stat.count;
    } else if (stat.status === 'answered') {
      totals.answered_calls += stat.count;
    }
  });
  
  res.json({
    success: true,
    data: {
      details: stats,
      totals
    }
  });
}));

// Get missed calls count
router.get('/missed/count', asyncHandler(async (req, res) => {
  const count = await Call.getMissedCount(req.user.id);
  
  res.json({
    success: true,
    data: { count }
  });
}));

// Get calls with a specific contact
router.get('/contact/:contactId', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const calls = await Call.getWithContact(
    req.user.id, 
    parseInt(req.params.contactId),
    { limit: parseInt(limit) }
  );
  
  res.json({
    success: true,
    data: calls
  });
}));

// Get a specific call
router.get('/:callId', asyncHandler(async (req, res) => {
  const call = await Call.findById(parseInt(req.params.callId));
  
  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }
  
  // Check if user is part of the call
  if (call.caller_id !== req.user.id && call.receiver_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view this call'
    });
  }
  
  res.json({
    success: true,
    data: call
  });
}));

// Initiate a call (creates call record)
router.post('/initiate', asyncHandler(async (req, res) => {
  const { receiver_id, group_id, call_type } = req.body;
  
  if (!receiver_id && !group_id) {
    return res.status(400).json({
      success: false,
      message: 'Either receiver_id or group_id is required'
    });
  }
  
  if (!['voice', 'video'].includes(call_type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid call type. Must be "voice" or "video"'
    });
  }
  
  // Check if receiver exists
  if (receiver_id) {
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }
  }
  
  // Check if there's an ongoing call
  const ongoingCall = await Call.getOngoing(req.user.id);
  if (ongoingCall) {
    return res.status(400).json({
      success: false,
      message: 'You already have an ongoing call',
      data: { call_id: ongoingCall.id }
    });
  }
  
  const call = await Call.create({
    caller_id: req.user.id,
    receiver_id: receiver_id || null,
    group_id: group_id || null,
    call_type,
    status: 'missed' // Will be updated when answered
  });
  
  res.status(201).json({
    success: true,
    message: 'Call initiated',
    data: call
  });
}));

// Update call status (answer, decline, etc.)
router.put('/:callId/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['answered', 'declined', 'busy', 'no_answer'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }
  
  const call = await Call.findById(parseInt(req.params.callId));
  
  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }
  
  // Only receiver can update status
  if (call.receiver_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Only the receiver can update call status'
    });
  }
  
  await Call.updateStatus(parseInt(req.params.callId), status);
  
  res.json({
    success: true,
    message: `Call ${status}`
  });
}));

// End a call
router.post('/:callId/end', asyncHandler(async (req, res) => {
  const call = await Call.findById(parseInt(req.params.callId));
  
  if (!call) {
    return res.status(404).json({
      success: false,
      message: 'Call not found'
    });
  }
  
  // Only participants can end the call
  if (call.caller_id !== req.user.id && call.receiver_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You are not a participant in this call'
    });
  }
  
  await Call.endCall(parseInt(req.params.callId));
  
  // Get updated call info
  const endedCall = await Call.findById(parseInt(req.params.callId));
  
  res.json({
    success: true,
    message: 'Call ended',
    data: {
      duration: endedCall.duration
    }
  });
}));

// Delete a call from history
router.delete('/:callId', asyncHandler(async (req, res) => {
  const deleted = await Call.delete(parseInt(req.params.callId), req.user.id);
  
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Call not found or you do not have permission to delete it'
    });
  }
  
  res.json({
    success: true,
    message: 'Call deleted from history'
  });
}));

// Clear all call history
router.delete('/history/clear', asyncHandler(async (req, res) => {
  const count = await Call.clearHistory(req.user.id);
  
  res.json({
    success: true,
    message: `${count} calls deleted from history`
  });
}));

module.exports = router;
