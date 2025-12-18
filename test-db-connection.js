// test-db-connection.js - Enhanced database connection test
const { Sequelize } = require('sequelize');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  const sequelize = new Sequelize('auto_ayushdb', 'auto_ayushuser', 'ayush@123', {
    host: '31.97.235.133',
    port: 3306,
    dialect: 'mysql',
    logging: console.log, // Enable logging to see what's happening
    pool: {
      max: 5,
      min: 0,
      acquire: 10000, // Reduced timeout
      idle: 5000
    },
    dialectOptions: {
      connectTimeout: 10000, // 10 seconds
      acquireTimeout: 10000,
      timeout: 10000,
    }
  });

  try {
    console.log('⏳ Attempting to connect to MySQL server...');
    console.log('📍 Host: 31.97.235.133:3306');
    console.log('🗄️ Database: auto_ayushdb');
    console.log('👤 User: auto_ayushuser');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('🔍 Testing simple query...');
    const [results] = await sequelize.query('SELECT 1 as test');
    console.log('✅ Query test successful:', results);
    
    // Close the connection
    await sequelize.close();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.original) {
      console.error('Original error:', error.original.message);
      console.error('Error code:', error.original.code);
      console.error('Error errno:', error.original.errno);
    }
    
    // Suggest solutions based on error type
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Suggestions:');
      console.log('- Check if MySQL server is running on 31.97.235.133:3306');
      console.log('- Verify firewall settings allow connections to port 3306');
      console.log('- Confirm the server accepts remote connections');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Suggestions:');
      console.log('- Network timeout - check internet connection');
      console.log('- Server might be overloaded or unreachable');
      console.log('- Try increasing timeout values');
    } else if (error.message.includes('Access denied')) {
      console.log('\n💡 Suggestions:');
      console.log('- Check username and password');
      console.log('- Verify user has permissions for the database');
      console.log('- Confirm user is allowed to connect from your IP');
    }
    
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();