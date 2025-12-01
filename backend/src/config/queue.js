const Bull = require('bull');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const QUEUES = {
  DAMAGE_CALCULATION: 'damage_calculation',
  PAYOUT_TRIGGER: 'payout_trigger',
};

const queues = {};

function createQueue(queueName) {
  if (queues[queueName]) {
    return queues[queueName];
  }

  const queue = new Bull(queueName, REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });

  queue.on('error', (error) => {
    logger.error(`Queue ${queueName} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in queue ${queueName} failed:`, error);
  });

  queues[queueName] = queue;
  return queue;
}

async function publishMessage(queueName, data) {
  try {
    const queue = createQueue(queueName);
    const job = await queue.add(data);
    logger.info(`Job added to queue ${queueName}`, { jobId: job.id });
    return job;
  } catch (error) {
    logger.error(`Error publishing to queue ${queueName}:`, error);
    throw error;
  }
}

function processQueue(queueName, handler) {
  try {
    const queue = createQueue(queueName);
    queue.process(async (job) => {
      logger.info(`Processing job ${job.id} from queue ${queueName}`, { data: job.data });
      await handler(job.data);
    });
    logger.info(`Started processing queue: ${queueName}`);
  } catch (error) {
    logger.error(`Error setting up processor for queue ${queueName}:`, error);
    throw error;
  }
}

async function closeAll() {
  try {
    for (const [name, queue] of Object.entries(queues)) {
      await queue.close();
      logger.info(`Closed queue: ${name}`);
    }
  } catch (error) {
    logger.error('Error closing queues:', error);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queues...');
  await closeAll();
  process.exit(0);
});

module.exports = {
  QUEUES,
  publishMessage,
  processQueue,
  closeAll,
};
