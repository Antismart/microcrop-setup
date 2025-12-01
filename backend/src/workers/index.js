const { processQueue, QUEUES } = require('../config/queue');
const damageService = require('../services/damage.service');
const paymentService = require('../services/payment.service');
const prisma = require('../config/database');
const logger = require('../config/logger');

// NOTE: Weather and satellite data processing has been moved to the data-processor service (Python/FastAPI)
// This worker system now only handles business logic: damage assessment and payout processing
// Workers now use Bull (Redis queue) instead of RabbitMQ for simplicity

async function startAllWorkers() {
  try {
    logger.info('Starting business logic workers with Bull queue...');

    // Start damage assessment worker
    processQueue(QUEUES.DAMAGE_CALCULATION, async (message) => {
      try {
        const { policyId, triggerType } = message;
        logger.info('Processing damage assessment', { policyId, triggerType });
        
        const result = await damageService.calculateDamageIndex(policyId);
        
        if (result.payoutInfo.shouldPayout) {
          logger.info('Payout triggered', {
            policyId,
            damageIndex: result.assessment.damageIndex,
            amount: result.payoutInfo.amount,
          });
        }
        
        logger.info('Damage assessment completed', { policyId });
      } catch (error) {
        logger.error('Error in damage worker:', error);
        throw error;
      }
    });

    // Start payout processor worker
    processQueue(QUEUES.PAYOUT_TRIGGER, async (message) => {
      try {
        const { policyId, assessmentId, amount, damageIndex } = message;
        logger.info('Processing payout', { policyId, amount });
        
        const policy = await prisma.policy.findUnique({
          where: { id: policyId },
        });
        
        if (!policy) {
          throw new Error(`Policy ${policyId} not found`);
        }
        
        const payout = await prisma.payout.create({
          data: {
            policyId,
            farmerId: policy.farmerId,
            amount,
            status: 'PENDING',
          },
        });
        
        await paymentService.processPayout(payout.id);
        
        logger.info('Payout processed successfully', {
          payoutId: payout.id,
          policyId,
          amount,
        });
      } catch (error) {
        logger.error('Error in payout worker:', error);
        throw error;
      }
    });

    logger.info('All workers started successfully');
  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down workers...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down workers...');
  process.exit(0);
});

// Start all workers if run directly
if (require.main === module) {
  startAllWorkers();
}

module.exports = { startAllWorkers };
