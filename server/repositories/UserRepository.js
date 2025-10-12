const { query, queryOne } = require('../db/helpers');
const bcrypt = require('bcrypt');

class UserRepository {
  async getAllUsers() {
    return await query(
      `SELECT id, ime, prezime, username, email, broj_telefona, sveuciliste, fakultet, smjer, opis, role, created_at, last_login, is_active, updated_at 
       FROM users 
       WHERE is_active = TRUE 
       ORDER BY created_at DESC`
    );
  }
  
  async getUserById(userId) {
    return await queryOne(
      `SELECT id, ime, prezime, username, email, broj_telefona, sveuciliste, fakultet, smjer, opis, role, created_at, last_login, is_active, updated_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );
  }
  
  async getUserByUsername(username) {
    return await queryOne(
      `SELECT id, ime, prezime, username, password_hash, email, role, is_active 
       FROM users 
       WHERE username = ? AND is_active = TRUE`,
      [username]
    );
  }
  
  async createUser(userData) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const result = await query(
      `INSERT INTO users (id, ime, prezime, username, password_hash, email, broj_telefona, sveuciliste, fakultet, smjer, opis, role, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userData.ime,
        userData.prezime,
        userData.username,
        passwordHash,
        userData.email,
        userData.brojTelefona || null,
        userData.sveuciliste || null,
        userData.fakultet || null,
        userData.smjer || null,
        userData.opis || null,
        userData.role || 'user',
        userData.createdBy || null
      ]
    );
    
    return result.insertId;
  }
  
  async updateUser(userId, userData, updatedBy) {
    const fields = [];
    const values = [];
    
    if (userData.ime !== undefined) {
      fields.push('ime = ?');
      values.push(userData.ime);
    }
    if (userData.prezime !== undefined) {
      fields.push('prezime = ?');
      values.push(userData.prezime);
    }
    if (userData.email !== undefined) {
      fields.push('email = ?');
      values.push(userData.email);
    }
    if (userData.brojTelefona !== undefined) {
      fields.push('broj_telefona = ?');
      values.push(userData.brojTelefona);
    }
    if (userData.sveuciliste !== undefined) {
      fields.push('sveuciliste = ?');
      values.push(userData.sveuciliste);
    }
    if (userData.fakultet !== undefined) {
      fields.push('fakultet = ?');
      values.push(userData.fakultet);
    }
    if (userData.smjer !== undefined) {
      fields.push('smjer = ?');
      values.push(userData.smjer);
    }
    if (userData.opis !== undefined) {
      fields.push('opis = ?');
      values.push(userData.opis);
    }
    if (userData.role !== undefined) {
      fields.push('role = ?');
      values.push(userData.role);
    }
    if (userData.password) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }
    
    if (fields.length === 0) {
      return { affectedRows: 0 };
    }
    
    fields.push('updated_at = NOW()');
    fields.push('updated_by = ?');
    values.push(updatedBy);
    values.push(userId);
    
    return await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
  
  async deleteUser(userId) {
    return await query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
      [userId]
    );
  }
  
  async updateLastLogin(userId) {
    return await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
  }
  
  async verifyPassword(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;
    
    delete user.password_hash;
    return user;
  }
}

module.exports = new UserRepository();
