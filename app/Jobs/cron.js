const cron = require('node-cron');
const Message = require('../db/schema');
const { updateMessagesInRedis } = require('../redis/redis');
const { deleteOldMessages } = require('../db/operation');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Sync recent messages from MongoDB to Redis cache
 * Runs every 5 minutes by default
 */
const syncMessagesToRedis = cron.schedule(
  config.cron.syncSchedule,
  async () => {
    try {
      logger.info('Starting Redis sync job...');
      
      const syncStartTime = Date.now();
      
      // Only fetch messages from last 10 minutes to avoid overload
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const recentMessages = await Message.find({
        createdAt: { $gte: tenMinutesAgo }
      })
      .sort({ createdAt: 1 })
      .limit(config.redis.maxMessages)
      .lean();

      if (recentMessages.length > 0) {
        await updateMessagesInRedis(recentMessages);
        
        const syncDuration = Date.now() - syncStartTime;
        logger.info('Redis sync completed successfully', {
          messagesCount: recentMessages.length,
          durationMs: syncDuration
        });
      } else {
        logger.debug('No new messages to sync to Redis');
      }
      
    } catch (error) {
      logger.error('Error in Redis sync job:', error);
    }
  },
  {
    scheduled: false // Don't start automatically
  }
);

/**
 * Cleanup old messages from MongoDB
 * Runs daily at 2 AM
 */
const cleanupOldMessages = cron.schedule(
  '0 2 * * *', // Every day at 2 AM
  async () => {
    try {
      logger.info('Starting message cleanup job...');
      
      const daysToKeep = 30; // Keep messages for 30 days
      const deletedCount = await deleteOldMessages(daysToKeep);
      
      logger.info('Message cleanup completed', {
        deletedCount,
        daysToKeep
      });
      
    } catch (error) {
      logger.error('Error in cleanup job:', error);
    }
  },
  {
    scheduled: false,
    timezone: 'UTC'
  }
);

/**
 * Health check job - logs system stats
 * Runs every hour
 */
const systemHealthCheck = cron.schedule(
  '0 * * * *', // Every hour
  async () => {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMessages = await Message.countDocuments();
      
      logger.info('System health check', {
        uptime: process.uptime(),
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        totalMessages
      });
      
    } catch (error) {
      logger.error('Error in health check job:', error);
    }
  },
  {
    scheduled: false
  }
);

/**
 * Start all cron jobs
 */
function startCronJobs() {
  logger.info('Starting cron jobs...');
  
  syncMessagesToRedis.start();
  logger.info(`Redis sync job scheduled: ${config.cron.syncSchedule}`);
  
  cleanupOldMessages.start();
  logger.info('Cleanup job scheduled: daily at 2 AM UTC');
  
  systemHealthCheck.start();
  logger.info('Health check job scheduled: hourly');
}

/**
 * Stop all cron jobs
 */
function stopCronJobs() {
  logger.info('Stopping cron jobs...');
  
  syncMessagesToRedis.stop();
  cleanupOldMessages.stop();
  systemHealthCheck.stop();
  
  logger.info('All cron jobs stopped');
}

module.exports = {
  startCronJobs,
  stopCronJobs
};