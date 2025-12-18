const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  current_step: {
    type: DataTypes.STRING,
    allowNull: true
  },
  selected_package: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'Sessions'
});

User.hasMany(Session);
Session.belongsTo(User);

module.exports = Session;
