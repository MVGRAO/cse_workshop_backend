const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { error } = require('../utils/response');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return error(res, 'Authentication required. Please login.', null, 401);
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.userId).select('-__v');

      if (!user) {
        return error(res, 'User not found', null, 401);
      }

      if (!user.isActive) {
        return error(res, 'User account is inactive', null, 401);
      }

      // Attach user to request
      req.user = {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
      };
      req.userModel = user; // Full user model if needed

      next();
    } catch (err) {
      return error(res, 'Invalid or expired token', null, 401);
    }
  } catch (error) {
    return error(res, 'Authentication error', null, 500);
  }
};

module.exports = authenticate;



