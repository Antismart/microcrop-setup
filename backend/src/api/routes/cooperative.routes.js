const express = require('express');
const router = express.Router();
const cooperativeController = require('../controllers/cooperative.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * Cooperative Dashboard Routes
 * All routes require authentication
 */

// Get dashboard statistics
router.get('/stats', authenticate, cooperativeController.getDashboardStats);

// Get revenue chart data
router.get('/revenue-chart', authenticate, cooperativeController.getRevenueChart);

// Get claims analytics
router.get('/claims-analytics', authenticate, cooperativeController.getClaimsAnalytics);

module.exports = router;
