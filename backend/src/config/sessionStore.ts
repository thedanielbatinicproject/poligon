import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import dotenv from 'dotenv';
dotenv.config();

const MySQLStore = MySQLStoreFactory(session);

const dbOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Optional:
  // createDatabaseTable: true,
  // schema: { ... }
};

const sessionStore = new MySQLStore(dbOptions);

export default sessionStore;
