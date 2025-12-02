const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration...');
    
    await client.query(`
      SELECT 'CREATE DATABASE construction_management'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'construction_management')
    `);
    
    console.log('Database checked/created');
    
    await client.query('\\c construction_management');
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();