const jwt = require('jsonwebtoken');

/**
 * Generate a JWT access token
 * @param {Object} payload - Token payload (userId, email, role)
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generate a JWT refresh token
 * @param {Object} payload - Token payload (userId)
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify a JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  return jwt.verify(token, secret);
};

/**
 * Verify a JWT refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
  return jwt.verify(token, secret);
};

/**
 * Decode a JWT token without verifying
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token or null if invalid
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
};
