const db = require('./index');

async function query(sql, params = []) {
  try {
    const result = await db.raw(sql, params);
    return result[0];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function transaction(callback) {
  const trx = await db.transaction();
  
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

module.exports = { query, queryOne, transaction, db };
