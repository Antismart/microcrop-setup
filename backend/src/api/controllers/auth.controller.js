const authService = require('../../services/auth.service');
const logger = require('../../config/logger');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          required: ['firstName', 'lastName', 'email', 'phone', 'password'],
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Validate phone format (Kenya)
    const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Expected Kenya mobile number (e.g., 0712345678)',
      });
    }

    // Validate role
    const validRoles = ['FARMER', 'COOPERATIVE', 'ADMIN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Register user
    const result = await authService.register({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || 'FARMER',
    });

    logger.info(`User registration successful: ${result.user.email}`, {
      userId: result.user.id,
      role: result.user.role,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    logger.error('Registration error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });

    // Handle specific errors
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    if (error.statusCode === 400 && error.details) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
      });
    }

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login a user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Login user
    const result = await authService.login(email, password);

    logger.info(`User login successful: ${result.user.email}`, {
      userId: result.user.id,
      role: result.user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', {
      error: error.message,
      email: req.body.email,
    });

    // Handle authentication errors
    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    logger.error('Token refresh error:', {
      error: error.message,
    });

    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    const user = await authService.getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error('Get current user error:', {
      error: error.message,
      userId: req.user?.userId,
    });

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Verify token
 * GET /api/auth/verify
 */
const verifyToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (checked by authenticate middleware)
    res.status(200).json({
      success: true,
      valid: true,
      user: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    logger.error('Token verification error:', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Token verification failed',
    });
  }
};

/**
 * Logout (optional - for token blacklist implementation)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing tokens
    // For enhanced security, you can implement token blacklisting here using Redis

    logger.info(`User logged out: ${req.user.email}`, {
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', {
      error: error.message,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update password
 * PUT /api/auth/password
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    await authService.updatePassword(req.user.userId, currentPassword, newPassword);

    logger.info(`Password updated for user: ${req.user.email}`, {
      userId: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    logger.error('Password update error:', {
      error: error.message,
      userId: req.user?.userId,
    });

    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        error: error.message,
      });
    }

    if (error.statusCode === 400 && error.details) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Password update failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getCurrentUser,
  verifyToken,
  logout,
  updatePassword,
};
