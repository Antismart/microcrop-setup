const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

/**
 * Admin Routes
 * 
 * GET    /api/admin/dashboard           - Get comprehensive dashboard metrics
 * GET    /api/admin/stats               - Get system statistics
 * POST   /api/admin/weather/simulate    - Simulate weather event (testing)
 * POST   /api/admin/payout/approve      - Manually approve/reject payout
 * POST   /api/admin/kyc/bulk-approve    - Bulk approve KYC for farmers
 * 
 * Note: These routes should be protected with admin authentication middleware
 */

// Dashboard metrics
router.get('/dashboard', adminController.getDashboard);

// System statistics
router.get('/stats', adminController.getSystemStats);

// Simulate weather event for testing
router.post('/weather/simulate', adminController.simulateWeatherEvent);

// Manually approve or reject payout
router.post('/payout/approve', adminController.approvePayout);

// Bulk approve KYC
router.post('/kyc/bulk-approve', adminController.bulkApproveKyc);

module.exports = router;
