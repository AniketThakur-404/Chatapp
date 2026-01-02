// initDatabase.js - Database initialization script
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing NeonDB PostgreSQL database...');

    // User Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Session Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Session" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES "User"(id),
        current_step VARCHAR(255),
        selected_package VARCHAR(255),
        location VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Message Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Message" (
        id SERIAL PRIMARY KEY,
        "sessionId" INTEGER REFERENCES "Session"(id),
        sender VARCHAR(50),
        message_text TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables created successfully!');
    console.log('   - User');
    console.log('   - Session');
    console.log('   - Message');

    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };