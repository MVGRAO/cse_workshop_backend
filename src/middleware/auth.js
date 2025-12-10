const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 * In development mode, can bypass authentication if DEV_BYPASS_AUTH is enabled
 */
const authenticate = async (req, res, next) => {
  try {
    // Development mode: Bypass authentication if enabled
    if (config.DEV_BYPASS_AUTH && config.DEV_MODE) {
      console.warn('⚠️  DEVELOPMENT MODE: Authentication bypassed!');
      
      // Try to find a default dev user, or create a mock user
      let devUser = await User.findOne({ email: 'dev@test.com' });
      
      if (!devUser) {
        // Create a mock dev user if it doesn't exist
        devUser = await User.findOne({ role: constants.ROLES.STUDENT });
        
        if (!devUser) {
          // If no users exist, create a mock user object
          req.user = {
            id: 'dev-user-id',
            role: constants.ROLES.STUDENT,
            email: 'dev@test.com',
          };
          req.userModel = null; // No database model in bypass mode
          return next();
        }
      }

      // Use existing dev user
      req.user = {
        id: devUser._id.toString(),
        role: devUser.role,
        email: devUser.email,
      };
      req.userModel = devUser;
      
      return next();
    }

    // Normal authentication flow
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



