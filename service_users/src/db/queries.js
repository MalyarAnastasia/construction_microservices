const { usersPool } = require('../../../config/database');

class UserRepository {
  async create(userData) {
    const { email, passwordHash, name, role } = userData;
    const query = `
      INSERT INTO users (email, password_hash, name, roles)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, roles, created_at, updated_at
    `;
    
    const result = await usersPool.query(query, [email, passwordHash, name, [role]]);
    return result.rows[0];
  }

  async findByEmail(email) {
    const query = `
      SELECT * FROM users 
      WHERE email = $1
      LIMIT 1
    `;
    
    const result = await usersPool.query(query, [email]);
    return result.rows[0];
  }

  async findById(id) {
    const query = `
      SELECT id, email, name, roles, created_at, updated_at 
      FROM users 
      WHERE id = $1
      LIMIT 1
    `;
    
    const result = await usersPool.query(query, [id]);
    return result.rows[0];
  }

  async update(id, updates) {
    const { name } = updates;
    const query = `
      UPDATE users 
      SET name = COALESCE($2, name)
      WHERE id = $1
      RETURNING id, email, name, roles, created_at, updated_at
    `;
    
    const result = await usersPool.query(query, [id, name]);
    return result.rows[0];
  }

  async findAll({ page = 1, limit = 10, role }) {
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params = [];
    
    if (role) {
      whereClause = `WHERE $1 = ANY(roles)`;
      params.push(role);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      ${whereClause}
    `;
    
    const usersQuery = `
      SELECT id, email, name, roles, created_at, updated_at 
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} 
      OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);
    
    const [countResult, usersResult] = await Promise.all([
      usersPool.query(countQuery, role ? [role] : []),
      usersPool.query(usersQuery, params)
    ]);
    
    return {
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }
}

module.exports = new UserRepository();