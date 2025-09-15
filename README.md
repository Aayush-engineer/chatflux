# 🚀 ChatFlux
**A Next-Gen Distributed & Real-Time Chat Platform**


**ChatFlux** is a **cutting-edge chat application** designed for **real-time, resilient, and highly scalable messaging**. Built with a modern tech stack, it delivers **instant communication**, **high-throughput event streaming**, and **efficient data persistence**—perfect for small teams or large-scale enterprise platforms.

---

## 💡 Key Features

- **⚡ Real-Time Messaging** – Powered by **Socket.IO**, enjoy seamless bidirectional communication.
- **📈 Scalable Architecture** – Redis for caching, Kafka for distributed event streaming, and ZooKeeper for coordination.
- **💾 Persistent Storage** – MongoDB stores chat history reliably.
- **🖥 Modern Frontend** – Built with **Svelte** for a responsive, lightweight, and dynamic interface.
- **🔄 Efficient Messaging** – Kafka handles high-throughput messaging, reducing database load.
- **🌐 Distributed System** – Run across multiple servers for fault tolerance and low latency.

---

## 🛠 Tech Stack

| Layer    | Technology                                         |
|----------|---------------------------------------------------|
| Backend  | Express.js, Socket.IO, Redis, Kafka, ZooKeeper, MongoDB |
| Frontend | Svelte                                            |
| DevOps   | Docker, Node.js                                   |

---

## 🏗 Architecture Overview

ChatFlux leverages a **distributed system architecture**:

1. **Client → Socket.IO**: Real-time bidirectional communication.
2. **Redis**: Message broker and caching layer for efficiency.
3. **Kafka & ZooKeeper**: Handles event streaming and distributed coordination.
4. **MongoDB**: Stores chat messages and user data persistently.
5. **Svelte Frontend**: Lightweight and reactive UI for smooth user experience.


---

## ⚙ Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm (v8+)
- Docker (for Redis, MongoDB, Kafka, and ZooKeeper)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/ChatFlux.git
cd ChatFlux

```
### Step 2: Install Dependencies
```bash
npm install
cd public && npm install

```

### Step 3: Run Prerequisites with Docker
```bash
docker run -p 27017:27017 mongo
docker run -p 2181:2181 zookeeper
docker run -p 6379:6379 redis/redis-stack-server:latest
docker run -p 9092:9092 \
-e KAFKA_ZOOKEEPER_CONNECT=<YOUR_LOCAL_IP>:2181 \
-e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://<YOUR_LOCAL_IP>:9092 \
-e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
confluentinc/cp-kafka

```

### Step 4: Configure Environment Variables
```bash

# API Settings
WEB_API_PORT=8000
WEB_API_ALLOWED_ORIGIN=["http://localhost:5173", "http://127.0.0.1:5173"]

# Database
MONGO_CONNECT_STRING="mongodb://127.0.0.1:27017/chatflux-db"

# Socket.IO
SOCKET_ALLOWED_ORIGIN=["http://localhost:5173", "http://127.0.0.1:5173"]

# Redis
REDIS_CHANNEL="redis-message-channel"

# Kafka
KAFKA_GROUP_ID="chatflux-group"
KAFKA_BROKERS="<YOUR_LOCAL_IP>:9092"
PROCESS_KAFKA_MESSAGE_LIMIT=100
KAFKA_TOPIC="chat-updates"
KAFKA_NO_OF_PARTITIONS=1

```

### Step 5: Run ChatFlux Locally
```bash
node ./app/kafka/KafkaAdmin.js
node KafkaConsumerRunner.js
node index.js
node ./app/Jobs/cron.js
cd ./public && npm run dev

```


### 📂 Folder Structure

ChatFlux/
├── README.md
├── package.json
├── prisma/
├── public/
│   ├── auth/
│   └── chat/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── service/
│   └── utils/

## 🤝 Contributing

We ❤️ contributions! Follow these steps to get started:

1. **Fork the repository**  
   Click the **Fork** button at the top-right corner of the repository page.

2. **Create a feature branch**  
```bash
git checkout -b feature/YourFeature


## 📄 License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for more details.

---

## 📞 Support

For any questions, issues, or suggestions, feel free to reach out:

- **Email:** aayush.21jdai066@jietjodhpur.ac.in

We are happy to help and welcome your feedback!
