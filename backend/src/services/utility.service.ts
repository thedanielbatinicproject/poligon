/**
 * UtilityService - intermediate layer for utility routes to interact with the database and other resources.
 * Add your utility DB/query/helper functions here.
 */
import pool from '../db';
import { User } from '../types/user';

export class UtilityService {
  // Example: Get current DB time
  static async getDbTime(): Promise<string> {
    const [rows] = await pool.query('SELECT NOW() AS dbTime');
    return (rows as any[])[0]?.dbTime || '';
  }

}
