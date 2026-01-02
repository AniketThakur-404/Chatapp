// initDatabase.js - Database initialization script
const db = require('./db');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing NeonDB PostgreSQL database...');

    // Test database connection
    await db.$connect();
    console.log('✅ Database connection established successfully.');

    console.log('📋 Database ready with tables:');
    console.log('   - User (id, phone_number, name, createdAt, updatedAt)');
    console.log('   - Session (id, current_step, selected_package, location, userId, createdAt, updatedAt)');
    console.log('   - Message (id, sender, message_text, sessionId, createdAt, updatedAt)');

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  await db.$disconnect();
}

module.exports = { initializeDatabase, disconnectDatabase };