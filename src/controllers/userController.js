const User = require('../models/User');
const { success, error } = require('../utils/response');
const constants = require('../utils/constants');

/**
 * GET /admin/users
 * Get all users with filters
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { role, college, classYear, page = 1, limit = constants.DEFAULT_PAGE_SIZE } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }
    if (college) {
      query.college = new RegExp(college, 'i');
    }
    if (classYear) {
      query.classYear = new RegExp(classYear, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-__v')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return success(res, 'Users retrieved', users, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /admin/users/:userId
 * Update user
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, isActive, college, classYear, mobile } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return error(res, 'User not found', null, 404);
    }

    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (college !== undefined) user.college = college;
    if (classYear !== undefined) user.classYear = classYear;
    if (mobile !== undefined) user.mobile = mobile;

    await user.save();

    return success(res, 'User updated', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      college: user.college,
      classYear: user.classYear,
      mobile: user.mobile,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /admin/users/:userId
 * Delete user (soft delete by setting isActive to false)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return error(res, 'User not found', null, 404);
    }

    user.isActive = false;
    await user.save();

    return success(res, 'User deactivated');
  } catch (err) {
    next(err);
  }
};



