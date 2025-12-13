const { Server } = require('socket.io');
const http = require('http');
const config = require('../config/config');
const logger = require('../utils/logger');
const { messageCounter, activeConnections, messageProcessingDuration } = require('../utils/metrics');
const { redisSub, publishMessage, addMessageToRedis } = require('../redis/redis');
const sendToKafka = require('../kafka/KafkaProducer');

let io;
let server;

async function createServer(app) {
  server = http.createServer(app);
  
  io = new Server(server, {
    cors: {
      origin: config.cors.socketOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    transports: ['websocket', 'polling']
  });

  await initSocketServer();
}

async function initSocketServer() {
  try {
    // Subscribe to Redis channel for message broadcasting
    await redisSub.subscribe(config.redis.channel, (err, count) => {
      if (err) {
        logger.error('Failed to subscribe to Redis channel:', err);
        throw err;
      }
      logger.info(`Subscribed to ${count} Redis channel(s)`);
    });

    // Handle incoming messages from Redis
    redisSub.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        logger.debug('Broadcasting message from Redis', { 
          channel, 
          socketId: parsedMessage.socket_id 
        });
        
        io.emit('chat message', parsedMessage);
      } catch (error) {
        logger.error('Error parsing Redis message:', error);
      }
    });

    // Socket.IO connection handler
    io.on('connection', (socket) => {
      activeConnections.inc();
      logger.info('New client connected', { 
        socketId: socket.id,
        transport: socket.conn.transport.name
      });

      // Send join message
      pushMessage({
        socket_id: socket.id,
        message: `${socket.id} joined the chat!`,
        messageType: 'join'
      });

      // Handle chat messages
      socket.on('chat message', async (data) => {
        const end = messageProcessingDuration.startTimer();
        
        try {
          // Validate message
          if (!data || typeof data !== 'string') {
            socket.emit('error', { message: 'Invalid message format' });
            end();
            return;
          }

          if (data.length > 5000) {
            socket.emit('error', { message: 'Message too long (max 5000 characters)' });
            end();
            return;
          }

          await pushMessage({
            socket_id: socket.id,
            message: data,
            messageType: 'user'
          });

          messageCounter.inc({ type: 'user' });
          end();
        } catch (error) {
          logger.error('Error handling chat message:', error);
          socket.emit('error', { message: 'Failed to send message' });
          end();
        }
      });

      // Handle typing indicator
      socket.on('typing', (isTyping) => {
        socket.broadcast.emit('user typing', {
          socketId: socket.id,
          isTyping
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        activeConnections.dec();
        logger.info('Client disconnected', { 
          socketId: socket.id,
          reason 
        });

        pushMessage({
          socket_id: socket.id,
          message: `${socket.id} left the chat!`,
          messageType: 'leave'
        });

        messageCounter.inc({ type: 'system' });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error:', { socketId: socket.id, error });
      });
    });

    // Handle Socket.IO errors
    io.engine.on('connection_error', (err) => {
      logger.error('Connection error:', {
        code: err.code,
        message: err.message,
        context: err.context
      });
    });

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server started successfully`, {
        port: config.port,
        env: config.env
      });
    });

  } catch (error) {
    logger.error('Failed to initialize Socket server:', error);
    throw error;
  }
}

/**
 * Process and distribute message through the pipeline
 */
async function pushMessage(messageData) {
  try {
    const message = {
      ...messageData,
      createdAt: Date.now()
    };

    // Execute all operations in parallel for speed
    await Promise.all([
      // 1. Publish to Redis Pub/Sub (instant broadcast)
      publishMessage(config.redis.channel, message),
      
      // 2. Store in Redis cache
      addMessageToRedis(message),
      
      // 3. Send to Kafka for persistence
      sendToKafka(message)
    ]);

    logger.debug('Message pushed successfully', { 
      socketId: message.socket_id,
      type: message.messageType 
    });
  } catch (error) {
    logger.error('Error pushing message:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown server
 */
async function closeServer() {
  return new Promise((resolve) => {
    logger.info('Closing Socket.IO server...');
    
    io.close(() => {
      logger.info('Socket.IO server closed');
      
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  });
}

module.exports = { 
  createServer, 
  closeServer,
  getIO: () => io 
};