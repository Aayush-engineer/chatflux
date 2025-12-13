const { Kafka } = require('kafkajs');
const config = require('../config/config');
const logger = require('../utils/logger');

// Create Kafka instance
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: {
    initialRetryTime: 100,
    retries: 8
  },
  logCreator: () => {
    return ({ level, log }) => {
      const { message, ...extra } = log;
      
      switch (level) {
        case 1: // ERROR
          logger.error(`[Kafka] ${message}`, extra);
          break;
        case 2: // WARN
          logger.warn(`[Kafka] ${message}`, extra);
          break;
        case 4: // INFO
          logger.info(`[Kafka] ${message}`, extra);
          break;
        default:
          logger.debug(`[Kafka] ${message}`, extra);
      }
    };
  }
});

module.exports = { kafka };