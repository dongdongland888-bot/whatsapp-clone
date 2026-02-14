const db = require('../config/db');

class Message {
  // Get all messages for a user (with pagination)
  static async findByUserId(userId, { limit = 50, offset = 0 } = {}) {
    const [rows] = await db.execute(`
      SELECT 
        m.id, m.sender_id, m.receiver_id, m.group_id, m.content, 
        m.message_type, m.media_id, m.reply_to_id, m.status,
        m.is_forwarded, m.is_edited, m.is_deleted, m.deleted_for_everyone,
        m.created_at, m.delivered_at, m.read_at,
        u.username as sender_name, u.avatar as sender_avatar,
        media.file_path as media_url, media.thumbnail_path as media_thumbnail,
        media.file_type as media_type, media.original_name as media_name,
        reply.content as reply_content, reply.sender_id as reply_sender_id,
        reply_user.username as reply_sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN media ON m.media_id = media.id
      LEFT JOIN messages reply ON m.reply_to_id = reply.id
      LEFT JOIN users reply_user ON reply.sender_id = reply_user.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND (m.is_deleted = FALSE OR m.deleted_for_everyone = TRUE)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, limit, offset]);
    return rows;
  }

  // Get chat history between two users (with pagination)
  static async getChatHistory(userId, otherUserId, { limit = 50, offset = 0, before = null } = {}) {
    let query = `
      SELECT 
        m.id, m.sender_id, m.receiver_id, m.content, 
        m.message_type, m.media_id, m.reply_to_id, m.status,
        m.is_forwarded, m.is_edited, m.is_deleted, m.deleted_for_everyone,
        m.created_at, m.delivered_at, m.read_at,
        u.username as sender_name, u.avatar as sender_avatar,
        media.file_path as media_url, media.thumbnail_path as media_thumbnail,
        media.file_type as media_type, media.original_name as media_name,
        media.file_size, media.duration, media.width, media.height,
        reply.content as reply_content, reply.sender_id as reply_sender_id,
        reply_user.username as reply_sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN media ON m.media_id = media.id
      LEFT JOIN messages reply ON m.reply_to_id = reply.id
      LEFT JOIN users reply_user ON reply.sender_id = reply_user.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        AND (m.is_deleted = FALSE OR m.deleted_for_everyone = TRUE)
    `;
    
    const params = [userId, otherUserId, otherUserId, userId];
    
    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(query, params);
    return rows.reverse(); // Return in chronological order
  }

  // Get group chat messages
  static async getGroupMessages(groupId, { limit = 50, offset = 0, before = null } = {}) {
    let query = `
      SELECT 
        m.id, m.sender_id, m.group_id, m.content, 
        m.message_type, m.media_id, m.reply_to_id, m.status,
        m.is_forwarded, m.is_edited, m.is_deleted, m.deleted_for_everyone,
        m.created_at,
        u.username as sender_name, u.avatar as sender_avatar,
        media.file_path as media_url, media.thumbnail_path as media_thumbnail,
        media.file_type as media_type, media.original_name as media_name,
        reply.content as reply_content, reply.sender_id as reply_sender_id,
        reply_user.username as reply_sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN media ON m.media_id = media.id
      LEFT JOIN messages reply ON m.reply_to_id = reply.id
      LEFT JOIN users reply_user ON reply.sender_id = reply_user.id
      WHERE m.group_id = ?
        AND (m.is_deleted = FALSE OR m.deleted_for_everyone = TRUE)
    `;
    
    const params = [groupId];
    
    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(query, params);
    return rows.reverse();
  }

  // Create a new message
  static async create(messageData) {
    const { 
      sender_id, receiver_id, group_id, content, 
      message_type = 'text', media_id = null, reply_to_id = null,
      is_forwarded = false 
    } = messageData;
    
    const [result] = await db.execute(
      `INSERT INTO messages 
       (sender_id, receiver_id, group_id, content, message_type, media_id, reply_to_id, is_forwarded, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [sender_id, receiver_id || null, group_id || null, content, message_type, media_id, reply_to_id, is_forwarded]
    );
    
    return { 
      id: result.insertId, 
      sender_id, 
      receiver_id, 
      group_id,
      content, 
      message_type,
      media_id,
      reply_to_id,
      is_forwarded,
      status: 'sent',
      created_at: new Date() 
    };
  }

  // Update message status
  static async updateStatus(messageId, status, userId = null) {
    const statusField = status === 'read' ? 'read_at' : 'delivered_at';
    const [result] = await db.execute(
      `UPDATE messages SET status = ?, ${statusField} = NOW() WHERE id = ?`,
      [status, messageId]
    );
    
    // For group messages, also update the read status table
    if (userId && status === 'read') {
      await db.execute(
        `INSERT IGNORE INTO message_read_status (message_id, user_id) VALUES (?, ?)`,
        [messageId, userId]
      );
    }
    
    return result.affectedRows > 0;
  }

  // Mark multiple messages as delivered
  static async markAsDelivered(messageIds, receiverId) {
    if (!messageIds.length) return;
    
    const placeholders = messageIds.map(() => '?').join(',');
    const [result] = await db.execute(
      `UPDATE messages 
       SET status = 'delivered', delivered_at = NOW() 
       WHERE id IN (${placeholders}) AND receiver_id = ? AND status = 'sent'`,
      [...messageIds, receiverId]
    );
    return result.affectedRows;
  }

  // Mark multiple messages as read
  static async markAsRead(senderId, receiverId) {
    const [result] = await db.execute(
      `UPDATE messages 
       SET status = 'read', read_at = NOW() 
       WHERE sender_id = ? AND receiver_id = ? AND status IN ('sent', 'delivered')`,
      [senderId, receiverId]
    );
    return result.affectedRows;
  }

  // Get unread message count
  static async getUnreadCount(userId) {
    const [rows] = await db.execute(
      `SELECT sender_id, COUNT(*) as count 
       FROM messages 
       WHERE receiver_id = ? AND status != 'read' AND is_deleted = FALSE
       GROUP BY sender_id`,
      [userId]
    );
    return rows;
  }

  // Edit message
  static async edit(messageId, senderId, newContent) {
    const [result] = await db.execute(
      `UPDATE messages 
       SET content = ?, is_edited = TRUE, updated_at = NOW() 
       WHERE id = ? AND sender_id = ?`,
      [newContent, messageId, senderId]
    );
    return result.affectedRows > 0;
  }

  // Delete message (soft delete)
  static async delete(messageId, senderId, forEveryone = false) {
    const [result] = await db.execute(
      `UPDATE messages 
       SET is_deleted = TRUE, deleted_for_everyone = ? 
       WHERE id = ? AND sender_id = ?`,
      [forEveryone, messageId, senderId]
    );
    return result.affectedRows > 0;
  }

  // Get message by ID
  static async findById(messageId) {
    const [rows] = await db.execute(
      `SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );
    return rows[0];
  }

  // Search messages
  static async search(userId, query, { limit = 20, offset = 0 } = {}) {
    const searchQuery = `%${query}%`;
    const [rows] = await db.execute(
      `SELECT 
        m.id, m.sender_id, m.receiver_id, m.group_id, m.content,
        m.message_type, m.created_at,
        u.username as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? OR m.receiver_id = ?)
         AND m.content LIKE ?
         AND m.message_type = 'text'
         AND m.is_deleted = FALSE
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, searchQuery, limit, offset]
    );
    return rows;
  }

  // Advanced search with filters
  static async searchAdvanced(userId, query, { limit = 20, offset = 0, type = null, chatId = null } = {}) {
    const searchQuery = `%${query}%`;
    const params = [userId, userId];
    
    let sql = `
      SELECT 
        m.id, m.sender_id, m.receiver_id, m.group_id, m.content,
        m.message_type, m.created_at, m.media_id,
        u.username as sender_name, u.avatar as sender_avatar,
        media.file_path as media_url, media.thumbnail_path as media_thumbnail,
        media.file_type as media_type, media.original_name as media_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN media ON m.media_id = media.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND m.is_deleted = FALSE
    `;
    
    // Add content search for text messages
    if (type === 'text' || !type) {
      sql += ' AND (m.content LIKE ? OR (m.message_type != \'text\' AND ? IS NOT NULL))';
      params.push(searchQuery, type);
    }
    
    // Filter by message type
    if (type && type !== 'all') {
      sql += ' AND m.message_type = ?';
      params.push(type);
    }
    
    // Filter by specific chat
    if (chatId) {
      sql += ' AND (m.receiver_id = ? OR m.sender_id = ?)';
      params.push(chatId, chatId);
    }
    
    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(sql, params);
    return rows;
  }

  // Get recent conversations for a user
  static async getRecentConversations(userId, limit = 20) {
    const [rows] = await db.execute(`
      SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as contact_id,
        u.username, u.avatar, u.is_online, u.last_seen,
        m.id as last_message_id, m.content as last_message, 
        m.message_type, m.created_at as last_message_at,
        m.sender_id as last_message_sender_id,
        (SELECT COUNT(*) FROM messages 
         WHERE sender_id = contact_id AND receiver_id = ? AND status != 'read' AND is_deleted = FALSE
        ) as unread_count
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
        AND m.group_id IS NULL
        AND m.id = (
          SELECT MAX(id) FROM messages 
          WHERE ((sender_id = m.sender_id AND receiver_id = m.receiver_id) 
                 OR (sender_id = m.receiver_id AND receiver_id = m.sender_id))
            AND group_id IS NULL
        )
      ORDER BY m.created_at DESC
      LIMIT ?
    `, [userId, userId, userId, userId, userId, limit]);
    return rows;
  }
}

module.exports = Message;
