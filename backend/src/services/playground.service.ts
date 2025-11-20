import pool from '../db';
import { DateTime } from 'luxon';

/**
 * Gets the current date in Europe/Zagreb timezone as YYYY-MM-DD string.
 */
function getCurrentZagrebDate(): string {
  return DateTime.now().setZone('Europe/Zagreb').toFormat('yyyy-MM-dd');
}

/**
 * Returns the number of renders for the given IP and date (defaults to today in Zagreb time).
 */
export async function getRendersForIp(ip: string, date?: string): Promise<number> {
  const renderDate = date || getCurrentZagrebDate();
  const [rows] = await pool.query(
    'SELECT count FROM visitor_renders WHERE ip = ? AND render_date = ?',
    [ip, renderDate]
  );
  if ((rows as any[]).length > 0) {
    return (rows as any[])[0].count;
  }
  return 0;
}

/**
 * Increments the render count for the given IP and date (defaults to today in Zagreb time).
 * If no record exists, creates a new one with count=1.
 */
export async function incrementRendersForIp(ip: string, date?: string): Promise<void> {
  const renderDate = date || getCurrentZagrebDate();
  const [rows] = await pool.query(
    'SELECT count FROM visitor_renders WHERE ip = ? AND render_date = ?',
    [ip, renderDate]
  );
  if ((rows as any[]).length > 0) {
    await pool.query(
      'UPDATE visitor_renders SET count = count + 1 WHERE ip = ? AND render_date = ?',
      [ip, renderDate]
    );
  } else {
    await pool.query(
      'INSERT INTO visitor_renders (ip, render_date, count) VALUES (?, ?, 1)',
      [ip, renderDate]
    );
  }
}

export async function decrementRendersForIp(ip: string, date?: string): Promise<void> {
  const renderDate = date || getCurrentZagrebDate();
  const [rows] = await pool.query(
    'SELECT count FROM visitor_renders WHERE ip = ? AND render_date = ?',
    [ip, renderDate]
  );
  if ((rows as any[]).length > 0) {
    await pool.query(
      'UPDATE visitor_renders SET count = count - 1 WHERE ip = ? AND render_date = ?',
      [ip, renderDate]
    );
  } else {
    await pool.query(
      'INSERT INTO visitor_renders (ip, render_date, count) VALUES (?, ?, 1)',
      [ip, renderDate]
    );
  }
}




/**
 * Resets the render count for the given IP and date (defaults to today in Zagreb time).
 * If no record exists, does nothing.
 */
export async function resetRendersForIp(ip: string, date?: string): Promise<void> {
  const renderDate = date || getCurrentZagrebDate();
  await pool.query(
    'DELETE FROM visitor_renders WHERE ip = ? AND render_date = ?',
    [ip, renderDate]
  );
}

/**
 * Utility: Remove all render records for a given IP (all dates).
 */
export async function resetAllRendersForIp(ip: string): Promise<void> {
  await pool.query(
    'DELETE FROM visitor_renders WHERE ip = ?',
    [ip]
  );
}

/**
 * Utility: Get all render records for a given IP (all dates).
 */
export async function getAllRendersForIp(ip: string): Promise<Array<{ render_date: string, count: number }>> {
  const [rows] = await pool.query(
    'SELECT render_date, count FROM visitor_renders WHERE ip = ? ORDER BY render_date DESC',
    [ip]
  );
  return rows as Array<{ render_date: string, count: number }>;
}
