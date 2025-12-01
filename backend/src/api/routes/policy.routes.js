const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');

/**
 * Policy Routes
 * 
 * POST   /api/policies/quote          - Get insurance quote
 * POST   /api/policies/purchase       - Purchase insurance policy
 * GET    /api/policies/farmer/:farmerId - Get farmer's policies
 * GET    /api/policies/:id/status     - Get policy status and details
 * PUT    /api/policies/:id/activate   - Activate policy (after payment)
 * PUT    /api/policies/:id/cancel     - Cancel pending policy
 */

// Get insurance quote
router.post('/quote', policyController.getQuote);

// Purchase insurance policy
router.post('/purchase', policyController.purchasePolicy);

// Get farmer's policies
router.get('/farmer/:farmerId', policyController.getFarmerPolicies);

// Get policy status and details (must come after /farmer/:farmerId to avoid conflict)
router.get('/:id/status', policyController.getPolicyStatus);

// Activate policy after payment
router.put('/:id/activate', policyController.activatePolicy);

// Cancel policy
router.put('/:id/cancel', policyController.cancelPolicy);

module.exports = router;
