const { Pool } = require('pg');

const createPool = (database) => {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: database || process.env.DB_NAME || 'construction_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'nastya2005',
    max: 20, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

module.exports = {
  usersPool: createPool('construction_management'),
  ordersPool: createPool('construction_management'), 
};