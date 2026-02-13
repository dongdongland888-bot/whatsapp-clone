const db = require('../config/db');
const path = require('path');
const fs = require('fs').promises;

class Media {
  // Create media record
  static async create(mediaData) {
    const {
      uploader_id,
      file_name,
      original_name,
      file_type,
      mime_type,
      file_size,
      file_path,
      thumbnail_path = null,
      duration = null,
      width = null,
      height = null
    } = mediaData;
    
    const [result] = await db.execute(
      `INSERT INTO media 
       (uploader_id, file_name, original_name, file_type, mime_type, file_size, file_path, thumbnail_path, duration, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uploader_id, file_name, original_name, file_type, mime_type, file_size, file_path, thumbnail_path, duration, width, height]
    );
    
    return {
      id: result.insertId,
      uploader_id,
      file_name,
      original_name,
      file_type,
      mime_type,
      file_size,
      file_path,
      thumbnail_path,
      duration,
      width,
      height,
      created_at: new Date()
    };
  }

  // Get media by ID
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM media WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Get media by user
  static async findByUserId(userId, { type = null, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM media WHERE uploader_id = ?';
    const params = [userId];
    
    if (type) {
      query += ' AND file_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get media shared in a chat
  static async getSharedMedia(userId, otherUserId, { type = null, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT m.*, msg.sender_id, msg.created_at as message_date
      FROM media m
      JOIN messages msg ON m.id = msg.media_id
      WHERE ((msg.sender_id = ? AND msg.receiver_id = ?) OR (msg.sender_id = ? AND msg.receiver_id = ?))
        AND msg.is_deleted = FALSE
    `;
    const params = [userId, otherUserId, otherUserId, userId];
    
    if (type) {
      query += ' AND m.file_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY msg.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get media shared in a group
  static async getGroupMedia(groupId, { type = null, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT m.*, msg.sender_id, u.username as sender_name, msg.created_at as message_date
      FROM media m
      JOIN messages msg ON m.id = msg.media_id
      JOIN users u ON msg.sender_id = u.id
      WHERE msg.group_id = ? AND msg.is_deleted = FALSE
    `;
    const params = [groupId];
    
    if (type) {
      query += ' AND m.file_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY msg.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Delete media
  static async delete(id, uploaderId) {
    // Get media info first
    const media = await this.findById(id);
    if (!media || media.uploader_id !== uploaderId) {
      return false;
    }
    
    // Delete file from storage
    try {
      await fs.unlink(media.file_path);
      if (media.thumbnail_path) {
        await fs.unlink(media.thumbnail_path);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
    
    // Delete from database
    const [result] = await db.execute(
      'DELETE FROM media WHERE id = ? AND uploader_id = ?',
      [id, uploaderId]
    );
    
    return result.affectedRows > 0;
  }

  // Get storage usage for a user
  static async getStorageUsage(userId) {
    const [rows] = await db.execute(
      `SELECT 
        file_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
       FROM media 
       WHERE uploader_id = ?
       GROUP BY file_type`,
      [userId]
    );
    
    const total = rows.reduce((acc, row) => acc + row.total_size, 0);
    
    return {
      total,
      by_type: rows.reduce((acc, row) => {
        acc[row.file_type] = {
          count: row.count,
          size: row.total_size
        };
        return acc;
      }, {})
    };
  }

  // Determine file type from mime type
  static getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  // Validate file type
  static isValidFileType(mimeType, allowedTypes = null) {
    const validTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/webm', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
      ]
    };
    
    if (allowedTypes) {
      const allowed = allowedTypes.flatMap(type => validTypes[type] || []);
      return allowed.includes(mimeType);
    }
    
    return Object.values(validTypes).flat().includes(mimeType);
  }

  // Get max file size by type (in bytes)
  static getMaxFileSize(fileType) {
    const limits = {
      image: 16 * 1024 * 1024, // 16MB
      video: 64 * 1024 * 1024, // 64MB
      audio: 16 * 1024 * 1024, // 16MB
      document: 100 * 1024 * 1024 // 100MB
    };
    return limits[fileType] || 16 * 1024 * 1024;
  }
}

module.exports = Media;
