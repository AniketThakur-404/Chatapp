const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  phone_number: { 
    type: DataTypes.STRING, 
    unique: true,
    allowNull: false
  },
  name: { 
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'Users',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
});

module.exports = User;
