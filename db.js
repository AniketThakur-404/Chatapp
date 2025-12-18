// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('auto_ayushdb', 'auto_ayushuser', 'ayush@123', {
  host: '31.97.235.133',
  port: 3306,
  dialect: 'mysql',
  logging: false, // optional
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
