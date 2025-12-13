# ChatFlux 🚀

A distributed, real-time chat platform built with modern microservices architecture.

## 🏗️ Architecture

```
User → Socket.IO → Express Server
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Redis Pub/Sub      Kafka Queue
    ↓                   ↓
Broadcast          Consumer Batch
                        ↓
                   MongoDB
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Message Queue**: Apache Kafka
- **Caching**: Redis (Pub/Sub + Cache)
- **Database**: MongoDB
- **Monitoring**: Prometheus metrics
- **Logging**: Winston

## 📋 Prerequisites

- Node.js 18+
- MongoDB 7+
- Redis 7+
- Apache Kafka 3.5+
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo>
cd chatflux

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f chatflux-app
```

### Manual Setup

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure** (MongoDB, Redis, Kafka)
```bash
# Using Docker for infrastructure only
docker-compose up -d mongodb redis kafka
```

4. **Run the application**
```bash
# Terminal 1: Main server
npm start

# Terminal 2: Kafka consumer
npm run consumer
```

## 📁 Project Structure

```
chatflux/
├── app/
│   ├── config/         # Configuration management
│   ├── db/             # Database models & operations
│   ├── jobs/           # Cron jobs
│   ├── kafka/          # Kafka producer/consumer
│   ├── redis/          # Redis client & operations
│   ├── routes/         # API routes
│   ├── socket/         # Socket.IO server
│   └── utils/          # Logger & metrics
├── logs/               # Application logs
├── index.js            # Main entry point
├── kafkaConsumerRunner.js  # Consumer service
├── docker-compose.yml  # Docker orchestration
└── Dockerfile          # Container image
```

## 🔧 Configuration

Key environment variables:

```env
# Server
WEB_APP_PORT=3000
NODE_ENV=production

# MongoDB
MONGO_CONNECT_STRING=mongodb://localhost:27017/chatflux

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_CHANNEL=chat-messages

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=chat-messages
KAFKA_GROUP_ID=chat-consumer-group
```

## 📊 API Endpoints

### Health Check
```http
GET /health
```

### Metrics (Prometheus)
```http
GET /metrics
```

### Get Messages
```http
POST /get_messages
Content-Type: application/json

{
  "limit": 50,
  "roomId": "global"
}
```

### Statistics
```http
GET /stats
```

## 🔌 Socket.IO Events

### Client → Server
- `chat message` - Send a message
- `typing` - Typing indicator

### Server → Client
- `chat message` - Receive broadcast message
- `user typing` - User typing notification
- `error` - Error messages

## 📈 Monitoring

Access Prometheus metrics at `/metrics`:

- `chat_messages_total` - Total messages processed
- `chat_active_connections` - Active WebSocket connections
- `chat_message_processing_duration_seconds` - Processing latency
- `kafka_batch_size` - Kafka batch sizes
- `redis_operation_duration_seconds` - Redis operation times

## 🧪 Testing

```bash
# Run tests
npm test

# Lint code
npm run lint
```

## 🎯 Features

✅ Horizontal scalability with Redis Pub/Sub  
✅ Message persistence with Kafka + MongoDB  
✅ Rate limiting & input validation  
✅ Structured logging with Winston  
✅ Prometheus metrics integration  
✅ Graceful shutdown handling  
✅ Health checks & monitoring  
✅ Docker containerization  

## 🔐 Security

- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation with Joi
- CORS protection
- Message size limits

## 🚦 Production Deployment

1. **Set environment to production**
```env
NODE_ENV=production
```

2. **Use process manager**
```bash
pm2 start index.js -i max --name chatflux-app
pm2 start kafkaConsumerRunner.js --name chatflux-consumer
```

3. **Setup reverse proxy** (nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 License

ISC

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.