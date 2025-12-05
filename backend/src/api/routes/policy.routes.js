const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * Policy Routes
 *
 * GET    /api/policies                - Get all policies (paginated, filtered by cooperative)
 * POST   /api/policies/quote          - Get insurance quote
 * POST   /api/policies/purchase       - Purchase insurance policy
 * GET    /api/policies/farmer/:farmerId - Get farmer's policies
 * GET    /api/policies/:id/status     - Get policy status and details
 * PUT    /api/policies/:id/activate   - Activate policy (after payment)
 * PUT    /api/policies/:id/cancel     - Cancel pending policy
 */

// Get all policies (for dashboard)
router.get('/', authenticate, policyController.getPolicies);

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
