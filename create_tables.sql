-- Create tables for WhatsApp Bot MySQL Database
-- Run these commands in your MySQL database: auto_ayushdb

USE auto_ayushdb;

-- Create Users table
CREATE TABLE IF NOT EXISTS `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone_number` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Sessions table
CREATE TABLE IF NOT EXISTS `Sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `current_step` varchar(255) DEFAULT NULL,
  `selected_package` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `UserId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `UserId` (`UserId`),
  CONSTRAINT `Sessions_ibfk_1` FOREIGN KEY (`UserId`) REFERENCES `Users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Messages table
CREATE TABLE IF NOT EXISTS `Messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender` varchar(255) DEFAULT NULL,
  `message_text` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `SessionId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `SessionId` (`SessionId`),
  CONSTRAINT `Messages_ibfk_1` FOREIGN KEY (`SessionId`) REFERENCES `Sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;