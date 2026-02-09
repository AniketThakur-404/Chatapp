// db.js - Database client for NeonDB PostgreSQL
// Works on both local development and Vercel serverless
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create PostgreSQL connection pool with SSL for NeonDB
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Database helper functions with Prisma-like interface
const db = {
  // User operations
  user: {
    findUnique: async ({ where }) => {
      const result = await pool.query(
        'SELECT * FROM "ChatUser" WHERE phone_number = $1',
        [where.phone_number]
      );
      return result.rows[0] || null;
    },
    create: async ({ data }) => {
      const result = await pool.query(
        'INSERT INTO "ChatUser" (phone_number, name, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING *',
        [data.phone_number, data.name || null]
      );
      return result.rows[0];
    },
    update: async ({ where, data }) => {
      const result = await pool.query(
        'UPDATE "ChatUser" SET name = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
        [data.name, where.id]
      );
      return result.rows[0];
    }
  },

  // Session operations
  session: {
    findFirst: async ({ where, orderBy }) => {
      const result = await pool.query(
        'SELECT * FROM "Session" WHERE "userId" = $1 ORDER BY "updatedAt" DESC LIMIT 1',
        [where.userId]
      );
      return result.rows[0] || null;
    },
    create: async ({ data }) => {
      const result = await pool.query(
        'INSERT INTO "Session" ("userId", current_step, selected_package, location, session_data, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
        [
          data.userId,
          data.current_step || null,
          data.selected_package || null,
          data.location || null,
          data.session_data || null
        ]
      );
      return result.rows[0];
    },
    update: async ({ where, data }) => {
      const result = await pool.query(
        'UPDATE "Session" SET current_step = $1, selected_package = $2, location = $3, session_data = $4, "updatedAt" = NOW() WHERE id = $5 RETURNING *',
        [
          data.current_step,
          data.selected_package,
          data.location,
          data.session_data || null,
          where.id
        ]
      );
      return result.rows[0];
    }
  },

  // Message operations
  message: {
    create: async ({ data }) => {
      const result = await pool.query(
        'INSERT INTO "Message" ("sessionId", sender, message_text, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
        [data.sessionId, data.sender, data.message_text]
      );
      return result.rows[0];
    }
  },

  // Connection management
  $connect: async () => {
    const client = await pool.connect();
    client.release();
    return true;
  },
  $disconnect: async () => {
    await pool.end();
  },
  $queryRaw: async (strings, ...values) => {
    const query = strings.join('$');
    const result = await pool.query(query, values);
    return result.rows;
  }
};

module.exports = db;
