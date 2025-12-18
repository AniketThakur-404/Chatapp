#!/usr/bin/env node
// setup-database.js - Standalone database setup script
// Run this script to create database tables: node setup-database.js

const { initializeDatabase } = require('./initDatabase');

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  console.log('📊 Target Database: MySQL (auto_ayushdb)');
  console.log('🌐 Host: 31.97.235.133:3306');
  console.log('👤 User: auto_ayushuser');
  console.log('');
  
  try {
    await initializeDatabase();
    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('✅ Your WhatsApp bot database is ready to use.');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('💥 Database setup failed!');
    console.error('Error details:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials are correct');
    console.error('3. Database "auto_ayushdb" exists');
    console.error('4. User has proper permissions');
    process.exit(1);
  }
}

// Run the setup
setupDatabase();