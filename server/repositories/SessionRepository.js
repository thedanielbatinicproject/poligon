const { query, queryOne } = require('../db/helpers');

class SessionRepository {
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async createSession(userId, userData) {
    const sessionId = this.generateSessionId();
    
    await query(
      `INSERT INTO sessions (session_id, user_id, user_data, expires_at) 
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [sessionId, userId, JSON.stringify(userData)]
    );
    
    return sessionId;
  }
  
  async getSessionById(sessionId) {
    const session = await queryOne(
      `SELECT session_id, user_id, user_data, created_at, last_access, expires_at 
       FROM sessions 
       WHERE session_id = ? AND expires_at > NOW()`,
      [sessionId]
    );
    
    if (session && session.user_data) {
      try {
        session.user_data = JSON.parse(session.user_data);
      } catch (error) {
        console.error('Error parsing session user_data:', error);
        session.user_data = null;
      }
    }
    
    return session;
  }
  
  async updateLastAccess(sessionId) {
    return await query(
      'UPDATE sessions SET last_access = NOW() WHERE session_id = ?',
      [sessionId]
    );
  }
  
  async deleteSession(sessionId) {
    return await query(
      'DELETE FROM sessions WHERE session_id = ?',
      [sessionId]
    );
  }
  
  async deleteUserSessions(userId) {
    return await query(
      'DELETE FROM sessions WHERE user_id = ?',
      [userId]
    );
  }
  
  async deleteExpiredSessions() {
    return await query(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );
  }
  
  async getUserSessions(userId) {
    return await query(
      `SELECT session_id, created_at, last_access, expires_at 
       FROM sessions 
       WHERE user_id = ? AND expires_at > NOW() 
       ORDER BY last_access DESC`,
      [userId]
    );
  }
}

module.exports = new SessionRepository();
