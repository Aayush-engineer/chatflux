const { kafka } = require('./KafkaClient');
const config = require('../config/config');
const logger = require('../utils/logger');

async function initKafkaAdmin() {
  const admin = kafka.admin();
  
  try {
    logger.info('Connecting to Kafka Admin...');
    await admin.connect();
    logger.info('Kafka Admin connected successfully');

    // Check if topic exists
    const topics = await admin.listTopics();
    const topicExists = topics.includes(config.kafka.topic);

    if (topicExists) {
      logger.info(`Topic "${config.kafka.topic}" already exists`);
    } else {
      logger.info(`Creating topic: ${config.kafka.topic}`);
      
      await admin.createTopics({
        topics: [
          {
            topic: config.kafka.topic,
            numPartitions: config.kafka.partitions,
            replicationFactor: 1, // Set to 3 in production with multiple brokers
            configEntries: [
              { name: 'retention.ms', value: '604800000' }, // 7 days
              { name: 'compression.type', value: 'snappy' }
            ]
          }
        ],
        waitForLeaders: true
      });
      
      logger.info(`Topic "${config.kafka.topic}" created successfully`);
    }

    await admin.disconnect();
    logger.info('Kafka Admin disconnected');
    
  } catch (error) {
    logger.error('Kafka Admin error:', error);
    
    try {
      await admin.disconnect();
    } catch (disconnectError) {
      logger.error('Error disconnecting Kafka Admin:', disconnectError);
    }
    
    throw error;
  }
}

module.exports = initKafkaAdmin;
