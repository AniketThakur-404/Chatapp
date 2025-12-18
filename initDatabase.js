// initDatabase.js - Database initialization script
const sequelize = require('./db');
const User = require('./models/User');
const Session = require('./models/Session');
const Message = require('./models/Message');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing MySQL database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Create all tables
    console.log('🔄 Creating database tables...');
    
    // Force sync will drop existing tables and recreate them
    // Use { force: false, alter: true } for production to preserve data
    await sequelize.sync({ force: false, alter: true });
    
    console.log('✅ All database tables created successfully!');
    console.log('📋 Tables created:');
    console.log('   - Users (id, phone_number, name, createdAt, updatedAt)');
    console.log('   - Sessions (id, current_step, selected_package, location, UserId, createdAt, updatedAt)');
    console.log('   - Messages (id, sender, message_text, SessionId, createdAt, updatedAt)');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };