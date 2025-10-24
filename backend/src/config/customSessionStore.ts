// src/config/customSessionStore.ts
import session from 'express-session';
import db from '../db';

class CustomSessionStore extends session.Store {
  async get(sid, callback) {
    // SELECT * FROM sessions WHERE session_id = ?
    // Parse session_data i vrati kao JS objekt
  }
  async set(sid, sessionData, callback) {
    // INSERT INTO sessions ... ON DUPLICATE KEY UPDATE ...
    // Upisuj user_id, ip_address, user_agent, last_activity itd.
  }
  async destroy(sid, callback) {
    // DELETE FROM sessions WHERE session_id = ?
  }
  async touch(sid, sessionData, callback) {
    // UPDATE sessions SET last_activity = NOW(), expires_at = ... WHERE session_id = ?
  }
}

export default CustomSessionStore;