const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'construction_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class ProjectRepository {
  async create(projectData) {
    const { userId, title, description, address, status, startDate, endDate, budget } = projectData;
    const query = `
      INSERT INTO projects (user_id, title, description, address, status, start_date, end_date, budget)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      userId, title, description, address, status || 'draft', 
      startDate, endDate, budget
    ]);
    return result.rows[0];
  }

  async findById(id) {
    const query = `
      SELECT * FROM projects 
      WHERE id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async findByUserId(userId, { page = 1, limit = 10, status } = {}) {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM projects 
      ${whereClause}
    `;
    
    const projectsQuery = `
      SELECT * FROM projects 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} 
      OFFSET $${params.length + 2}
    `;
    
    params.push(limit, offset);
    
    const [countResult, projectsResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, status ? 2 : 1)),
      pool.query(projectsQuery, params)
    ]);
    
    return {
      projects: projectsResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async update(id, updates) {
    const { title, description, address, status, startDate, endDate, budget } = updates;
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (startDate !== undefined) {
      fields.push(`start_date = $${paramCount++}`);
      values.push(startDate);
    }
    if (endDate !== undefined) {
      fields.push(`end_date = $${paramCount++}`);
      values.push(endDate);
    }
    if (budget !== undefined) {
      fields.push(`budget = $${paramCount++}`);
      values.push(budget);
    }
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    values.push(id);
    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

class DefectRepository {
  async create(defectData) {
    const { projectId, title, description, severity, status, reporterId, assigneeId, location } = defectData;
    const query = `
      INSERT INTO defects (project_id, title, description, severity, status, reporter_id, assignee_id, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      projectId, title, description, severity || 'medium', status || 'reported',
      reporterId, assigneeId, location
    ]);
    return result.rows[0];
  }

  async findById(id) {
    const query = `
      SELECT * FROM defects 
      WHERE id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async findByProjectId(projectId, { page = 1, limit = 10, status, severity } = {}) {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE project_id = $1';
    const params = [projectId];
    let paramCount = 2;
    
    if (status) {
      whereClause += ` AND status = $${paramCount++}`;
      params.push(status);
    }
    if (severity) {
      whereClause += ` AND severity = $${paramCount++}`;
      params.push(severity);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM defects 
      ${whereClause}
    `;
    
    const defectsQuery = `
      SELECT * FROM defects 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} 
      OFFSET $${paramCount + 1}
    `;
    
    params.push(limit, offset);
    
    const [countResult, defectsResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, paramCount - 2)),
      pool.query(defectsQuery, params)
    ]);
    
    return {
      defects: defectsResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async update(id, updates) {
    const { title, description, severity, status, assigneeId, location } = updates;
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (severity !== undefined) {
      fields.push(`severity = $${paramCount++}`);
      values.push(severity);
    }
    if (status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (assigneeId !== undefined) {
      fields.push(`assignee_id = $${paramCount++}`);
      values.push(assigneeId);
    }
    if (location !== undefined) {
      fields.push(`location = $${paramCount++}`);
      values.push(location);
    }
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    values.push(id);
    const query = `
      UPDATE defects 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM defects WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = {
  projectRepository: new ProjectRepository(),
  defectRepository: new DefectRepository(),
  pool
};