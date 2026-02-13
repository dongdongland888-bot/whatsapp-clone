const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  // Get all users (with pagination)
  static async findAll({ limit = 50, offset = 0, search = null } = {}) {
    let query = `
      SELECT id, username, email, phone, avatar, status_message, is_online, last_seen, created_at 
      FROM users
    `;
    const params = [];
    
    if (search) {
      query += ' WHERE username LIKE ? OR email LIKE ? OR phone LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    query += ' ORDER BY username ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Find user by ID
  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT id, username, email, phone, avatar, status_message, is_online, last_seen, created_at 
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  // Find user by ID with password (for auth)
  static async findByIdWithPassword(id) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const [rows] = await db.execute(
      'SELECT id, username, email, phone, avatar, status_message, is_online, last_seen, created_at FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  // Find user by phone
  static async findByPhone(phone) {
    const [rows] = await db.execute(
      'SELECT id, username, email, phone, avatar, status_message, is_online, last_seen, created_at FROM users WHERE phone = ?',
      [phone]
    );
    return rows[0];
  }

  // Create new user
  static async create(userData) {
    const { username, email, password, phone = null, avatar = null } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, phone, avatar) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, phone, avatar]
    );
    
    // Create default preferences
    await db.execute(
      'INSERT INTO user_preferences (user_id) VALUES (?)',
      [result.insertId]
    );
    
    return { 
      id: result.insertId, 
      username, 
      email, 
      phone,
      avatar,
      status_message: 'Hey there! I am using WhatsApp Clone',
      is_online: false,
      created_at: new Date()
    };
  }

  // Update user profile
  static async update(id, userData) {
    const allowedFields = ['username', 'avatar', 'status_message', 'phone'];
    const updates = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (userData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(userData[field]);
      }
    }
    
    if (updates.length === 0) return false;
    
    values.push(id);
    const [result] = await db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  // Update password
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const [result] = await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update online status
  static async setOnlineStatus(id, isOnline) {
    const [result] = await db.execute(
      `UPDATE users SET is_online = ?, last_seen = ${isOnline ? 'last_seen' : 'NOW()'} WHERE id = ?`,
      [isOnline, id]
    );
    return result.affectedRows > 0;
  }

  // Update last seen
  static async updateLastSeen(id) {
    const [result] = await db.execute(
      'UPDATE users SET last_seen = NOW(), is_online = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Delete user
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Get user preferences
  static async getPreferences(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  // Update user preferences
  static async updatePreferences(userId, preferences) {
    const allowedFields = [
      'theme', 'notification_sound', 'notification_preview',
      'read_receipts', 'last_seen_visible', 'language'
    ];
    const updates = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (preferences[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(preferences[field]);
      }
    }
    
    if (updates.length === 0) return false;
    
    values.push(userId);
    const [result] = await db.execute(
      `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  // Search users (for adding contacts)
  static async search(query, excludeUserId = null, limit = 20) {
    const searchPattern = `%${query}%`;
    let sql = `
      SELECT id, username, email, avatar, status_message, is_online, last_seen 
      FROM users 
      WHERE (username LIKE ? OR email LIKE ? OR phone LIKE ?)
    `;
    const params = [searchPattern, searchPattern, searchPattern];
    
    if (excludeUserId) {
      sql += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    sql += ' ORDER BY username ASC LIMIT ?';
    params.push(limit);
    
    const [rows] = await db.execute(sql, params);
    return rows;
  }

  // Check if email exists
  static async emailExists(email, excludeUserId = null) {
    let sql = 'SELECT id FROM users WHERE email = ?';
    const params = [email];
    
    if (excludeUserId) {
      sql += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  }

  // Check if username exists
  static async usernameExists(username, excludeUserId = null) {
    let sql = 'SELECT id FROM users WHERE username = ?';
    const params = [username];
    
    if (excludeUserId) {
      sql += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  }
}

module.exports = User;
