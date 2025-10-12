/**
 * Database connection module
 * Exports a configured Knex instance for MariaDB/MySQL
 */
const knex = require('knex');
const knexConfig = require('../knexfile');

// Determine environment (default to development)
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Create and export the knex instance
const db = knex(config);

// Test connection on startup (optional but useful for debugging)
db.raw('SELECT 1')
  .then(() => {
    console.log(`✅ Database connected successfully (${environment})`);
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = db;
