const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('../utils/logger');
const { redisOperationDuration } = require('../utils/metrics');

// Create Redis clients
const createRedisClient = (name) => {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: config.redis.retryStrategy,
    lazyConnect: true
  });

  client.on('connect', () => {
    logger.info(`Redis ${name} client connected`);
  });

  client.on('error', (err) => {
    logger.error(`Redis ${name} client error:`, err);
  });

  client.on('close', () => {
    logger.warn(`Redis ${name} client connection closed`);
  });

  return client;
};

// Main Redis client for general operations
const redisClient = createRedisClient('main');

// For Pub/Sub (requires separate connections)
const redisPub = createRedisClient('publisher');
const redisSub = createRedisClient('subscriber');

/**
 * Initialize Redis connections
 */
async function initRedis() {
  try {
    await Promise.all([
      redisClient.connect(),
      redisPub.connect(),
      redisSub.connect()
    ]);
    logger.info('All Redis clients connected successfully');
  } catch (error) {
    logger.error('Failed to connect Redis clients:', error);
    throw error;
  }
}

/**
 * Fetch messages from Redis with timing
 */
async function fetchMessagesFromRedis(limit = config.redis.maxMessages) {
  const end = redisOperationDuration.startTimer({ operation: 'lrange' });
  
  try {
    const messages = await redisClient.lrange('messages', 0, limit - 1);
    end();
    
    logger.debug(`Fetched ${messages.length} messages from Redis`);
    return messages.map(msg => {
      try {
        return JSON.parse(msg);
      } catch (e) {
        logger.warn('Failed to parse message from Redis:', e);
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    end();
    logger.error('Error fetching messages from Redis:', error);
    throw error;
  }
}

/**
 * Update messages in Redis (smart sync)
 */
async function updateMessagesInRedis(messages) {
  const end = redisOperationDuration.startTimer({ operation: 'update' });
  
  try {
    if (!messages || messages.length === 0) {
      logger.debug('No messages to update in Redis');
      end();
      return;
    }

    const pipeline = redisClient.pipeline();
    
    // Add new messages
    const jsonMessages = messages.map(msg => JSON.stringify(msg));
    pipeline.rpush('messages', ...jsonMessages);
    
    // Trim to max size (keep most recent)
    pipeline.ltrim('messages', -config.redis.maxMessages, -1);
    
    await pipeline.exec();
    end();
    
    logger.info(`Updated Redis with ${messages.length} messages`);
  } catch (error) {
    end();
    logger.error('Error updating messages in Redis:', error);
    throw error;
  }
}

/**
 * Add a single message to Redis
 */
async function addMessageToRedis(message) {
  const end = redisOperationDuration.startTimer({ operation: 'rpush' });
  
  try {
    const jsonMessage = JSON.stringify(message);
    
    const pipeline = redisClient.pipeline();
    pipeline.rpush('messages', jsonMessage);
    pipeline.ltrim('messages', -config.redis.maxMessages, -1);
    
    await pipeline.exec();
    end();
  } catch (error) {
    end();
    logger.error('Error adding message to Redis:', error);
    throw error;
  }
}

/**
 * Publish message to Redis channel
 */
async function publishMessage(channel, message) {
  try {
    await redisPub.publish(channel, JSON.stringify(message));
  } catch (error) {
    logger.error('Error publishing to Redis:', error);
    throw error;
  }
}

/**
 * Get Redis connection status
 */
function getRedisStatus() {
  return {
    main: redisClient.status,
    publisher: redisPub.status,
    subscriber: redisSub.status
  };
}

/**
 * Gracefully close all Redis connections
 */
async function closeRedis() {
  try {
    await Promise.all([
      redisClient.quit(),
      redisPub.quit(),
      redisSub.quit()
    ]);
    logger.info('All Redis clients disconnected gracefully');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
}

module.exports = {
  redisClient,
  redisPub,
  redisSub,
  initRedis,
  fetchMessagesFromRedis,
  updateMessagesInRedis,
  addMessageToRedis,
  publishMessage,
  getRedisStatus,
  closeRedis
};