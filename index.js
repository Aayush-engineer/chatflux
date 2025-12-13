require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const config = require('./app/config/config');
const logger = require('./app/utils/logger');
const router = require('./app/routes/routes');
const { createServer, closeServer } = require('./app/socket/socket');
const { connectDB, disconnectDB } = require('./app/db/db');
const { initRedis, closeRedis } = require('./app/redis/redis');
const { startCronJobs, stopCronJobs } = require('./app/Jobs/cron');
const initKafkaAdmin = require('./app/kafka/KafkaAdmin');
const { disconnectProducer } = require('./app/kafka/KafkaProducer');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Adjust based on your needs
}));

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (if needed)
// app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/', router);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: config.env === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

/**
 * Initialize all services
 */
async function initializeServices() {
  try {
    logger.info('Starting ChatFlux application...');
    logger.info(`Environment: ${config.env}`);
    
    // 1. Connect to MongoDB
    await connectDB();
    
    // 2. Initialize Redis connections
    await initRedis();
    
    // 3. Initialize Kafka (create topics if needed)
    await initKafkaAdmin();
    
    // 4. Start Socket.IO server
    await createServer(app);
    
    // 5. Start cron jobs
    startCronJobs();
    
    logger.info('All services initialized successfully');
    logger.info(`ChatFlux is ready at http://localhost:${config.port}`);
    
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    await gracefulShutdown(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(exitCode = 0) {
  logger.info('Initiating graceful shutdown...');
  
  try {
    // Stop accepting new connections
    await closeServer();
    
    // Stop cron jobs
    stopCronJobs();
    
    // Disconnect Kafka producer
    await disconnectProducer();
    
    // Close Redis connections
    await closeRedis();
    
    // Close MongoDB connection
    await disconnectDB();
    
    logger.info('Graceful shutdown completed');
    process.exit(exitCode);
    
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received');
  gracefulShutdown(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received (Ctrl+C)');
  gracefulShutdown(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown(1);
});

// Start the application
initializeServices().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});