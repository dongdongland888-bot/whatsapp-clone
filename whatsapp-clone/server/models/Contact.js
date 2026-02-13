const db = require('../config/db');

class Contact {
  // Get all contacts for a user
  static async findByUserId(userId, { includeBlocked = false } = {}) {
    let query = `
      SELECT 
        c.id, c.contact_user_id, c.nickname, c.is_blocked, c.is_favorite, c.created_at,
        u.username, u.email, u.phone, u.avatar, u.status_message, u.is_online, u.last_seen
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ?
    `;
    
    if (!includeBlocked) {
      query += ' AND c.is_blocked = FALSE';
    }
    
    query += ' ORDER BY c.is_favorite DESC, u.username ASC';
    
    const [rows] = await db.execute(query, [userId]);
    return rows;
  }

  // Get a specific contact
  static async findById(contactId, userId) {
    const [rows] = await db.execute(`
      SELECT 
        c.id, c.contact_user_id, c.nickname, c.is_blocked, c.is_favorite, c.created_at,
        u.username, u.email, u.phone, u.avatar, u.status_message, u.is_online, u.last_seen
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.id = ? AND c.user_id = ?
    `, [contactId, userId]);
    return rows[0];
  }

  // Check if contact exists
  static async exists(userId, contactUserId) {
    const [rows] = await db.execute(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?',
      [userId, contactUserId]
    );
    return rows.length > 0;
  }

  // Add a new contact
  static async create(userId, contactData) {
    const { contact_user_id, nickname = null } = contactData;
    
    // Check if trying to add self
    if (userId === contact_user_id) {
      throw new Error('Cannot add yourself as a contact');
    }
    
    const [result] = await db.execute(
      'INSERT INTO contacts (user_id, contact_user_id, nickname) VALUES (?, ?, ?)',
      [userId, contact_user_id, nickname]
    );
    
    return {
      id: result.insertId,
      user_id: userId,
      contact_user_id,
      nickname,
      is_blocked: false,
      is_favorite: false,
      created_at: new Date()
    };
  }

  // Update contact
  static async update(contactId, userId, updateData) {
    const allowedFields = ['nickname', 'is_blocked', 'is_favorite'];
    const updates = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    }
    
    if (updates.length === 0) return false;
    
    values.push(contactId, userId);
    const [result] = await db.execute(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }

  // Delete contact
  static async delete(contactId, userId) {
    const [result] = await db.execute(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );
    return result.affectedRows > 0;
  }

  // Block/unblock contact
  static async setBlocked(userId, contactUserId, isBlocked) {
    // Check if contact exists
    const [existing] = await db.execute(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?',
      [userId, contactUserId]
    );
    
    if (existing.length > 0) {
      const [result] = await db.execute(
        'UPDATE contacts SET is_blocked = ? WHERE user_id = ? AND contact_user_id = ?',
        [isBlocked, userId, contactUserId]
      );
      return result.affectedRows > 0;
    } else if (isBlocked) {
      // Create blocked contact entry
      await db.execute(
        'INSERT INTO contacts (user_id, contact_user_id, is_blocked) VALUES (?, ?, TRUE)',
        [userId, contactUserId]
      );
      return true;
    }
    
    return false;
  }

  // Toggle favorite
  static async toggleFavorite(contactId, userId) {
    const [result] = await db.execute(
      'UPDATE contacts SET is_favorite = NOT is_favorite WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );
    return result.affectedRows > 0;
  }

  // Get blocked contacts
  static async getBlocked(userId) {
    const [rows] = await db.execute(`
      SELECT 
        c.id, c.contact_user_id, c.created_at,
        u.username, u.avatar
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ? AND c.is_blocked = TRUE
      ORDER BY c.created_at DESC
    `, [userId]);
    return rows;
  }

  // Get favorite contacts
  static async getFavorites(userId) {
    const [rows] = await db.execute(`
      SELECT 
        c.id, c.contact_user_id, c.nickname, c.created_at,
        u.username, u.email, u.avatar, u.status_message, u.is_online, u.last_seen
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ? AND c.is_favorite = TRUE AND c.is_blocked = FALSE
      ORDER BY u.username ASC
    `, [userId]);
    return rows;
  }

  // Check if user is blocked
  static async isBlocked(userId, contactUserId) {
    const [rows] = await db.execute(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ? AND is_blocked = TRUE',
      [userId, contactUserId]
    );
    return rows.length > 0;
  }

  // Get mutual contacts (contacts that also have you as contact)
  static async getMutualContacts(userId) {
    const [rows] = await db.execute(`
      SELECT 
        c.id, c.contact_user_id, c.nickname, c.is_favorite,
        u.username, u.avatar, u.status_message, u.is_online, u.last_seen
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      JOIN contacts c2 ON c2.user_id = c.contact_user_id AND c2.contact_user_id = c.user_id
      WHERE c.user_id = ? AND c.is_blocked = FALSE AND c2.is_blocked = FALSE
      ORDER BY u.username ASC
    `, [userId]);
    return rows;
  }

  // Search contacts
  static async search(userId, query) {
    const searchPattern = `%${query}%`;
    const [rows] = await db.execute(`
      SELECT 
        c.id, c.contact_user_id, c.nickname, c.is_favorite,
        u.username, u.email, u.phone, u.avatar, u.status_message, u.is_online, u.last_seen
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ? 
        AND c.is_blocked = FALSE
        AND (u.username LIKE ? OR u.email LIKE ? OR c.nickname LIKE ?)
      ORDER BY c.is_favorite DESC, u.username ASC
    `, [userId, searchPattern, searchPattern, searchPattern]);
    return rows;
  }
}

module.exports = Contact;
