require("dotenv").config();
const { kafka } = require("./KafkaClient");

(async () => {
    try {
        const admin = kafka.admin();
        console.log("Connecting Kafka Admin...");
        await admin.connect();
        console.log("Kafka Admin Connected");

        console.log("Creating Topic:", process.env.KAFKA_TOPIC);

        await admin.createTopics({
            topics: [
                {
                    topic: process.env.KAFKA_TOPIC,
                    numPartitions: Number(process.env.KAFKA_NO_OF_PARTITIONS) || 1
                }
            ]
        });

        console.log("Topic Created Successfully!");

        await admin.disconnect();
        console.log("Kafka Admin Disconnected");
    } catch (err) {
        console.error("Kafka Admin Error:", err);
    }
})();

