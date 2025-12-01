const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claim.controller');

/**
 * Claim Routes
 * 
 * GET    /api/claims/:policyId           - Get claims (damage assessments) for a policy
 * GET    /api/claims/payouts/:farmerId   - Get all payouts for a farmer
 * POST   /api/claims/process              - Process a payout (admin/automated)
 * GET    /api/claims/payout/:payoutId     - Get payout details by ID
 * PUT    /api/claims/payout/:payoutId/status - Update payout status
 */

// Get claims for a specific policy
router.get('/:policyId', claimController.getPolicyClaims);

// Get all payouts for a farmer
router.get('/payouts/:farmerId', claimController.getFarmerPayouts);

// Get payout details by ID (must come before /process to avoid route conflict)
router.get('/payout/:payoutId', claimController.getPayoutDetails);

// Process a new payout
router.post('/process', claimController.processPayout);

// Update payout status
router.put('/payout/:payoutId/status', claimController.updatePayoutStatus);

module.exports = router;
