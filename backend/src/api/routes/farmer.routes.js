const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmer.controller');

/**
 * Farmer Routes
 * 
 * POST   /api/farmers/register          - Register a new farmer
 * GET    /api/farmers                   - List all farmers (with pagination & filters)
 * GET    /api/farmers/:id               - Get farmer by ID
 * GET    /api/farmers/phone/:phoneNumber - Get farmer by phone number
 * PUT    /api/farmers/:id               - Update farmer profile
 * PUT    /api/farmers/:id/kyc           - Update KYC status
 * DELETE /api/farmers/:id               - Delete farmer
 */

// Register new farmer
router.post('/register', farmerController.registerFarmer);

// List all farmers with pagination and filters
router.get('/', farmerController.listFarmers);

// Get farmer by phone number (must come before /:id to avoid conflict)
router.get('/phone/:phoneNumber', farmerController.getFarmerByPhone);

// Get farmer by ID
router.get('/:id', farmerController.getFarmer);

// Update farmer profile
router.put('/:id', farmerController.updateFarmer);

// Update KYC status
router.put('/:id/kyc', farmerController.updateKycStatus);

// Delete farmer
router.delete('/:id', farmerController.deleteFarmer);

module.exports = router;
