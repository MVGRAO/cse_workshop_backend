const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { verifyGoogleToken, isAllowedEmailDomain } = require('../config/googleAuth');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

/**
 * POST /auth/google
 * Verify Google token and authenticate user
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return error(res, 'Google ID token is required', null, 400);
    }

    // Verify Google token
    const googleUser = await verifyGoogleToken(idToken);

    // Check email domain
    if (!isAllowedEmailDomain(googleUser.email)) {
      return error(res, 'Only college email addresses are allowed', null, 403);
    }

    // Find or create user
    let user = await User.findOne({ email: googleUser.email });

    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        avatarUrl: googleUser.picture,
        role: 'student', // Default role
      });
    } else {
      // Update user info
      user.name = googleUser.name;
      user.avatarUrl = googleUser.picture;
      user.googleId = googleUser.googleId;
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    // Send registration email for new users
    if (isNewUser) {
      try {
        await emailService.sendRegistrationEmail(user.email, user.name);
      } catch (emailErr) {
        logger.error(`Failed to send registration email: ${emailErr.message}`);
        // Don't fail the request if email fails
      }
    }

    return success(res, 'Authentication successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/me
 * Get current user profile
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');

    if (!user) {
      return error(res, 'User not found', null, 404);
    }

    return success(res, 'User profile retrieved', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      college: user.college,
      classYear: user.classYear,
      mobile: user.mobile,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
};



