const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * Base JWT Verification Helper
 * Verifies token signature and expiration only.
 * Returns decoded token or throws error.
 */
const verifyToken = (req) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
    throw new Error('No token provided');
  }
  const token = req.headers.authorization.split(' ')[1];
  console.log(config.JWT_SECRET);
  return jwt.verify(token, config.JWT_SECRET);
};

// DEV MODE BYPASS LOGIC (Kept for compatibility, but strictly scoped if needed)
const handleDevBypass = async (req, role) => {
  if (config.DEV_BYPASS_AUTH && config.DEV_MODE) {
    console.warn(`⚠️  DEVELOPMENT MODE: Authentication bypassed for ${role}!`);

    // Use valid 24-char hex strings to avoid "Cast to ObjectId failed"
    const DUMMY_ADMIN_ID = '000000000000000000000001';
    const DUMMY_USER_ID = '000000000000000000000002';

    if (role === constants.ROLES.ADMIN) {
      // Try to find a real admin first
      let admin = await Admin.findOne();

      req.user = {
        id: admin ? admin._id.toString() : DUMMY_ADMIN_ID,
        role: constants.ROLES.ADMIN,
        email: admin ? admin.email : 'dev@admin.com',
        type: 'admin'
      };
      if (admin) req.adminModel = admin;
      return true;
    }

    // Mock User (Student/Verifier)
    let devUser = await User.findOne({ email: 'dev@test.com' });
    if (!devUser) {
      // Try to find any user with the requested role
      devUser = await User.findOne({ role });
    }

    if (devUser) {
      req.user = { id: devUser._id.toString(), role: devUser.role, email: devUser.email };
      req.userModel = devUser;
      return true;
    }

    // If still no user, synthesize one with valid ID
    req.user = { id: DUMMY_USER_ID, role: role, email: 'dev@test.com' };
    req.userModel = null;
    return true;
  }
  return false;
};

/**
 * STRICT MIDDLEWARE: Protect ADMIN Routes
 * Allowed: ONLY Admins
 */
exports.protectAdmin = async (req, res, next) => {
  try {
    if (await handleDevBypass(req, constants.ROLES.ADMIN)) return next();

    const decoded = verifyToken(req);

    // Strict Check: Must be type 'admin' or role 'admin' coming from Admin table logic
    // Admin tokens usually have `adminId` or `type: 'admin'`
    if (!decoded.adminId && decoded.type !== 'admin' && decoded.role !== constants.ROLES.ADMIN) {
      return error(res, 'Access denied. Admins only.', null, 403);
    }

    const adminId = decoded.adminId || decoded.userId; // handle legacy/different payload structures
    const admin = await Admin.findById(adminId).select('-__v');

    if (!admin || !admin.isActive) {
      return error(res, 'Admin access denied.', null, 403);
    }

    req.user = {
      id: admin._id.toString(),
      role: constants.ROLES.ADMIN,
      email: admin.email,
      type: 'admin',
    };
    req.adminModel = admin;
    next();
  } catch (err) {
    return error(res, 'Not authorized as Admin', null, 401);
  }
};

/**
 * STRICT MIDDLEWARE: Protect VERIFIER Routes
 * Allowed: ONLY Verifiers
 */
exports.protectVerifier = async (req, res, next) => {
  try {
    if (await handleDevBypass(req, constants.ROLES.VERIFIER)) return next();

    const decoded = verifyToken(req);

    // Strict Check: Role must be verifier
    if (decoded.role !== constants.ROLES.VERIFIER) {
      return error(res, 'Access denied. Verifiers only.', null, 403);
    }

    const user = await User.findById(decoded.userId).select('-__v');
    if (!user || user.role !== constants.ROLES.VERIFIER || !user.isActive) {
      return error(res, 'Verifier access denied.', null, 403);
    }

    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    req.userModel = user;
    next();
  } catch (err) {
    return error(res, 'Not authorized as Verifier', null, 401);
  }
};

/**
 * STRICT MIDDLEWARE: Protect STUDENT Routes
 * Allowed: ONLY Students
 */
exports.protectStudent = async (req, res, next) => {
  try {
    if (await handleDevBypass(req, constants.ROLES.STUDENT)) return next();

    const decoded = verifyToken(req);

    // Strict Check: Role must be student
    // Note: If you want to allow Verifiers to also act as Students, remove the strict check.
    // The user asked for "student auth ONLY for... respective roles", implying strictness.
    if (decoded.role !== constants.ROLES.STUDENT) {
      return error(res, 'Access denied. Students only.', null, 403);
    }

    const user = await User.findById(decoded.userId).select('-__v');
    if (!user || user.role !== constants.ROLES.STUDENT || !user.isActive) {
      return error(res, 'Student access denied.', null, 403);
    }

    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    req.userModel = user;
    next();
  } catch (err) {
    return error(res, 'Not authorized as Student', null, 401);
  }
};

/**
 * STRICT MIDDLEWARE: Protect ANY USER Routes (Student OR Verifier)
 * Usage: Shared profile routes like /me, /profile
 */
exports.protectUser = async (req, res, next) => {
  try {
    // Check bypass for either role
    if (await handleDevBypass(req, constants.ROLES.STUDENT)) return next();
    if (await handleDevBypass(req, constants.ROLES.VERIFIER)) return next();

    const decoded = verifyToken(req);

    // Strict Check: Must be Student or Verifier
    // Allow if role is STUDENT or VERIFIER
    const isStudent = decoded.role === constants.ROLES.STUDENT;
    const isVerifier = decoded.role === constants.ROLES.VERIFIER;

    if (!isStudent && !isVerifier) {
      // Debug log for easier troubleshooting
      console.log(`[Auth] Access denied to /auth/me for role: ${decoded.role} (Expected: ${constants.ROLES.STUDENT} or ${constants.ROLES.VERIFIER})`);
      return error(res, 'Access denied. Users only.', null, 403);
    }

    const user = await User.findById(decoded.userId).select('-__v');
    if (!user || user.isActive === false) { // Explicitly check isActive false, in case undefined
      return error(res, 'User access denied (User not found or inactive).', null, 403);
    }

    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    req.userModel = user;
    next();
  } catch (err) {
    return error(res, 'Not authorized as User', null, 401);
  }
};

// Legacy export compatibility if needed, but we typically replace usage.
// If any other file imports 'authenticate' directly, it will break unless we export it?
// The user wants generic failure gone. So I will NOT export a generic 'authenticate'.
// Any file relying on it MUST be updated.
