const { verifyToken } = require('../../utils/jwt.util');
const logger = require('../../config/logger');

/**
 * Middleware to authenticate requests using JWT
 * Verifies the JWT token in the Authorization header
 * and attaches the decoded user to req.user
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authorization header provided',
        message: 'Please provide a valid JWT token in the Authorization header',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format',
        message: 'Authorization header must be in format: Bearer <token>',
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'JWT token is missing',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    // Log successful authentication (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request authenticated', {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        path: req.path,
        method: req.method,
      });
    }

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      path: req.path,
      method: req.method,
    });

    // Handle JWT-specific errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided JWT token is invalid',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'The JWT token has expired. Please login again.',
        expiredAt: error.expiredAt,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Unable to authenticate request',
    });
  }
};

/**
 * Middleware to authorize requests based on user roles
 * Must be used after authenticate middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'You must be logged in to access this resource',
      });
    }

    // Check if user role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
        yourRole: req.user.role,
      });
    }

    // Log successful authorization (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request authorized', {
        userId: req.user.userId,
        role: req.user.role,
        path: req.path,
        method: req.method,
      });
    }

    next();
  };
};

/**
 * Middleware to optionally authenticate requests
 * Does not fail if no token is provided, but verifies if present
 * Useful for routes that work for both authenticated and unauthenticated users
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    // Verify token if present
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Token is invalid, but we don't fail the request
    logger.debug('Optional auth failed, continuing without authentication', {
      error: error.message,
      path: req.path,
    });

    next();
  }
};

/**
 * Middleware to check if user owns the resource
 * Compares req.user.userId with req.params.userId or req.params.id
 * @param {string} paramName - Name of the parameter to check (default: 'id')
 */
const checkResourceOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const resourceUserId = req.params[paramName] || req.params.userId;

    // Admins can access any resource
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Check if user owns the resource
    if (req.user.userId !== resourceUserId) {
      logger.warn('Resource ownership check failed', {
        userId: req.user.userId,
        resourceUserId,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  checkResourceOwnership,
};
