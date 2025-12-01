const axios = require('axios');
const logger = require('../config/logger');

// Constants for USDC on Base
const NETWORK = 'base';
const CRYPTO_CURRENCY = 'USDC';
const USDC_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const FIAT_CURRENCY = 'KES';

class SwyptService {
  constructor() {
    this.baseUrl = process.env.SWYPT_API_URL || 'https://pool.swypt.io/api';
    this.apiKey = process.env.SWYPT_API_KEY;
    this.apiSecret = process.env.SWYPT_API_SECRET;
    this.network = NETWORK;
    this.cryptoCurrency = CRYPTO_CURRENCY;
    this.tokenAddress = USDC_TOKEN_ADDRESS;
    this.fiatCurrency = FIAT_CURRENCY;
  }

  /**
   * Get headers for Swypt API requests
   */
  getHeaders() {
    return {
      'x-api-key': this.apiKey,
      'x-api-secret': this.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get quote for converting between KES and USDC on Base
   * @param {string} type - 'onramp' or 'offramp'
   * @param {number} amount - Amount in KES (for onramp) or USDC (for offramp)
   * @param {string} category - Optional category (e.g., 'B2C' for offramp)
   */
  async getQuote(type, amount, category = null) {
    try {
      logger.info('Getting Swypt quote', { type, amount, network: this.network });

      const payload = {
        type,
        amount: amount.toString(),
        fiatCurrency: this.fiatCurrency,
        cryptoCurrency: this.cryptoCurrency,
        network: this.network,
      };

      if (category) {
        payload.category = category;
      }

      const response = await axios.post(
        `${this.baseUrl}/fx-quotes`,
        payload,
        { headers: this.getHeaders() }
      );

      logger.info('Swypt quote received', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error getting Swypt quote:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get quote from Swypt');
    }
  }

  /**
   * Get USDC token address on Base
   * @returns {string} USDC token address
   */
  getTokenAddress() {
    return this.tokenAddress;
  }

  /**
   * Get network (always Base)
   * @returns {string} Network name
   */
  getNetwork() {
    return this.network;
  }

  /**
   * Initiate M-Pesa STK Push for onramp (KES to USDC on Base)
   * @param {string} phoneNumber - M-Pesa phone number (254XXXXXXXXX)
   * @param {number} amount - Amount in KES
   * @param {string} userAddress - Wallet address to receive USDC
   */
  async initiateOnramp(phoneNumber, amount, userAddress) {
    try {
      logger.info('Initiating Swypt onramp (STK Push)', {
        phoneNumber,
        amount,
        userAddress,
        network: this.network,
        token: this.cryptoCurrency,
      });

      const payload = {
        partyA: phoneNumber,
        amount: amount.toString(),
        side: 'onramp',
        userAddress,
        tokenAddress: this.tokenAddress,
      };

      const response = await axios.post(
        `${this.baseUrl}/onramp-orders`,
        payload,
        { headers: this.getHeaders() }
      );

      logger.info('STK Push initiated', response.data);
      return response.data; // Returns { status, message, data: { orderID, message } }
    } catch (error) {
      logger.error('Error initiating onramp:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initiate STK push');
    }
  }

  /**
   * Check onramp transaction status
   */
  async checkOnrampStatus(orderID) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/onramp-order-status/${orderID}`,
        { headers: this.getHeaders() }
      );

      logger.info('Onramp status checked', { orderID, status: response.data.data?.status });
      return response.data; // Returns { status, data: { status: 'SUCCESS'|'PENDING'|'FAILED', ... } }
    } catch (error) {
      logger.error('Error checking onramp status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to check onramp status');
    }
  }

  /**
   * Process USDC transfer to user on Base after successful M-Pesa payment
   * @param {string} address - User's wallet address on Base
   * @param {string} orderID - Order ID from STK push response
   */
  async processCryptoTransfer(address, orderID) {
    try {
      logger.info('Processing USDC transfer on Base', { orderID, address });

      const payload = {
        chain: this.network,
        address,
        orderID,
        project: process.env.SWYPT_PROJECT_NAME || 'microcrop',
      };

      const response = await axios.post(
        `${this.baseUrl}/deposit`,
        payload,
        { headers: this.getHeaders() }
      );

      logger.info('USDC transfer processed', response.data);
      return response.data; // Returns { status, message, hash, createdAt, updatedAt }
    } catch (error) {
      logger.error('Error processing crypto transfer:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to process crypto transfer');
    }
  }

  /**
   * Initiate offramp (USDC to KES via M-Pesa)
   * Note: This is called AFTER the smart contract withdrawal
   * @param {string} hash - Transaction hash of USDC withdrawal on Base
   * @param {string} phoneNumber - M-Pesa phone number (254XXXXXXXXX)
   * @param {string} userAddress - User's wallet address on Base
   */
  async initiateOfframp(hash, phoneNumber, userAddress) {
    try {
      logger.info('Initiating Swypt offramp (USDC to M-Pesa)', {
        hash,
        phoneNumber,
        network: this.network,
        token: this.cryptoCurrency,
      });

      const payload = {
        chain: this.network,
        hash,
        partyB: phoneNumber,
        tokenAddress: this.tokenAddress,
        userAddress,
        project: process.env.SWYPT_PROJECT_NAME || 'microcrop',
      };

      const response = await axios.post(
        `${this.baseUrl}/offramp-orders`,
        payload,
        { headers: this.getHeaders() }
      );

      logger.info('Offramp initiated', response.data);
      return response.data; // Returns { status, message, data: { orderID } }
    } catch (error) {
      logger.error('Error initiating offramp:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initiate offramp');
    }
  }

  /**
   * Check offramp transaction status
   */
  async checkOfframpStatus(orderID) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/offramp-order-status/${orderID}`,
        { headers: this.getHeaders() }
      );

      logger.info('Offramp status checked', { orderID, status: response.data.data?.status });
      return response.data; // Returns { status, data: { status: 'SUCCESS'|'PENDING'|'FAILED', ... } }
    } catch (error) {
      logger.error('Error checking offramp status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to check offramp status');
    }
  }

  /**
   * Create onramp ticket for failed/cancelled transactions
   */
  async createOnrampTicket(params) {
    try {
      const payload = {
        ...params,
        side: 'on-ramp',
      };

      const response = await axios.post(
        `${this.baseUrl}/onramp-ticket`,
        payload,
        { headers: this.getHeaders() }
      );

      logger.info('Onramp ticket created', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error creating onramp ticket:', error.response?.data || error.message);
      throw new Error('Failed to create onramp ticket');
    }
  }

  /**
   * Create offramp ticket for failed/pending transactions
   */
  async createOfframpTicket(params) {
    try {
      const payload = {
        ...params,
        side: 'off-ramp',
      };

      const response = await axios.post(
        `${this.baseUrl}/offramp-ticket`,
        payload,
        { headers: this.getHeaders() }
      );

      logger.info('Offramp ticket created', response.data);
      return response.data;
    } catch (error) {
      logger.error('Error creating offramp ticket:', error.response?.data || error.message);
      throw new Error('Failed to create offramp ticket');
    }
  }

  /**
   * Calculate premium payment amount with fees (KES to USDC on Base)
   * @param {number} premiumKES - Premium amount in KES
   * @returns {Promise<Object>} Quote with amounts and fees
   */
  async calculatePremiumPayment(premiumKES) {
    try {
      // Get quote for converting KES to USDC on Base
      const quote = await this.getQuote('onramp', premiumKES);

      return {
        inputAmount: premiumKES,
        outputAmount: quote.data.outputAmount,
        exchangeRate: quote.data.exchangeRate,
        fee: quote.data.fee,
        totalKES: premiumKES + (quote.data.fee?.feeInKES || 0),
      };
    } catch (error) {
      logger.error('Error calculating premium payment:', error);
      throw error;
    }
  }

  /**
   * Calculate payout amount in KES from USDC
   * @param {number} amountUSDC - Amount in USDC
   * @returns {Promise<Object>} Quote with KES amount and fees
   */
  async calculatePayoutAmount(amountUSDC) {
    try {
      // Get quote for converting USDC to KES on Base
      const quote = await this.getQuote('offramp', amountUSDC, 'B2C');

      return {
        inputAmount: amountUSDC,
        outputAmount: quote.data.outputAmount,
        exchangeRate: quote.data.exchangeRate,
        fee: quote.data.fee,
        estimatedKES: quote.data.fee?.estimatedOutputKES || quote.data.outputAmount,
      };
    } catch (error) {
      logger.error('Error calculating payout amount:', error);
      throw error;
    }
  }
}

module.exports = new SwyptService();
