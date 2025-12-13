const { kafka } = require('./KafkaClient');
const config = require('../config/config');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Singleton producer instance
let producer = null;
let isConnecting = false;

/**
 * Get or create Kafka producer (singleton pattern)
 */
async function getProducer() {
  if (producer) {
    return producer;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (producer) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
    return producer;
  }

  try {
    isConnecting = true;
    
    producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
      retry: {
        retries: 5
      }
    });

    logger.info('Connecting to Kafka Producer...');
    await producer.connect();
    logger.info('Kafka Producer connected successfully');

    // Handle producer events
    producer.on('producer.disconnect', () => {
      logger.warn('Kafka Producer disconnected');
      producer = null;
    });

    // Graceful shutdown handler
    const cleanup = async () => {
      if (producer) {
        try {
          await producer.disconnect();
          logger.info('Kafka Producer disconnected gracefully');
        } catch (error) {
          logger.error('Error disconnecting Kafka Producer:', error);
        }
      }
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    return producer;
  } catch (error) {
    logger.error('Failed to connect Kafka Producer:', error);
    producer = null;
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Send message to Kafka
 */
async function sendMessage(message) {
  try {
    const prod = await getProducer();
    
    const messageId = uuidv4();
    
    await prod.send({
      topic: config.kafka.topic,
      messages: [
        {
          key: message.socket_id || 'system',
          value: JSON.stringify(message),
          headers: {
            'message-id': messageId,
            'timestamp': Date.now().toString()
          }
        }
      ],
      acks: -1, // Wait for all replicas (most durable)
      timeout: 30000
    });

    logger.debug('Message sent to Kafka', { messageId });
  } catch (error) {
    logger.error('Error sending message to Kafka:', error);
    throw error;
  }
}

/**
 * Disconnect producer (for graceful shutdown)
 */
async function disconnectProducer() {
  if (producer) {
    try {
      await producer.disconnect();
      logger.info('Kafka Producer disconnected');
      producer = null;
    } catch (error) {
      logger.error('Error disconnecting Kafka Producer:', error);
    }
  }
}

module.exports = sendMessage;
module.exports.disconnectProducer = disconnectProducer;