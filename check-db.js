require('dotenv').config();
const { Pool } = require('pg');

// NeonDB connection string includes sslmode=require, so we rely on that.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkDatabase() {
    try {
        console.log('Connecting to NeonDB...\n');

        // Simple query to verify connection first
        const now = await pool.query('SELECT NOW()');
        console.log('✅ Connected! Server time:', now.rows[0].now);

        const users = await pool.query('SELECT COUNT(*) FROM "ChatUser"');
        const sessions = await pool.query('SELECT COUNT(*) FROM "Session"');
        const messages = await pool.query('SELECT COUNT(*) FROM "Message"');

        console.log('=== Database Statistics ===');
        console.log('Total Users:', users.rows[0].count);
        console.log('Total Sessions:', sessions.rows[0].count);
        console.log('Total Messages:', messages.rows[0].count);

        console.log('\n=== Recent Users (Top 5) ===');
        const recentUsers = await pool.query('SELECT * FROM "ChatUser" ORDER BY "createdAt" DESC LIMIT 5');
        console.log(JSON.stringify(recentUsers.rows, null, 2));

        console.log('\n=== Recent Messages (Top 5) ===');
        const recentMessages = await pool.query('SELECT * FROM "Message" ORDER BY "createdAt" DESC LIMIT 5');
        console.log(JSON.stringify(recentMessages.rows, null, 2));

        await pool.end();
    } catch (error) {
        console.error('❌ Database Check Error:', error);
    }
}

checkDatabase();
