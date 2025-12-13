const Message = require('./schema');
const logger = require('../utils/logger');
const { kafkaBatchSize } = require('../utils/metrics');

/**
 * Store multiple messages in batch
 */
async function storeMessages(messages) {
  if (!messages || messages.length === 0) {
    logger.warn('storeMessages called with empty array');
    return [];
  }

  try {
    logger.info(`Attempting to insert ${messages.length} messages`);
    
    const insertedMessages = await Message.insertMany(messages, { 
      ordered: false, // Continue on error
      lean: true 
    });
    
    logger.info(`Successfully inserted ${insertedMessages.length} messages`);
    kafkaBatchSize.observe(insertedMessages.length);
    
    return insertedMessages;
  } catch (error) {
    if (error.writeErrors) {
      // Some messages succeeded
      const successCount = messages.length - error.writeErrors.length;
      logger.warn(`Partial insert: ${successCount}/${messages.length} succeeded`, {
        errors: error.writeErrors.length
      });
      return error.insertedDocs || [];
    }
    
    logger.error('Error saving messages:', {
      error: error.message,
      count: messages.length
    });
    throw error;
  }
}

/**
 * Fetch recent messages with pagination
 */
async function fetchRecentMessages(roomId = 'global', limit = 50, before = null) {
  try {
    const query = { roomId };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    
    logger.debug(`Fetched ${messages.length} messages for room ${roomId}`);
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    logger.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Get messages count by room
 */
async function getMessageCount(roomId = 'global') {
  try {
    return await Message.countDocuments({ roomId });
  } catch (error) {
    logger.error('Error counting messages:', error);
    return 0;
  }
}

/**
 * Delete old messages (cleanup)
 */
async function deleteOldMessages(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Message.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    logger.info(`Deleted ${result.deletedCount} messages older than ${daysOld} days`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Error deleting old messages:', error);
    throw error;
  }
}

module.exports = {
  storeMessages,
  fetchRecentMessages,
  getMessageCount,
  deleteOldMessages
};