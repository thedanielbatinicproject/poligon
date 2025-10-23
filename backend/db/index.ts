import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,

  // moguće povećati broj konekcija ako je potrebno - default je 20
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 20,

  // 0 = unlimited
  queueLimit: 0,
  
  charset: 'utf8mb4_unicode_ci'
});

export default pool;