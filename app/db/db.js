const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../utils/logger');

// Mongoose configuration
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    
    logger.info('MongoDB connected successfully!', {
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  mongoose
};