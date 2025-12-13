const { kafka } = require('./KafkaClient');
const { storeMessages } = require('../db/operation');
const config = require('../config/config');
const logger = require('../utils/logger');

let consumer = null;

async function initKafkaConsumer() {
  try {
    consumer = kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      retry: {
        retries: 5
      }
    });

    logger.info('Connecting to Kafka Consumer...');
    await consumer.connect();
    logger.info('Kafka Consumer connected successfully');

    await consumer.subscribe({
      topics: [config.kafka.topic],
      fromBeginning: false // Only new messages (change to true for replay)
    });

    let messagesBuffer = [];
    let lastFlushTime = Date.now();
    const FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds if batch not full

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value.toString();
          const parsedMessage = JSON.parse(messageValue);

          logger.debug('Received message from Kafka', {
            partition,
            offset: message.offset,
            key: message.key?.toString()
          });

          messagesBuffer.push(parsedMessage);

          const shouldFlush = 
            messagesBuffer.length >= config.kafka.batchLimit ||
            (Date.now() - lastFlushTime) >= FLUSH_INTERVAL_MS;

          if (shouldFlush) {
            await flushMessages();
          }

        } catch (error) {
          logger.error('Error processing Kafka message:', {
            error: error.message,
            topic,
            partition,
            offset: message.offset
          });
        }
      }
    });

    // Periodic flush for remaining messages
    setInterval(async () => {
      if (messagesBuffer.length > 0) {
        await flushMessages();
      }
    }, FLUSH_INTERVAL_MS);

    async function flushMessages() {
      if (messagesBuffer.length === 0) return;

      const messagesToStore = [...messagesBuffer];
      messagesBuffer = [];
      lastFlushTime = Date.now();

      try {
        await storeMessages(messagesToStore);
        logger.info(`Flushed ${messagesToStore.length} messages to MongoDB`);
      } catch (error) {
        logger.error('Failed to flush messages:', error);
        // Could implement retry logic or dead-letter queue here
      }
    }

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down Kafka Consumer...');
      
      // Flush remaining messages
      if (messagesBuffer.length > 0) {
        await flushMessages();
      }
      
      if (consumer) {
        await consumer.disconnect();
        logger.info('Kafka Consumer disconnected gracefully');
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Kafka Consumer error:', error);
    throw error;
  }
}

module.exports = initKafkaConsumer;
