const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const adminDashboardController = require('../controllers/admin.dashboard.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

/**
 * Admin Routes
 *
 * GET    /api/admin/dashboard           - Get comprehensive dashboard metrics
 * GET    /api/admin/dashboard/stats     - Get admin platform-wide stats
 * GET    /api/admin/dashboard/revenue-chart - Get admin platform-wide revenue chart
 * GET    /api/admin/dashboard/system-health - Get system health metrics
 * GET    /api/admin/stats               - Get system statistics
 * POST   /api/admin/weather/simulate    - Simulate weather event (testing)
 * POST   /api/admin/payout/approve      - Manually approve/reject payout
 * POST   /api/admin/kyc/bulk-approve    - Bulk approve KYC for farmers
 *
 * Note: All routes require admin authentication
 */

// Platform-wide admin dashboard
router.get('/dashboard/stats', authenticate, requireRole('ADMIN'), adminDashboardController.getAdminDashboardStats);
router.get('/dashboard/revenue-chart', authenticate, requireRole('ADMIN'), adminDashboardController.getAdminRevenueChart);
router.get('/dashboard/system-health', authenticate, requireRole('ADMIN'), adminDashboardController.getSystemHealth);

// Dashboard metrics (comprehensive)
router.get('/dashboard', authenticate, requireRole('ADMIN'), adminController.getDashboard);

// System statistics
router.get('/stats', authenticate, requireRole('ADMIN'), adminController.getSystemStats);

// Simulate weather event for testing
router.post('/weather/simulate', authenticate, requireRole('ADMIN'), adminController.simulateWeatherEvent);

// Manually approve or reject payout
router.post('/payout/approve', authenticate, requireRole('ADMIN'), adminController.approvePayout);

// Bulk approve KYC
router.post('/kyc/bulk-approve', authenticate, requireRole('ADMIN'), adminController.bulkApproveKyc);

module.exports = router;
