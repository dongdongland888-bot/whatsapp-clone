const express = require('express');
const router = express.Router();
const webPush = require('web-push');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Configure web-push with VAPID keys
// Generate keys: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webPush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@example.com'),
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// Apply authentication to all routes
router.use(verifyToken);

/**
 * Get VAPID public key
 */
router.get('/vapid-key', (req, res) => {
  if (!vapidKeys.publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications not configured'
    });
  }

  res.json({
    success: true,
    data: {
      publicKey: vapidKeys.publicKey
    }
  });
});

/**
 * Subscribe to push notifications
 */
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.id;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription object'
    });
  }

  // Store subscription in database
  const query = `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      updated_at = NOW()
  `;

  await db.query(query, [
    userId,
    subscription.endpoint,
    subscription.keys?.p256dh || '',
    subscription.keys?.auth || ''
  ]);

  console.log(`Push subscription saved for user ${userId}`);

  res.json({
    success: true,
    message: 'Subscription saved successfully'
  });
}));

/**
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  const userId = req.user.id;

  if (!endpoint) {
    return res.status(400).json({
      success: false,
      message: 'Endpoint is required'
    });
  }

  const query = `DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`;
  await db.query(query, [userId, endpoint]);

  console.log(`Push subscription removed for user ${userId}`);

  res.json({
    success: true,
    message: 'Unsubscribed successfully'
  });
}));

/**
 * Get user's subscriptions (for debugging)
 */
router.get('/subscriptions', asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [subscriptions] = await db.query(
    `SELECT id, endpoint, created_at FROM push_subscriptions WHERE user_id = ?`,
    [userId]
  );

  res.json({
    success: true,
    data: subscriptions.map(sub => ({
      id: sub.id,
      endpoint: sub.endpoint.substring(0, 50) + '...',
      createdAt: sub.created_at
    }))
  });
}));

/**
 * Send push notification to a user
 * This is an internal function, not an API endpoint
 */
async function sendPushNotification(userId, payload) {
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.log('Push notifications not configured, skipping');
    return { sent: 0, failed: 0 };
  }

  try {
    // Get all subscriptions for user
    const [subscriptions] = await db.query(
      `SELECT * FROM push_subscriptions WHERE user_id = ?`,
      [userId]
    );

    if (!subscriptions.length) {
      return { sent: 0, failed: 0 };
    }

    const results = { sent: 0, failed: 0, errors: [] };

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webPush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: payload.urgency || 'normal'
          }
        );

        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push(err.message);

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.query(
            `DELETE FROM push_subscriptions WHERE id = ?`,
            [sub.id]
          );
          console.log(`Removed invalid subscription ${sub.id}`);
        }
      }
    }

    return results;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return { sent: 0, failed: 1, errors: [err.message] };
  }
}

/**
 * Send notification for new message
 */
async function notifyNewMessage(receiverId, message, sender) {
  const payload = {
    title: sender.username || '新消息',
    body: getMessagePreview(message),
    icon: sender.avatar || '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    tag: `chat-${message.sender_id}`,
    data: {
      chatId: message.sender_id,
      messageId: message.id,
      type: 'message'
    },
    actions: [
      { action: 'reply', title: '回复' },
      { action: 'dismiss', title: '忽略' }
    ]
  };

  return sendPushNotification(receiverId, payload);
}

/**
 * Get message preview text
 */
function getMessagePreview(message) {
  if (message.message_type === 'text') {
    return message.content.length > 50 
      ? message.content.substring(0, 50) + '...' 
      : message.content;
  }
  
  const typeLabels = {
    image: '📷 图片',
    video: '🎬 视频',
    audio: '🎵 语音消息',
    document: '📄 文件',
    location: '📍 位置',
    contact: '👤 联系人'
  };

  return typeLabels[message.message_type] || '新消息';
}

/**
 * Send notification for incoming call
 */
async function notifyIncomingCall(receiverId, caller) {
  const payload = {
    title: '来电',
    body: `${caller.username} 正在呼叫您`,
    icon: caller.avatar || '/assets/icons/icon-192.png',
    badge: '/assets/icons/call-badge.png',
    tag: 'incoming-call',
    requireInteraction: true,
    data: {
      callerId: caller.id,
      type: 'call'
    },
    actions: [
      { action: 'answer', title: '接听' },
      { action: 'decline', title: '拒绝' }
    ]
  };

  return sendPushNotification(receiverId, payload);
}

/**
 * Send notification for group message
 */
async function notifyGroupMessage(groupMembers, message, sender, groupName) {
  const payload = {
    title: groupName,
    body: `${sender.username}: ${getMessagePreview(message)}`,
    icon: '/assets/icons/group-192.png',
    badge: '/assets/icons/badge-72.png',
    tag: `group-${message.group_id}`,
    data: {
      groupId: message.group_id,
      messageId: message.id,
      type: 'group_message'
    }
  };

  const results = { sent: 0, failed: 0 };

  for (const memberId of groupMembers) {
    // Don't notify the sender
    if (memberId === sender.id) continue;
    
    const result = await sendPushNotification(memberId, payload);
    results.sent += result.sent;
    results.failed += result.failed;
  }

  return results;
}

// Export both router and utility functions
module.exports = {
  router,
  sendPushNotification,
  notifyNewMessage,
  notifyIncomingCall,
  notifyGroupMessage
};
