const db = require('../config/db');

class Group {
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT g.id, g.name, g.description, g.avatar, g.created_at, 
             COUNT(gm.user_id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM groups WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create(groupData) {
    const { name, description, avatar, creator_id } = groupData;
    const [result] = await db.execute(
      'INSERT INTO groups (name, description, avatar, creator_id) VALUES (?, ?, ?, ?)',
      [name, description, avatar || '', creator_id]
    );
    
    // Add creator as first member
    await db.execute(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [result.insertId, creator_id]
    );
    
    return { id: result.insertId, name, description, avatar, creator_id };
  }

  static async addUserToGroup(groupId, userId) {
    const [result] = await db.execute(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, userId]
    );
    return result.affectedRows > 0;
  }

  static async removeUserFromGroup(groupId, userId) {
    const [result] = await db.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    return result.affectedRows > 0;
  }

  static async getMembers(groupId) {
    const [rows] = await db.execute(`
      SELECT u.id, u.username, u.email, u.avatar
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `, [groupId]);
    return rows;
  }

  static async getGroupsByUserId(userId) {
    const [rows] = await db.execute(`
      SELECT g.id, g.name, g.description, g.avatar, g.created_at,
             COUNT(gm.user_id) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [userId]);
    return rows;
  }
}

module.exports = Group;