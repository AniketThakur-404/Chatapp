// fix-database-charset.js - Fix database charset to support emojis
const sequelize = require('./db');

async function fixDatabaseCharset() {
  try {
    console.log('🔧 Fixing database charset to support emojis...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Fix database charset
    console.log('🔄 Converting database to utf8mb4...');
    await sequelize.query('ALTER DATABASE auto_ayushdb CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;');
    console.log('✅ Database charset updated');
    
    // Fix Users table
    console.log('🔄 Converting Users table...');
    await sequelize.query(`
      ALTER TABLE Users 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Users table converted');
    
    // Fix Sessions table
    console.log('🔄 Converting Sessions table...');
    await sequelize.query(`
      ALTER TABLE Sessions 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Sessions table converted');
    
    // Fix Messages table
    console.log('🔄 Converting Messages table...');
    await sequelize.query(`
      ALTER TABLE Messages 
      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Messages table converted');
    
    // Verify the changes
    console.log('🔍 Verifying table charset...');
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_COLLATION 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'auto_ayushdb' 
      AND TABLE_NAME IN ('Users', 'Sessions', 'Messages');
    `);
    
    console.log('📋 Table charsets:');
    results.forEach(row => {
      console.log(`  ${row.TABLE_NAME}: ${row.TABLE_COLLATION}`);
    });
    
    console.log('✅ Database charset fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to fix database charset:');
    console.error('Error:', error.message);
    
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
  } finally {
    await sequelize.close();
  }
}

fixDatabaseCharset();