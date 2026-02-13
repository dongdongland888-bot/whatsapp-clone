const db = require('../config/db');

class Call {
  /**
   * 创建通话记录
   */
  static async create(callData) {
    const { caller_id, receiver_id, call_type } = callData;
    const [result] = await db.execute(
      `INSERT INTO calls (caller_id, receiver_id, call_type, status, started_at) 
       VALUES (?, ?, ?, 'ringing', NOW())`,
      [caller_id, receiver_id, call_type]
    );
    return { 
      id: result.insertId, 
      caller_id, 
      receiver_id, 
      call_type,
      status: 'ringing',
      started_at: new Date()
    };
  }

  /**
   * 根据ID查找通话
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM calls WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  /**
   * 更新通话状态
   */
  static async updateStatus(id, status) {
    await db.execute(
      'UPDATE calls SET status = ? WHERE id = ?',
      [status, id]
    );
  }

  /**
   * 结束通话（记录结束时间和时长）
   */
  static async endCall(id) {
    const [rows] = await db.execute(
      'SELECT started_at FROM calls WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const startedAt = new Date(rows[0].started_at);
    const endedAt = new Date();
    const duration = Math.floor((endedAt - startedAt) / 1000); // 秒数

    await db.execute(
      'UPDATE calls SET ended_at = NOW(), duration = ?, status = "ended" WHERE id = ?',
      [duration, id]
    );
    
    return { id, duration, ended_at: endedAt };
  }

  /**
   * 获取用户的通话历史
   */
  static async getCallHistory(userId, limit = 50) {
    const [rows] = await db.execute(
      `SELECT c.*, 
              caller.username as caller_username, caller.avatar as caller_avatar,
              receiver.username as receiver_username, receiver.avatar as receiver_avatar
       FROM calls c
       LEFT JOIN users caller ON c.caller_id = caller.id
       LEFT JOIN users receiver ON c.receiver_id = receiver.id
       WHERE c.caller_id = ? OR c.receiver_id = ?
       ORDER BY c.started_at DESC
       LIMIT ?`,
      [userId, userId, limit]
    );
    return rows;
  }

  /**
   * 获取两个用户之间的通话历史
   */
  static async getCallsBetweenUsers(userId1, userId2, limit = 20) {
    const [rows] = await db.execute(
      `SELECT * FROM calls 
       WHERE (caller_id = ? AND receiver_id = ?) OR (caller_id = ? AND receiver_id = ?)
       ORDER BY started_at DESC
       LIMIT ?`,
      [userId1, userId2, userId2, userId1, limit]
    );
    return rows;
  }

  /**
   * 获取未接来电
   */
  static async getMissedCalls(userId) {
    const [rows] = await db.execute(
      `SELECT c.*, 
              caller.username as caller_username, caller.avatar as caller_avatar
       FROM calls c
       LEFT JOIN users caller ON c.caller_id = caller.id
       WHERE c.receiver_id = ? AND c.status IN ('missed', 'declined')
       ORDER BY c.started_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * 获取通话统计
   */
  static async getCallStats(userId) {
    const [rows] = await db.execute(
      `SELECT 
         COUNT(*) as total_calls,
         SUM(CASE WHEN caller_id = ? THEN 1 ELSE 0 END) as outgoing_calls,
         SUM(CASE WHEN receiver_id = ? THEN 1 ELSE 0 END) as incoming_calls,
         SUM(CASE WHEN status = 'ended' THEN duration ELSE 0 END) as total_duration,
         SUM(CASE WHEN call_type = 'video' THEN 1 ELSE 0 END) as video_calls,
         SUM(CASE WHEN call_type = 'voice' THEN 1 ELSE 0 END) as voice_calls
       FROM calls 
       WHERE caller_id = ? OR receiver_id = ?`,
      [userId, userId, userId, userId]
    );
    return rows[0];
  }
}

module.exports = Call;
