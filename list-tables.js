require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (e) {
        console.error(e);
    }
}

listTables();
