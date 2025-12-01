const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * Authentication Routes
 * 
 * Public routes:
 * POST   /api/auth/register          - Register a new user
 * POST   /api/auth/login             - Login with email and password
 * POST   /api/auth/refresh-token     - Refresh access token
 * 
 * Protected routes (require authentication):
 * GET    /api/auth/me                - Get current user information
 * GET    /api/auth/verify            - Verify token validity
 * POST   /api/auth/logout            - Logout (optional, for token blacklist)
 * PUT    /api/auth/password          - Update password
 */

// Public routes - No authentication required
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes - Authentication required
router.get('/me', authenticate, authController.getCurrentUser);
router.get('/verify', authenticate, authController.verifyToken);
router.post('/logout', authenticate, authController.logout);
router.put('/password', authenticate, authController.updatePassword);

module.exports = router;
