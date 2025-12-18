// db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DB_HOST = '31.97.235.133',
  DB_PORT = '3306',
  DB_NAME = 'auto_ayushdb',
  DB_USER = 'auto_ayushuser',
  DB_PASSWORD = 'ayush@123'
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    connectTimeout: 30000,
    charset: 'utf8mb4'
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
});

module.exports = sequelize;
