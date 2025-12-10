const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
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

    // Prepare user data
    const userData = {
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.googleId,
      avatarUrl: googleUser.picture,
      givenName: googleUser.givenName,
      familyName: googleUser.familyName,
      locale: googleUser.locale,
      lastLoginAt: new Date(),
    };

    // Try to fetch additional profile details if access token is provided
    const { accessToken } = req.body;
    if (accessToken) {
      try {
        const { fetchGoogleProfileDetails } = require('../config/googleAuth');
        const additionalInfo = await fetchGoogleProfileDetails(accessToken);
        if (additionalInfo.phoneNumber) {
          userData.phoneNumber = additionalInfo.phoneNumber;
        }
        if (additionalInfo.location) {
          userData.location = additionalInfo.location;
        }
      } catch (err) {
        logger.warn(`Failed to fetch additional profile info: ${err.message}`);
        // Continue without additional info
      }
    }

    if (!user) {
      user = await User.create({
        ...userData,
        role: 'student', // Default role
      });
    } else {
      // Update user info
      Object.assign(user, userData);
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
        givenName: user.givenName,
        familyName: user.familyName,
        locale: user.locale,
        phoneNumber: user.phoneNumber,
        location: user.location,
        mobile: user.mobile,
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
      givenName: user.givenName,
      familyName: user.familyName,
      locale: user.locale,
      phoneNumber: user.phoneNumber,
      location: user.location,
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

/**
 * PUT /auth/profile
 * Update current user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, mobile, college, classYear } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return error(res, 'User not found', null, 404);
    }

    // Update fields if provided
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) {
      if (!validator.isEmail(email)) {
        return error(res, 'Please provide a valid email address', null, 400);
      }
      // Check email domain
      if (!isAllowedEmailDomain(email)) {
        return error(res, 'Only college email addresses are allowed', null, 403);
      }
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (existingUser) {
        return error(res, 'Email is already taken by another user', null, 400);
      }
      user.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) user.phoneNumber = phone.trim();
    if (mobile !== undefined) user.mobile = mobile.trim();
    if (college !== undefined) user.college = college.trim();
    if (classYear !== undefined) user.classYear = classYear.trim();

    await user.save();

    logger.info(`User profile updated: ${user.email} (${user._id})`);

    return success(res, 'Profile updated successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber,
      mobile: user.mobile,
      college: user.college,
      classYear: user.classYear,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /auth/account
 * Delete current user account
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return error(res, 'User not found', null, 404);
    }

    // Soft delete: set isActive to false
    user.isActive = false;
    await user.save();

    logger.info(`User account deleted: ${user.email} (${user._id})`);

    return success(res, 'Account deleted successfully', null);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/register
 * Register a new user with email and password
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, college, classYear, mobile } = req.body;

    // Validation
    if (!name || !email || !password) {
      return error(res, 'Name, email, and password are required', null, 400);
    }

    if (!validator.isEmail(email)) {
      return error(res, 'Please provide a valid email address', null, 400);
    }

    if (password.length < 6) {
      return error(res, 'Password must be at least 6 characters long', null, 400);
    }

    // Check email domain
    if (!isAllowedEmailDomain(email)) {
      return error(res, 'Only college email addresses are allowed', null, 403);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, 'User with this email already exists', null, 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with all provided data
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'student',
    };

    // Add optional fields if provided
    if (college && college.trim()) {
      userData.college = college.trim();
    }
    if (classYear && classYear.trim()) {
      userData.classYear = classYear.trim();
    }
    if (mobile && mobile.trim()) {
      userData.mobile = mobile.trim();
    }

    // Create user in MongoDB
    const user = await User.create(userData);

    logger.info(`New user registered: ${user.email} (${user._id})`);

    // Generate JWT
    const token = generateToken(user._id, user.role);

    // Send registration email
    try {
      await emailService.sendRegistrationEmail(user.email, user.name);
    } catch (emailErr) {
      logger.error(`Failed to send registration email: ${emailErr.message}`);
      // Don't fail registration if email fails
    }

    return success(res, 'Registration successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        classYear: user.classYear,
        mobile: user.mobile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 * Login with email and password
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return error(res, 'Email and password are required', null, 400);
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return error(res, 'Invalid email or password', null, 401);
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.password) {
      return error(res, 'This account uses Google sign-in. Please use Google to sign in.', null, 401);
    }

    // Check if account is active
    if (!user.isActive) {
      return error(res, 'Your account has been deactivated. Please contact support.', null, 403);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return error(res, 'Invalid email or password', null, 401);
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`User logged in: ${user.email} (${user._id})`);

    // Generate JWT
    const token = generateToken(user._id, user.role);

    return success(res, 'Login successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        college: user.college,
        classYear: user.classYear,
        mobile: user.mobile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/forgot-password
 * Request password reset
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return error(res, 'Email is required', null, 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return success(res, 'If an account exists with this email, a password reset link has been sent', null);
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: '1h',
    });

    // TODO: Save reset token to database and send email
    // For now, just return success
    logger.info(`Password reset requested for: ${email}, token: ${resetToken}`);

    return success(res, 'Password reset link sent to your email', null);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/dev-token
 * Get a development token for testing (only works in dev mode)
 */
exports.getDevToken = async (req, res, next) => {
  try {
    const config = require('../config/env');
    
    if (!config.DEV_MODE || !config.DEV_BYPASS_AUTH) {
      return error(res, 'This endpoint is only available in development mode', null, 403);
    }

    // Find or create a dev user
    let devUser = await User.findOne({ email: 'dev@test.com' });
    
    if (!devUser) {
      // Try to find any existing user
      devUser = await User.findOne();
      
      if (!devUser) {
        // Create a mock dev user
        devUser = await User.create({
          email: 'dev@test.com',
          name: 'Dev User',
          role: 'student',
          isActive: true,
        });
      }
    }

    const token = generateToken(devUser._id, devUser.role);

    return success(res, 'Dev token generated', {
      token,
      user: {
        id: devUser._id,
        name: devUser.name,
        email: devUser.email,
        role: devUser.role,
      },
      warning: '⚠️ This is a development token. Do not use in production!',
    });
  } catch (err) {
    next(err);
  }
};



