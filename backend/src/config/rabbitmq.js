const amqp = require('amqplib');

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// Queue names
const QUEUES = {
  WEATHER_INGESTION: 'weather_ingestion',
  SATELLITE_PROCESSING: 'satellite_processing',
  DAMAGE_CALCULATION: 'damage_calculation',
  PAYOUT_TRIGGER: 'payout_trigger',
};

async function connect() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert queues exist
    for (const queue of Object.values(QUEUES)) {
      await channel.assertQueue(queue, {
        durable: true,
      });
    }

    console.log('✓ RabbitMQ connected successfully');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
    });

    return { connection, channel };
  } catch (error) {
    console.error('✗ Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

async function publishMessage(queue, message) {
  try {
    if (!channel) {
      await connect();
    }
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    return channel.sendToQueue(queue, messageBuffer, {
      persistent: true,
    });
  } catch (error) {
    console.error(`Error publishing to queue ${queue}:`, error);
    throw error;
  }
}

async function consumeMessages(queue, handler) {
  try {
    if (!channel) {
      await connect();
    }

    await channel.prefetch(1); // Process one message at a time

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          channel.ack(msg);
        } catch (error) {
          console.error(`Error processing message from ${queue}:`, error);
          // Reject and requeue the message
          channel.nack(msg, false, true);
        }
      }
    });

    console.log(`Started consuming from queue: ${queue}`);
  } catch (error) {
    console.error(`Error setting up consumer for ${queue}:`, error);
    throw error;
  }
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await close();
});

module.exports = {
  connect,
  publishMessage,
  consumeMessages,
  close,
  QUEUES,
};
