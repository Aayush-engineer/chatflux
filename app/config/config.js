require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.WEB_APP_PORT, 10) || 3000,
  
  cors: {
    allowedOrigins: JSON.parse(process.env.WEB_API_ALLOWED_ORIGIN || '["http://localhost:8888"]'),
    socketOrigins: JSON.parse(process.env.SOCKET_ALLOWED_ORIGIN || '["http://localhost:8888"]')
  },

  mongodb: {
    uri: process.env.MONGO_CONNECT_STRING || 'mongodb://localhost:27017/chatflux',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    channel: process.env.REDIS_CHANNEL || 'chat-messages',
    maxMessages: parseInt(process.env.REDIS_MAX_MESSAGES, 10) || 5000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  },

  kafka: {
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
    clientId: process.env.KAFKA_GROUP_ID || 'chat-consumer-group',
    groupId: process.env.KAFKA_GROUP_ID || 'chat-consumer-group',
    topic: process.env.KAFKA_TOPIC || 'chat-messages',
    partitions: parseInt(process.env.KAFKA_NO_OF_PARTITIONS, 10) || 3,
    batchLimit: parseInt(process.env.PROCESS_KAFKA_MESSAGE_LIMIT, 10) || 10
  },

  cron: {
    syncSchedule: process.env.SYNC_CRON_SCHEDULE || '*/5 * * * *'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  }
};

module.exports = config;