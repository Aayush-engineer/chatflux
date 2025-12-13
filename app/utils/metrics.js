const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const messageCounter = new client.Counter({
  name: 'chat_messages_total',
  help: 'Total number of chat messages processed',
  labelNames: ['type']
});

const activeConnections = new client.Gauge({
  name: 'chat_active_connections',
  help: 'Number of active WebSocket connections'
});

const messageProcessingDuration = new client.Histogram({
  name: 'chat_message_processing_duration_seconds',
  help: 'Duration of message processing in seconds',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

const kafkaBatchSize = new client.Histogram({
  name: 'kafka_batch_size',
  help: 'Size of Kafka message batches',
  buckets: [1, 5, 10, 20, 50, 100]
});

const redisOperationDuration = new client.Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
});

// Register all metrics
register.registerMetric(messageCounter);
register.registerMetric(activeConnections);
register.registerMetric(messageProcessingDuration);
register.registerMetric(kafkaBatchSize);
register.registerMetric(redisOperationDuration);

module.exports = {
  register,
  messageCounter,
  activeConnections,
  messageProcessingDuration,
  kafkaBatchSize,
  redisOperationDuration
};