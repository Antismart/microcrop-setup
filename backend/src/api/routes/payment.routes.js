const express = require('express');
const router = express.Router();
const paymentService = require('../../services/payment.service');
const swyptService = require('../../services/swypt.service');
const logger = require('../../config/logger');

/**
 * Get quote for premium payment
 */
router.post('/quote', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const quote = await swyptService.calculatePremiumPayment(amount);
    
    res.json({
      success: true,
      quote,
    });
  } catch (error) {
    logger.error('Error getting payment quote:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Initiate premium payment
 */
router.post('/initiate', async (req, res) => {
  try {
    const { farmerId, amount, policyNumber } = req.body;

    if (!farmerId || !amount || !policyNumber) {
      return res.status(400).json({ 
        error: 'farmerId, amount, and policyNumber are required' 
      });
    }

    const result = await paymentService.initiatePremiumCollection(
      farmerId,
      amount,
      policyNumber
    );

    res.json({
      success: true,
      transaction: result.transaction,
      swyptResponse: result.paymentRequest,
      message: 'Payment request sent. Please complete M-Pesa prompt on your phone.',
    });
  } catch (error) {
    logger.error('Error initiating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check payment status
 */
router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const transaction = await paymentService.getTransactionStatus(reference);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // If still pending, check with Swypt
    if (transaction.status === 'PENDING') {
      await paymentService.checkAndCompletePayment(reference);
      
      // Fetch updated transaction
      const updated = await paymentService.getTransactionStatus(reference);
      return res.json(updated);
    }

    res.json(transaction);
  } catch (error) {
    logger.error('Error checking payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List farmer transactions
 */
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const transactions = await paymentService.getFarmerTransactions(farmerId, limit);

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get payment configuration (USDC on Base only)
 */
router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        network: swyptService.getNetwork(),
        token: 'USDC',
        tokenAddress: swyptService.getTokenAddress(),
        fiatCurrency: 'KES',
      },
    });
  } catch (error) {
    logger.error('Error fetching config:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
