const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password.util');
const { generateToken, generateRefreshToken } = require('../utils/jwt.util');
const logger = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registered user with tokens
 */
const register = async (userData) => {
  const { firstName, lastName, email, phone, password, role } = userData;

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    const error = new Error('Password does not meet requirements');
    error.statusCode = 400;
    error.details = passwordValidation.errors;
    throw error;
  }

  // Normalize phone number
  let normalizedPhone = phone.replace(/\s+/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+254' + normalizedPhone.substring(1);
  } else if (normalizedPhone.startsWith('254')) {
    normalizedPhone = '+' + normalizedPhone;
  } else if (!normalizedPhone.startsWith('+254')) {
    normalizedPhone = '+254' + normalizedPhone;
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { phone: normalizedPhone },
      ],
    },
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email.toLowerCase()
        ? 'Email already registered'
        : 'Phone number already registered'
    );
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: normalizedPhone,
      password: hashedPassword,
      role: role || 'FARMER',
      updatedAt: new Date(),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  logger.info(`User registered successfully: ${user.email}`, {
    userId: user.id,
    role: user.role,
  });

  return {
    user,
    token,
    refreshToken,
  };
};

/**
 * Login a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User with tokens
 */
const login = async (email, password) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check if user is active
  if (!user.isActive) {
    const error = new Error('Account has been deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  logger.info(`User logged in successfully: ${user.email}`, {
    userId: user.id,
    role: user.role,
  });

  return {
    user: userWithoutPassword,
    token,
    refreshToken,
  };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens
 */
const refreshAccessToken = async (refreshToken) => {
  const { verifyRefreshToken } = require('../utils/jwt.util');

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account has been deactivated');
      error.statusCode = 403;
      throw error;
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    logger.info(`Token refreshed for user: ${user.email}`, {
      userId: user.id,
    });

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      const tokenError = new Error('Invalid or expired refresh token');
      tokenError.statusCode = 401;
      throw tokenError;
    }
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User without password
 */
const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      farmer: {
        select: {
          id: true,
          phoneNumber: true,
          county: true,
          subCounty: true,
          kycStatus: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Verify user email
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated user
 */
const verifyEmail = async (userId) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    },
  });

  logger.info(`Email verified for user: ${user.email}`, {
    userId: user.id,
  });

  return user;
};

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
const updatePassword = async (userId, currentPassword, newPassword) => {
  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    const error = new Error('New password does not meet requirements');
    error.statusCode = 400;
    error.details = passwordValidation.errors;
    throw error;
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });

  logger.info(`Password updated for user: ${user.email}`, {
    userId: user.id,
  });

  return true;
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  getUserById,
  verifyEmail,
  updatePassword,
};
