const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const config = require('../config/config');
const logger = require('../utils/logger');
const { register } = require('../utils/metrics');
const { fetchMessagesFromRedis } = require('../redis/redis');
const { getMessageCount, fetchRecentMessages } = require('../db/operation');
const { getConnectionStatus: getDBStatus } = require('../db/db');
const { getRedisStatus } = require('../redis/redis');

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const getMessagesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  before: Joi.date().iso().optional(),
  roomId: Joi.string().max(100).default('global')
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: getDBStatus(),
        redis: getRedisStatus()
      }
    };

    const isHealthy = 
      health.services.mongodb === 'connected' &&
      health.services.redis.main === 'ready';

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * Metrics endpoint for Prometheus
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end();
  }
});

/**
 * Get messages endpoint with validation
 */
router.post('/get_messages', apiLimiter, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = getMessagesSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    const { limit, before, roomId } = value;

    // Try Redis first (fast), fallback to MongoDB
    let messages;
    
    try {
      messages = await fetchMessagesFromRedis(limit);
      
      if (!messages || messages.length === 0) {
        logger.debug('Redis cache miss, fetching from MongoDB');
        messages = await fetchRecentMessages(roomId, limit, before);
      }
    } catch (redisError) {
      logger.warn('Redis fetch failed, using MongoDB:', redisError);
      messages = await fetchRecentMessages(roomId, limit, before);
    }

    res.json({
      success: true,
      count: messages.length,
      messages
    });

  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

/**
 * Get message statistics
 */
router.get('/stats', apiLimiter, async (req, res) => {
  try {
    const totalMessages = await getMessageCount();
    
    res.json({
      success: true,
      stats: {
        totalMessages,
        serverUptime: process.uptime(),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * Root endpoint
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'ChatFlux API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      messages: 'POST /get_messages',
      stats: '/stats'
    }
  });
});

/**
 * 404 handler
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

/**
 * Error handler
 */
router.use((err, req, res, next) => {
  logger.error('Route error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = router;