const prisma = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');
const swyptService = require('./swypt.service');

class PaymentService {
  /**
   * Initiate premium collection via M-Pesa (Swypt STK Push - KES to USDC on Base)
   */
  async initiatePremiumCollection(farmerId, policyId, amount, phoneNumber) {
    try {
      const farmer = await prisma.farmer.findUnique({
        where: { id: farmerId },
      });

      if (!farmer) {
        throw new Error(`Farmer ${farmerId} not found`);
      }

      // Get policy details
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
      });

      if (!policy) {
        throw new Error(`Policy ${policyId} not found`);
      }

      // Generate unique reference
      const reference = `PREM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      // Initiate Swypt STK Push (KES to USDC on Base)
      const swyptResponse = await swyptService.initiateOnramp(
        phoneNumber,
        amount,
        process.env.TREASURY_WALLET_ADDRESS
      );

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          farmerId,
          type: 'PREMIUM_PAYMENT',
          amount,
          status: 'PENDING',
          reference,
          phoneNumber,
          description: `Insurance premium for ${policy.policyNumber}`,
          metadata: { 
            policyId,
            policyNumber: policy.policyNumber,
            swyptOrderID: swyptResponse.data?.orderID,
            tokenAddress: swyptService.getTokenAddress(),
            network: swyptService.getNetwork(),
          },
        },
      });

      logger.info('Premium collection initiated via Swypt', {
        reference,
        farmerId,
        amount,
        phoneNumber,
        swyptOrderID: swyptResponse.data?.orderID,
        network: 'base',
        token: 'USDC',
      });

      return {
        success: true,
        transaction,
        swyptResponse,
      };
    } catch (error) {
      logger.error('Error initiating premium collection:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check payment status and complete if successful
   */
  async checkAndCompletePayment(reference) {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { reference },
      });

      if (!transaction) {
        throw new Error(`Transaction ${reference} not found`);
      }

      const swyptOrderID = transaction.metadata?.swyptOrderID;
      if (!swyptOrderID) {
        throw new Error('Swypt order ID not found in transaction metadata');
      }

      // Check status with Swypt
      const statusResponse = await swyptService.checkOnrampStatus(swyptOrderID);
      const status = statusResponse.data?.status; // 'SUCCESS', 'PENDING', 'FAILED'

      logger.info('Payment status checked', { reference, swyptOrderID, status });

      if (status === 'SUCCESS') {
        // Update transaction
        const updatedTransaction = await prisma.transaction.update({
          where: { reference },
          data: {
            status: 'COMPLETED',
            mpesaRef: statusResponse.data.details?.mpesaReceipt,
            completedAt: new Date(),
          },
        });

        // If it's a premium payment, activate the policy
        if (transaction.type === 'PREMIUM_PAYMENT') {
          const policyNumber = transaction.metadata?.policyNumber;
          
          if (policyNumber) {
            await prisma.policy.update({
              where: { policyNumber },
              data: { status: 'ACTIVE' },
            });

            logger.info('Policy activated', { policyNumber });

            // TODO: Send SMS confirmation to farmer
          }
        }

        return updatedTransaction;
      } else if (status === 'FAILED') {
        // Mark as failed
        await prisma.transaction.update({
          where: { reference },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
          },
        });
      }

      return transaction;
    } catch (error) {
      logger.error('Error checking payment status:', error);
      throw error;
    }
  }

  /**
   * Process insurance payout (Swypt Offramp)
   */
  async processPayout(payoutId) {
    try {
      const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
        include: {
          policy: true,
          farmer: true,
        },
      });

      if (!payout) {
        throw new Error(`Payout ${payoutId} not found`);
      }

      logger.info('Processing payout via Swypt', {
        payoutId,
        farmerId: payout.farmerId,
        amount: payout.amount,
      });

      // Update payout status
      await prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'PROCESSING' },
      });

      // Calculate USDC amount from KES
      const amountKES = payout.amount;
      const quote = await swyptService.calculatePayoutAmount(amountKES / 130); // Rough USDC conversion

      // TODO: Execute blockchain transaction first (withdraw USDC from contract on Base)
      // This is a placeholder - actual blockchain transaction needed
      const mockTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;

      // Initiate Swypt offramp (USDC to M-Pesa on Base)
      const swyptResponse = await swyptService.initiateOfframp(
        mockTxHash, // Transaction hash from blockchain
        payout.farmer.phoneNumber,
        process.env.TREASURY_WALLET_ADDRESS
      );

      const swyptOrderID = swyptResponse.data?.orderID;

      // Wait a bit then check status
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await swyptService.checkOfframpStatus(swyptOrderID);

      // Update payout with Swypt details
      const updatedPayout = await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: statusResponse.data?.status === 'SUCCESS' ? 'COMPLETED' : 'PROCESSING',
          mpesaRef: statusResponse.data?.details?.mpesaReceipt,
          transactionHash: mockTxHash,
          completedAt: statusResponse.data?.status === 'SUCCESS' ? new Date() : null,
        },
      });

      // Update policy status if completed
      if (statusResponse.data?.status === 'SUCCESS') {
        await prisma.policy.update({
          where: { id: payout.policyId },
          data: { status: 'CLAIMED' },
        });

        logger.info('Payout completed successfully', {
          payoutId,
          mpesaRef: statusResponse.data?.details?.mpesaReceipt,
          amount: payout.amount,
        });
      }

      // TODO: Send SMS notification to farmer
      // TODO: Record transaction on blockchain properly

      return updatedPayout;
    } catch (error) {
      logger.error('Error processing payout:', error);

      // Update payout status to failed
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Verify Swypt webhook signature (HMAC-SHA256)
   */
  verifySwyptSignature(data) {
    try {
      const secret = process.env.SWYPT_WEBHOOK_SECRET;
      const signature = data.signature;
      delete data.signature;

      const payload = JSON.stringify(data);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(reference) {
    return await prisma.transaction.findUnique({
      where: { reference },
    });
  }

  /**
   * Get farmer's transaction history
   */
  async getFarmerTransactions(farmerId, limit = 20) {
    return await prisma.transaction.findMany({
      where: { farmerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

module.exports = new PaymentService();
