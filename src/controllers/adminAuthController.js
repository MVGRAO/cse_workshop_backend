const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { success, error } = require('../utils/response');
const config = require('../config/env');
const constants = require('../utils/constants');

const generateAdminToken = (adminId) =>
  jwt.sign({ adminId, role: constants.ROLES.ADMIN, type: 'admin' }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });

/**
 * POST /api/v1/admin/auth/login
 * Admin login with email/password
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required', null, 400);
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return error(res, 'Invalid email or password', null, 401);
    }

    if (!admin.isActive) {
      return error(res, 'Admin account is inactive', null, 403);
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return error(res, 'Invalid email or password', null, 401);
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    return success(res, 'Admin login successful', {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: constants.ROLES.ADMIN,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/auth/create
 * Create new admin
 */
exports.createAdmin = async (req, res, next) => {
  try {
    console.log('✅ createAdmin endpoint hit - no authentication was required');
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return error(res, 'Name, email and password are required', null, 400);
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return error(res, 'Admin with this email already exists', null, 409);
    }

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    const token = generateAdminToken(admin._id);

    return success(res, 'Admin created successfully', {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: constants.ROLES.ADMIN,
      },
    }, null, 201);
  } catch (err) {
    next(err);
  }
};



