const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Session = require('./Session');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['user', 'bot']]
    }
  },
  message_text: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
}, {
  timestamps: true,
  tableName: 'Messages',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
});

Session.hasMany(Message);
Message.belongsTo(Session);

module.exports = Message;
